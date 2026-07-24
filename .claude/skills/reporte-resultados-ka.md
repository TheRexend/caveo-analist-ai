---
name: reporte-resultados-ka
description: Reporte mensal segmentado por RF e MM da Caveo. Coleta Meta Ads, Google Ads e Salesforce do mês corrente até D-1 e grava os inputs das abas "Mês-a-Mês RF" e "Mês-a-Mês MM" (mídia por bloco + funil MQL/SQL/Vendas/Faturamento). Use para atualizar as abas mensais segmentadas.
---

# Skill: Reporte Mensal Segmentado RF/MM

Coleta **Meta + Google + Salesforce** do mês corrente (dia 1 até D-1), separa por
segmento **RF / MM** e grava os **22 inputs secos** da coluna do mês (Realizado)
nas abas **"Mês-a-Mês RF"** e **"Mês-a-Mês MM"**. Sobrescreve a coluna do mês a
cada rodada (snapshot vivo). As fórmulas derivadas recalculam sozinhas — NUNCA
escrever em célula de fórmula.

## Contas e planilha

| Recurso | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` |
| Google Ads | `3921127876` (MCC `5029399396`) |
| Salesforce | `caveo.my.salesforce.com` |
| Planilha | `169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw` |
| Abas | `Mês-a-Mês RF`, `Mês-a-Mês MM` |
| Auth Sheets | `.claude/sheets_credentials.json` (service account) |

## Fundação (LER ANTES DE QUALQUER SOQL)

Canal pago (cpc + cruzamento), segmento (`TipCte__c` + `Tempo_de_Formado__c`),
MQL/SQL (`QUALIFICATION_RULES`) e ganho (`WON_CLAUSE`) vêm de
`docs/fundacao-dados.md`. Modelo de **duas datas**: MQL/SQL por `CreatedDate`;
Vendas/Faturamento por `LastStageChangeDate`. Fuso `-03:00`. NÃO reescrever listas.

Fragmentos usados (verbatim):

- **PAID:** `((UtmMed__c LIKE '%cpc%') OR ((UtmMed__c = null OR (NOT UtmMed__c LIKE '%cpc%')) AND (fbc__c != null OR fbclid__c != null OR gclid__c != null OR gbraid__c != null)))`
- **WON_CLAUSE:** `(IsWon = true OR StageName = 'Ganho não Identificado')`
- **TIPCTE_RF:** `(TipCte__c IN ('Formando') OR (TipCte__c = 'Médico' AND Tempo_de_Formado__c IN ('Menos de 3 anos','Vai se formar')))`
- **TIPCTE_MM:** `(TipCte__c IN ('Revalida') OR (TipCte__c = 'Médico' AND (NOT Tempo_de_Formado__c IN ('Menos de 3 anos','Vai se formar'))))`

## Universo e blocos

Só campanhas com o marcador **BOO** (`[BOO]` no Meta, `BOO -` no Google → teste
"contém boo"). Blocos (helper `blocks.block_of`): `google_search`,
`google_yt_pmax` (PMax/Display/Video/DemandGen não-topo), `meta_captacao`,
`meta_awareness` (`[TOPO]`), `google_awareness` (`[TOPO]`/DemandGen topo).
Campanha BOO sem tag `[RF]`/`[MM]` (institucional) → rateio por opps
(`alloc.allocate_row`, fallback 50/50).

## Mapa de células (idêntico nas duas abas; `<COL>` = coluna do mês)

| Bloco | invest | impr | clicks | leads/engaj |
|---|---|---|---|---|
| Google Search | 4 | 5 | 6 | 9 (conv.) |
| Google YT/PMax/Display | 12 | 13 | 15 | 18 (conv.) |
| Meta captação | 21 | 22 | 24 | 27 (leads) |
| Meta Awareness | 30 | 31 | — | 33 (engaj.) |
| Google Awareness | 35 | 36 | — | 38 (engaj.) |
| SF | mql=43 | sql=46 | vendas=49 | faturamento=52 |

## Fase 0 — Período

`START` = 1º dia do mês corrente (`YYYY-MM-01`); `END` = D-1 (`YYYY-MM-DD`).
Deriva `ANO`, `MES` de `END`. Informar: `Coletando de [START] a [END]…`.

## Fase 1 — Coleta (paralela)

### 1A. Meta — insights por campanha
`mcp__meta-ads-mcp__get_insights` com `account_id="act_438086148409254"`,
`level="campaign"`, `time_range={"since": START, "until": END}`,
`fields="campaign_name,spend,impressions,actions"`. Por campanha extrair:
`spend`; `impressions`; `link_clicks` = `actions[action_type=link_click].value`;
`leads` = `actions[action_type=lead].value`; `post_engagement` =
`actions[action_type=post_engagement].value` (0 se ausente). Montar `META_ROWS`.

### 1B. Google — por campanha
`mcp__google-ads-mcp__search_search`, `customer_id="3921127876"`,
`resource="campaign"`,
`fields=["campaign.name","campaign.advertising_channel_type","metrics.cost_micros","metrics.impressions","metrics.clicks","metrics.conversions","metrics.engagements"]`,
`conditions=["segments.date BETWEEN '[START]' AND '[END]'","campaign.status != 'REMOVED'"]`.
Por campanha: `cost` = `cost_micros`/1e6; `impressions`; `clicks`; `conversions`;
`engagements` (0 se ausente); `channel_type`. Montar `GOOGLE_ROWS`.

### 1C. SF — MQL/SQL (coorte por `CreatedDate`; rodar 2x: TIPCTE_RF / TIPCTE_MM)
```sql
SELECT OpportunityId, StageName, CreatedDate, Opportunity.IsWon
FROM OpportunityHistory
WHERE Opportunity.CreatedDate >= [START]T00:00:00-03:00
  AND Opportunity.CreatedDate <= [END]T23:59:59-03:00
  AND Opportunity.[PAID]
  AND Opportunity.[TIPCTE_RF | TIPCTE_MM]
