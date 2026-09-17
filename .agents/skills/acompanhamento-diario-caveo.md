---
name: acompanhamento-diario-caveo
description: Coleta métricas diárias da Caveo (investimento, leads, MQL, SQL, fechamentos) de Meta Ads + Google Ads + Salesforce, consolidado no bloco MÉDICO da planilha "Resultados Mês Atual" (bloco Formando retirado de uso em 2026-08-18). Cadência diária append-only (sem retroativo). Use para atualizar o acompanhamento diário de captação e funil.
---

# Skill: Acompanhamento Diário — Caveo

Coleta diária por **dia × canal (Meta/Google)** e grava no bloco **MÉDICO** da
planilha de acompanhamento. **Append-only: nunca reescreve dias anteriores.**

## Consolidação em bloco único (decisão de 2026-08-18)

Até 17/08/2026 esta skill separava Médico e Formando (via `TipCte__c`). Em
18/08/2026 o Matheus decidiu consolidar **tudo** no bloco MÉDICO: a automação
Sofia parou de preencher `TipCte__c` a partir de 13/08 (fica vazio em 94-99%
das opps pagas/dia — ver `docs/fundacao-dados.md`/memória do projeto), então
manter dois blocos segmentados deixou de fazer sentido — o Formando ficaria
quase sempre zerado e o Médico carregaria o resto por default, não por
classificação real.

**O que isso significa na prática:**
- Esta skill **não chama `classify_contratante`/`allocate` de `segments.py`
  para decidir bucket** — isso é diferente de outras skills (ex.
  `planilha-resultados`, `reconciliacao-fechamentos-caveo`) que **continuam**
  segmentando corretamente por `TipCte__c` para os próprios relatórios. Não
  "corrigir" essas outras skills a partir daqui — a consolidação vale só para
  esta planilha.
- **Todo** o volume pago (Meta + Google, qualquer `TipCte__c`, incluindo vazio)
  vai para o bloco MÉDICO, linhas 46-76 (dia _d_ → linha 45+_d_).
- O bloco **FORMANDO** (linhas 88-118) foi zerado para 01-17/08/2026 na
  regravação de 18/08 e **não recebe mais escrita** desta skill em diante —
  não gravar zero explícito nele a cada execução, simplesmente não tocá-lo.
- O bloco TOTAL (linhas 4-34, fórmula `=MÉDICO+FORMANDO`) continua correto
  porque Formando fica em zero.

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
`docs/fundacao-dados.md` (seção "Fragmentos SOQL prontos"), fuso `-03:00`.
MQL/SQL usam `QUALIFICATION_RULES` (seção 7, espelhado em
`scripts/acompanhamento_diario/qualification.py` — **sempre** `from
qualification import mql_day, sql_day`, nunca reimplementar a régua na mão).
NÃO reescrever essas listas aqui.

**Sem filtro nem classificação de `TipCte__c`** — ver "Consolidação em bloco
único" acima. Toda opp cpc/cruzamento entra, independente de segmento.

## Bucket temporal (regra de ouro — sem retroativo)

- Investimento / Leads → **dia do gasto** (plataforma).
- MQL / SQL → **dia da primeira transição** que cruza o gate (`OpportunityHistory`).
- Fechamento → **`LastStageChangeDate`** (dia do fechamento).

Todo dia é sempre calculado em **`-03:00`**, nunca no UTC bruto que o
Salesforce devolve (ver nota de fuso na Fase 1D) — vale para os três casos
acima.

## Zero explícito (regra de ouro — sem ambiguidade)

Todo dia dentro do período processado grava as **9 métricas com `0`** no
bloco MÉDICO quando não há ocorrência (ex.: sem MQL, sem SQL, sem fechamento,
sem lead naquele canal). A célula nunca fica em branco por falta de dado — só
fica em branco se o dia estiver **fora** do período desta execução. Assim, uma
célula vazia na planilha significa "esse dia não foi processado ainda", nunca
"processei e não sei o valor". (O bloco Formando não é mais escrito — ver
acima; isso não é "célula vazia por não processar", é retirada de uso.)

## Fase 0 — Período

- **Padrão (append-only): `START = END = D-1` (só ontem).** A cadência diária grava
  apenas o dia novo — nunca reprocessa nem reescreve dias anteriores do mês.
- Override: `$ARGUMENTS` pode conter uma única data (`YYYY-MM-DD` → `START=END=data`)
  ou um intervalo explícito (`YYYY-MM-DD a YYYY-MM-DD` → `START..END`), para
  recuperar um dia perdido ou refazer uma janela sob demanda.
