---
name: reporte-resultados-ka
description: Coleta dados de Meta Ads (Captação e Awareness), Google Ads e Salesforce para o cliente KA e preenche a planilha de resultados. Use ao rodar o relatório mensal do KA ou quando precisar atualizar os dados de performance consolidados na planilha.
---

# Skill: Reporte de Resultados — KA

Automatiza a coleta de dados de performance e o preenchimento da planilha mensal do cliente KA
a partir de Meta Ads, Google Ads e Salesforce.

## Contas

| Plataforma | Identificador |
|---|---|
| Salesforce | `caveo.my.salesforce.com` |
| Meta Ads | `act_438086148409254` |
| Google Ads | Caveo Tecnologia `3921127876` (MCC `5029399396`) |
| Google Sheets | `169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw` |

## Fonte única de regras (LER ANTES DE QUALQUER SOQL)

O filtro de **canal pago** e os **estágios** vêm de **`docs/fundacao-dados.md`**
(modelo **cpc + cruzamento**, **duas datas**, fuso `-03:00`). NÃO reescrever
listas de `UtmSou__c` aqui. Fechamentos contam por `LastStageChangeDate`
(`WON_CLAUSE` da fundação).

## Quando o usuário pede algo, identifique a fase

| Pedido | Fase |
|---|---|
| "roda o reporte" / "atualiza a planilha" | Todas as fases (0→1→2→3) |
| "coleta os dados" sem gravar | Fase 0 + Fase 1 apenas |
| "grava na planilha" com dados já em mãos | Fase 3 diretamente |
| "qual o período do reporte?" | Fase 0 — confirmar período |

---

## Fase 0 — Confirmar Período

Calcular automaticamente:
- **START** = primeiro dia do mês corrente no formato `YYYY-MM-01`
- **END** = hoje − 1 dia no formato `YYYY-MM-DD`

Apresentar ao usuário para confirmação antes de coletar:
```
Período a coletar: [START] a [END]
Confirma?
```

---

## Fase 1 — Coleta de Dados

Executar as quatro coletas **em paralelo** (uma chamada MCP por bloco).

### 1A. Meta Ads — Captação ([FUNDO] e [MEIO])

**Ferramenta:** `mcp__meta-ads-mcp__get_insights`

Parâmetros-chave:
- `account_id`: `act_438086148409254`
- `level`: `campaign`
- `date_preset`: custom (usar START e END da Fase 0)
- `fields`: `campaign_name,spend,impressions,link_clicks,leads`

Após receber os dados, **filtrar apenas campanhas cujo nome contenha `[FUNDO]` ou `[MEIO]`** (case-insensitive).

Somar os valores filtrados:

| Métrica | Campo API | Variável |
|---|---|---|
| Investimento | `spend` | `meta_captacao_investimento` |
| Impressões | `impressions` | `meta_captacao_impressoes` |
| Clique no Link | `link_clicks` | `meta_captacao_cliques` |
| Leads | `leads` | `meta_captacao_leads` |

### 1B. Meta Ads — Awareness ([TOPO])

**Ferramenta:** `mcp__meta-ads-mcp__get_insights`

Parâmetros-chave:
- `account_id`: `act_438086148409254`
- `level`: `campaign`
- `date_preset`: custom (usar START e END da Fase 0)
- `fields`: `campaign_name,spend,impressions,link_clicks,actions`
- `breakdowns`: `publisher_platform` (para isolar Instagram)

Após receber os dados, **filtrar apenas campanhas cujo nome contenha `[TOPO]`** (case-insensitive).

Para Seguidores: dentro do array `actions`, encontrar o objeto com `action_type = "page_fan_add"` e somar os valores das linhas com `publisher_platform = "instagram"`.

Somar os valores filtrados:

| Métrica | Campo API | Variável |
|---|---|---|
| Investimento | `spend` | `meta_awareness_investimento` |
| Impressões | `impressions` | `meta_awareness_impressoes` |
| Clique no Link | `link_clicks` | `meta_awareness_cliques` |
| Seguidores | `actions[action_type=page_fan_add]` (Instagram) | `meta_awareness_seguidores` |

> **Atenção:** Se a campanha [TOPO] não tiver objetivo "Seguidores de conta do Instagram", `page_fan_add` pode retornar zero ou não aparecer no array `actions`. Reportar `0` nesse caso e sinalizar ao usuário.

### 1C. Google Ads — Performance Max

**Ferramenta:** `mcp__google-ads-mcp__search`

Parâmetros:
- `customer_id`: `3921127876`
- `query`:

```sql
SELECT
  campaign.name,
  campaign.advertising_channel_type,
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions
FROM campaign
WHERE segments.date BETWEEN '[START]' AND '[END]'
  AND campaign.status != 'REMOVED'
  AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
```

Converter `cost_micros` para BRL: `valor / 1_000_000`.

Somar todas as campanhas retornadas:

| Métrica | Campo API | Variável |
|---|---|---|
| Investimento | `metrics.cost_micros / 1e6` | `google_pmax_investimento` |
| Impressões | `metrics.impressions` | `google_pmax_impressoes` |
| Cliques | `metrics.clicks` | `google_pmax_cliques` |
| Conversões | `metrics.conversions` | `google_pmax_conversoes` |

### 1D. Google Ads — Demais Campanhas

**Ferramenta:** `mcp__google-ads-mcp__search`

Parâmetros:
- `customer_id`: `3921127876`
- `query`:

```sql
SELECT
  campaign.name,
  campaign.advertising_channel_type,
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions
FROM campaign
WHERE segments.date BETWEEN '[START]' AND '[END]'
  AND campaign.status != 'REMOVED'
  AND campaign.advertising_channel_type != 'PERFORMANCE_MAX'
```

Converter `cost_micros` para BRL: `valor / 1_000_000`.

Somar todas as campanhas retornadas:

| Métrica | Campo API | Variável |
|---|---|---|
| Investimento | `metrics.cost_micros / 1e6` | `google_outros_investimento` |
| Impressões | `metrics.impressions` | `google_outros_impressoes` |
| Cliques | `metrics.clicks` | `google_outros_cliques` |
| Conversões | `metrics.conversions` | `google_outros_conversoes` |

### 1E. Salesforce — Oportunidades e Fechamentos

**Ferramenta:** `mcp__salesforce-mcp__salesforce_query`

Executar **duas queries**:

> Usar os filtros `[FILTRO_META]` / `[FILTRO_GOOGLE]` (cláusula "cpc OU
> cruzamento" por plataforma) e o `WON_CLAUSE` de `docs/fundacao-dados.md`.

**Query A — Oportunidades criadas (por plataforma, `CreatedDate`):**

```sql
-- rodar 2x: [FILTRO_META] / [FILTRO_GOOGLE]
SELECT COUNT(Id) total
FROM Opportunity
WHERE CreatedDate >= [START]T00:00:00-03:00
  AND CreatedDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META | FILTRO_GOOGLE])
```

**Query B — Fechamentos (ganho, por `LastStageChangeDate` — duas datas):**

```sql
-- rodar 2x: [FILTRO_META] / [FILTRO_GOOGLE]
SELECT COUNT(Id) total
FROM Opportunity
WHERE ([WON_CLAUSE])
  AND LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META | FILTRO_GOOGLE])
```

A partir dos resultados, derivar:

| Variável | Cálculo |
|---|---|
| `sf_meta_oportunidades` | Query A com `[FILTRO_META]` |
| `sf_meta_fechamentos` | Query B com `[FILTRO_META]` |
| `sf_google_oportunidades` | Query A com `[FILTRO_GOOGLE]` |
| `sf_google_fechamentos` | Query B com `[FILTRO_GOOGLE]` |

---

## Fase 2 — Consolidação e Validação

Apresentar o resumo ao usuário antes de gravar:

```
REPORTE KA — [START] a [END]
═══════════════════════════════════════════

META ADS — CAPTAÇÃO ([FUNDO] e [MEIO])
  Investimento:    R$ [meta_captacao_investimento]
  Impressões:      [meta_captacao_impressoes]
  Cliques no Link: [meta_captacao_cliques]
  Leads:           [meta_captacao_leads]

META ADS — AWARENESS ([TOPO])
  Investimento:    R$ [meta_awareness_investimento]
  Impressões:      [meta_awareness_impressoes]
  Cliques no Link: [meta_awareness_cliques]
  Seguidores:      [meta_awareness_seguidores]

GOOGLE ADS — PERFORMANCE MAX
  Investimento:    R$ [google_pmax_investimento]
  Impressões:      [google_pmax_impressoes]
  Cliques:         [google_pmax_cliques]
  Conversões:      [google_pmax_conversoes]

GOOGLE ADS — DEMAIS CAMPANHAS
  Investimento:    R$ [google_outros_investimento]
  Impressões:      [google_outros_impressoes]
  Cliques:         [google_outros_cliques]
  Conversões:      [google_outros_conversoes]

SALESFORCE
  Meta — Oportunidades:  [sf_meta_oportunidades]
  Meta — Fechamentos:    [sf_meta_fechamentos]
  Google — Oportunidades:[sf_google_oportunidades]
  Google — Fechamentos:  [sf_google_fechamentos]

Confirma gravação na planilha?
```

Aguardar confirmação do usuário antes de avançar para a Fase 3.

---

## Fase 3 — Gravação na Planilha

**Planilha:** `169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw`

### Autenticação (service account)

Credenciais: `.claude/sheets_credentials.json`
Conta de serviço: `reporte-ka-sheets@caveo-496716.iam.gserviceaccount.com`

### Script de gravação (Python via Bash)

```python
import gspread
from google.oauth2.service_account import Credentials

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
creds = Credentials.from_service_account_file(
    '.claude/sheets_credentials.json',
    scopes=SCOPES
)
gc = gspread.authorize(creds)
ws = gc.open_by_key('169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw').worksheet('Banco de Dados')

def write_cell(cell, value):
    ws.update(values=[[value]], range_name=cell)

# --- escrita das células ---

# Meta Ads — Awareness
write_cell('A2', meta_awareness_investimento)
write_cell('B2', meta_awareness_impressoes)
write_cell('C2', meta_awareness_cliques)
write_cell('D2', meta_awareness_seguidores)

# Meta Ads — Captação
write_cell('A5', meta_captacao_investimento)
write_cell('B5', meta_captacao_impressoes)
write_cell('C5', meta_captacao_cliques)
write_cell('D5', meta_captacao_leads)

# Google Ads — Demais campanhas
write_cell('A8', google_outros_investimento)
write_cell('B8', google_outros_impressoes)
write_cell('C8', google_outros_cliques)
write_cell('D8', google_outros_conversoes)

# Google Ads — Performance Max

write_cell('A11', google_pmax_investimento)
write_cell('B11', google_pmax_impressoes)
write_cell('C11', google_pmax_cliques)
write_cell('D11', google_pmax_conversoes)

# Salesforce — Meta
write_cell('A13', sf_meta_oportunidades)
write_cell('B13', sf_meta_fechamentos)

# Salesforce — Google
write_cell('A16', sf_google_oportunidades)
write_cell('B16', sf_google_fechamentos)

print('Planilha atualizada.')
```

### Mapeamento de Células

> Preencher junto com o usuário. Cada linha liga uma variável coletada a uma célula da planilha.

| Dado | Variável | Aba | Célula |
|---|---|---|---|
| Investimento Meta Awareness | `meta_awareness_investimento` | Banco de Dados | A2 |
| Impressões Meta Awareness | `meta_awareness_impressoes` | Banco de Dados | B2 |
| Cliques Meta Awareness | `meta_awareness_cliques` | Banco de Dados | C2 |
| Seguidores Meta Awareness | `meta_awareness_seguidores` | Banco de Dados | D2 |
| Investimento Meta Captação | `meta_captacao_investimento` | Banco de Dados | A5 |
| Impressões Meta Captação | `meta_captacao_impressoes` | Banco de Dados | B5 |
| Cliques Meta Captação | `meta_captacao_cliques` | Banco de Dados | C5 |
| Leads Meta Captação | `meta_captacao_leads` | Banco de Dados | D5 |
| Investimento Google Demais | `google_outros_investimento` | Banco de Dados | A8 |
| Impressões Google Demais | `google_outros_impressoes` | Banco de Dados | B8 |
| Cliques Google Demais | `google_outros_cliques` | Banco de Dados | C8 |
| Conversões Google Demais | `google_outros_conversoes` | Banco de Dados | D8 |
| Investimento Google PMax | `google_pmax_investimento` | Banco de Dados | A11 |
| Impressões Google PMax | `google_pmax_impressoes` | Banco de Dados | B11 |
| Cliques Google PMax | `google_pmax_cliques` | Banco de Dados | C11 |
| Conversões Google PMax | `google_pmax_conversoes` | Banco de Dados | D11 |
| Oportunidades Meta (SF) | `sf_meta_oportunidades` | Banco de Dados | A13 |
| Fechamentos Meta (SF) | `sf_meta_fechamentos` | Banco de Dados | B13 |
| Oportunidades Google (SF) | `sf_google_oportunidades` | Banco de Dados | A16 |
| Fechamentos Google (SF) | `sf_google_fechamentos` | Banco de Dados | B16 |

---

## Pontos de atenção

- **Seguidores:** `page_fan_add` agrega Facebook + Instagram. Usar breakdown `publisher_platform=instagram` para isolar. Se a campanha [TOPO] não tiver objetivo de seguidores, o valor será `0`.
- **Filtro de campanhas:** o filtro `[FUNDO]`, `[MEIO]` e `[TOPO]` é feito **localmente** após o retorno da API — não é um filtro de API nativa. Verificar se os nomes das campanhas seguem exatamente esse padrão.
- **Investimento Google:** `cost_micros` deve ser dividido por `1.000.000` para obter BRL.
- **Fechamentos Salesforce:** usar o `WON_CLAUSE` da fundação (`IsWon = true OR StageName = 'Ganho não Identificado'`) por `LastStageChangeDate`, não lista própria de estágios.
- **Canal pago:** `[FILTRO_META]` / `[FILTRO_GOOGLE]` da fundação (cpc + cruzamento), não `LIKE '%...%'` de source.
- **Token gcloud:** o access token tem validade de ~1 hora. Se o script falhar com 401, re-executar `gcloud auth print-access-token`.
- **Escopo gcloud:** confirmar que a conta logada no gcloud tem permissão de edição na planilha. Verificar com `gcloud auth list`.
