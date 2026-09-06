---
name: dados-lp-caveo
description: Coleta as métricas diárias da landing page e grava na aba "Dados Landingpage" da planilha de resultados — topo de funil de Meta Ads e Google Ads (impressões, cliques, leads, investimento), o funil de Salesforce de cada plataforma (MQL, SQL e fechamentos de mídia paga por UTM medium cpc) e sessões e bounce rate do GA4. Preenche todos os dias pendentes até D-1 e estende a coluna A quando a data ainda não tem linha. Use para atualizar o monitoramento diário da LP.
---

# Skill: Dados Landing Page — Caveo

Coleta diária por **dia × canal** e gravação na aba `Dados Landingpage`.
Preenche **todo dia pendente até D-1**, não só ontem.

## Contas e planilha

| Recurso | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` |
| Google Ads | `3921127876` |
| GA4 | host `lp2.caveo.com.br` |
| Salesforce | via `.claude/salesforce_mcp_server.py` (ver Fase 2D) |
| Planilha | `169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw`, aba `Dados Landingpage` |
| Auth Sheets | `.claude/sheets_credentials.json` (service account) |
| Helper | `scripts/dados_lp/sheet.py` |

## Réguas de métrica (NÃO alterar de cabeça)

Cinco blocos, na ordem da aba. As **seis colunas de Salesforce** (G/H/I e O/P/Q)
entraram em 2026-08-18.

> **Os dois blocos de plataforma não são simétricos.** No Meta o investimento é
> a **F**, logo antes do Salesforce (G/H/I). No Google ele é a **N**, também
> antes do Salesforce (O/P/Q) — mas depois de leads. Conferir a coluna antes de
> gravar: no Meta, a **I é fechamentos**, não investimento.

| Coluna | Métrica | Régua |
|---|---|---|
| C | Impressões Meta | soma de `impressions`, todas as campanhas |
| D | Cliques Meta | soma de **`link_click`** em `actions` |
| E | Leads Meta | soma de **`lead`** em `actions` |
| F | Investimento Meta | soma de `spend` |
| G | Contato Realizado (MQL) Meta | SF — dia da 1ª transição que cruza o gate MQL |
| H | Proposta Enviada (SQL) Meta | SF — dia da 1ª transição que cruza o gate SQL |
| I | Fechamentos Meta | SF — `LastStageChangeDate` de opp Ganho |
| K | Impressões Google | soma de `metrics.impressions` |
| L | Cliques Google | soma de `metrics.clicks` |
| M | Leads Google | soma de `metrics.conversions`, arredondado |
| N | Investimento Google | soma de `metrics.cost_micros` / 1e6 |
| O | Contato Realizado (MQL) Google | mesma régua de G, canal Google |
| P | Proposta Enviada (SQL) Google | mesma régua de H, canal Google |
| Q | Fechamentos Google | mesma régua de I, canal Google |
| S | Sessões GA4 | `sessions` do host `lp2.caveo.com.br` |
| T | Bounce Rate GA4 | `bounceRate` do host `lp2.caveo.com.br`, em fração |

**Duas armadilhas, provadas por reconciliação contra 13/08/2026:**

- Cliques Meta é **`link_click`**, não `clicks`. O campo `clicks` daria 573
  naquele dia; a régua certa dá 344.
- Leads Meta é **`lead`**, não `complete_registration`.
  `complete_registration` daria 9; a régua certa dá 12.

**Esta aba diverge da `/acompanhamento-diario-caveo` de propósito.** Lá, só
campanhas `[LEADS]` entram e o funil é quebrado por segmento
(Médico/Formando). Aqui não há filtro de campanha nem de contratante. As duas
planilhas nunca vão bater mesmo com a régua de lead igual (`lead` padrão em
ambas desde 2026-09-03). Isso é escolha do cliente para esta aba — não
"consertar".

## Atribuição do bloco de Salesforce

**Só `cpc` direto** — decisão do cliente em 2026-08-18: "se a UTM medium é CPC e
se tá correspondendo com MetaAds". O cruzamento por click ID (`fbclid`,
`gclid`…) da fundação **não entra aqui**, ao contrário de
`/acompanhamento-diario-caveo`.

Usar os fragmentos prontos de `docs/fundacao-dados.md` (seção "Fragmentos SOQL
prontos"), linha `cpc (direto)` — **nunca reescrever a lista de fontes de
memória**:

| Canal | Fragmento |
|---|---|
| Meta | `(UtmMed__c LIKE '%cpc%' AND (NOT UtmSou__c LIKE '%google%'))` |
| Google | `(UtmMed__c LIKE '%cpc%' AND UtmSou__c LIKE '%google%')` |

Os dois **particionam** o conjunto cpc: em 13–17/08/2026, meta 2.043 + google
4.429 = 6.472 linhas de histórico, exatamente o total de `UtmMed__c LIKE
'%cpc%'`. Sem sobreposição e sem buraco — é isso que faz `AD=G+O`, `AE=H+P` e
`AF=I+Q` do bloco Total Geral fecharem com o total de mídia paga.

**Sem filtro de `TipCte__c`** — pedido explícito do cliente. Vale lembrar que
desde 13/08/2026 esse campo parou de ser preenchido pela automação Sofia, então
filtrar por ele aqui zeraria o bloco.

> **`Opportunity.` é obrigatório em `OpportunityHistory`.** Os campos de UTM
> vivem em `Opportunity`; usar `UtmMed__c` cru numa query de histórico devolve
> `INVALID_FIELD`.

### MQL / SQL / fechamentos

Réguas da fundação, já implementadas em `scripts/acompanhamento_diario/qualification.py`
— **importar o helper, não reimplementar**:

- **MQL** (G/O): dia da 1ª transição para `Contato Realizado`, `Aguardando
  Resposta`, `Reunião Agendada` ou `Proposta Enviada`.
- **SQL** (H/P): dia da 1ª transição para `Proposta Enviada`.
- **Fechamentos** (I/Q): `LastStageChangeDate` com a `WON_CLAUSE`
  (`IsWon = true OR StageName = 'Ganho não Identificado'`).

> **`alsoWon` mexe muito no SQL.** A fundação manda uma opp Ganho contar como
> MQL/SQL mesmo sem transição explícita ao estágio-limiar. Em 13–17/08/2026 o
> SQL do Google foi **9 = 2 propostas explícitas + 7 opps Ganho que nunca
> passaram por "Proposta Enviada"**. O número da coluna P não é, portanto, a
> contagem de propostas enviadas — é o gate SQL da fundação. Não "corrigir"
> para bater com o rótulo da coluna.

> **Fuso.** O Salesforce devolve as datas em **UTC** (`+0000`) mesmo com o
> `WHERE` limitado em `-03:00`. Converter para `-03:00` **antes** de extrair o
> dia. Ex.: `2026-08-18T00:02:43+0000` = 17/08 21:02 `-03:00` → dia **17**. Sem
> isso, o que acontece entre ~21h e 23h59 cai na linha do dia seguinte.

**Lookback de 12 meses** antes do primeiro dia-alvo na query de histórico: uma
opp criada antes do período pode cruzar um gate *dentro* dele.

## Colunas proibidas

**B, J, R, U** são rótulos fixos. **V–AF** são as fórmulas do bloco Total Geral.
A skill nunca escreve nessas colunas numa linha existente. `COLS` do helper não
as contém, então `cell_updates` é incapaz de acertá-las.

## Zero explícito (regra de ouro)

Todo dia processado grava as **dezesseis métricas com `0`** quando não houve
ocorrência. Célula nunca fica em branco por falta de dado.

Aqui isso é estrutural: "célula vazia" é o sinal de "dia pendente" na Fase 1. Um
dia gravado em branco voltaria como pendente em toda execução seguinte.

## Fase 0 — Alvo

- **Padrão:** `UNTIL = D-1`. A skill descobre sozinha o que está faltando.
- **Override:** `$ARGUMENTS` aceita uma data (`YYYY-MM-DD`) ou um intervalo
  (`YYYY-MM-DD a YYYY-MM-DD`) e, nesse caso, **força a regravação** daquelas
  datas mesmo já preenchidas. Use quando o dado da plataforma tiver assentado
  depois da primeira coleta — o Google Ads reescreve número por até ~3 dias.

## Fase 1 — Reconhecimento da tabela

```python
import sys
sys.path.insert(0, 'scripts/dados_lp')
from sheet import (build_date_row_map, check_consecutive, pending_dates,
                   partial_dates, missing_dates)
