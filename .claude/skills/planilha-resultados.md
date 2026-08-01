---
name: planilha-resultados
description: Coleta e apresenta dados consolidados de Mídia Paga da Caveo (Meta Ads [LEADS] + Google Ads + Salesforce CRM) para o período do mês atual de 01 até D-1, segmentado por Médico e Formando. Entrega funil Investimento→Leads (Registro Concluído)→MQL Opp→SQL Proposta Enviada→Fechamento por segmento×plataforma, visão por estágio e breakdown por campanha. Use quando precisar do relatório de performance de mídia paga.
---

# Skill: Planilha de Resultados — Caveo Mídia Paga

Coleta e consolida dados de Meta Ads, Google Ads e Salesforce para o período do mês corrente
(dia 01 até D-1), segmenta por **Médico** e **Formando**, e grava na
planilha "Relação de Leads".

## Contas e planilha

| Recurso | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` (Caveo App) |
| Google Ads | `3921127876` (Caveo Tecnologia) |
| Salesforce | `caveo.my.salesforce.com` |
| Planilha | `169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw`, aba `Relação de Leads` |
| Auth Sheets | `.claude/sheets_credentials.json` (service account `reporte-ka-sheets@caveo-496716.iam.gserviceaccount.com`) |

## Fundação (LER ANTES DE QUALQUER SOQL)

O filtro de **canal pago** (Meta/Google) usa o modelo **cpc + cruzamento** de
`docs/fundacao-dados.md` (seção "Fragmentos SOQL prontos"), com fuso `-03:00`.
NÃO reescrever listas de `UtmSou__c` aqui. Segmento (Médico/Formando) usa
`classify_contratante` (fundação §4, `TipCte__c`) — **sempre** `from segments
import classify_contratante` (`scripts/acompanhamento_diario/segments.py`);
nunca aplicar a regra de cabeça. Opps que classificam como `"revalida"` ou
`None` são descartadas — não aparecem nesta skill. MQL/SQL cumulativo usa
`QUALIFICATION_RULES` (fundação §7) via `from qualification import mql_day,
sql_day` (`scripts/acompanhamento_diario/qualification.py`). Campanha sem tag
de segmento no nome conta 100% como Médico via `from segments import
allocate` (fundação §8 é nota histórica agora — mídia paga mira só Médico,
sem rateio institucional). NÃO reescrever essas regras aqui — importar
sempre dos módulos.

## Estrutura da planilha "Relação de Leads"

A aba tem 3 blocos verticais. O bloco **Geral** (linhas 1-26) é **100% fórmula**
(`=Médico+Formando` célula a célula) — esta skill **nunca escreve nele**. Só os
blocos **MÉDICO** (linhas 28-54) e **FORMANDO** (linhas 56-82) recebem dados
desta skill. Cada bloco tem colunas Meta Ads (B) e Google Ads (F) com o funil
Investimento → Leads → MQL Opp → SQL Proposta Enviada → Fechamento, seguido
da tabela "Estágio | Oportunidades | %".

Dentro de cada bloco, **CPL, T Conv., T Oport., T SQL, T Fechamento., a
coluna "%" da tabela de estágio e a linha TOTAL são fórmulas da própria
planilha** — nunca escrever nessas células (ver mapeamento completo em
`scripts/planilha_resultados/sheet.py`, `COLS`/`STAGE_ROWS`). **CPM e CTR são
valores estáticos** (sem fórmula) — a skill precisa calculá-los e gravá-los.

A partir da **linha 85** (área em branco, sem cabeçalho pré-existente) vai a
relação de campanhas: um bloco para Meta Ads (linhas 85-105) e, mais abaixo,
um bloco para Google Ads (linhas 108-128) — ver Fase 4.

---

## Fase 0 — Calcular Período

Calcular automaticamente sem perguntar ao usuário:

- **START** = primeiro dia do mês corrente → `YYYY-MM-01`
- **END** = hoje − 1 dia → `YYYY-MM-DD`

Informar o período ao usuário em uma linha antes de iniciar a coleta:
```
Coletando dados de [START] a [END]...
```

O escopo temporal é **coorte por `CreatedDate`**: o conjunto de oportunidades
é o das opps **criadas** no período; MQL/SQL/Fechamento avaliam o status
dessas mesmas opps **até hoje** (cumulativo — uma opp criada dia 3 e que só
chegou a "Proposta Enviada" dia 20 ainda conta).

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
- Link Clicks = array `actions` → objeto com `action_type = "link_click"` → `value`
- **Leads = array `actions` → objeto com `action_type = "complete_registration"` → `value`**
  (fallback: `offsite_conversion.fb_pixel_complete_registration` se `complete_registration`
  não vier na resposta). **"Registro Concluído" é a conversão principal — não usar
  `action_type = "lead"` nem `onsite_web_lead`.**

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

Para cada campanha: Investimento = `cost_micros`/1.000.000; Impressões =
`metrics.impressions`; Cliques = `metrics.clicks`; Conversões =
`metrics.conversions` (arredondar para inteiro no fim, não por campanha).

### 1C. Salesforce — Oportunidades (linhas cruas, sem agregação)

**Ferramenta:** `mcp__salesforce-mcp__salesforce_query` — rodar 2x (`[FILTRO_META]` / `[FILTRO_GOOGLE]` da fundação):

```sql
SELECT Id, UtmCam__c, StageName, TipCte__c
FROM Opportunity
WHERE CreatedDate >= [START]T00:00:00-03:00
  AND CreatedDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] | [FILTRO_GOOGLE])
