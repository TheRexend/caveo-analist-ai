---
name: reporte-resultados-ka
description: Reporte mensal segmentado por Médico e Formando da Caveo. Coleta Meta Ads, Google Ads e Salesforce do mês corrente até D-1 e grava os inputs das abas "Mês-a-Mês Formando" e "Mês-a-Mês Médico" (mídia por bloco + funil MQL/SQL/Vendas/Faturamento). Use para atualizar as abas mensais segmentadas.
---

# Skill: Reporte Mensal Segmentado Médico/Formando

Coleta **Meta + Google + Salesforce** do mês corrente (dia 1 até D-1), separa por
segmento **Médico / Formando** e grava os **22 inputs secos** da coluna do mês
(Realizado) nas abas **"Mês-a-Mês Formando"** e **"Mês-a-Mês Médico"**.
Sobrescreve a coluna do mês a cada rodada (snapshot vivo). As fórmulas
derivadas recalculam sozinhas — NUNCA escrever em célula de fórmula.

## Contas e planilha

| Recurso | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` |
| Google Ads | `3921127876` (MCC `5029399396`) |
| Salesforce | `caveo.my.salesforce.com` |
| Planilha | `169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw` |
| Abas | `Mês-a-Mês Formando`, `Mês-a-Mês Médico` |
| Auth Sheets | `.claude/sheets_credentials.json` (service account) |

## Fundação (LER ANTES DE QUALQUER SOQL)

Canal pago (cpc + cruzamento), segmento (`TipCte__c`), MQL/SQL
(`QUALIFICATION_RULES`) e ganho (`WON_CLAUSE`) vêm de `docs/fundacao-dados.md`.
Modelo de **duas datas**: MQL/SQL por `CreatedDate`; Vendas/Faturamento por
`LastStageChangeDate`. Fuso `-03:00`. NÃO reescrever listas.

Fragmentos usados (verbatim):

- **PAID:** `((UtmMed__c LIKE '%cpc%') OR ((UtmMed__c = null OR (NOT UtmMed__c LIKE '%cpc%')) AND (fbc__c != null OR fbclid__c != null OR gclid__c != null OR gbraid__c != null)))`
- **WON_CLAUSE:** `(IsWon = true OR StageName = 'Ganho não Identificado')`
- **TIPCTE_FORMANDO:** `TipCte__c IN ('Formando')`
- **TIPCTE_MEDICO:** `TipCte__c IN ('Médico')`

Revalida (`TipCte__c = 'Revalida'`) não aparece nesta skill — nem
Formando nem Médico o incluem.

## Universo e blocos

Só campanhas com o marcador **BOO** (`[BOO]` no Meta, `BOO -` no Google → teste
"contém boo"). Blocos (helper `blocks.block_of`): `google_search`,
`google_yt_pmax` (PMax/Display/Video/DemandGen não-topo), `meta_captacao`,
`meta_awareness` (`[TOPO]`), `google_awareness` (`[TOPO]`/DemandGen topo).
Campanha BOO sem tag `[RF]`/`[MM]` legada (institucional) → 100% Médico
(`alloc.allocate_row`, sem rateio — mídia paga mira só Médico).

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
**`leads` = `actions[action_type=complete_registration].value`** (fallback:
`offsite_conversion.fb_pixel_complete_registration` se `complete_registration`
não vier na resposta). "Registro Concluído" é a conversão principal — **não
usar** `action_type=lead` nem `onsite_web_lead` (mesma regra da skill
`planilha-resultados`, para manter os dois reportes mensais na mesma régua).
`post_engagement` = `actions[action_type=post_engagement].value` (0 se
ausente). Montar `META_ROWS`.

### 1B. Google — por campanha
`mcp__google-ads-mcp__search_search`, `customer_id="3921127876"`,
`resource="campaign"`,
`fields=["campaign.name","campaign.advertising_channel_type","metrics.cost_micros","metrics.impressions","metrics.clicks","metrics.conversions","metrics.engagements"]`,
`conditions=["segments.date BETWEEN '[START]' AND '[END]'","campaign.status != 'REMOVED'"]`.
Por campanha: `cost` = `cost_micros`/1e6; `impressions`; `clicks`; `conversions`;
`engagements` (0 se ausente); `channel_type`. Montar `GOOGLE_ROWS`.

### 1C. SF — MQL/SQL (coorte por `CreatedDate`; rodar 2x: TIPCTE_FORMANDO / TIPCTE_MEDICO)
```sql
SELECT OpportunityId, StageName, CreatedDate, Opportunity.IsWon
FROM OpportunityHistory
WHERE Opportunity.CreatedDate >= [START]T00:00:00-03:00
  AND Opportunity.CreatedDate <= [END]T23:59:59-03:00
  AND Opportunity.[PAID]
  AND Opportunity.[TIPCTE_FORMANDO | TIPCTE_MEDICO]
ORDER BY OpportunityId, CreatedDate
```
Agrupar por `OpportunityId` → `history=[{stage, date}]` (`date` = dia de
`CreatedDate` da linha), `is_won = IsWon OR StageName contém "Ganho não Identificado"`.
Montar `SF_HISTORY = {"formando":[...], "medico":[...]}`.

### 1D. SF — Vendas/Faturamento (por `LastStageChangeDate`; rodar 2x: Formando / Médico)
```sql
SELECT COUNT(Id) qtd, SUM(Amount) valor
FROM Opportunity
WHERE [WON_CLAUSE]
  AND LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND [PAID]
  AND [TIPCTE_FORMANDO | TIPCTE_MEDICO]
