---
name: planilha-resultados
description: Coleta e apresenta dados consolidados de Mídia Paga da Caveo (Meta Ads [LEADS] + Google Ads + Salesforce CRM) para o período do mês atual de 01 até D-1. Entrega totais por plataforma, visão Salesforce por estágio separada por Meta/Google, e breakdown por campanha com Investimento, Leads, CPL, Opps, Custo/Opp e Fechados. Use quando precisar do relatório de performance de mídia paga.
---

# Skill: Planilha de Resultados — Caveo Mídia Paga

Coleta e consolida dados de Meta Ads, Google Ads e Salesforce para o período do mês corrente
(dia 01 até D-1) e entrega o relatório completo de mídia paga.

## Contas

| Plataforma | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` (Caveo App) |
| Google Ads | `3921127876` (Caveo Tecnologia) |
| Salesforce | `caveo.my.salesforce.com` |

## Fonte única de regras (LER ANTES DE QUALQUER SOQL)

O filtro de **canal pago** (Meta/Google) usa o modelo **cpc + cruzamento** de
**`docs/fundacao-dados.md`** (seção "Fragmentos SOQL prontos"), com **duas datas**
(criadas por `CreatedDate`; fechamentos por `LastStageChangeDate`) e fuso `-03:00`.
NÃO reescrever listas de `UtmSou__c` aqui. O breakdown por `StageName` individual
(para as células da planilha) é mantido — é apresentação, não regra de canal.

---

## Fase 0 — Calcular Período

Calcular automaticamente sem perguntar ao usuário:

- **START** = primeiro dia do mês corrente → `YYYY-MM-01`
- **END** = hoje − 1 dia → `YYYY-MM-DD`

Exemplo: se hoje é 11/06/2026, então START = `2026-06-01` e END = `2026-06-10`.

Informar o período ao usuário em uma linha antes de iniciar a coleta:
```
Coletando dados de [START] a [END]...
```

---

## Fase 1 — Coleta de Dados (executar tudo em paralelo)

### 1A. Meta Ads — Insights por Campanha

**Ferramenta:** `mcp__meta-ads-mcp__get_insights`

Parâmetros:
```
object_id:  "act_438086148409254"
level:      "campaign"
time_range: {"since": "[START]", "until": "[END]"}
limit:      50
```

Após receber os dados, **filtrar apenas campanhas cujo nome contenha `[LEADS]`** (case-insensitive).

Para cada campanha filtrada, extrair:
- `spend` → Investimento
- `impressions` → Impressões
- CPM = (`spend` / `impressions`) × 1000  *(ou usar o campo `cpm` da resposta)*
- Link Clicks = array `actions` → objeto com `action_type = "link_click"` → `value`
- CTR Link = (Link Clicks / `impressions`) × 100
- Leads = array `actions` → objeto com `action_type = "lead"` → `value`

Somar todos os valores das campanhas filtradas para os **Totais Meta [LEADS]**.

### 1B. Google Ads — Performance por Campanha

**Ferramenta:** `mcp__google-ads-mcp__search_search`

Parâmetros:
```
customer_id: "3921127876"
resource:    "campaign"
fields:      ["campaign.id", "campaign.name", "campaign.status",
              "metrics.cost_micros", "metrics.impressions",
              "metrics.clicks", "metrics.ctr", "metrics.conversions"]
conditions:  ["segments.date BETWEEN '[START]' AND '[END]'",
              "campaign.status = 'ENABLED'"]
```

Para cada campanha retornada, extrair:
- Investimento = `metrics.cost_micros` / 1.000.000
- Impressões = `metrics.impressions`
- CPM = (Investimento / Impressões) × 1000
- Cliques no Link = `metrics.clicks`
- CTR Link = `metrics.ctr` × 100  *(já é ratio, converter para %)*
- Conversões = `metrics.conversions` *(arredondar para inteiro)*

Somar todos para os **Totais Google Ads**.

### 1C. Salesforce — Estágios por Plataforma

**Ferramenta:** `mcp__salesforce-mcp__salesforce_query`

```sql
-- rodar 2x: uma com [FILTRO_META], outra com [FILTRO_GOOGLE] da fundação
-- ([FILTRO] = cláusula "cpc OU cruzamento" da plataforma em docs/fundacao-dados.md)
SELECT StageName, COUNT(Id) qtd
FROM Opportunity
WHERE CreatedDate >= [START]T00:00:00-03:00
  AND CreatedDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META | FILTRO_GOOGLE])
