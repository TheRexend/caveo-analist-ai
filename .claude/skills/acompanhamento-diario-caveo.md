---
name: acompanhamento-diario-caveo
description: Coleta métricas diárias da Caveo (investimento, leads, MQL, SQL, fechamentos) de Meta Ads + Google Ads + Salesforce, por segmento (Médico / Formando), e grava na planilha "Resultados Mês Atual". Cadência diária append-only (sem retroativo). Use para atualizar o acompanhamento diário de captação e funil.
---

# Skill: Acompanhamento Diário — Caveo

Coleta diária por **dia × segmento (Médico/Formando) × canal (Meta/Google)** e
grava na planilha de acompanhamento. **Append-only: nunca reescreve dias
anteriores.**

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
usam `QUALIFICATION_RULES` (seção 7). Segmento por `TipCte__c` via
`classify_contratante` (seção 4) — **sempre** `from segments import
classify_contratante` (`scripts/acompanhamento_diario/segments.py`); nunca
aplicar a regra de cabeça. Campanha sem tag de segmento no nome (institucional)
conta 100% como Médico — mídia paga mira só Médico, sem rateio institucional
(fundação seção 8 é nota histórica agora; ver `classify_segment`/`allocate` no
mesmo módulo). NÃO reescrever essas listas aqui.

## Bucket temporal (regra de ouro — sem retroativo)

- Investimento / Leads → **dia do gasto** (plataforma).
- MQL / SQL → **dia da primeira transição** que cruza o gate (`OpportunityHistory`).
- Fechamento → **`LastStageChangeDate`** (dia do fechamento).

Todo dia é sempre calculado em **`-03:00`**, nunca no UTC bruto que o
Salesforce devolve (ver nota de fuso na Fase 1D) — vale para os três casos
acima.

## Zero explícito (regra de ouro — sem ambiguidade)

Todo dia dentro do período processado grava as **9 métricas com `0`** quando
não há ocorrência (ex.: sem MQL, sem SQL, sem fechamento, sem lead naquele
canal). A célula nunca fica em branco por falta de dado — só fica em branco
se o dia estiver **fora** do período desta execução. Assim, uma célula vazia
na planilha significa "esse dia não foi processado ainda", nunca "processei e
não sei o valor".

## Fase 0 — Período

- **Padrão (append-only): `START = END = D-1` (só ontem).** A cadência diária grava
  apenas o dia novo — nunca reprocessa nem reescreve dias anteriores do mês.
- Override: `$ARGUMENTS` pode conter uma única data (`YYYY-MM-DD` → `START=END=data`)
  ou um intervalo explícito (`YYYY-MM-DD a YYYY-MM-DD` → `START..END`), para
  recuperar um dia perdido ou refazer uma janela sob demanda.
- Informar: `Coletando de [START] a [END]…`
- Todo o pipeline (coleta, cálculo, preview e `gravar()`) já é escopado por
  `in_period(START,END)` e pelas SOQL/insights limitadas ao período, então
  `START=END=D-1` computa e grava **somente** aquele dia.

## Fase 0.5 — Antes da primeira execução real (uma vez)

Gate único, executado **uma só vez** antes da primeira gravação real (não rodar
agora, nem a cada execução). Antes do primeiro `gravar()`:

1. **Confirmar as bases dos blocos** — ler de volta as células de rótulo e checar
   que a planilha traz "MÉDICO" por volta da linha 43 e "FORMANDO"
   por volta da linha 85 (ver Task 11 do plano — renomeação das planilhas reais).
   `sheet.day_to_row` assume `BLOCK_BASE = {medico: 45, formando: 87}`
   (dia _d_ → 45+_d_ / 87+_d_); se os rótulos estiverem em outras linhas, ajustar
   `BLOCK_BASE` antes de gravar — caso contrário os números caem no bloco errado.
2. **Confirmar a autenticação** — validar que a service account
   (`.claude/sheets_credentials.json`) autentica e abre a aba `Resultados Mês Atual`.

Passando os dois checks, a skill pode gravar normalmente nas execuções seguintes.

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
com lookback de 12 meses antes de START (ciclos médicos longos podem passar de 3
meses — a janela larga garante capturar opps criadas antes mas que cruzam um gate
DENTRO do período; o `in_period` continua restringindo o que é gravado):
```sql
SELECT OpportunityId, StageName, CreatedDate,
       Opportunity.TipCte__c, Opportunity.IsWon
FROM OpportunityHistory
WHERE Opportunity.CreatedDate >= [START-12meses]T00:00:00-03:00
  AND Opportunity.CreatedDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META | FILTRO_GOOGLE])
ORDER BY OpportunityId, CreatedDate
```
Agrupar as linhas por `OpportunityId` → `history=[{stage, date}]` (date = dia de
`CreatedDate` da linha de histórico, em `-03:00`), `is_won = IsWon OR StageName
contém "Ganho não Identificado"`, `segment = classify_contratante(TipCte__c)`
(`from segments import classify_contratante` — nunca classificar de memória).
Opps que classificam como `None` ou `"revalida"` (`TipCte__c` vazio,
desconhecido, ou Revalida) são **descartadas** — não entram em
`medico`/`formando` (o acumulador só tem essas duas chaves; Revalida não
aparece nestes relatórios de mídia paga).

### 1D. Salesforce — fechamentos por dia/segmento (mídia paga)
```sql
SELECT TipCte__c, LastStageChangeDate
FROM Opportunity
WHERE LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
  AND [WON_CLAUSE]
```
Esta query **não filtra por `TipCte__c`** — classificar cada linha em
`segment = classify_contratante(TipCte__c)` (`from segments import
classify_contratante`; nunca de memória). Opps que classificam como `None` ou
`"revalida"` são **descartadas** do `SF_CLOSINGS` — mesma regra de 1C.

