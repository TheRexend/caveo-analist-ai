---
name: reporte-semanal-caveo
description: Gera o reporte semanal de performance da Caveo para envio direto ao cliente via WhatsApp (últimos 7 dias, métricas agregadas Google+Meta + funil MQL/SQL do Salesforce). Aciona o agente analista para produzir análise consolidada, plano de ação a partir do KPI ofensor e perguntas de alinhamento. Use toda sexta-feira ou quando precisar do reporte semanal atualizado.
---

# Skill: Reporte Semanal — Caveo

Automatiza a coleta de dados de performance e a geração de uma mensagem
**pronta para enviar ao cliente** (não é reporte interno): investimento total
e por plataforma, impressões, leads e funil de qualificação MQL/SQL, seguidos
de análise, plano de ação e perguntas de alinhamento geradas pelo agente
analista.

## Contas

| Plataforma | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` |
| Google Ads | Caveo Tecnologia `3921127876` (MCC `5029399396`) |
| Salesforce | `caveo.my.salesforce.com` |

> Só Google + Meta. A Caveo não roda TikTok/Pinterest — se isso mudar, adicionar
> um bloco de coleta próprio em vez de forçar nas contas acima.

## Fonte única de regras (LER ANTES DE QUALQUER SOQL)

As regras de **canal** (UTM source → Meta/Google), **atribuição** (cpc +
cruzamento por click ID), **estágios** do funil, **qualificação MQL/SQL** e o
**modelo de duas datas** vêm da FONTE ÚNICA: **`docs/fundacao-dados.md`**
(gerada de `config/business-rules.ts`). Antes de montar as queries do
Salesforce, consulte esse arquivo e use os fragmentos SOQL de lá. NÃO
reescrever listas de UTM/estágio aqui — se este arquivo divergir da fundação,
a fundação vence.

A lógica de gate cumulativo de MQL/SQL já existe em código —
`scripts/acompanhamento_diario/qualification.py` (`mql_day`, `sql_day`) — e é
a mesma usada pela skill `reporte-resultados-ka`. Reaproveitar, não duplicar.

## Quando o usuário pede algo, identifique a fase

| Pedido | Fases |
|---|---|
| "roda o reporte semanal" / "gera o reporte" | Todas (0 → 1 → 2 → 3 → 4) |
| "qual é o período?" | Fase 0 apenas |
| "coleta os dados" sem gerar mensagem | Fase 0 + Fase 1 |
| "gera a análise" com dados já coletados | Fase 3 (agente analista) |
| "gera a mensagem" com análise já pronta | Fase 4 apenas |

---

## Fase 0 — Confirmar Períodos

Calcular automaticamente a partir de hoje (`TODAY`):

| Variável | Fórmula | Exemplo (sexta 2026-05-22) |
|---|---|---|
| `CUR_END` | TODAY − 1 | 2026-05-21 |
| `CUR_START` | TODAY − 7 | 2026-05-15 |
| `PREV_END` | TODAY − 8 | 2026-05-14 |
| `PREV_START` | TODAY − 14 | 2026-05-08 |

O período **anterior** não aparece na mensagem final ao cliente — serve só
de insumo interno para o agente analista comentar tendência ("subiu X%") na
Fase 3 com base em dado real, não estimado.

Apresentar ao usuário para confirmação antes de qualquer chamada de API:

```
Períodos a coletar:
  Atual:    [CUR_START] a [CUR_END]
  Anterior (uso interno): [PREV_START] a [PREV_END]