- **Antes de coletar, ler o dia-alvo na planilha** (bloco Médico, linha
  45+dia): se já tiver valores não-vazios, é um dia já processado — não
  reescrever sem confirmação explícita do usuário (mesmo estando dentro de
  `$ARGUMENTS`). Reportar o achado e perguntar.
- Informar: `Coletando de [START] a [END]…`
- Todo o pipeline (coleta, cálculo, preview e `gravar()`) já é escopado por
  `in_period(START,END)` e pelas SOQL/insights limitadas ao período, então
  `START=END=D-1` computa e grava **somente** aquele dia.

## Fase 0.5 — Antes da primeira execução real (uma vez, histórico)

Gate único, já confirmado em produção em 2026-08-10 (`BLOCK_BASE.medico=45`
bate com os rótulos reais, service account autentica). Não repetir a cada
execução. Predata a consolidação de 18/08 — o gate cobria os dois blocos;
hoje só o Médico é relevante para escrita.

## Fase 1 — Coleta (paralela)

### 1A. Meta — spend + registro concluído por campanha/dia
`mcp__meta-ads-mcp__get_insights` com `object_id="act_438086148409254"`,
`level="campaign"`, `time_range={"since": START, "until": END}`, `time_increment=1`.
Filtrar campanhas com `[LEADS]`. Por campanha/dia extrair: `spend`; e o `value` do
objeto de `actions` com `action_type = "lead"` (lead padrão, não
`complete_registration`) → **leads Meta**. Somar direto entre campanhas (sem
split de segmento) → total do dia.

### 1B. Google — cost + conversões por campanha/dia
`mcp__google-ads-mcp__search_search` com `customer_id="3921127876"`,
`resource="campaign"`, fields `["campaign.name","segments.date","metrics.cost_micros","metrics.conversions"]`,
conditions `["segments.date BETWEEN '[START]' AND '[END]'"]`. Por dia: invest =
soma de `cost_micros`/1e6 entre campanhas; **leads Google** = soma de
`conversions` (arredondar no fim).

### 1C. Salesforce — histórico p/ MQL/SQL (por canal)
Para `[FILTRO_META]` e `[FILTRO_GOOGLE]` (fragmentos cpc+cruzamento da fundação),
com lookback de 12 meses antes de START (ciclos médicos longos podem passar de 3
meses — a janela larga garante capturar opps criadas antes mas que cruzam um gate
DENTRO do período; o `in_period` continua restringindo o que é gravado):

```sql
SELECT OpportunityId, StageName, CreatedDate, Opportunity.IsWon
FROM OpportunityHistory
WHERE Opportunity.CreatedDate >= [START-12meses]T00:00:00-03:00
  AND Opportunity.CreatedDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META | FILTRO_GOOGLE])
ORDER BY OpportunityId, CreatedDate
```

> Se o volume estourar o limite de output do MCP (aconteceu em 18/08/2026 com
> ~150 opps pagas/dia pós-Sofia — dezenas de milhares de linhas de histórico),
> trocar pelo caminho em duas etapas: (a) buscar só as linhas de histórico com
> estágio de gate (`Contato Realizado`, `Aguardando Resposta`, `Reunião
> Agendada`, `Proposta Enviada`, `Fechado`, `Ganho não Identificado`) criadas
> NO dia alvo (-03:00); (b) das opps resultantes, só as com
> `Opportunity.CreatedDate` anterior ao dia precisam de busca de histórico
> completo (as demais foram criadas no próprio dia, então a linha do dia já é
> a primeira transição).

Agrupar as linhas por `OpportunityId` → `history=[{stage, date}]` (date = dia de
`CreatedDate` da linha de histórico, em `-03:00`), `is_won = IsWon OR StageName
contém "Ganho não Identificado"`. **Não classificar por `TipCte__c` nem
descartar nenhuma opp** — toda opp cpc/cruzamento entra no cálculo de MQL/SQL,
independente de segmento (ver "Consolidação em bloco único").

### 1D. Salesforce — fechamentos por dia (mídia paga)
```sql
SELECT LastStageChangeDate
FROM Opportunity
WHERE LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
  AND [WON_CLAUSE]
```
Toda linha conta para o fechamento do dia — sem classificação nem descarte por
`TipCte__c`.

> **Atenção fuso:** o Salesforce devolve `LastStageChangeDate` em **UTC**
> (`+0000`) mesmo com o `WHERE` limitado em `-03:00`. **Converter cada
> `LastStageChangeDate` para -03:00 antes de extrair o dia** (mesma regra de
> 1C). Ex.: `2026-07-21T00:56:14+0000` = `20/07 20:56 -03:00` → dia **20**, não
> 21. Sem essa conversão, fechamentos entre ~21h e 23h59 (horário de Brasília)
> voltam com data UTC do dia seguinte e ficam fora do dia processado (somem da
> linha certa) ou são gravados fora da janela pedida (quebra o append-only).