GROUP BY StageName
```

Classificar por plataforma pelo **filtro usado** (`[FILTRO_META]` → Meta;
`[FILTRO_GOOGLE]` → Google), não por inspeção manual de `UtmSou__c`.

Agregar por estágio para cada plataforma:

Estágios esperados (nessa ordem na exibição):
1. Aguardando Resposta
2. Contato Realizado
3. Perdido
4. Fechado (Ganho)  ← StageName = `Fechado`
5. Proposta Enviada
6. Nova
7. Standy-By
8. Ganho não Identificado
9. **Total** (soma de todos)

### 1D. Salesforce — Opps e Fechados por Campanha

**Ferramenta:** `mcp__salesforce-mcp__salesforce_query`

```sql
-- rodar 2x: [FILTRO_META] / [FILTRO_GOOGLE] da fundação
SELECT UtmCam__c, StageName, COUNT(Id) qtd
FROM Opportunity
WHERE CreatedDate >= [START]T00:00:00-03:00
  AND CreatedDate <= [END]T23:59:59-03:00
  AND UtmCam__c != null
  AND ([FILTRO_META | FILTRO_GOOGLE])
GROUP BY UtmCam__c, StageName
ORDER BY COUNT(Id) DESC
```

Para cada `UtmCam__c`, somar:
- **Opps** = COUNT total de registros daquela campanha
- **Fechado** = COUNT dos registros onde `StageName = 'Fechado'` **OU** `StageName = 'Ganho não Identificado'`

---

## Fase 2 — Consolidação e Apresentação

Cruzar os dados das quatro coletas e apresentar o relatório completo abaixo.

### Regras de cruzamento Meta Ads × Salesforce

Para associar campanhas Meta Ads às oportunidades do Salesforce:
- O `UtmCam__c` no Salesforce geralmente corresponde ao **nome exato da campanha** no Meta Ads.
- Se houver match exato: usar os valores de Opps e Fechados daquela campanha.
- Se não houver match: exibir `—` em Opps e Custo/Opp.

### Regras de cruzamento Google Ads × Salesforce

- Mapear `UtmCam__c` (SF) → nome da campanha (Google Ads):
  - `institucional` → campanha Search Institucional
  - `cnpj_medico` → campanha Search CNPJ Médico
  - `pmax_plataforma_financeira_medicopj` → campanha PMax Plataforma Financeira
  - `menos_impostos` / `contabilidade*` → campanhas Search Contabilidade
  - `campanha_teste` → ignorar ou sinalizar

---

## Formato de Saída

Apresentar exatamente neste formato:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MÍDIA PAGA — CAVEO | [MÊS/ANO] ([START] – [END])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

META ADS — TOTAIS (filtro: campanhas com [LEADS])
┌──────────────────────┬──────────────┐
│ Investimento         │ R$ XX.XXX,XX │
│ Impressões           │ XXX.XXX      │
│ CPM                  │ R$ XX,XX     │
│ Cliques no Link      │ X.XXX        │
│ CTR Link             │ X,XX%        │
│ Leads                │ XXX          │
│ Oportunidades        │ XX           │
│ Oportunidades Fechadas│ XX          │
└──────────────────────┴──────────────┘

GOOGLE ADS — TOTAIS
┌──────────────────────┬──────────────┐
│ Investimento         │ R$ X.XXX,XX  │
│ Impressões           │ XX.XXX       │
│ CPM                  │ R$ XXX,XX    │
│ Cliques no Link      │ X.XXX        │
│ CTR Link             │ XX,XX%       │
│ Conversões           │ XX           │
│ Oportunidades        │ XX           │
│ Oportunidades Fechadas│ XX          │
└──────────────────────┴──────────────┘

SALESFORCE — VISÃO POR ESTÁGIO (opps criadas no período)
┌──────────────────────────┬──────────┬────────────┐
│ Estágio                  │ Meta Ads │ Google Ads │
├──────────────────────────┼──────────┼────────────┤
│ Aguardando Resposta      │ XX       │ XX         │
│ Contato Realizado        │ XX       │ XX         │
│ Perdido                  │ XX       │ XX         │
│ Fechado (Ganho)          │ XX       │ XX         │
│ Proposta Enviada         │ XX       │ XX         │
│ Nova                     │ XX       │ XX         │
│ Standy-By                │ XX       │ XX         │
│ Ganho não Identificado   │ XX       │ XX         │
│ Total                    │ XX       │ XX         │
└──────────────────────────┴──────────┴────────────┘

CAMPANHAS — META ADS (apenas [LEADS])
┌─────────────────────────────┬──────────┬───────┬──────────┬──────┬──────────┬─────────┐
│ Campanha                    │ Invest.  │ Leads │ CPL      │ Opps │ Custo/Opp│ Fechado │
├─────────────────────────────┼──────────┼───────┼──────────┼──────┼──────────┼─────────┤
│ [nome curto da campanha]    │ R$ X.XXX │ XX    │ R$ XX,XX │ XX   │ R$ XX,XX │ XX      │
│ ...                         │ ...      │ ...   │ ...      │ ...  │ ...      │ ...     │
└─────────────────────────────┴──────────┴───────┴──────────┴──────┴──────────┴─────────┘

CAMPANHAS — GOOGLE ADS
┌─────────────────────────────┬──────────┬───────┬──────────┬──────┬──────────┬─────────┐
│ Campanha                    │ Invest.  │ Conv. │ CPL      │ Opps │ Custo/Opp│ Fechado │
├─────────────────────────────┼──────────┼───────┼──────────┼──────┼──────────┼─────────┤
│ [nome curto da campanha]    │ R$ X.XXX │ XX    │ R$ XX,XX │ XX   │ R$ XX,XX │ XX      │
│ ...                         │ ...      │ ...   │ ...      │ ...  │ ...      │ ...     │
└─────────────────────────────┴──────────┴───────┴──────────┴──────┴──────────┴─────────┘
```