Confirma?
```

---

## Fase 1 — Coleta de Dados

Executar as coletas **em paralelo** (uma chamada MCP por bloco).

### 1A. Meta Ads — Período Atual

**Ferramenta:** `mcp__meta-ads-mcp__get_insights`

Parâmetros:
- `account_id`: `act_438086148409254`
- `level`: `campaign`
- `time_range`: `{"since": "[CUR_START]", "until": "[CUR_END]"}`
- `fields`: `campaign_name,spend,impressions,reach,frequency,link_clicks,leads,cpm,ctr`

Após receber os dados, **filtrar localmente campanhas cujo nome contenha
`[LEADS]`** (case-insensitive). Se nenhuma campanha bater nesse filtro,
interromper e alertar o usuário antes de continuar.

Somar os valores filtrados:

| Variável | Campo API |
|---|---|
| `meta_cur_investimento` | `spend` |
| `meta_cur_leads` | `actions[action_type=lead].value` |
| `meta_cur_impressoes` | `impressions` |
| `meta_cur_alcance` | `reach` |
| `meta_cur_frequencia` | `frequency` (média ponderada por impressões) |
| `meta_cur_cliques` | `link_clicks` |
| `meta_cur_cpm` | `cpm` (média ponderada por impressões) |
| `meta_cur_ctr` | `ctr` (média ponderada por impressões) |

### 1B. Meta Ads — Período Anterior

Mesmos parâmetros da 1A com `time_range`: `{"since": "[PREV_START]", "until": "[PREV_END]"}`.
Mesmos filtros e cálculos. Variáveis: `meta_prev_*` (mesmo sufixo da 1A).

### 1C. Google Ads — Período Atual

**Ferramenta:** `mcp__google-ads-mcp__search_search`

Parâmetros:
- `customer_id`: `3921127876`
- `resource`: `campaign`
- `fields`: `["campaign.name","campaign.advertising_channel_type","metrics.cost_micros","metrics.conversions","metrics.impressions","metrics.clicks","metrics.ctr","metrics.average_cpc","metrics.search_impression_share"]`
- `conditions`: `["segments.date BETWEEN '[CUR_START]' AND '[CUR_END]'","campaign.status != 'REMOVED'"]`

Converter `cost_micros / 1_000_000` para BRL. Arredondar `conversions` para
inteiro (somar antes de arredondar). Somar todas as campanhas retornadas:

| Variável | Campo API |
|---|---|
| `google_cur_investimento` | `metrics.cost_micros / 1e6` |
| `google_cur_leads` | `round(sum(metrics.conversions))` |
| `google_cur_impressoes` | `metrics.impressions` |
| `google_cur_cliques` | `metrics.clicks` |
| `google_cur_ctr` | `metrics.ctr` (média ponderada por impressões) |
| `google_cur_cpc_medio` | `metrics.average_cpc / 1e6` (média ponderada por cliques) |
| `google_cur_impression_share` | `metrics.search_impression_share`, só sobre campanhas `SEARCH` (média ponderada por impressões) |

### 1D. Google Ads — Período Anterior

Mesmos parâmetros da 1C com `segments.date BETWEEN '[PREV_START]' AND '[PREV_END]'`.
Variáveis: `google_prev_*` (mesmo sufixo da 1C).

### 1E. Salesforce — MQL/SQL cumulativo (funil combinado, `CreatedDate`)

**Ferramenta:** `mcp__salesforce-mcp__salesforce_query` (ou `salesforce_query_all` se a 1ª chamada bater 2000 linhas)

> Usa o fragmento **`all`** (cpc + cruzamento, todas as plataformas somadas —
> não separar Meta/Google aqui) da tabela "Fragmentos SOQL prontos" da
> fundação. Sem filtro de `TipCte__c`: mídia paga mira 100% Médico, então não
> há necessidade de segmentar.

```sql
-- rodar 2x: uma para [CUR_START]/[CUR_END], outra para [PREV_START]/[PREV_END]
SELECT OpportunityId, StageName, CreatedDate, Opportunity.IsWon
FROM OpportunityHistory
WHERE Opportunity.CreatedDate >= [START]T00:00:00-03:00
  AND Opportunity.CreatedDate <= [END]T23:59:59-03:00
  AND Opportunity.[PAID_ALL]
ORDER BY OpportunityId, CreatedDate
```

Agrupar por `OpportunityId` → `history=[{stage, date}]` (`date` = dia de
`CreatedDate` da linha), `is_won = IsWon OR StageName contém "Ganho não Identificado"`
(replica o `WON_CLAUSE` da fundação). Montar `SF_HISTORY_CUR` e `SF_HISTORY_PREV`.

### 1F. Salesforce — Funil por estágio combinado (diagnóstico para o agente)

```sql
-- rodar 2x: [CUR_START]/[CUR_END] e [PREV_START]/[PREV_END]
SELECT StageName, COUNT(Id) total
FROM Opportunity
WHERE CreatedDate >= [START]T00:00:00-03:00
  AND CreatedDate <= [END]T23:59:59-03:00
  AND [PAID_ALL]