## Fase 2 — Cálculo (script Python via Bash, usando o helper)

Construir e rodar com o **`python3` do sistema** o script abaixo, preenchendo
as estruturas `META_ROWS`, `GOOGLE_ROWS`, `SF_HISTORY`, `SF_CLOSINGS` com os
dados reais coletados:

```python
import sys
sys.path.insert(0, 'scripts/acompanhamento_diario')
from qualification import mql_day, sql_day
from sheet import cell_updates, write_updates
import gspread
from google.oauth2.service_account import Credentials
from collections import defaultdict

# START/END já conhecidos; days = [1..N] dentro do período.
# META_ROWS / GOOGLE_ROWS: [{"day": int, "spend": float, "leads": float}]  (já somado entre campanhas)
# SF_HISTORY:  [{"channel": "meta"|"google", "history": [{"stage","date"}], "is_won": bool}]
# SF_CLOSINGS: [{"day": int}]

# acc[day] = dict de métricas (chaves de sheet.COLS), PRÉ-ZERADO abaixo. Um só
# bucket — tudo é MÉDICO desde 2026-08-18 (ver Fundação).
acc = defaultdict(dict)

_ALL_METRIC_KEYS = ("invest_meta", "leads_meta", "mql_meta", "sql_meta",
                    "invest_google", "leads_google", "mql_google", "sql_google",
                    "fechamento")
_day_start, _day_end = int(START[8:10]), int(END[8:10])
for _day in range(_day_start, _day_end + 1):
    for _k in _ALL_METRIC_KEYS:
        acc[_day][_k] = 0

def add(day, key, val):
    acc[day][key] = acc[day].get(key, 0) + val

# --- Investimento + Leads (soma direta, sem split de segmento) ---
for rows, ik, lk in ((META_ROWS, "invest_meta", "leads_meta"),
                     (GOOGLE_ROWS, "invest_google", "leads_google")):
    for r in rows:
        add(r["day"], ik, r["spend"])
        add(r["day"], lk, r["leads"])

# --- MQL/SQL pelo dia da transição (bucketiza só o que cai no período) ---
def in_period(d):  # d = "YYYY-MM-DD"
    return d is not None and START <= d <= END
def day_of(d):
    return int(d[8:10])
for o in SF_HISTORY:
    md, sd = mql_day(o["history"], o["is_won"]), sql_day(o["history"], o["is_won"])
    ck = "mql_meta" if o["channel"] == "meta" else "mql_google"
    sk = "sql_meta" if o["channel"] == "meta" else "sql_google"
    if in_period(md): add(day_of(md), ck, 1)
    if in_period(sd): add(day_of(sd), sk, 1)

# --- Fechamentos ---
for c in SF_CLOSINGS:
    add(c["day"], "fechamento", 1)

# --- Arredondar leads (Google conversions pode vir fracionado) ---
for day, m in acc.items():
    for k in ("leads_meta", "leads_google"):
        if k in m: m[k] = round(m[k])

# --- PREVIEW (imprimir antes de gravar) ---
# Além do agregado por dia, imprime as células A1 exatas que serão gravadas
# (as mesmas que cell_updates devolve) para conferência humana do mapeamento:
# ex.: dia 3 escreve em C48/F48/… (linha = 45 + dia, bloco Médico).
print("\n=== MÉDICO (consolidado — Meta+Google, todo TipCte) ===")
for day in sorted(acc):
    m = dict(acc[day])
    print(day, m)
    cells = cell_updates("medico", day, m)
    print("    A1:", ", ".join(f"{a1}={val}" for a1, val in cells))

# --- GRAVAÇÃO (só após confirmação do usuário na Fase 3) ---
def gravar():
    creds = Credentials.from_service_account_file(
        '.claude/sheets_credentials.json',
        scopes=['https://www.googleapis.com/auth/spreadsheets'])
    ws = gspread.authorize(creds).open_by_key(
        '19gElL0pmUO3yPZZG0-5E1ym61wHbQM5-JohK5_wPjj4').worksheet('Resultados Mês Atual')
    total = 0
    for day, m in acc.items():
        total += write_updates(ws, cell_updates("medico", day, m))
    print(f"Gravadas {total} células.")
```

## Fase 3 — Preview e confirmação

Apresentar a tabela MÉDICO (dias × colunas). Perguntar:
```
Gravar estes dias na planilha "Resultados Mês Atual"? (sim para confirmar)
```
Só chamar `gravar()` após "sim". Nunca tocar TOTAL, B/H/N, D/J/Q, nem o bloco
Formando.
