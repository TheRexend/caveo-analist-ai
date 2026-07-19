---
name: reporte-semanal-caveo
description: Gera o reporte semanal de performance da Caveo para WhatsApp, comparando os últimos 7 dias com os 7 dias anteriores. Coleta dados de Meta Ads ([LEADS]), Google Ads e Salesforce, calcula variações e aciona o agente analista para produzir análise e plano de ação. Use toda sexta-feira ou quando precisar do reporte semanal atualizado.
---

# Skill: Reporte Semanal — Caveo

Automatiza a coleta de dados de performance, o cálculo de variações semanais e a geração de análise + plano de ação, produzindo uma mensagem pronta para copiar e colar no WhatsApp.

## Contas

| Plataforma | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` |
| Google Ads | Caveo Tecnologia `3921127876` (MCC `5029399396`) |
| Salesforce | `caveo.my.salesforce.com` |

## Fonte única de regras (LER ANTES DE QUALQUER SOQL)

As regras de **canal** (UTM source → Meta/Google), **atribuição** (cpc +
cruzamento por click ID), **estágios** do funil e o **modelo de duas datas**
vêm da FONTE ÚNICA: **`docs/fundacao-dados.md`** (gerada de
`config/business-rules.ts`). Antes de montar as queries do Salesforce, consulte
esse arquivo e use os fragmentos SOQL de lá. NÃO reescrever listas de UTM/estágio
aqui — se este arquivo divergir da fundação, a fundação vence.

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

Apresentar ao usuário para confirmação antes de qualquer chamada de API:

```
Períodos a coletar:
  Atual:    [CUR_START] a [CUR_END]
  Anterior: [PREV_START] a [PREV_END]
Confirma?
```

---

## Fase 1 — Coleta de Dados

Executar as seis coletas **em paralelo** (uma chamada MCP por bloco).

### 1A. Meta Ads — Período Atual

**Ferramenta:** `mcp__meta-ads-mcp__get_insights`

Parâmetros:
- `account_id`: `act_438086148409254`
- `level`: `campaign`
- `time_range`: `{"since": "[CUR_START]", "until": "[CUR_END]"}`
- `fields`: `campaign_name,spend,impressions,reach,frequency,link_clicks,leads,cpm,ctr`

Após receber os dados, **filtrar localmente campanhas cujo nome contenha `[LEADS]`** (case-insensitive). Se nenhuma campanha bater nesse filtro, interromper e alertar o usuário antes de continuar.

Somar os valores filtrados:

| Variável | Campo API |
|---|---|
| `meta_cur_investimento` | `spend` |
| `meta_cur_leads` | `leads` |
| `meta_cur_impressoes` | `impressions` |
| `meta_cur_alcance` | `reach` |
| `meta_cur_frequencia` | `frequency` (média ponderada) |
| `meta_cur_cliques` | `link_clicks` |
| `meta_cur_cpm` | `cpm` (média ponderada por impressões) |
| `meta_cur_ctr` | `ctr` (média ponderada por impressões) |

### 1B. Meta Ads — Período Anterior

Mesmos parâmetros da 1A com `time_range`:
- `{"since": "[PREV_START]", "until": "[PREV_END]"}`

Mesmos filtros e cálculos. Variáveis: `meta_prev_investimento`, `meta_prev_leads`, `meta_prev_impressoes`, `meta_prev_alcance`, `meta_prev_frequencia`, `meta_prev_cliques`, `meta_prev_cpm`, `meta_prev_ctr`.

### 1C. Google Ads — Período Atual

**Ferramenta:** `mcp__google-ads-mcp__search`

Parâmetros:
- `customer_id`: `3921127876`
- `query`:

```sql
SELECT
  campaign.name,
  campaign.advertising_channel_type,
  metrics.cost_micros,
  metrics.conversions,
  metrics.impressions,
  metrics.clicks,
  metrics.ctr,
  metrics.average_cpc,
  metrics.search_impression_share
FROM campaign
WHERE segments.date BETWEEN '[CUR_START]' AND '[CUR_END]'
  AND campaign.status != 'REMOVED'
