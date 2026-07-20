---
name: acompanhamento-diario-caveo
description: Coleta métricas diárias da Caveo (investimento, leads, MQL, SQL, fechamentos) de Meta Ads + Google Ads + Salesforce, por segmento (Médico Maduro / Recém-Formado), e grava na planilha "Resultados Mês Atual". Cadência diária append-only (sem retroativo). Use para atualizar o acompanhamento diário de captação e funil.
---

# Skill: Acompanhamento Diário — Caveo

Coleta diária por **dia × segmento (MM/RF) × canal (Meta/Google)** e grava na
planilha de acompanhamento. **Append-only: nunca reescreve dias anteriores.**

## Contas e planilha

| Recurso | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` |
| Google Ads | `3921127876` |
| Salesforce | `caveo.my.salesforce.com` |
| Planilha | `19gElL0pmUO3yPZZG0-5E1ym61wHbQM5-JohK5_wPjj4`, aba `Resultados Mês Atual` |
| Auth Sheets | `.claude/sheets_credentials.json` (service account) |

## Fundação (LER ANTES DE QUALQUER SOQL)

Canal pago (Meta/Google) usa o modelo **cpc + cruzamento** de
`docs/fundacao-dados.md` (seção "Fragmentos SOQL prontos"), fuso `-03:00`. MQL/SQL
usam `QUALIFICATION_RULES` (seção 7); alocação de segmento usa `SEGMENT_ALLOCATION`
(seção 8). Segmento por `TipCte__c` (seção 4). NÃO reescrever essas listas aqui.

## Bucket temporal (regra de ouro — sem retroativo)

- Investimento / Leads → **dia do gasto** (plataforma).
- MQL / SQL → **dia da primeira transição** que cruza o gate (`OpportunityHistory`).
- Fechamento → **`LastStageChangeDate`** (dia do fechamento).

## Fase 0 — Período

- START = `YYYY-MM-01` (mês corrente). END = D-1 (ontem). Aceita override:
  `$ARGUMENTS` pode conter uma data (`YYYY-MM-DD`) ou intervalo (`YYYY-MM-DD a YYYY-MM-DD`).
- Informar: `Coletando de [START] a [END]…`

## Fase 1 — Coleta (paralela)

### 1A. Meta — spend + registro concluído por campanha/dia
`mcp__meta-ads-mcp__get_insights` com `object_id="act_438086148409254"`,
`level="campaign"`, `time_range={"since": START, "until": END}`, `time_increment=1`.
Filtrar campanhas com `[LEADS]`. Por campanha/dia extrair: `spend`; e o `value` do
objeto de `actions` com `action_type = "complete_registration"` (ou
`offsite_conversion.fb_pixel_complete_registration`) → **leads Meta**.

### 1B. Google — cost + conversões por campanha/dia
`mcp__google-ads-mcp__search_search` com `customer_id="3921127876"`,
`resource="campaign"`, fields `["campaign.name","segments.date","metrics.cost_micros","metrics.conversions"]`,
conditions `["segments.date BETWEEN '[START]' AND '[END]'"]`. Por campanha/dia:
invest = `cost_micros`/1e6; **leads Google** = `conversions` (total, arredondar no fim).

### 1C. Salesforce — histórico p/ MQL/SQL (por canal)
Para `[FILTRO_META]` e `[FILTRO_GOOGLE]` (fragmentos cpc+cruzamento da fundação),
com lookback de 3 meses antes de START (para pegar opps que progridem tarde):
```sql
SELECT OpportunityId, StageName, CreatedDate,
       Opportunity.TipCte__c, Opportunity.IsWon
FROM OpportunityHistory
WHERE Opportunity.CreatedDate >= [START-3meses]T00:00:00-03:00
  AND Opportunity.CreatedDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META | FILTRO_GOOGLE])
ORDER BY OpportunityId, CreatedDate
```
Agrupar as linhas por `OpportunityId` → `history=[{stage, date}]` (date = dia de
`CreatedDate` da linha de histórico, em `-03:00`), `is_won = IsWon OR StageName
contém "Ganho não Identificado"`, `segment` por `TipCte__c`.

### 1D. Salesforce — fechamentos por dia/segmento (mídia paga)
```sql
SELECT TipCte__c, LastStageChangeDate
FROM Opportunity
WHERE LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
  AND [WON_CLAUSE]
```

### 1E. Salesforce — opps por campanha/dia/segmento (para o rateio institucional)
```sql
SELECT UtmCam__c, TipCte__c, CreatedDate
FROM Opportunity
WHERE CreatedDate >= [START]T00:00:00-03:00
  AND CreatedDate <= [END]T23:59:59-03:00
  AND UtmCam__c != null