> **Atenção fuso:** o Salesforce devolve `LastStageChangeDate` em **UTC**
> (`+0000`) mesmo com o `WHERE` limitado em `-03:00`. Para montar
> `SF_CLOSINGS`, **converter cada `LastStageChangeDate` para -03:00 antes de
> extrair o dia** (mesma regra de 1C). Ex.: `2026-07-21T00:56:14+0000` =
> `20/07 20:56 -03:00` → dia **20**, não 21. Sem essa conversão, fechamentos
> entre ~21h e 23h59 (horário de Brasília) voltam com data UTC do dia
> seguinte e ficam fora do dia processado (somem da linha certa) ou são
> gravados fora da janela pedida (quebra o append-only).

## Fase 2 — Cálculo (script Python via Bash, usando o helper)

Construir e rodar com o **`python3` do sistema** o script abaixo, preenchendo as
estruturas `META_ROWS`, `GOOGLE_ROWS`, `SF_HISTORY`, `SF_CLOSINGS`
com os dados reais coletados:

```python
import sys
sys.path.insert(0, 'scripts/acompanhamento_diario')
from segments import allocate, classify_contratante
from qualification import mql_day, sql_day
from sheet import cell_updates, write_updates
import gspread
from google.oauth2.service_account import Credentials
from collections import defaultdict

# START/END já conhecidos; days = [1..N] dentro do período.
# META_ROWS / GOOGLE_ROWS: [{"campaign": str, "day": int, "spend": float, "leads": float}]
# SF_HISTORY:  [{"channel": "meta"|"google", "segment": "medico"|"formando",
#               "history": [{"stage","date"}], "is_won": bool}]
# SF_CLOSINGS: [{"segment": "medico"|"formando", "day": int}]

# acc[segment][day] = dict de métricas (chaves de sheet.COLS), PRÉ-ZERADO abaixo.
acc = {"medico": defaultdict(dict), "formando": defaultdict(dict)}

# Zero explícito: todo dia dentro de [START,END] recebe as 9 métricas com 0
# antes de qualquer acumulação. Sem isso, um dia sem MQL/SQL/fechamento/lead
# simplesmente não teria a chave no dict e cell_updates() pularia a célula —
# ficando indistinguível de "esse dia não foi processado". Com o zero
# explícito, toda célula do período é sempre escrita (0 quando não há
# ocorrência), então "vazio" na planilha só significa "fora do período".
_ALL_METRIC_KEYS = ("invest_meta", "leads_meta", "mql_meta", "sql_meta",
                    "invest_google", "leads_google", "mql_google", "sql_google",
                    "fechamento")
_day_start, _day_end = int(START[8:10]), int(END[8:10])
for _seg in ("medico", "formando"):
    for _day in range(_day_start, _day_end + 1):
        for _k in _ALL_METRIC_KEYS:
            acc[_seg][_day][_k] = 0

def add(seg, day, key, val):
    acc[seg][day][key] = acc[seg][day].get(key, 0) + val

# --- Investimento + Leads (campanha taggeada -> 100% no segmento da tag;
#     sem tag/institucional -> 100% Médico, sem rateio) ---
for rows, ik, lk in ((META_ROWS, "invest_meta", "leads_meta"),
                     (GOOGLE_ROWS, "invest_google", "leads_google")):
    for r in rows:
        a = allocate(r["campaign"], r["spend"], r["leads"])
        for seg in ("medico", "formando"):
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

# --- Arredondar leads (Google conversions pode vir fracionado) ---
for seg in ("medico", "formando"):
    for day, m in acc[seg].items():
        for k in ("leads_meta", "leads_google"):
            if k in m: m[k] = round(m[k])

# --- PREVIEW (imprimir antes de gravar) ---
# Além do agregado por dia, imprime as células A1 exatas que serão gravadas
# (as mesmas que cell_updates devolve) para conferência humana do mapeamento:
# ex.: Médico dia 3 escreve em C48/F48/… (linha = base do bloco + dia).
for seg in ("medico", "formando"):
    print(f"\n=== {seg.upper()} ===")
    for day in sorted(acc[seg]):
        m = dict(acc[seg][day])
        print(day, m)
        cells = cell_updates(seg, day, m)
        print("    A1:", ", ".join(f"{a1}={val}" for a1, val in cells))

# --- GRAVAÇÃO (só após confirmação do usuário na Fase 3) ---
def gravar():
    creds = Credentials.from_service_account_file(
        '.claude/sheets_credentials.json',
        scopes=['https://www.googleapis.com/auth/spreadsheets'])
    ws = gspread.authorize(creds).open_by_key(
        '19gElL0pmUO3yPZZG0-5E1ym61wHbQM5-JohK5_wPjj4').worksheet('Resultados Mês Atual')
    total = 0
    for seg in ("medico", "formando"):
        for day, m in acc[seg].items():
            total += write_updates(ws, cell_updates(seg, day, m))
    print(f"Gravadas {total} células.")
```

## Fase 3 — Preview e confirmação

Apresentar as tabelas Médico e Formando (dias × colunas). Perguntar:
```
Gravar estes dias na planilha "Resultados Mês Atual"? (sim para confirmar)
```
Só chamar `gravar()` após "sim". Nunca tocar TOTAL, B/H/N, nem D/J/P/Q.