import gspread
from google.oauth2.service_account import Credentials

SHEET_ID = '169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw'
TAB = 'Dados Landingpage'

creds = Credentials.from_service_account_file(
    '.claude/sheets_credentials.json',
    scopes=['https://www.googleapis.com/auth/spreadsheets'])
ws = gspread.authorize(creds).open_by_key(SHEET_ID).worksheet(TAB)

col_a = ws.col_values(1)
dmap = build_date_row_map(col_a)
grid_rows = ws.get(f'C2:T{len(col_a)}')     # C..T = as dezesseis graváveis
grid = {i + 2: row for i, row in enumerate(grid_rows)}

buracos = check_consecutive(dmap)
pendentes = pending_dates(dmap, grid, UNTIL)
parciais = partial_dates(dmap, grid, UNTIL)
faltantes = missing_dates(dmap, UNTIL)
print('buracos:', buracos)
print('pendentes:', pendentes)
print('parciais (serão puladas):', parciais)
print('linhas a criar:', faltantes)
```

**Se `buracos` não estiver vazio: reportar e PARAR.** Buraco no meio da tabela é
anomalia; inserir linha no meio deslocaria as seguintes e quebraria as âncoras
das fórmulas. O usuário decide o que fazer.

Datas-alvo = `pendentes + faltantes` (sem `$ARGUMENTS`), ou exatamente as datas
pedidas + `faltantes` (com `$ARGUMENTS`). Se não houver nada, dizer e parar.

> A coluna A já vem estendida bem além de D-1 (até 10/10/2026 hoje), então
> `faltantes` costuma vir vazia e o caminho de criar linha fica dormente. Ele
> continua correto e testado — não removê-lo.

## Fase 2 — Coleta

### 2A. Meta — uma chamada POR DIA

`mcp__meta-ads-mcp__get_insights` com `object_id="act_438086148409254"`,
`level="campaign"`, `time_range={"since": DIA, "until": DIA}`, `limit=100`.

O MCP **ignora `time_increment`** e agrega o range inteiro, por isso uma chamada
por dia. Por dia, somando **todas** as campanhas devolvidas:

- `impressions` → C
- o `value` da action `link_click` → D
- o `value` da action `lead` → E
- `spend` → F

Campanha sem a action na lista contribui com 0 para aquela métrica.

### 2B. Google — uma chamada cobre o intervalo

`mcp__google-ads-mcp__search_search` com `customer_id="3921127876"`,
`resource="campaign"`, fields
`["segments.date","metrics.impressions","metrics.clicks","metrics.cost_micros","metrics.conversions"]`,
conditions `["segments.date BETWEEN '[MENOR_DIA]' AND '[MAIOR_DIA]'"]`.

Agrupar por `segments.date` e somar todas as campanhas: impressões → K,
cliques → L, `conversions` (arredondar só no fim) → M, `cost_micros`/1e6 → N.

### 2C. GA4 — uma chamada cobre o intervalo

`mcp__ga4__ga4_run_report` com `metrics=["sessions","bounceRate"]`,
`dimensions=["date","hostName"]`, `date_start`/`date_end` no intervalo,
`limit=500`.

Filtrar **apenas** `hostName == "lp2.caveo.com.br"`. Descartar
`lp.caveo.com.br` e `welcome.caveo.com.br`.

> A dimensão `date` do GA4 volta como `YYYYMMDD` (ex.: `20260813`), sem hífen —
> converter para ISO antes de casar com as datas-alvo.

Sessões → S. `bounceRate` → T, **em fração** (`0.0088`), porque a célula já é
formatada como porcentagem. Dia sem linha para `lp2` grava `0` em S e T, e é
avisado no preview.

### 2D. Salesforce — MQL, SQL e fechamentos por dia × canal

**Rodar num script Python, não pelo MCP tool.** O histórico do período é de
milhares de linhas (6.472 em 5 dias) e devolver isso pelo tool inunda o
contexto sem necessidade — a agregação é local. Importar o próprio servidor
MCP, que já traz `sf_query_all` com paginação e renovação de token:

```python
import json, io, os, sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

