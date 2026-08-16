---
name: dados-lp-caveo
description: Coleta as métricas diárias de topo de funil da landing page (impressões, cliques, leads e investimento de Meta Ads e Google Ads; sessões e bounce rate do GA4) e grava na aba "Dados Landingpage" da planilha de resultados. Preenche todos os dias pendentes até D-1 e estende a coluna A quando a data ainda não tem linha. Use para atualizar o monitoramento diário da LP.
---

# Skill: Dados Landing Page — Caveo

Coleta diária de topo de funil por **dia × canal** e gravação na aba
`Dados Landingpage`. Preenche **todo dia pendente até D-1**, não só ontem.

## Contas e planilha

| Recurso | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` |
| Google Ads | `3921127876` |
| GA4 | host `lp2.caveo.com.br` |
| Planilha | `169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw`, aba `Dados Landingpage` |
| Auth Sheets | `.claude/sheets_credentials.json` (service account) |
| Helper | `scripts/dados_lp/sheet.py` |

## Réguas de métrica (NÃO alterar de cabeça)

| Coluna | Métrica | Régua |
|---|---|---|
| C | Impressões Meta | soma de `impressions`, todas as campanhas |
| D | Cliques Meta | soma de **`link_click`** em `actions` |
| E | Leads Meta | soma de **`lead`** em `actions` |
| F | Investimento Meta | soma de `spend` |
| H | Impressões Google | soma de `metrics.impressions` |
| I | Cliques Google | soma de `metrics.clicks` |
| J | Leads Google | soma de `metrics.conversions`, arredondado |
| K | Investimento Google | soma de `metrics.cost_micros` / 1e6 |
| M | Sessões GA4 | `sessions` do host `lp2.caveo.com.br` |
| N | Bounce Rate GA4 | `bounceRate` do host `lp2.caveo.com.br`, em fração |

**Duas armadilhas, provadas por reconciliação contra 13/08/2026:**

- Cliques Meta é **`link_click`**, não `clicks`. O campo `clicks` daria 573
  naquele dia; a régua certa dá 344.
- Leads Meta é **`lead`**, não `complete_registration`.
  `complete_registration` daria 9; a régua certa dá 12.

**Esta aba diverge da `/acompanhamento-diario-caveo` de propósito.** Lá, leads
Meta é `complete_registration` e só campanhas `[LEADS]` entram. As duas
planilhas nunca vão bater. Isso é escolha do cliente para esta aba — não
"consertar".

## Colunas proibidas

**B, G, L, O** são rótulos fixos. **P–W** são as fórmulas do bloco Total Geral.
A skill nunca escreve nessas colunas numa linha existente. `COLS` do helper não
as contém, então `cell_updates` é incapaz de acertá-las.

## Zero explícito (regra de ouro)

Todo dia processado grava as **dez métricas com `0`** quando não houve
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
grid_rows = ws.get(f'C2:N{len(col_a)}')
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

Agrupar por `segments.date` e somar todas as campanhas: impressões → H,
cliques → I, `conversions` (arredondar só no fim) → J, `cost_micros`/1e6 → K.

### 2C. GA4 — uma chamada cobre o intervalo

`mcp__ga4__ga4_run_report` com `metrics=["sessions","bounceRate"]`,
`dimensions=["date","hostName"]`, `date_start`/`date_end` no intervalo,
`limit=500`.

Filtrar **apenas** `hostName == "lp2.caveo.com.br"`. Descartar
`lp.caveo.com.br` e `welcome.caveo.com.br`.

> A dimensão `date` do GA4 volta como `YYYYMMDD` (ex.: `20260813`), sem hífen —
> converter para ISO antes de casar com as datas-alvo.

Sessões → M. `bounceRate` → N, **em fração** (`0.0088`), porque a célula já é
formatada como porcentagem. Dia sem linha para `lp2` grava `0` em M e N, e é
avisado no preview.

**Se qualquer uma das três fontes falhar, interromper antes de gravar.** Um dia
gravado pela metade confunde o sinal de "pendente" da Fase 1.

## Fase 3 — Preview

Imprimir a tabela data × dez métricas, **mais as células A1 exatas** que serão
gravadas, mais a lista de linhas que serão criadas e das datas parciais puladas.
Então perguntar:

```
Gravar estes dias na aba "Dados Landingpage"? (sim para confirmar)
```

## Fase 4 — Gravação (só após "sim")

**Ordem obrigatória: linhas novas primeiro, métricas depois.** Invertido, a
métrica cairia numa linha que ainda não existe.

```python
from sheet import append_rows_payload, cell_updates, write_updates

# 1) criar as linhas que faltam
if faltantes:
    primeira_nova = max(dmap.values()) + 1
    payload = append_rows_payload(primeira_nova, faltantes)
    write_updates(ws, payload, value_input_option='USER_ENTERED')
    for offset, iso in enumerate(faltantes):
        dmap[iso] = primeira_nova + offset
    print(f'Criadas {len(faltantes)} linhas novas: {", ".join(faltantes)}')

# 2) gravar as métricas
# METRICAS = {iso: {chave de COLS: valor}} — as dez chaves sempre presentes
total = 0
for iso, metrics in sorted(METRICAS.items()):
    total += write_updates(ws, cell_updates(dmap[iso], metrics),
                           value_input_option='RAW')
print(f'Gravadas {total} células.')

# 3) conferir o formato das datas novas
if faltantes:
    linhas = [dmap[iso] for iso in faltantes]
    lidas = ws.get(f'A{min(linhas)}:A{max(linhas)}',
                   value_render_option='UNFORMATTED_VALUE')
    print('coluna A das linhas novas (deve vir número serial):', lidas)
```

Se a releitura devolver **texto** em vez de número serial, a linha nova não
herdou o formato de data — aplicar o formato explicitamente antes de encerrar.

## Fase 5 — Relatório

Dizer quantas células foram gravadas, quantas linhas foram criadas (**com as
datas**, o usuário pediu esse aviso explicitamente), e listar as datas parciais
que foram puladas.