```

Converter `cost_micros / 1_000_000` para BRL. Arredondar `conversions` para inteiro. Somar todas as campanhas retornadas:

| Variável | Campo API |
|---|---|
| `google_cur_investimento` | `metrics.cost_micros / 1e6` |
| `google_cur_leads` | `round(metrics.conversions)` |
| `google_cur_impressoes` | `metrics.impressions` |
| `google_cur_cliques` | `metrics.clicks` |
| `google_cur_ctr` | `metrics.ctr` (média ponderada por impressões) |
| `google_cur_cpc_medio` | `metrics.average_cpc / 1e6` (média ponderada por cliques) |
| `google_cur_impression_share` | `metrics.search_impression_share` (média ponderada por impressões, quando disponível) |

### 1D. Google Ads — Período Anterior

Mesmos parâmetros da 1C com `WHERE segments.date BETWEEN '[PREV_START]' AND '[PREV_END]'`.

Variáveis: `google_prev_investimento`, `google_prev_leads`, `google_prev_impressoes`, `google_prev_cliques`, `google_prev_ctr`, `google_prev_cpc_medio`, `google_prev_impression_share`.

### 1E. Salesforce — Período Atual

**Ferramenta:** `mcp__salesforce-mcp__salesforce_query`

> **Modelo da fundação (alinhado ao dashboard):** usar o filtro de canal pago
> **cpc + cruzamento** de `docs/fundacao-dados.md` (seção "Fragmentos SOQL
> prontos"), o **modelo de duas datas** e o filtro de ganho `WON_CLAUSE`.
> Datas com fuso da operação `-03:00` (não `Z`). Substituir `[FILTRO_META]` /
> `[FILTRO_GOOGLE]` pelas cláusulas `cpc OU cruzamento` da fundação para cada
> plataforma (colunas `meta` / `google` da tabela de fragmentos).

**Query E1 — Oportunidades criadas (por plataforma, `CreatedDate`):**

```sql
-- rodar 2x: uma com [FILTRO_META], outra com [FILTRO_GOOGLE]
SELECT COUNT(Id) total
FROM Opportunity
WHERE CreatedDate >= [CUR_START]T00:00:00-03:00
  AND CreatedDate <= [CUR_END]T23:59:59-03:00
  AND ([FILTRO_META | FILTRO_GOOGLE])
```

**Query E2 — Fechamentos (ganho, por `LastStageChangeDate` — duas datas):**

```sql
-- rodar 2x (Meta / Google). WON_CLAUSE vem da fundação.
SELECT COUNT(Id) total
FROM Opportunity
WHERE ([WON_CLAUSE])
  AND LastStageChangeDate >= [CUR_START]T00:00:00-03:00
  AND LastStageChangeDate <= [CUR_END]T23:59:59-03:00
  AND ([FILTRO_META | FILTRO_GOOGLE])
```

**Query E3 — Distribuição do funil por estágio (para o agente analista):**

```sql
-- rodar 2x (Meta / Google) para separar os funis
SELECT StageName, COUNT(Id) total
FROM Opportunity
WHERE CreatedDate >= [CUR_START]T00:00:00-03:00
  AND CreatedDate <= [CUR_END]T23:59:59-03:00
  AND ([FILTRO_META | FILTRO_GOOGLE])