```

Não agregar em SOQL — trazer as linhas crus e classificar/agrupar na Fase 2
(`SF_OPPS`, tag `platform: "meta"|"google"` por qual das duas rodadas a linha veio).
Esta única query alimenta: tabela de estágio por segmento e breakdown por
campanha (Opps/Fechado).

> **Matching campanha↔UtmCam (Google):** no Google, `UtmCam__c` guarda um
> **código interno**, não o nome da campanha — precisa mapear antes de
> cruzar com `GOOGLE_CAMPAIGNS` (1B). Mapeamento atual (ajustar se a conta
> criar/renomear campanha):
> ```python
> GOOGLE_UTMCAM_ALIAS = {
>     "institucional": "BOO - [Search] - [Max Conv] - Institucional",
>     "cnpj_medico": "BOO - [RF] [Search] [Max Conv] - Cnpj médico",
>     "pmax_plataforma_financeira_medicopj_2": "BOO - [MM] [Pmax] [Fundo] Plataforma Médico PJ - Novo",
>     "search_MM": "BOO - [MM] [Search] - [Max Conv] - Persona Médico Maduro",
> }
> ```
> Sem esse remapeamento, **toda** a tabela de campanhas Google fica com
> Opps/Custo-Opp/Fechado em `—` (nenhum match) — sempre aplicar o alias
> **antes** de montar `camp_tally`. No Meta o `UtmCam__c`
> já é o nome exato da campanha — não precisa de alias. Tags sem mapeamento
> conhecido (`contabilidade_nivel_brasil`, `emita_notas_sem_problemas`,
> `cnpj2` no período de referência) não têm campanha ativa correspondente —
> deixar sem match, não adivinhar.

### 1D. Salesforce — Histórico (para MQL/SQL cumulativo)

**Ferramenta:** `mcp__salesforce-mcp__salesforce_query` — rodar 2x (`[FILTRO_META]` / `[FILTRO_GOOGLE]`):

```sql
SELECT OpportunityId, StageName, CreatedDate,
       Opportunity.TipCte__c, Opportunity.IsWon
FROM OpportunityHistory
WHERE Opportunity.CreatedDate >= [START]T00:00:00-03:00
  AND Opportunity.CreatedDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] | [FILTRO_GOOGLE])
