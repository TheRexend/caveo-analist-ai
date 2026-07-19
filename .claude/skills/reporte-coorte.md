---
name: reporte-coorte
description: Gera a coorte de fechamento — dos Fechados Ganho de um período (mês do fechamento), quanto veio de captações de cada mês de origem. Deixa visível que parte do fechamento de julho veio de captações de meses anteriores. Escopo só Ganho. Use para o relatório de coorte ou quando precisar separar volume fechado por safra de origem.
---

# Skill: Reporte de Coorte de Fechamento — Caveo

Dos **Fechados Ganho** de um período (referência = mês do fechamento por
`LastStageChangeDate`), quebra por **mês de origem da captação** (`CreatedDate`).
Escopo: **só Ganho** (Fechado + Ganho não Identificado) — não inclui Perdido.

## Fonte única de regras
Regra de coorte, `WON_CLAUSE`, canal e contratante: **`docs/fundacao-dados.md`**
(seção "Coorte de fechamento"). Buckets de mês (`YYYY-MM`) montados fora do SOQL.

## Fase 0 — Período de referência
Mês (ou intervalo) de **fechamento** a analisar. Plataforma e contratante
opcionais (default: ambos).

## Fase 1 — Coleta (Salesforce)
```sql
-- ganho no período de referência, quebrado por dia de ORIGEM (CreatedDate)
SELECT DAY_ONLY(convertTimezone(CreatedDate)) origem, COUNT(Id) qtd
FROM Opportunity
WHERE ([WON_CLAUSE])
  AND LastStageChangeDate >= [REF_START]T00:00:00-03:00
  AND LastStageChangeDate <= [REF_END]T23:59:59-03:00
  [+ FILTRO_CANAL e/ou TipCte da fundação, se filtrando]
GROUP BY DAY_ONLY(convertTimezone(CreatedDate))
```
> `WON_CLAUSE` e filtros vêm da fundação. Para plataforma/contratante, aplicar
> `[FILTRO_META]`/`[FILTRO_GOOGLE]` e/ou o filtro de `TipCte__c`.

## Fase 2 — Agregação em coorte
Agrupar os dias de origem em meses (`YYYY-MM`). Montar:

```
COORTE DE FECHAMENTO — fechados em [REF: mês/ano]

Total fechado no mês: [N]
├─ origem [mês REF]      : [n]  ([%])   ← fechou no mesmo mês que entrou
├─ origem [mês REF-1]    : [n]  ([%])
├─ origem [mês REF-2]    : [n]  ([%])
└─ origem anteriores     : [n]  ([%])

LEITURA: [x]% do fechamento de [REF] veio de captações de meses anteriores —
[interpretação: ciclo de venda longo / safra antiga maturando / etc.]
```

## Pontos de atenção
- Ganho por `LastStageChangeDate`; origem por `CreatedDate` (modelo de duas datas).
- `DAY_ONLY(convertTimezone(...))` para agrupar no fuso local (evita erro de UTC).
- Só Ganho — Perdido fora de escopo (por decisão do design).