GROUP BY StageName
```

> Se o resultado de qualquer query retornar exatamente 2000 linhas, usar `mcp__salesforce-mcp__salesforce_query_all` para garantir que não houve truncação.

Derivar localmente a partir dos resultados:

| Variável | Fonte |
|---|---|
| `google_cur_oportunidades` | E1 com `[FILTRO_GOOGLE]` |
| `google_cur_fechamentos` | E2 com `[FILTRO_GOOGLE]` |
| `meta_cur_oportunidades` | E1 com `[FILTRO_META]` |
| `meta_cur_fechamentos` | E2 com `[FILTRO_META]` |
| `sf_cur_funil_google` | E3 com `[FILTRO_GOOGLE]` — distribuição de estágios |
| `sf_cur_funil_meta` | E3 com `[FILTRO_META]` — distribuição de estágios |

### 1F. Salesforce — Período Anterior

Mesmas três queries da 1E com datas `[PREV_START]` / `[PREV_END]`.

Variáveis: `google_prev_oportunidades`, `google_prev_fechamentos`, `meta_prev_oportunidades`, `meta_prev_fechamentos`, `sf_prev_funil_google`, `sf_prev_funil_meta`.

---

## Fase 2 — Consolidação de Métricas

### Métricas derivadas

Calcular para ambos os períodos:

| Métrica | Fórmula | Se denominador = 0 |
|---|---|---|
| CPL Google | `google_investimento / google_leads` | `"—"` |
| CPO Google | `google_investimento / google_oportunidades` | `"—"` |
| Custo por Lead Meta | `meta_investimento / meta_leads` | `"—"` |
| Custo por Oportunidade Meta | `meta_investimento / meta_oportunidades` | `"—"` |

### Cálculo de variação %

Para cada par `(cur, prev)`:
- Se `prev == 0` ou a métrica prev é `"—"`: exibir `(—)`
- Senão: `delta = round((cur - prev) / prev * 100)`
- Exibir `(+XX%)` se positivo, `(-XX%)` se negativo
- `Fechamentos`: exibir apenas o valor absoluto, **sem variação %**

### Formatação numérica (locale BR)

- Monetário: `R$ X.XXX,XX` (ponto como separador de milhar, vírgula como decimal)
- Inteiros: sem separador
- Percentual de variação: inteiro sem decimal (`+12%`, não `+12,3%`)
- CTR, frequência: uma casa decimal com vírgula (`4,2%`)

---

## Fase 3 — Análise e Plano de Ação

Invocar o subagente `analista-midia-paga-crm` passando o seguinte briefing estruturado com todos os dados das fases 1 e 2:

```
REPORTE SEMANAL CAVEO
PERÍODO ATUAL: [CUR_START] a [CUR_END]
PERÍODO ANTERIOR: [PREV_START] a [PREV_END]

=== META ADS ([LEADS]) ===
Investimento:       R$ [meta_cur_investimento] | ant: R$ [meta_prev_investimento] | var: [delta%]
Leads:              [meta_cur_leads] | ant: [meta_prev_leads] | var: [delta%]
Custo por Lead:     R$ [meta_cur_cpl] | ant: R$ [meta_prev_cpl] | var: [delta%]
Oportunidades (SF): [meta_cur_oportunidades] | ant: [meta_prev_oportunidades] | var: [delta%]
Custo por Opp:      R$ [meta_cur_cpo] | ant: R$ [meta_prev_cpo] | var: [delta%]
Fechamentos:        [meta_cur_fechamentos] | ant: [meta_prev_fechamentos]
Impressões: [meta_cur_impressoes] | CPM: R$ [meta_cur_cpm] | CTR: [meta_cur_ctr]% | Frequência: [meta_cur_frequencia] | Alcance: [meta_cur_alcance]
(ant) Impressões: [meta_prev_impressoes] | CPM: R$ [meta_prev_cpm] | CTR: [meta_prev_ctr]% | Frequência: [meta_prev_frequencia]
Funil Meta atual:    [sf_cur_funil_meta]
Funil Meta anterior: [sf_prev_funil_meta]

=== GOOGLE ADS ===
Investimento:       R$ [google_cur_investimento] | ant: R$ [google_prev_investimento] | var: [delta%]
Leads/Conversões:   [google_cur_leads] | ant: [google_prev_leads] | var: [delta%]
Custo por Lead:     R$ [google_cur_cpl] | ant: R$ [google_prev_cpl] | var: [delta%]
Oportunidades (SF): [google_cur_oportunidades] | ant: [google_prev_oportunidades] | var: [delta%]
Custo por Opp:      R$ [google_cur_cpo] | ant: R$ [google_prev_cpo] | var: [delta%]
Fechamentos:        [google_cur_fechamentos] | ant: [google_prev_fechamentos]
Impressões: [google_cur_impressoes] | Cliques: [google_cur_cliques] | CTR: [google_cur_ctr]% | CPC médio: R$ [google_cur_cpc_medio] | IS: [google_cur_impression_share]%
(ant) Impressões: [google_prev_impressoes] | Cliques: [google_prev_cliques] | CTR: [google_prev_ctr]% | CPC médio: R$ [google_prev_cpc_medio]
Funil Google atual:    [sf_cur_funil_google]
Funil Google anterior: [sf_prev_funil_google]
```

**Instrução ao agente:**
- Usar modo **"Diagnóstico de Funil por UTM"** (Bloco 2 + Bloco 4)
- Usar métricas secundárias (CPM, frequência, impression share, CTR) como sinais diagnósticos das causas
- Indicar o que foi feito ou deixou de ser feito na semana que explica a melhora ou piora
- Produzir por plataforma: **1 bullet de análise** (2–3 frases: causa + evidência + interpretação) + **1–2 bullets de plano de ação** com próximos passos específicos e acionáveis

**Output esperado do agente (por plataforma):**

```
• [análise: variação observada + causa provável + evidência da métrica secundária]