ORDER BY OpportunityId, CreatedDate
```

> **Atenção — prefixo `Opportunity.` no filtro:** `OpportunityHistory` não
> tem `UtmMed__c`/`UtmSou__c`/`fbc__c`/`fbclid__c`/`gclid__c`/`gbraid__c`
> como campos próprios — são campos do objeto pai. Ao montar
> `[FILTRO_META]`/`[FILTRO_GOOGLE]` **nesta query**, prefixar cada um desses
> campos com `Opportunity.` (ex.: `Opportunity.UtmMed__c LIKE '%cpc%'`), ao
> contrário da 1C (onde a query é direto em `Opportunity` e o fragmento da
> fundação é usado literal, sem prefixo). Sem o prefixo o Salesforce devolve
> `INVALID_FIELD` ("No such column ... on entity 'OpportunityHistory'").

Trazer linhas cruas (`SF_HISTORY_RAW`, tag `platform`) — o agrupamento por
`OpportunityId` e o cálculo de `mql_day`/`sql_day` acontecem na Fase 2, via
`qualification.py` (mesma regra de `acompanhamento-diario-caveo`: cumulativo,
"Ganho também conta").

---

## Fase 2 — Cálculo (script Python via Bash, usando os helpers)

Construir e rodar com o **`python3` do sistema** o script abaixo, preenchendo
`META_CAMPAIGNS`, `GOOGLE_CAMPAIGNS`, `SF_OPPS`, `SF_HISTORY_RAW` com os dados
reais coletados na Fase 1:

```python
import sys
sys.path.insert(0, 'scripts/acompanhamento_diario')
from segments import allocate, classify_contratante
from qualification import mql_day, sql_day
sys.path.insert(0, 'scripts/planilha_resultados')
from sheet import cell_updates, write_updates
import gspread
from google.oauth2.service_account import Credentials
from collections import defaultdict

# --- Dados brutos coletados na Fase 1 ---
# META_CAMPAIGNS: campanhas [LEADS] (1A). GOOGLE_CAMPAIGNS: campanhas ENABLED (1B).
META_CAMPAIGNS = [
    # {"name": str, "spend": float, "impressions": int, "clicks": int, "leads": float}
]
GOOGLE_CAMPAIGNS = [
    # {"name": str, "spend": float, "impressions": int, "clicks": int, "conversions": float}
]
# SF_OPPS: uma linha por Opportunity (1C). No Google, "utmcam" já deve vir
# remapeado pelo GOOGLE_UTMCAM_ALIAS (ver 1C) — nunca o código interno bruto.
SF_OPPS = [
    # {"platform": "meta"|"google", "utmcam": str|None, "stage": str,
    #  "tipcte": str|None}
]
# SF_HISTORY_RAW: uma linha por transição de OpportunityHistory (1D)
SF_HISTORY_RAW = [
    # {"platform": "meta"|"google", "opp_id": str, "stage": str, "date": str,
    #  "is_won": bool, "tipcte": str|None}
]

WON_STAGES = ("Fechado", "Ganho não Identificado")
STAGE_LABELS = {  # StageName (SF) -> rótulo da tabela de estágio da planilha
    "Aguardando Resposta": "Aguardando Resposta",
    "Contato Realizado": "Contato Realizado",
    "Perdido": "Perdido",
    "Fechado": "Fechado Ganho",
    "Proposta Enviada": "Proposta Enviada",
    "Nova": "Nova",
    "Standy-By": "Standy-By",
    "Stand By": "Standy-By",
    "Ganho não Identificado": "Ganho não Identificado",
}

# --- 1. Classificar oportunidades (1C) por segmento; descartar None (TipCte__c
#     vazio) e "revalida" (não aparece nesta skill) do funil segmentado. O
#     camp_tally (total por campanha) continua contando tudo que classificou. ---
stage_tally = {p: {"medico": defaultdict(int), "formando": defaultdict(int)} for p in ("meta", "google")}
camp_tally = {p: defaultdict(lambda: {"opps": 0, "fechado": 0}) for p in ("meta", "google")}

for o in SF_OPPS:
    seg = classify_contratante(o["tipcte"])
    if seg is None:
        continue
    if o["utmcam"]:
        c = camp_tally[o["platform"]][o["utmcam"]]
        c["opps"] += 1
        if o["stage"] in WON_STAGES:
            c["fechado"] += 1
    if seg == "revalida":
        continue
    stage_tally[o["platform"]][seg][o["stage"]] += 1

# --- 2. MQL/SQL cumulativo (1D) por segmento ---
by_opp = defaultdict(list)
for h in SF_HISTORY_RAW:
    by_opp[(h["platform"], h["opp_id"])].append(h)

mql_count = {p: {"medico": 0, "formando": 0} for p in ("meta", "google")}
sql_count = {p: {"medico": 0, "formando": 0} for p in ("meta", "google")}

for (platform, opp_id), rows in by_opp.items():
    seg = classify_contratante(rows[0]["tipcte"])
    if seg not in ("medico", "formando"):
        continue
    history = [{"stage": r["stage"], "date": r["date"]} for r in rows]
    is_won = any(r["is_won"] or r["stage"] == "Ganho não Identificado" for r in rows)
    if mql_day(history, is_won) is not None:
        mql_count[platform][seg] += 1
    if sql_day(history, is_won) is not None:
        sql_count[platform][seg] += 1