### Regras de formatação

- Valores monetários: separador de milhar `.` e decimal `,` → `R$ 1.274,76`
- Percentuais: uma casa decimal → `3,1%`
- CPL (Custo por Lead) = Investimento / Leads
- Custo/Opp = Investimento / Oportunidades
- Se Leads = 0 ou Opps = 0: exibir `—` em CPL / Custo/Opp
- Nomes de campanhas: encurtar suprimindo prefixos `[BOO]` e datas longas. Manter as tags de funil: `[RF]`, `[MM]`, `[FUNDO]`, `[MEIO]`, `[LEADS]` e o título descritivo.
- Colunas "Opps" e "Fechado" sem match no Salesforce: exibir `—`

Após apresentar o relatório completo, perguntar ao usuário:
```
Deseja gravar os dados na planilha "Relação de Leads"? (responda sim para confirmar)
```
Se confirmado, avançar para a **Fase 3**.

---

## Fase 3 — Gravação na Planilha

**Planilha:** `169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw`
**Aba:** `Relação de Leads`

### Autenticação (service account)

Credenciais: `.claude/sheets_credentials.json`
Conta de serviço: `reporte-ka-sheets@caveo-496716.iam.gserviceaccount.com`

### Regras de construção do script

Construir o script Python abaixo substituindo todos os `[PLACEHOLDER]` pelos valores numéricos reais coletados:

- **Valores monetários** (Invest., CPM, CPL, Custo/Opp): gravar como `float` sem símbolo → `14748.91`
- **Inteiros** (Impressões, Leads, Cliques, Opps, Conv., estágios): gravar como `int`
- **CTR**: converter de percentual para decimal → `3,1% = 0.031` / `13,1% = 0.131`
- **Valores ausentes (`—`)**: usar `None` — o helper `w()` escreve `''` na célula
- **Campanhas**: construir a lista com os dados reais; incluir `None` nas colunas sem match SF
- Antes de gravar campanhas, limpar os intervalos para remover linhas de execuções anteriores

### Script de gravação (Python via Bash)

```python
import gspread
from google.oauth2.service_account import Credentials

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
creds = Credentials.from_service_account_file('.claude/sheets_credentials.json', scopes=SCOPES)
gc = gspread.authorize(creds)
ws = gc.open_by_key('169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw').worksheet('Relação de Leads')

def w(cell, value):
    ws.update(values=[[value if value is not None else '']], range_name=cell)

# ── META ADS — TOTAIS ──────────────────────────────────────────
w('B2',  [META_INVESTIMENTO])
w('B4',  [META_IMPRESSOES])
w('C5',  [META_CPM])
w('B6',  [META_CLIQUES])
w('C7',  [META_CTR_DECIMAL])   # ex: 0.031 para 3,1%
w('B8',  [META_LEADS])
w('B10', [META_OPPS])

# ── SALESFORCE — Meta por estágio ──────────────────────────────
w('B16', [SF_META_AGUARDANDO])
w('B17', [SF_META_CONTATO])
w('B18', [SF_META_PERDIDO])
w('B19', [SF_META_FECHADO])
w('B20', [SF_META_PROPOSTA])
w('B21', [SF_META_NOVA])
w('B22', [SF_META_STANDBY])
w('B23', [SF_META_GANHO_NI])
w('B24', [SF_META_TOTAL])

# ── META CAMPANHAS (linha 29+) ─────────────────────────────────
# Limpar intervalo antes de gravar
ws.batch_clear(['A29:H55'])

meta_campanhas = [
    # (nome_curto, invest, leads, cpl_ou_None, opps_ou_None, custo_opp_ou_None, fechado_ou_None)
    # SUBSTITUIR PELAS LINHAS REAIS — uma tupla por campanha
]
for i, (nome, invest, leads, cpl, opps, custo_opp, fechado) in enumerate(meta_campanhas):
    r = 29 + i
    w(f'A{r}', nome)
    w(f'C{r}', invest)
    w(f'D{r}', leads)
    w(f'E{r}', cpl)
    w(f'F{r}', opps)
    w(f'G{r}', custo_opp)
    w(f'H{r}', fechado)

# ── GOOGLE ADS — TOTAIS ────────────────────────────────────────
w('F2',  [GOOGLE_INVESTIMENTO])
w('F4',  [GOOGLE_IMPRESSOES])
w('G5',  [GOOGLE_CPM])
w('F6',  [GOOGLE_CLIQUES])
w('G7',  [GOOGLE_CTR_DECIMAL])  # ex: 0.131 para 13,1%
w('F8',  [GOOGLE_CONVERSOES])
w('F10', [GOOGLE_OPPS])

# ── SALESFORCE — Google por estágio ───────────────────────────
w('F16', [SF_GOOGLE_AGUARDANDO])
w('F17', [SF_GOOGLE_CONTATO])
w('F18', [SF_GOOGLE_PERDIDO])
w('F19', [SF_GOOGLE_FECHADO])
w('F20', [SF_GOOGLE_PROPOSTA])
w('F21', [SF_GOOGLE_NOVA])
w('F22', [SF_GOOGLE_STANDBY])
w('F23', [SF_GOOGLE_GANHO_NI])
w('F24', [SF_GOOGLE_TOTAL])

# ── GOOGLE CAMPANHAS (linha 43+) ───────────────────────────────
# Limpar intervalo antes de gravar
ws.batch_clear(['A43:H60'])

google_campanhas = [
    # (nome_curto, invest, conv, cpl_ou_None, opps_ou_None, custo_opp_ou_None, fechado_ou_None)
    # SUBSTITUIR PELAS LINHAS REAIS — uma tupla por campanha
]
for i, (nome, invest, conv, cpl, opps, custo_opp, fechado) in enumerate(google_campanhas):
    r = 43 + i
    w(f'A{r}', nome)
    w(f'C{r}', invest)
    w(f'D{r}', conv)
    w(f'E{r}', cpl)
    w(f'F{r}', opps)
    w(f'G{r}', custo_opp)
    w(f'H{r}', fechado)

print('Planilha atualizada com sucesso.')
```