ORDER BY OpportunityId, CreatedDate
```
Agrupar por `OpportunityId` → `history=[{stage, date}]` (`date` = dia de
`CreatedDate` da linha), `is_won = IsWon OR StageName contém "Ganho não Identificado"`.
Montar `SF_HISTORY = {"rf":[...], "mm":[...]}`.

### 1D. SF — Vendas/Faturamento (por `LastStageChangeDate`; rodar 2x: RF / MM)
```sql
SELECT COUNT(Id) qtd, SUM(Amount) valor
FROM Opportunity
WHERE [WON_CLAUSE]
  AND LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND [PAID]
  AND [TIPCTE_RF | TIPCTE_MM]
```
`VENDAS = {"rf": qtd, "mm": qtd}`; `FATURAMENTO = {"rf": valor or 0, "mm": valor or 0}`.

### 1E. SF — opps por campanha p/ rateio institucional (rodar 2x: RF / MM)
```sql
SELECT UtmCam__c, COUNT(Id) qtd
FROM Opportunity
WHERE CreatedDate >= [START]T00:00:00-03:00
  AND CreatedDate <= [END]T23:59:59-03:00
  AND UtmCam__c != null
  AND [PAID]
  AND [TIPCTE_RF | TIPCTE_MM]
GROUP BY UtmCam__c
```
Montar `INST_OPPS = {utmcam: {"mm": n, "rf": n}}`. Matching campanha↔UtmCam: no
Meta costuma ser idêntico; no Google institucional pode divergir — sem match, a
campanha cai no fallback 50/50 e é sinalizada no preview.

## Fase 2 — Cálculo (script Python via Bash)

Preencher `ANO, MES, META_ROWS, GOOGLE_ROWS, SF_HISTORY, VENDAS, FATURAMENTO,
INST_OPPS` com os dados reais e rodar com o `python3` do sistema:

```python
import sys
sys.path.insert(0, 'scripts/acompanhamento_diario')
sys.path.insert(0, 'scripts/reporte_ka')
from blocks import block_of
from alloc import allocate_row
from qualification import mql_day, sql_day
from sheet import resolve_realizado_column, col_letter, cell_updates, write_updates
import gspread
from google.oauth2.service_account import Credentials