# --- 3. Campanha taggeada -> 100% no segmento da tag; institucional (sem
#     tag) -> 100% Médico, sem rateio (mídia paga mira só Médico) ---
def split_campaigns(campaigns, lead_key):
    out = {"medico": {"spend": 0.0, "impressions": 0.0, "clicks": 0.0, "leads": 0.0},
           "formando": {"spend": 0.0, "impressions": 0.0, "clicks": 0.0, "leads": 0.0}}
    for c in campaigns:
        a_money = allocate(c["name"], c["spend"], c[lead_key])
        a_vol = allocate(c["name"], c["impressions"], c["clicks"])
        for seg in ("medico", "formando"):
            out[seg]["spend"] += a_money[seg]["spend"]
            out[seg]["leads"] += a_money[seg]["leads"]
            out[seg]["impressions"] += a_vol[seg]["spend"]
            out[seg]["clicks"] += a_vol[seg]["leads"]
    return out

meta_split = split_campaigns(META_CAMPAIGNS, "leads")
google_split = split_campaigns(GOOGLE_CAMPAIGNS, "conversions")

# --- 4. Montar métricas finais por segmento ---
all_updates = {}
preview = {}
for seg in ("medico", "formando"):
    stages = {}
    for platform in ("meta", "google"):
        by_label = defaultdict(int)
        for stage_name, qtd in stage_tally[platform][seg].items():
            label = STAGE_LABELS.get(stage_name)
            if label:
                by_label[label] += qtd
        stages[platform] = dict(by_label)
    fechamento_meta = stages["meta"].get("Fechado Ganho", 0) + stages["meta"].get("Ganho não Identificado", 0)
    fechamento_google = stages["google"].get("Fechado Ganho", 0) + stages["google"].get("Ganho não Identificado", 0)

    m_spend = round(meta_split[seg]["spend"], 2)
    m_impr = round(meta_split[seg]["impressions"])
    m_clicks = round(meta_split[seg]["clicks"])
    m_leads = round(meta_split[seg]["leads"])
    g_spend = round(google_split[seg]["spend"], 2)
    g_impr = round(google_split[seg]["impressions"])
    g_clicks = round(google_split[seg]["clicks"])
    g_leads = round(google_split[seg]["leads"])

    metrics = {
        "invest_meta": m_spend, "impressoes_meta": m_impr,
        "cpm_meta": round((m_spend / m_impr) * 1000, 2) if m_impr else 0,
        "clicks_meta": m_clicks, "ctr_meta": round(m_clicks / m_impr, 4) if m_impr else 0,
        "leads_meta": m_leads, "mql_meta": mql_count["meta"][seg],
        "sql_meta": sql_count["meta"][seg], "fechamento_meta": fechamento_meta,
        "invest_google": g_spend, "impressoes_google": g_impr,
        "cpm_google": round((g_spend / g_impr) * 1000, 2) if g_impr else 0,
        "clicks_google": g_clicks, "ctr_google": round(g_clicks / g_impr, 4) if g_impr else 0,
        "leads_google": g_leads, "mql_google": mql_count["google"][seg],
        "sql_google": sql_count["google"][seg], "fechamento_google": fechamento_google,
    }
    preview[seg] = {"metrics": metrics, "stages": stages}
    for a1, val in cell_updates(seg, metrics, stages):
        all_updates[a1] = val

# --- PREVIEW (imprimir antes de gravar) ---
for seg, data in preview.items():
    print(f"\n=== {seg.upper()} ===")
    print(data["metrics"])
    print(data["stages"])

# --- CAMPANHAS (tabela informativa por plataforma, não segmentada — Fase 4) ---
def campaign_rows(campaigns, platform, lead_key):
    rows = []
    for c in campaigns:
        t = camp_tally[platform].get(c["name"], {"opps": 0, "fechado": 0})
        leads = round(c[lead_key])
        cpl = round(c["spend"] / leads, 2) if leads else None
        opps = t["opps"] or None
        custo_opp = round(c["spend"] / t["opps"], 2) if t["opps"] else None
        fechado = t["fechado"] if t["opps"] else None
        rows.append((c["name"], round(c["spend"], 2), leads, cpl, opps, custo_opp, fechado))
    return rows

