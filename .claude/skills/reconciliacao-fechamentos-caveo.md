---
name: reconciliacao-fechamentos-caveo
description: Reconciliação sob demanda entre a planilha "Resultados Mês Atual" (fechamentos Médico/Formando) e o Salesforce atual — compara dia a dia, aponta divergência e lista oportunidades para conferência manual. Só leitura, nunca grava.
---

# Skill: Reconciliação de Fechamentos — Caveo

Compara os fechamentos (coluna O) gravados na planilha "Resultados Mês Atual"
contra o estado **atual** do Salesforce, dia a dia e segmento a segmento
(Médico/Formando). Aponta onde a divergência nasceu e lista as oportunidades
do dia sinalizado para conferência manual. **Só leitura — nunca grava na
planilha nem no Salesforce.**

## Contas e planilha

| Recurso | Identificador |
|---|---|
| Salesforce | `caveo.my.salesforce.com` |
| Planilha | `19gElL0pmUO3yPZZG0-5E1ym61wHbQM5-JohK5_wPjj4`, aba `Resultados Mês Atual` |
| Auth Sheets | `.claude/sheets_credentials.json` (service account, leitura) |

## Fundação (LER ANTES DE QUALQUER SOQL)

Mesmo modelo cpc+cruzamento de `docs/fundacao-dados.md` (fuso `-03:00`), mesma
`WON_CLAUSE` (seção 3), mesmo `classify_contratante` (seção 4, 1 argumento —
`TipCte__c`) — `from segments import classify_contratante`
(`scripts/acompanhamento_diario/segments.py`). Opps que classificam como
`"revalida"` ou `None` são descartadas, mesma regra das outras skills. NÃO
reescrever essas regras aqui.

## Fase 0 — Período

- Padrão: dia 1 do mês corrente até o último dia com valor **não vazio**
  gravado na coluna O da planilha (ver Fase 1).
- Override: `$ARGUMENTS` pode conter um intervalo explícito (`YYYY-MM-DD a
  YYYY-MM-DD`) para reconciliar uma janela menor **dentro do mês corrente**
  (ex.: só a primeira quinzena). A aba "Resultados Mês Atual" só cobre o mês
  em curso — reconciliar um mês já fechado exigiria apontar para uma aba/
  planilha arquivada, fora do escopo desta skill.
- Informar: `Reconciliando de [START] a [END]…`

## Fase 1 — Ler a planilha

```python
import sys
sys.path.insert(0, 'scripts/acompanhamento_diario')
from sheet import read_fechamentos
import gspread
from google.oauth2.service_account import Credentials

creds = Credentials.from_service_account_file(
    '.claude/sheets_credentials.json',
    scopes=['https://www.googleapis.com/auth/spreadsheets.readonly'])
ws = gspread.authorize(creds).open_by_key(
    '19gElL0pmUO3yPZZG0-5E1ym61wHbQM5-JohK5_wPjj4').worksheet('Resultados Mês Atual')

ledger = read_fechamentos(ws)  # {"medico": {dia: valor_ou_None}, "formando": {...}}

# Último dia gravado = maior dia com valor não-None em qualquer segmento.
last_day = max(
    (d for seg in ("medico", "formando") for d, v in ledger[seg].items() if v is not None),
    default=None,
)
if last_day is None:
    print("Nada gravado ainda neste mês — nada a reconciliar.")
    # não seguir para as fases seguintes.
```

Se `$ARGUMENTS` trouxer um intervalo explícito, usar START/END dali em vez de
dia 1..último dia gravado; caso contrário `END = last_day` (padrão).

## Fase 2 — Consultar o Salesforce agora (uma query agregada)

Para `[FILTRO_META]` e `[FILTRO_GOOGLE]` (fragmentos cpc+cruzamento da
fundação) combinados com `OR`:

```sql
SELECT DAY_ONLY(convertTimezone(LastStageChangeDate)) d,
       TipCte__c, COUNT(Id) cnt
FROM Opportunity
WHERE (IsWon = true OR StageName = 'Ganho não Identificado')
  AND LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
GROUP BY DAY_ONLY(convertTimezone(LastStageChangeDate)), TipCte__c
```

Para cada linha do resultado, `segment = classify_contratante(TipCte__c)`;
descartar linhas com `segment` em `(None, "revalida")`. Acumular em
`live = {"medico": {dia: n}, "formando": {dia: n}}` (dia = `int(d[8:10])`,
mesma convenção de `day_of` da skill diária). Dias sem nenhuma linha ficam
ausentes de `live[seg]` — tratar como `0` na comparação (Fase 3), **não**
como "não processado" (essa distinção é só do ledger, que tem células
vazias de verdade).

## Fase 3 — Comparar

```python
rows = []  # (dia, segmento, ledger, salesforce_agora, diff)
for day in range(1, last_day + 1):
    for seg in ("medico", "formando"):
        led = ledger[seg].get(day)
        if led is None:
            continue  # dia não processado pela skill diária — fora da comparação
        liv = live[seg].get(day, 0)
        rows.append((day, seg, led, liv, liv - led))

divergentes = [r for r in rows if r[4] != 0]
```

## Fase 4 — Drill-down nos dias divergentes

Para cada `(dia, segmento)` em `divergentes`, uma query pontual (só aquele
dia, sem filtro de `TipCte__c`):

```sql
SELECT Id, Name, Account.Name, StageName, LastStageChangeDate, TipCte__c
FROM Opportunity
WHERE (IsWon = true OR StageName = 'Ganho não Identificado')
  AND LastStageChangeDate >= [DIA]T00:00:00-03:00
  AND LastStageChangeDate <= [DIA]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
```

Classificar cada resultado com `classify_contratante` e manter só os que
classificam para o `segmento` sinalizado. Listar (Id, Name, Account, StageName,
LastStageChangeDate) para conferência manual.

> **Isso mostra a verdade atual do Salesforce para aquele dia — não um diff de
> IDs contra o que a planilha gravou** (a planilha nunca guardou IDs, só
> contagem agregada). Serve de apoio à investigação manual, não resolve
> retroativamente sozinho.

## Fase 5 — Relatório final

Imprimir, nesta ordem:

1. Tabela dia × segmento × ledger × Salesforce-agora × diff (todas as linhas
   de `rows`, com as divergentes marcadas).
2. Total do período: soma de `ledger` vs. soma de `live`, por segmento e
   geral.
3. Para cada dia/segmento divergente: a lista de oportunidades da Fase 4.

Nunca gravar nada — nem na planilha, nem em nenhuma outra aba/arquivo.