GROUP BY StageName
```

Só serve de insumo para o agente diagnosticar onde o funil está travando
(Fase 3) — não aparece na mensagem final ao cliente.

> Se qualquer query retornar exatamente 2000 linhas, usar `salesforce_query_all`.

---

## Fase 2 — Consolidação de Métricas

Rodar com o `python3` do sistema (reaproveita `qualification.py`, não
duplicar a lógica de gate):

```python
import sys
sys.path.insert(0, 'scripts/acompanhamento_diario')
from qualification import mql_day, sql_day

# ===== dados da Fase 1 (PREENCHER) =====
# SF_HISTORY_CUR = [{"history":[{"stage","date"}], "is_won": bool}, ...]  (1 item por Oportunidade)
# SF_HISTORY_PREV = [...]

def counts(history_list):
    total = len(history_list)  # "Leads Total" = Oportunidades criadas no período (mesma população do gate)
    mql = sum(1 for o in history_list if mql_day(o["history"], o["is_won"]) is not None)
    sql = sum(1 for o in history_list if sql_day(o["history"], o["is_won"]) is not None)
    return total, mql, sql

leads_total_cur, mql_cur, sql_cur = counts(SF_HISTORY_CUR)
leads_total_prev, mql_prev, sql_prev = counts(SF_HISTORY_PREV)
```

> **`leads_total` NÃO é a soma de `meta_cur_leads` + `google_cur_leads`.**
> Esses campos são eventos de conversão reportados pela própria plataforma de
> anúncio (pixel/action) e não têm relação de subconjunto com MQL/SQL — já foi
> visto `MQL > leads da plataforma` num período (mismatch de população, não
> bug). "Leads Total" aqui é o **total de Oportunidades criadas no Salesforce**
> no período (`len(SF_HISTORY_CUR)`), a mesma população da qual MQL e SQL são
> subconjuntos cumulativos — é isso que garante `Leads ≥ MQL ≥ SQL` na mensagem
> ao cliente. `meta_cur_leads`/`google_cur_leads` continuam existindo só como
> insumo diagnóstico secundário pro agente (Fase 3), não aparecem na mensagem.

### Métricas agregadas (mostradas ao cliente — só período atual)

| Métrica | Fórmula |
|---|---|
| `investimento_total_cur` | `meta_cur_investimento + google_cur_investimento` |
| `impressoes_total_cur` | `meta_cur_impressoes + google_cur_impressoes` |
| `leads_total_cur` | `len(SF_HISTORY_CUR)` — Oportunidades criadas no período (paid, todas as plataformas) |
| `mql_cur` | via `qualification.mql_day` sobre `SF_HISTORY_CUR` |
| `pct_mql_cur` | `round(mql_cur / leads_total_cur * 100)` — `"—"` se `leads_total_cur == 0` |
| `sql_cur` | via `qualification.sql_day` sobre `SF_HISTORY_CUR` |
| `pct_sql_cur` | `round(sql_cur / mql_cur * 100)` — `"—"` se `mql_cur == 0` (percentual é **sobre o MQL**, não sobre leads) |

### Métricas equivalentes do período anterior (uso interno, Fase 3 apenas)

Mesmas fórmulas com sufixo `_prev` (`investimento_total_prev`,
`leads_total_prev`, `mql_prev`, `sql_prev`, `pct_mql_prev`, `pct_sql_prev`) —
não entram na mensagem, só no briefing do agente para ele comentar tendência
com dado real.

### Formatação numérica (locale BR)

- Monetário: `R$ X.XXX,XX` (ponto como separador de milhar, vírgula como decimal)
- Inteiros: `X.XXX` com separador de milhar quando ≥ 1000 (ex: `19.035`), sem separador abaixo disso
- Percentuais desta skill usam prefixo `~` (aproximado): `~57%`, não `+57%` — não há mais variação semana a semana na mensagem final

---

## Fase 3 — Análise, Plano de Ação e Perguntas de Alinhamento

Invocar o subagente `analista-midia-paga-crm` passando o seguinte briefing
estruturado:

```
REPORTE SEMANAL CAVEO — MENSAGEM AO CLIENTE
PERÍODO ATUAL: [CUR_START] a [CUR_END]
PERÍODO ANTERIOR (uso interno, não aparece na mensagem): [PREV_START] a [PREV_END]