SHEET_ID = '169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw'
TABS = {"rf": "Mês-a-Mês RF", "mm": "Mês-a-Mês MM"}

# ===== dados da Fase 1 (PREENCHER) =====
# ANO, MES = 2026, 7
# META_ROWS = [{"name","spend","impressions","link_clicks","leads","post_engagement"}]
# GOOGLE_ROWS = [{"name","channel_type","cost","impressions","clicks","conversions","engagements"}]
# SF_HISTORY = {"rf":[{"history":[{"stage","date"}],"is_won":bool}], "mm":[...]}
# VENDAS = {"rf": int, "mm": int}
# FATURAMENTO = {"rf": float, "mm": float}
# INST_OPPS = {utmcam: {"mm": int, "rf": int}}

acc = {"rf": {}, "mm": {}}
def add(seg, block, metrics):
    b = acc[seg].setdefault(block, {})
    for k, v in metrics.items():
        b[k] = b.get(k, 0) + v

fallback_5050 = []
def opp_counts(name):
    c = INST_OPPS.get(name)
    if c is None:
        return 0, 0
    return c.get("mm", 0), c.get("rf", 0)

def is_tagged(name):
    n = name.lower()
    return "[mm]" in n or "[rf]" in n

# --- Meta ---
for r in META_ROWS:
    blk = block_of(r["name"], "meta")
    if blk == "excluded":
        continue
    if blk == "meta_awareness":
        metrics = {"invest": r["spend"], "impr": r["impressions"], "engaj": r.get("post_engagement", 0)}
    else:
        metrics = {"invest": r["spend"], "impr": r["impressions"], "clicks": r["link_clicks"], "leads": r["leads"]}
    omm, orf = opp_counts(r["name"])
    if not is_tagged(r["name"]) and (omm + orf) == 0 and r["spend"]:
        fallback_5050.append(r["name"])
    al = allocate_row(r["name"], metrics, omm, orf)
    for seg in ("mm", "rf"):
        add(seg, blk, al[seg])

# --- Google ---
for r in GOOGLE_ROWS:
    blk = block_of(r["name"], "google", r["channel_type"])
    if blk == "excluded":
        continue
    if blk == "google_awareness":
        metrics = {"invest": r["cost"], "impr": r["impressions"], "engaj": r.get("engagements", 0)}
    else:
        metrics = {"invest": r["cost"], "impr": r["impressions"], "clicks": r["clicks"], "leads": r["conversions"]}
    omm, orf = opp_counts(r["name"])
    if not is_tagged(r["name"]) and (omm + orf) == 0 and r["cost"]:
        fallback_5050.append(r["name"])
    al = allocate_row(r["name"], metrics, omm, orf)
    for seg in ("mm", "rf"):
        add(seg, blk, al[seg])

# --- SF MQL/SQL (coorte por criação; reached-gate via qualification) ---
for seg in ("rf", "mm"):
    mql = sum(1 for o in SF_HISTORY[seg] if mql_day(o["history"], o["is_won"]) is not None)
    sql = sum(1 for o in SF_HISTORY[seg] if sql_day(o["history"], o["is_won"]) is not None)
    add(seg, "sf", {"mql": mql, "sql": sql})

# --- SF Vendas/Faturamento (por LastStageChangeDate) ---
for seg in ("rf", "mm"):
    add(seg, "sf", {"vendas": VENDAS[seg], "faturamento": FATURAMENTO[seg]})

# --- Arredondar métricas inteiras fracionadas pelo rateio ---
for seg in ("rf", "mm"):
    for blk, m in acc[seg].items():
        for k in ("impr", "clicks", "leads", "engaj"):
            if k in m:
                m[k] = round(m[k])