meta_campaign_rows = campaign_rows(META_CAMPAIGNS, "meta", "leads")
google_campaign_rows = campaign_rows(GOOGLE_CAMPAIGNS, "google", "conversions")

# --- GRAVAÇÃO (só após confirmação do usuário na Fase 4) ---
def gravar():
    creds = Credentials.from_service_account_file(
        '.claude/sheets_credentials.json',
        scopes=['https://www.googleapis.com/auth/spreadsheets'])
    ws = gspread.authorize(creds).open_by_key(
        '169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw').worksheet('Relação de Leads')

    write_updates(ws, list(all_updates.items()))

    ws.batch_clear(['A85:G105'])
    ws.update(values=[["Campanha", "Invest.", "Leads", "CPL", "Opps", "Custo/Opp", "Fechado"]], range_name='A85:G85')
    for i, row in enumerate(meta_campaign_rows):
        r = 86 + i
        ws.update(values=[[v if v is not None else '' for v in row]], range_name=f'A{r}:G{r}')

    ws.batch_clear(['A108:G128'])
    ws.update(values=[["Campanha", "Invest.", "Conv.", "CPL", "Opps", "Custo/Opp", "Fechado"]], range_name='A108:G108')
    for i, row in enumerate(google_campaign_rows):
        r = 109 + i
        ws.update(values=[[v if v is not None else '' for v in row]], range_name=f'A{r}:G{r}')

    print(f"Gravadas {len(all_updates)} células de funil + "
          f"{len(meta_campaign_rows) + len(google_campaign_rows)} linhas de campanha.")
```

---

## Fase 3 — Apresentação

Apresentar ao usuário, por segmento (Médico primeiro, depois Formando):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MÍDIA PAGA — CAVEO | [MÊS/ANO] ([START] – [END])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MÉDICO
┌──────────────────────────┬──────────────┬──────────────┐
│                          │ Meta Ads     │ Google Ads   │
├──────────────────────────┼──────────────┼──────────────┤
│ Investimento             │ R$ X.XXX,XX  │ R$ X.XXX,XX  │
│ Impressões               │ XXX.XXX      │ XX.XXX       │
│ CPM                      │ R$ XX,XX     │ R$ XXX,XX    │
│ Cliques no Link          │ X.XXX        │ X.XXX        │
│ CTR Link                 │ X,X%         │ X,X%         │
│ Leads (Registro Concl.)  │ XXX          │ XXX          │
│ MQL Opp (cumulativo)     │ XX           │ XX           │
│ SQL Proposta Enviada     │ XX           │ XX           │
│ Fechamento               │ XX           │ XX           │
└──────────────────────────┴──────────────┴──────────────┘

Estágio (Médico)                Meta Ads   Google Ads
Aguardando Resposta              XX         XX
Contato Realizado                XX         XX
Perdido                          XX         XX
Fechado Ganho                    XX         XX
Proposta Enviada                 XX         XX
Nova                             XX         XX
Standy-By                        XX         XX
Ganho não Identificado           XX         XX

FORMANDO
[mesma estrutura acima]

CAMPANHAS — META ADS (apenas [LEADS])
┌───────────────────────────┬──────────┬───────┬──────────┬──────┬──────────┬─────────┐
│ Campanha                  │ Invest.  │ Leads │ CPL      │ Opps │ Custo/Opp│ Fechado │
├───────────────────────────┼──────────┼───────┼──────────┼──────┼──────────┼─────────┤
│ ...                       │ ...      │ ...   │ ...      │ ...  │ ...      │ ...     │
└───────────────────────────┴──────────┴───────┴──────────┴──────┴──────────┴─────────┘

CAMPANHAS — GOOGLE ADS
┌───────────────────────────┬──────────┬───────┬──────────┬──────┬──────────┬─────────┐
│ Campanha                  │ Invest.  │ Conv. │ CPL      │ Opps │ Custo/Opp│ Fechado │
├───────────────────────────┼──────────┼───────┼──────────┼──────┼──────────┼─────────┤
│ ...                       │ ...      │ ...   │ ...      │ ...  │ ...      │ ...     │
└───────────────────────────┴──────────┴───────┴──────────┴──────┴──────────┴─────────┘
```

### Regras de formatação

- Valores monetários: `R$ 1.274,76`. Percentuais: uma casa decimal (`3,1%`).
- Nomes de campanha: suprimir `[BOO]`; manter tags de funil (`[RF]`, `[MM]`,
  `[FUNDO]`, `[MEIO]`, `[LEADS]`) e o título descritivo.
