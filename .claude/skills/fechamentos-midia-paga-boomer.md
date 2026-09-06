---
name: fechamentos-midia-paga-boomer
description: Coleta as oportunidades Ganho do Salesforce atribuídas a mídia paga (Meta/Google, cpc direto ou cruzamento por click ID) e grava/atualiza uma linha por fechamento na aba "Clientes Dash Boomer " da planilha Premissas_e_Clientes — Id, Nome, Canal, Estágio, datas, todas as colunas de UTM/click ID e uma Descrição explicando os casos de cruzamento (fechamento em last click orgânico com anúncio pago identificado por click ID). Padrão: mês corrente até D-1. Use sempre que o usuário pedir o levantamento/atualização de fechamentos de mídia paga para o dashboard da Boomer, mesmo sem citar o nome da skill — gatilhos como "atualiza os fechamentos de mídia paga", "puxa os fechamentos desse mês pro dash da Boomer" ou "roda o levantamento de mídia paga" devem acionar esta skill.
---

# Skill: Fechamentos de Mídia Paga — Dash Boomer

Extrai do Salesforce as Oportunidades **Ganho** atribuídas a **mídia paga**
(Meta ou Google, por UTM `cpc` direto ou por cruzamento via click ID) e
mantém uma lista viva na aba `Clientes Dash Boomer ` — uma linha por
Oportunidade, upsert por `Id Oportunidade`. Não é um bloco de métricas
agregadas como `/dados-lp-caveo` ou `/acompanhamento-diario-caveo`: é a
lista crua, para o dashboard da Boomer.

## Conta e planilha

| Recurso | Identificador |
|---|---|
| Salesforce | via `.claude/salesforce_mcp_server.py` (mesma import do Fase 2D de `/dados-lp-caveo`) |
| Planilha | `1BTyQIcp5FvXpjXTgVkbsLQC09s1N7y_RCtTDvN7a2YE` ("Premissas_e_Clientes") |
| Aba | `Clientes Dash Boomer ` — **atenção ao espaço no final do nome**, sem ele `worksheet()` lança `WorksheetNotFound` |
| Auth Sheets | `.claude/sheets_credentials.json` (service account) |
| Helper | `scripts/clientes_dash_boomer/sheet.py` |

## Cabeçalho (18 colunas, A–R)

```
Id Oportunidade; Nome; Canal; Estagio; IsWon; Fechamento (Data); Criado em;
UtmSou__c; UtmMed__c; UtmCam__c; UtmCon__c; UtmTer__c;
gclid__c; gbraid__c; wbraid__c; fbclid__c; fbc__c; Descrição
```

`HEADER` em `sheet.py` é a fonte única — nunca redigitar a lista.

## Atribuição — mídia paga "all" (cpc + cruzamento)

Ao contrário de `/dados-lp-caveo` (só cpc direto, por pedido específico do
cliente para aquela aba), esta skill usa a regra **completa** da fundação:
cpc direto **OU** cruzamento por click ID (Meta tem prioridade sobre Google
em conflito). Fragmento pronto em `sheet.PAID_MEDIA_CLAUSE`, espelhando
`docs/fundacao-dados.md` § "Fragmentos SOQL prontos", coluna `all` — **não
reescrever a lista de fontes de memória**.

O campo **Canal** não existe no Salesforce — é derivado por
`sheet.canal_e_cruzamento()` a partir de `UtmSou__c`/`UtmMed__c` (regra §1
da fundação) com fallback para o click ID presente quando o medium não é
cpc. Quando o fechamento cai no fallback (cruzamento), a coluna
**Descrição** é preenchida explicando que o último clique foi
orgânico/direto mas houve interação prévia com anúncio pago — é essa
frase que o usuário pediu para diferenciar esses casos visualmente na
planilha. Fechamento por cpc direto deixa a Descrição vazia.

## Fase 0 — Período-alvo

- **Padrão (sem `$ARGUMENTS`):** mês corrente, do dia 1 até D-1 (fuso
  `America/Sao_Paulo`, `-03:00`). Calculado por `sheet.month_bounds_default`.
- **Override (`$ARGUMENTS`):** `sheet.parse_period_arg` aceita:
  - `YYYY-MM` — o mês inteiro; se for o mês corrente, capa em D-1 igual ao
    padrão; mês futuro é erro.
  - `YYYY-MM-DD a YYYY-MM-DD` — intervalo explícito, **sem** cap em D-1 (é
    pedido explícito do usuário, ele decide se quer incluir hoje).