os.environ.update(json.load(io.open('.mcp.json'))
                  ['mcpServers']['salesforce-mcp']['env'])
sys.path.insert(0, '.claude')
sys.path.insert(0, 'scripts/acompanhamento_diario')
import salesforce_mcp_server as sf
from qualification import mql_day, sql_day     # regras da fundação

BR = timezone(timedelta(hours=-3))
def dia_br(ts):
    """'2026-08-18T00:02:43.000+0000' -> '2026-08-17' (dia em -03:00)."""
    return datetime.strptime(ts, '%Y-%m-%dT%H:%M:%S.%f%z').astimezone(BR).date().isoformat()

# Fragmentos cpc da fundação, prefixados p/ OpportunityHistory.
HIST_FRAG = {
    'meta':   "(Opportunity.UtmMed__c LIKE '%cpc%' "
              "AND (NOT Opportunity.UtmSou__c LIKE '%google%'))",
    'google': "(Opportunity.UtmMed__c LIKE '%cpc%' "
              "AND Opportunity.UtmSou__c LIKE '%google%')",
}

for canal in ('meta', 'google'):
    res = sf.sf_query_all(
        f"SELECT OpportunityId, StageName, CreatedDate, Opportunity.IsWon "
        f"FROM OpportunityHistory "
        f"WHERE Opportunity.CreatedDate >= {LOOKBACK}T00:00:00-03:00 "
        f"AND Opportunity.CreatedDate <= {END}T23:59:59-03:00 "
        f"AND {HIST_FRAG[canal]} ORDER BY OpportunityId, CreatedDate",
        max_records=50000)
    opps = defaultdict(lambda: {'history': [], 'is_won': False})
    for r in res['records']:
        o = opps[r['OpportunityId']]
        o['history'].append({'stage': r['StageName'],
                             'date': dia_br(r['CreatedDate'])})
        # IsWon chega ANINHADO em r['Opportunity']; 'Ganho não Identificado'
        # tem IsWon=false no SF mas conta como ganho pela fundação.
        o['is_won'] = (bool((r.get('Opportunity') or {}).get('IsWon'))
                       or r['StageName'] == 'Ganho não Identificado'
                       or o['is_won'])
    for o in opps.values():
        d = mql_day(o['history'], o['is_won'])
        if d in acc: acc[d][f'{canal}_mql'] += 1
        d = sql_day(o['history'], o['is_won'])
        if d in acc: acc[d][f'{canal}_sql'] += 1