```
Bucketizar em `{ (utmcam, dia): {mm: n, rf: n} }` (dia em `-03:00`).

> **Matching campanha↔UtmCam:** o rateio casa o nome da campanha da plataforma
> com `UtmCam__c`. No Meta costuma ser idêntico; no Google, campanhas
> institucionais podem ter nome divergente — normalizar (mesmo mapa de
> `planilha-resultados` Fase 2 / `lib/integrations/google.ts`). Sem match, a
> campanha cai no fallback 50/50 e **deve aparecer sinalizada no preview**.

## Fase 2 — Cálculo (script Python via Bash, usando o helper)

Construir e rodar com o **`python3` do sistema** o script abaixo, preenchendo as
estruturas `META_ROWS`, `GOOGLE_ROWS`, `SF_HISTORY`, `SF_CLOSINGS`, `SF_CAMP_OPPS`
com os dados reais coletados:

```python
import sys
sys.path.insert(0, 'scripts/acompanhamento_diario')
from segments import allocate, classify_segment
from qualification import mql_day, sql_day
from sheet import cell_updates, write_updates
import gspread
from google.oauth2.service_account import Credentials
from collections import defaultdict

# START/END já conhecidos; days = [1..N] dentro do período.
# META_ROWS / GOOGLE_ROWS: [{"campaign": str, "day": int, "spend": float, "leads": float}]
# SF_CAMP_OPPS: {(utmcam, day): {"mm": int, "rf": int}}
# SF_HISTORY:  [{"channel": "meta"|"google", "segment": "mm"|"rf",
#               "history": [{"stage","date"}], "is_won": bool}]
# SF_CLOSINGS: [{"segment": "mm"|"rf", "day": int}]

# acc[segment][day] = dict parcial de métricas (chaves de sheet.COLS)
acc = {"mm": defaultdict(dict), "rf": defaultdict(dict)}

def add(seg, day, key, val):
    acc[seg][day][key] = acc[seg][day].get(key, 0) + val

# --- Investimento + Leads (rateio institucional) ---
def opp_share(utmcam, day):
    c = SF_CAMP_OPPS.get((utmcam, day), {"mm": 0, "rf": 0})
    return c["mm"], c["rf"]

fallback_5050 = []  # (campaign, day) institucionais sem opp no dia (gasto rateado 50/50)

for rows, ik, lk in ((META_ROWS, "invest_meta", "leads_meta"),
                     (GOOGLE_ROWS, "invest_google", "leads_google")):
    for r in rows:
        omm, orf = opp_share(r["campaign"], r["day"])
        if classify_segment(r["campaign"]) == "institucional" and (omm + orf) == 0 and r["spend"]:
            fallback_5050.append((r["campaign"], r["day"]))
        a = allocate(r["campaign"], r["spend"], r["leads"], omm, orf)
        for seg in ("mm", "rf"):
            add(seg, r["day"], ik, a[seg]["spend"])
            add(seg, r["day"], lk, a[seg]["leads"])

# --- MQL/SQL pelo dia da transição (bucketiza só o que cai no período) ---
def in_period(d):  # d = "YYYY-MM-DD"
    return d is not None and START <= d <= END
def day_of(d):
    return int(d[8:10])
for o in SF_HISTORY:
    md, sd = mql_day(o["history"], o["is_won"]), sql_day(o["history"], o["is_won"])
    ck = "mql_meta" if o["channel"] == "meta" else "mql_google"
    sk = "sql_meta" if o["channel"] == "meta" else "sql_google"
    if in_period(md): add(o["segment"], day_of(md), ck, 1)
    if in_period(sd): add(o["segment"], day_of(sd), sk, 1)

# --- Fechamentos ---
for c in SF_CLOSINGS:
    add(c["segment"], c["day"], "fechamento", 1)

# --- Arredondar leads (rateio pode gerar fração) ---
for seg in ("mm", "rf"):
    for day, m in acc[seg].items():
        for k in ("leads_meta", "leads_google"):
            if k in m: m[k] = round(m[k])

# --- PREVIEW (imprimir antes de gravar) ---
for seg in ("mm", "rf"):
    print(f"\n=== {seg.upper()} ===")
    for day in sorted(acc[seg]):
        print(day, dict(acc[seg][day]))

if fallback_5050:
    print("\n[!] Institucional em fallback 50/50 (gasto no dia, 0 opps no SF):")
    for camp, day in fallback_5050:
        print(f"    dia {day}: {camp}")

# --- GRAVAÇÃO (só após confirmação do usuário na Fase 3) ---
def gravar():
    creds = Credentials.from_service_account_file(
        '.claude/sheets_credentials.json',
        scopes=['https://www.googleapis.com/auth/spreadsheets'])
    ws = gspread.authorize(creds).open_by_key(
        '19gElL0pmUO3yPZZG0-5E1ym61wHbQM5-JohK5_wPjj4').worksheet('Resultados Mês Atual')
    total = 0
    for seg in ("mm", "rf"):
        for day, m in acc[seg].items():
            total += write_updates(ws, cell_updates(seg, day, m))
    print(f"Gravadas {total} células.")
```

## Fase 3 — Preview e confirmação

Apresentar as tabelas MM e RF (dias × colunas). **Sinalizar** campanhas
institucionais que caíram no fallback 50/50 (0 opps no dia). Perguntar:
```
Gravar estes dias na planilha "Resultados Mês Atual"? (sim para confirmar)
```
Só chamar `gravar()` após "sim". Nunca tocar TOTAL, B/H/N, nem D/J/P/Q.