```
`VENDAS = {"formando": qtd, "medico": qtd}`; `FATURAMENTO = {"formando": valor or 0, "medico": valor or 0}`.

## Fase 2 — Cálculo (script Python via Bash)

Preencher `ANO, MES, META_ROWS, GOOGLE_ROWS, SF_HISTORY, VENDAS, FATURAMENTO`
com os dados reais e rodar com o `python3` do sistema:

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
TABS = {"formando": "Mês-a-Mês Formando", "medico": "Mês-a-Mês Médico"}

# ===== dados da Fase 1 (PREENCHER) =====
# ANO, MES = 2026, 7
# META_ROWS = [{"name","spend","impressions","link_clicks","leads","post_engagement"}]
# GOOGLE_ROWS = [{"name","channel_type","cost","impressions","clicks","conversions","engagements"}]
# SF_HISTORY = {"formando":[{"history":[{"stage","date"}],"is_won":bool}], "medico":[...]}
# VENDAS = {"formando": int, "medico": int}
# FATURAMENTO = {"formando": float, "medico": float}

acc = {"formando": {}, "medico": {}}
def add(seg, block, metrics):
    b = acc[seg].setdefault(block, {})
    for k, v in metrics.items():
        b[k] = b.get(k, 0) + v

# --- Meta ---
for r in META_ROWS:
    blk = block_of(r["name"], "meta")
    if blk == "excluded":
        continue
    if blk == "meta_awareness":
        metrics = {"invest": r["spend"], "impr": r["impressions"], "engaj": r.get("post_engagement", 0)}
    else:
        metrics = {"invest": r["spend"], "impr": r["impressions"], "clicks": r["link_clicks"], "leads": r["leads"]}
    al = allocate_row(r["name"], metrics)
    for seg in ("medico", "formando"):
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
    al = allocate_row(r["name"], metrics)
    for seg in ("medico", "formando"):
        add(seg, blk, al[seg])

# --- SF MQL/SQL (coorte por criação; reached-gate via qualification) ---
for seg in ("formando", "medico"):
    mql = sum(1 for o in SF_HISTORY[seg] if mql_day(o["history"], o["is_won"]) is not None)
    sql = sum(1 for o in SF_HISTORY[seg] if sql_day(o["history"], o["is_won"]) is not None)
    add(seg, "sf", {"mql": mql, "sql": sql})

# --- SF Vendas/Faturamento (por LastStageChangeDate) ---
for seg in ("formando", "medico"):
    add(seg, "sf", {"vendas": VENDAS[seg], "faturamento": FATURAMENTO[seg]})

# --- Arredondar métricas inteiras fracionadas ---
for seg in ("formando", "medico"):
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
for seg in ("formando", "medico"):
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

if cols["formando"] is None or cols["medico"] is None:
    print(f"[PARAR] Coluna do mês {MES:02d}/{ANO} não existe (Formando={cols['formando']} Médico={cols['medico']}).")
    print("Crie o trio Realizado|Meta|Δ% do mês nas abas ou informe a coluna. NADA foi gravado.")
    sys.exit(1)
if cols["formando"] != cols["medico"]:
    print(f"[PARAR] Formando e Médico resolveram colunas diferentes (Formando={cols['formando']} Médico={cols['medico']}). NADA foi gravado.")
    sys.exit(1)

COL = col_letter(cols["formando"])
print(f"Mês {MES:02d}/{ANO} -> coluna {COL} (Realizado) nas abas Formando e Médico.\n")

# --- PREVIEW ---
for seg in ("formando", "medico"):
    print(f"=== {seg.upper()} — coluna {COL} ===")
    for a1, val in cell_updates(COL, acc[seg]):
        print(f"  {a1} = {val}")
    print()

# --- GRAVAÇÃO: só após confirmação (Fase 4). Descomentar e rodar de novo. ---
def gravar():
    total = 0
    for seg, tab in TABS.items():
        total += write_updates(sh.worksheet(tab), cell_updates(COL, acc[seg]))
    print(f"Gravadas {total} células ({COL} nas abas Formando e Médico).")
# gravar()
```

## Fase 3 — Preview e confirmação

Apresentar as tabelas Formando e Médico (as 22 células de cada) + a coluna
resolvida + avisos: vendas/faturamento não segmentados por `TipCte__c`
nulo/Revalida (diferença entre total pago e Formando+Médico); awareness
zerado. Perguntar:
```
Gravar na coluna [COL] ([MÊS]/[ANO]) das abas Formando e Médico? (sim para confirmar)
```

## Fase 4 — Gravação

Só após "sim": descomentar `gravar()` no script e rodar de novo (dados já
embutidos). Nunca tocar em células de fórmula.

## Pontos de atenção

- **Header não formatado:** ler o cabeçalho com `value_render_option='UNFORMATTED_VALUE'` — senão os seriais viram strings ("julho / 26") e o resolvedor não acha a coluna.
- **Coluna inexistente = parar:** mês novo sem trio de colunas → PARA sem gravar (evita sobrescrever o mês anterior).
- **Duas datas:** MQL/SQL por `CreatedDate`; Vendas/Faturamento por `LastStageChangeDate`.
- **Universo BOO:** exclui webinar/comunidade e as campanhas "Turbo" (pausadas). Se "Turbo" voltar como captação médico, revisar.
- **Métricas a validar na 1ª rodada:** Meta Cliques=`link_click`, Leads=`actions[complete_registration]` (Registro Concluído, não `lead`); Google Leads=`conversions`. Ajustar se o cliente definir diferente.