# Fechamentos: uma query só, canal decidido pela fonte (espelha os fragmentos).
res = sf.sf_query_all(
    f"SELECT Id, UtmSou__c, LastStageChangeDate FROM Opportunity "
    f"WHERE LastStageChangeDate >= {START}T00:00:00-03:00 "
    f"AND LastStageChangeDate <= {END}T23:59:59-03:00 "
    f"AND UtmMed__c LIKE '%cpc%' "
    f"AND (IsWon = true OR StageName = 'Ganho não Identificado')",
    max_records=50000)
for r in res['records']:
    canal = 'google' if 'google' in (r.get('UtmSou__c') or '').lower() else 'meta'
    d = dia_br(r['LastStageChangeDate'])
    if d in acc: acc[d][f'{canal}_fechamentos'] += 1
```

**Se qualquer uma das quatro fontes falhar, interromper antes de gravar.** Um
dia gravado pela metade confunde o sinal de "pendente" da Fase 1.

## Fase 3 — Preview

Imprimir a tabela data × dezesseis métricas, **mais as células A1 exatas** que
serão gravadas, mais a lista de linhas que serão criadas e das datas parciais
puladas. Então perguntar:

```
Gravar estes dias na aba "Dados Landingpage"? (sim para confirmar)
```

## Fase 4 — Gravação (só após "sim")

**Ordem obrigatória: linhas novas primeiro, métricas depois.** Invertido, a
métrica cairia numa linha que ainda não existe.

```python
from sheet import (append_rows_payload, cell_updates, ensure_bounce_format,
                   write_updates)

# 1) criar as linhas que faltam
if faltantes:
    primeira_nova = max(dmap.values()) + 1
    payload = append_rows_payload(primeira_nova, faltantes)
    write_updates(ws, payload, value_input_option='USER_ENTERED')
    for offset, iso in enumerate(faltantes):
        dmap[iso] = primeira_nova + offset
    print(f'Criadas {len(faltantes)} linhas novas: {", ".join(faltantes)}')

# 2) gravar as métricas
# METRICAS = {iso: {chave de COLS: valor}} — as dezesseis chaves sempre presentes
total = 0
for iso, metrics in sorted(METRICAS.items()):
    total += write_updates(ws, cell_updates(dmap[iso], metrics),
                           value_input_option='RAW')
print(f'Gravadas {total} células.')

# 3) garantir o formato de porcentagem na coluna T
ensure_bounce_format(ws, min(dmap.values()), max(dmap.values()))

# 4) conferir o formato das datas novas
if faltantes:
    linhas = [dmap[iso] for iso in faltantes]
    lidas = ws.get(f'A{min(linhas)}:A{max(linhas)}',
                   value_render_option='UNFORMATTED_VALUE')
    print('coluna A das linhas novas (deve vir número serial):', lidas)
```

Se a releitura devolver **texto** em vez de número serial, a linha nova não
herdou o formato de data — aplicar o formato explicitamente antes de encerrar.

> **Por que o passo 3 existe.** O bounce é gravado em fração (`0.0263`) e só a
> linha 2 da planilha, preenchida à mão, já vinha com o formato de porcentagem.
> As demais linhas nasceram sem formato nenhum, e a primeira execução real
> gravou `0,02629969419` no lugar de `2,63%`. `ensure_bounce_format` é barato e
> idempotente — rodar sempre, não só quando cria linha.

`cell_updates` aceita um **subconjunto** das chaves de `COLS`. É isso que
permite backfill cirúrgico de um bloco só (as seis colunas de Salesforce —
G/H/I e O/P/Q — numa linha que já tem Meta/Google/GA4) sem tocar no que já
está gravado.

## Fase 5 — Relatório

Dizer quantas células foram gravadas, quantas linhas foram criadas (**com as
datas**, o usuário pediu esse aviso explicitamente), e listar as datas parciais
que foram puladas.