- Se hoje é dia 1 do mês e não veio `$ARGUMENTS`, não há nenhum D-1 dentro
  do mês corrente ainda — `parse_period_arg` levanta `ValueError`. Reportar
  e parar, não inventar um período.

```python
import sys
from datetime import date, timedelta, timezone
sys.path.insert(0, 'scripts/clientes_dash_boomer')
from sheet import parse_period_arg, PAID_MEDIA_CLAUSE, HEADER

HOJE = datetime.now(timezone(timedelta(hours=-3))).date()
START, END = parse_period_arg($ARGUMENTS, HOJE)  # ValueError -> reportar e parar
```

## Fase 1 — Coleta no Salesforce

Uma query cobre os dois canais — o Canal é derivado depois, localmente, não
por duas queries separadas como em `/dados-lp-caveo`.

```python
import os, json, io
os.environ.update(json.load(io.open('.mcp.json'))
                  ['mcpServers']['salesforce-mcp']['env'])
sys.path.insert(0, '.claude')
import salesforce_mcp_server as sf

res = sf.sf_query_all(
    "SELECT Id, Name, StageName, IsWon, LastStageChangeDate, CreatedDate, "
    "UtmSou__c, UtmMed__c, UtmCam__c, UtmCon__c, UtmTer__c, "
    "gclid__c, gbraid__c, wbraid__c, fbclid__c, fbc__c "
    "FROM Opportunity "
    f"WHERE LastStageChangeDate >= {START.isoformat()}T00:00:00-03:00 "
    f"AND LastStageChangeDate <= {END.isoformat()}T23:59:59-03:00 "
    "AND (IsWon = true OR StageName = 'Ganho não Identificado') "
    f"AND {PAID_MEDIA_CLAUSE} "
    "ORDER BY LastStageChangeDate ASC",
    max_records=10000)
records = res['records']
```

Fechamento usa `LastStageChangeDate` (modelo de duas datas, §5 da
fundação) — não `CreatedDate`. Zero resultados é um estado válido (mês sem
fechamento pago ainda); reportar e parar sem escrever nada.

## Fase 2 — Upsert na aba

```python
import gspread
from google.oauth2.service_account import Credentials
from sheet import id_row_map, diff_rows, write_diff

creds = Credentials.from_service_account_file(
    '.claude/sheets_credentials.json',
    scopes=['https://www.googleapis.com/auth/spreadsheets'])
ws = gspread.authorize(creds).open_by_key(
    '1BTyQIcp5FvXpjXTgVkbsLQC09s1N7y_RCtTDvN7a2YE'
).worksheet('Clientes Dash Boomer ')

col_a = ws.col_values(1)
if not col_a:  # aba vazia — grava o cabeçalho antes de qualquer linha
    ws.update(range_name='A1', values=[HEADER], value_input_option='USER_ENTERED')
    col_a = [HEADER[0]]

existentes = id_row_map(col_a)
updates, novas = diff_rows(records, existentes)
```

**Upsert incondicional por `Id Oportunidade`**: se o Id já tem linha na
aba, a linha inteira é regravada com o dado atual do Salesforce (uma opp
Ganho pode ter o UTM/data reprocessado depois da primeira coleta); se é Id
novo, vira linha nova no fim. Isso é o que permite rodar a skill todo dia
sem duplicar nem deixar dado velho — não checar campo a campo antes de
decidir, sempre sobrescrever a linha existente é mais simples e igualmente
correto.

## Fase 3 — Preview e confirmação

Antes de gravar, mostrar:
- Período usado (`START`–`END`) e nº de registros da query.
- Quantas linhas serão **atualizadas** (Id já na aba) vs **criadas**.
- As linhas de cruzamento (Descrição não vazia) — nome + canal + sinal do
  click ID — para o usuário conferir esses casos antes de escrever, igual
  ao que foi feito manualmente na primeira execução desta skill.

Perguntar:
```
Gravar N atualizações e M linhas novas na aba "Clientes Dash Boomer "? (sim para confirmar)
```

## Fase 4 — Gravação (só após "sim")

```python
n_upd, n_new = write_diff(ws, updates, novas)
```

## Fase 5 — Relatório

Dizer o período coletado, quantas linhas foram atualizadas e quantas
criadas, e listar de novo os casos de cruzamento gravados nesta execução
(se houver) — é a parte que mais precisa de checagem humana, porque é
atribuição inferida, não um UTM direto.