### Mapeamento de Células

| Dado | Célula | Dado | Célula |
|---|---|---|---|
| Meta — Investimento | B2 | Google — Investimento | F2 |
| Meta — Impressões | B4 | Google — Impressões | F4 |
| Meta — CPM | C5 | Google — CPM | G5 |
| Meta — Cliques no Link | B6 | Google — Cliques no Link | F6 |
| Meta — CTR Link | C7 | Google — CTR Link | G7 |
| Meta — Leads | B8 | Google — Conversões | F8 |
| Meta — Oportunidades | B10 | Google — Oportunidades | F10 |
| SF Meta — Aguardando Resposta | B16 | SF Google — Aguardando Resposta | F16 |
| SF Meta — Contato Realizado | B17 | SF Google — Contato Realizado | F17 |
| SF Meta — Perdido | B18 | SF Google — Perdido | F18 |
| SF Meta — Fechado (Ganho) | B19 | SF Google — Fechado (Ganho) | F19 |
| SF Meta — Proposta Enviada | B20 | SF Google — Proposta Enviada | F20 |
| SF Meta — Nova | B21 | SF Google — Nova | F21 |
| SF Meta — Standy-By | B22 | SF Google — Standy-By | F22 |
| SF Meta — Ganho não Identificado | B23 | SF Google — Ganho não Identificado | F23 |
| SF Meta — Total | B24 | SF Google — Total | F24 |
| Meta Camp. — Campanha | B29+ | Google Camp. — Campanha | B43+ |
| Meta Camp. — Invest. | C29+ | Google Camp. — Invest. | C43+ |
| Meta Camp. — Leads | D29+ | Google Camp. — Conversões | D43+ |
| Meta Camp. — CPL | E29+ | Google Camp. — CPL | E43+ |
| Meta Camp. — Opps | F29+ | Google Camp. — Opps | F43+ |
| Meta Camp. — Custo/Opp | G29+ | Google Camp. — Custo/Opp | G43+ |
| Meta Camp. — Fechado | H29+ | Google Camp. — Fechado | H43+ |

---

## Pontos de Atenção

- **Filtro [LEADS] no Meta:** aplicado **localmente** após retorno da API. Campanhas sem `[LEADS]` no nome são excluídas dos totais e da tabela. Exemplos de campanhas excluídas: `[VISITAS NO PERFIL]`, `[SEGUIDORES]`.
- **CPM Google:** calcular localmente pois `search_search` não retorna CPM diretamente. Formula: `(cost_micros/1e6) / impressions * 1000`.
- **CTR Google:** `metrics.ctr` já vem como ratio (ex: `0.0688`). Multiplicar por 100 para exibir como `%`.
- **Conversões Google:** podem vir com casas decimais por janela de atribuição. Arredondar para inteiro.
- **Canal pago (Meta/Google):** vem do modelo **cpc + cruzamento** da fundação (`docs/fundacao-dados.md`), não de listas de `UtmSou__c`. Rodar cada query 2x (`[FILTRO_META]` / `[FILTRO_GOOGLE]`).
- **Distribuição por estágio:** montada sobre `CreatedDate` (contrato das células desta planilha) — **exceção** ao modelo de duas datas, que se aplica ao reporte semanal. `Fechado` = `StageName` "Fechado"; "Ganho não Identificado" contabiliza como ganho (ver `WON_CLAUSE` da fundação).
- **Oportunidades Fechadas no cabeçalho:** usar o total da coluna Google/Meta da linha `Fechado` da tabela de estágios.