Plano de ação:
• [ação específica 1]
• [ação específica 2, se aplicável]
```

---

## Fase 4 — Mensagem WhatsApp

Montar a mensagem final com os dados da Fase 2 e os textos gerados pelo agente na Fase 3. Saída pronta para copiar e colar.

```
Reporte referente ao dia [CUR_START dd/MM] a [CUR_END dd/MM]

🟩GOOGLE ADS

💰Investimento: R$ [google_cur_investimento] ([delta%])
✉️Leads: [google_cur_leads] ([delta%])
🟢Custo por Lead: R$ [google_cur_cpl] ([delta%])
📧Oportunidades: [google_cur_oportunidades] ([delta%])
🟡Custo por Oportunidade: R$ [google_cur_cpo] ([delta%])
⚫️Fechamentos: [google_cur_fechamentos]

• [análise Google — gerada pelo agente]

Plano de ação:
• [ação Google 1]
• [ação Google 2, se aplicável]

🟦META ADS

💰Investimento: R$ [meta_cur_investimento] ([delta%])
✉️Leads: [meta_cur_leads] ([delta%])
🟢Custo por Lead: R$ [meta_cur_cpl] ([delta%])
📧Oportunidade: [meta_cur_oportunidades] ([delta%])
🟡Custo por Oportunidade: R$ [meta_cur_cpo] ([delta%])
⚫️Fechamentos: [meta_cur_fechamentos]

• [análise Meta — gerada pelo agente]

Plano de ação:
• [ação Meta 1]
• [ação Meta 2, se aplicável]
```

**Regras de formatação:**
- Emoji colado ao label, sem espaço: `💰Investimento:`, não `💰 Investimento:`
- Header: `CUR_START` e `CUR_END` no formato `DD/MM`
- Variações: sempre entre parênteses com sinal: `(+12%)`, `(-34%)`, `(—)` se indisponível
- `Fechamentos`: somente o inteiro absoluto, sem variação %
- Linha em branco entre o bloco de métricas e o bullet de análise
- Linha em branco entre o bullet de análise e `Plano de ação:`
- Duas linhas em branco separando o bloco Google do bloco Meta

---

## Pontos de atenção

- **Filtro `[LEADS]`:** aplicado localmente após o retorno da API Meta — não é filtro nativo. Interromper e alertar se nenhuma campanha bater no filtro.
- **`cost_micros` Google:** sempre dividir por `1.000.000` antes de qualquer cálculo ou exibição.
- **`conversions` Google:** o campo retorna float (ex: `12.0`) — arredondar para inteiro.
- **Ganho / estágios:** usar o `WON_CLAUSE` e os grupos de estágio da fundação (`docs/fundacao-dados.md`), não listas próprias. Ganho = `IsWon = true OR StageName = 'Ganho não Identificado'`.
- **Canal / UTM:** usar os fragmentos `cpc + cruzamento` da fundação (não `LIKE '%...%'` de source). A fundação já cobre casing e placements.
- **Fuso:** datas com `-03:00` (fuso da operação), não `Z`.
- **Paginação Salesforce:** se qualquer query retornar exatamente 2000 linhas, usar `salesforce_query_all`.
- **`search_impression_share`:** disponível apenas para campanhas de Pesquisa — retorna `null` para Performance Max. Calcular apenas sobre campanhas onde o campo esteja presente.