=== MÉTRICAS DO CLIENTE (período atual) ===
Investimento Google: R$ [google_cur_investimento]
Investimento Meta:   R$ [meta_cur_investimento]
Investimento Total:  R$ [investimento_total_cur]
Impressões:          [impressoes_total_cur]
Leads Total:         [leads_total_cur]
MQL:                 [mql_cur]  (~[pct_mql_cur]% dos leads)
SQL:                 [sql_cur]  (~[pct_sql_cur]% do MQL)

=== COMPARATIVO PERÍODO ANTERIOR (uso interno, não citar números crus — só tendência) ===
Investimento Total: [investimento_total_prev] | Leads: [leads_total_prev]
MQL: [mql_prev] (~[pct_mql_prev]%) | SQL: [sql_prev] (~[pct_sql_prev]%)

=== SECUNDÁRIAS POR PLATAFORMA (diagnóstico, não citar cru na mensagem) ===
Meta — CPM: R$ [meta_cur_cpm] | CTR: [meta_cur_ctr]% | Frequência: [meta_cur_frequencia] | Alcance: [meta_cur_alcance]
(ant) Meta — CPM: R$ [meta_prev_cpm] | CTR: [meta_prev_ctr]% | Frequência: [meta_prev_frequencia]
Google — Cliques: [google_cur_cliques] | CTR: [google_cur_ctr]% | CPC médio: R$ [google_cur_cpc_medio] | IS (Search): [google_cur_impression_share]%
(ant) Google — Cliques: [google_prev_cliques] | CTR: [google_prev_ctr]% | CPC médio: R$ [google_prev_cpc_medio] | IS (Search) ant: [google_prev_impression_share]%

=== FUNIL POR ESTÁGIO (diagnóstico) ===
Atual:    [funil_cur_por_estagio]
Anterior: [funil_prev_por_estagio]
```

**Instrução ao agente:**
- Determinar o **KPI ofensor da semana** entre MQL e SQL — comparar `pct_mql_cur`/`pct_sql_cur` contra os benchmarks que você já conhece e contra a tendência do período anterior. SQL é avaliado sobre o MQL (não sobre leads); é comum SQL parecer "pior" nominalmente por ser a etapa mais funda do funil.
- Produzir **1 análise consolidada** (não separar por plataforma) — 3 a 5 frases: o que mudou na semana (criativos, campanhas, tracking, funil) que explica a variação do KPI ofensor, com evidência das métricas secundárias.
- Produzir **1 plano de ação** focado especificamente em destravar o KPI ofensor — passos concretos e acionáveis, endereçados ao time (interno ou comercial do cliente).
- Produzir **1 a 2 perguntas de alinhamento** dirigidas ao cliente sobre o KPI ofensor — buscar contexto que só o time comercial do cliente tem (percepção sobre a etapa, motivo de objeção, gargalo de processo).

**Output esperado do agente:**

```
[análise consolidada — 1 parágrafo]

[plano de ação — 1 parágrafo, passos específicos]

[pergunta(s) de alinhamento — 1-2 perguntas diretas]
```

---

## Fase 4 — Mensagem ao Cliente

Montar a mensagem final com os dados da Fase 2 e os textos gerados pelo
agente na Fase 3. Saída pronta para copiar e colar — **é uma mensagem
dirigida ao cliente**, não um reporte interno.

```
Bom dia, pessoal, tudo bem?

Estou enviando o relatório semanal referente aos últimos 7 dias: [CUR_START dd/MM] a [CUR_END dd/MM]


💰 Investimento Google: R$ [google_cur_investimento]

💰 Investimento Meta: R$ [meta_cur_investimento]


💰 Investimento Total: R$ [investimento_total_cur]

⚡  Impressões: [impressoes_total_cur]

⚡  Leads - Total: [leads_total_cur]

🟢 MQL: [mql_cur]

📊 %MQL: ~[pct_mql_cur]%

🟩 SQL: [sql_cur]

📊 % SQL: ~[pct_sql_cur]%