- CPL/Custo-Opp com denominador 0: exibir `—`.

Após apresentar, perguntar:
```
Deseja gravar os dados na planilha "Relação de Leads"? (responda sim para confirmar)
```
Se confirmado, chamar `gravar()` (Fase 2).

---

## Fase 4 — Mapeamento de Células (referência)

Ver `scripts/planilha_resultados/sheet.py` (`COLS`, `STAGE_ROWS`,
`BLOCK_BASE`) para o mapeamento autoritativo — não reescrever aqui. Resumo:

| Bloco | Linhas do funil (Invest./Impr./CPM/Clicks/CTR/Leads/MQL/SQL/Fechamento) | Linhas de estágio |
|---|---|---|
| MÉDICO | 30/32/33/34/35/36/38/40/42 | 46-53 |
| FORMANDO | 58/60/61/62/63/64/66/68/70 | 74-81 |

Coluna B = Meta Ads, coluna F = Google Ads (dentro de cada bloco). O bloco
Geral (linhas 1-26, coluna I/J) é fórmula — nunca gravar nele.

Campanhas: Meta Ads em `A85:G105` (cabeçalho em 85, dados 86+); Google Ads em
`A108:G128` (cabeçalho em 108, dados 109+). Limpar o intervalo antes de
regravar (`batch_clear`) para não deixar linhas de execuções anteriores.

---

## Pontos de Atenção

- **Leads Meta = "Registro Concluído"** (`action_type = "complete_registration"`,
  fallback `offsite_conversion.fb_pixel_complete_registration`). Não usar
  `lead`/`onsite_web_lead` — são o formulário nativo do Meta, não a conversão
  principal do pixel.
- **MQL Opp / SQL Proposta Enviada são cumulativos**, via `OpportunityHistory`
  + `qualification.py` (fundação §7: "Ganho também conta") — **não** são o
  mesmo número que a linha "Proposta Enviada" da tabela de estágio (que é
  snapshot do `StageName` atual). Uma opp que passou por Proposta Enviada e
  depois fechou ou foi perdida conta em SQL, mas não aparece mais como
  "Proposta Enviada" na tabela de estágio.
- **Fechamento = Fechado Ganho + Ganho não Identificado** da própria tabela de
  estágio do bloco (mesma coorte por `CreatedDate`, sem query separada) — é
  o `WON_CLAUSE` da fundação por definição, já que ambos os estágios são
  terminais (o snapshot atual de uma opp ganha nunca reverte).
- **Coorte por `CreatedDate`, status até hoje:** todo o bloco (Médico/Formando) usa o
  mesmo filtro temporal — o conjunto de opps é definido pela criação no
  período; MQL/SQL/Fechamento avaliam o status dessas opps **como estão
  hoje**, não no dia em que cruzaram o gate. Isto é uma escolha deliberada
  (mais simples que o modelo de duas datas da fundação, usado no reporte
  semanal) — se os números precisarem reconciliar com um relatório baseado em
  `LastStageChangeDate`, eles vão divergir por desenho.
- **Bloco Geral nunca é gravado** — é 100% fórmula (`=Médico+Formando`) na própria
  planilha; gravar nele quebra a soma.
- **CPM e CTR são valores estáticos** nos blocos Médico/Formando (ao contrário do bloco
  Geral, onde são fórmula) — sempre recalcular e gravar, nunca assumir que a
  planilha atualiza sozinha.
- **Filtro [LEADS] no Meta:** aplicado localmente após retorno da API.
  Campanhas sem `[LEADS]` no nome (ex.: `[VISITAS NO PERFIL]`) são excluídas.
- **Campanha institucional (sem tag `[RF]`/`[MM]` legada):** spend,
  impressões, cliques e leads contam 100% como Médico — mídia paga mira só
  Médico, sem rateio entre segmentos (fundação §8 é nota histórica; ver
  `segments.classify_segment`/`allocate`).
- **Tabela de campanhas (linha 85+) não é segmentada** por Médico/Formando —
  mostra o total da campanha (Opps/Fechado somam os dois segmentos), já que
  o nome da campanha normalmente já carrega a tag de segmento.
- **Conversões Google:** podem vir com casas decimais por janela de
  atribuição — arredondar para inteiro no fim (por campanha, não somando
  decimais já truncados).