# --- Zero explícito: garante overwrite das 22 células mesmo sem dado ---
BLOCK_KEYS = {
    "google_search": ("invest", "impr", "clicks", "leads"),
    "google_yt_pmax": ("invest", "impr", "clicks", "leads"),
    "meta_captacao": ("invest", "impr", "clicks", "leads"),
    "meta_awareness": ("invest", "impr", "engaj"),
    "google_awareness": ("invest", "impr", "engaj"),
    "sf": ("mql", "sql", "vendas", "faturamento"),
}
for seg in ("rf", "mm"):
    for blk, keys in BLOCK_KEYS.items():
        b = acc[seg].setdefault(blk, {})
        for k in keys:
            b.setdefault(k, 0)

# --- Resolver a coluna do mês nas DUAS abas (header NÃO formatado) ---
gc = gspread.authorize(Credentials.from_service_account_file(
    '.claude/sheets_credentials.json', scopes=['https://www.googleapis.com/auth/spreadsheets']))
sh = gc.open_by_key(SHEET_ID)
cols = {}
for seg, tab in TABS.items():
    ws = sh.worksheet(tab)
    header = ws.get('A1:AZ2', value_render_option='UNFORMATTED_VALUE')
    header = header + [[], []]
    cols[seg] = resolve_realizado_column(header[0], header[1], ANO, MES)

if cols["rf"] is None or cols["mm"] is None:
    print(f"[PARAR] Coluna do mês {MES:02d}/{ANO} não existe (RF={cols['rf']} MM={cols['mm']}).")
    print("Crie o trio Realizado|Meta|Δ% do mês nas abas ou informe a coluna. NADA foi gravado.")
    sys.exit(1)
if cols["rf"] != cols["mm"]:
    print(f"[PARAR] RF e MM resolveram colunas diferentes (RF={cols['rf']} MM={cols['mm']}). NADA foi gravado.")
    sys.exit(1)

COL = col_letter(cols["rf"])
print(f"Mês {MES:02d}/{ANO} -> coluna {COL} (Realizado) nas abas RF e MM.\n")

# --- PREVIEW ---
for seg in ("rf", "mm"):
    print(f"=== {seg.upper()} — coluna {COL} ===")
    for a1, val in cell_updates(COL, acc[seg]):
        print(f"  {a1} = {val}")
    print()
if fallback_5050:
    print("[!] Institucional em fallback 50/50 (sem opps p/ ratear):")
    for c in sorted(set(fallback_5050)):
        print(f"    {c}")

# --- GRAVAÇÃO: só após confirmação (Fase 4). Descomentar e rodar de novo. ---
def gravar():
    total = 0
    for seg, tab in TABS.items():
        total += write_updates(sh.worksheet(tab), cell_updates(COL, acc[seg]))
    print(f"Gravadas {total} células ({COL} nas abas RF e MM).")
# gravar()
```

## Fase 3 — Preview e confirmação

Apresentar as tabelas RF e MM (as 22 células de cada) + a coluna resolvida +
avisos: rateios em fallback 50/50; vendas/faturamento não segmentados por
`TipCte__c` nulo (diferença entre total pago e RF+MM); awareness zerado.
Perguntar:
```
Gravar na coluna [COL] ([MÊS]/[ANO]) das abas RF e MM? (sim para confirmar)
```

## Fase 4 — Gravação

Só após "sim": descomentar `gravar()` no script e rodar de novo (dados já
embutidos). Nunca tocar em células de fórmula.

## Pontos de atenção

- **Header não formatado:** ler o cabeçalho com `value_render_option='UNFORMATTED_VALUE'` — senão os seriais viram strings ("julho / 26") e o resolvedor não acha a coluna.
- **Coluna inexistente = parar:** mês novo sem trio de colunas → PARA sem gravar (evita sobrescrever o mês anterior).
- **Duas datas:** MQL/SQL por `CreatedDate`; Vendas/Faturamento por `LastStageChangeDate`.
- **Universo BOO:** exclui webinar/comunidade e as campanhas "Turbo" (pausadas). Se "Turbo" voltar como captação médico, revisar.
- **Métricas a validar na 1ª rodada:** Meta Cliques=`link_click`, Leads=`actions[lead]`; Google Leads=`conversions`. Ajustar se o cliente definir diferente.