📊 Análise sobre a performance dos dados

[análise consolidada — gerada pelo agente]


🎯 Próximos passos a partir do KPI ofensor

[plano de ação — gerado pelo agente]


🚩 Dúvidas ou alinhamento

[pergunta(s) de alinhamento — geradas pelo agente]
```

**Regras de formatação:**
- Saudação fixa `Bom dia, pessoal, tudo bem?` — ajustar manualmente para `Boa tarde` se enviado à tarde.
- Emoji + espaço simples antes do label (`💰 Investimento Google:`), **exceto** `⚡` que leva dois espaços (`⚡  Impressões:`) — replica o exemplo original literalmente.
- `%MQL` sem espaço antes do `%`; `% SQL` **com** espaço — replica o exemplo original literalmente, não padronizar.
- Linha em branco entre cada linha de Investimento por plataforma; duas linhas em branco antes de `Investimento Total`; linha em branco entre as métricas restantes (Impressões/Leads/MQL/%MQL/SQL/%SQL).
- Duas linhas em branco antes de cada cabeçalho de seção (`📊 Análise...`, `🎯 Próximos passos...`, `🚩 Dúvidas...`); uma linha em branco entre o cabeçalho e o texto da seção.
- Sem TikTok/Pinterest, sem CPL/CPO/Oportunidades/Fechamentos, sem variação % semana a semana — tudo isso ficou no formato antigo (interno). Se precisar do detalhe por plataforma, pedir a análise completa separadamente; não inflar esta mensagem.

---

## Pontos de atenção

- **Mudança de formato (2026-09-04):** esta skill deixou de gerar o reporte
  interno por plataforma (Investimento/CPL/CPO/Oportunidades/Fechamentos
  separados Google×Meta) e passou a gerar mensagem direta ao cliente com
  métricas agregadas + funil MQL/SQL. A nota antiga sobre "Fechamentos usa só
  `IsWon = true`" não se aplica mais — a query de Fechamentos foi removida
  desta skill; MQL/SQL usa o `is_won` completo (`WON_CLAUSE` da fundação),
  igual à `reporte-resultados-ka`.
- **Filtro `[LEADS]`:** aplicado localmente após o retorno da API Meta — não é filtro nativo. Interromper e alertar se nenhuma campanha bater no filtro.
- **`cost_micros` Google:** sempre dividir por `1.000.000` antes de qualquer cálculo ou exibição.
- **`conversions` Google:** o campo retorna float — somar tudo primeiro, arredondar só no total.
- **MQL/SQL:** cumulativo via `OpportunityHistory` — a oportunidade conta se **já atingiu** o gate (não precisa estar no estágio hoje). `%SQL` é sobre o MQL, não sobre leads/leads totais — não confundir com o antigo "Custo por Oportunidade".
- **"Leads Total" = Oportunidades no Salesforce, não evento de conversão da plataforma de anúncio:** `meta_cur_leads`/`google_cur_leads` (actions/conversions reportados por Meta/Google) não são subconjunto de MQL/SQL e não devem ser somados para virar `leads_total`. Use sempre `len(SF_HISTORY)` — só assim a cadeia `Leads ≥ MQL ≥ SQL` se mantém verdadeira.
- **Benchmark de MQL/SQL:** não vive nesta skill nem na fundação — é conhecimento do agente `analista-midia-paga-crm` (mesma regra de organização das demais skills: benchmark só no agente).
- **Canal / UTM:** usar o fragmento `all` (cpc + cruzamento, todas as plataformas) da fundação — não separar por Meta/Google na query de MQL/SQL, e não filtrar por `TipCte__c`.
- **Fuso:** datas com `-03:00` (fuso da operação), não `Z`.
- **Paginação Salesforce:** se qualquer query retornar exatamente 2000 linhas, usar `salesforce_query_all`.
- **`search_impression_share`:** disponível apenas para campanhas de Pesquisa — retorna `null`/0 para Performance Max. Calcular a média só sobre campanhas `SEARCH`.
- **TikTok/Pinterest:** não fazem parte da conta Caveo hoje — as linhas do formato-exemplo original foram descartadas. Se a Caveo passar a rodar essas plataformas, criar coleta própria (conta + credenciais) antes de adicionar ao template.
