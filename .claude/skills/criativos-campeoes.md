---
name: criativos-campeoes
description: Identifica os criativos campeões de um período — ranqueia por oportunidades geradas e por MQL/SQL atribuídos ao criativo (via utm_content), para deixar fácil ver qual comunicação está vencendo. Operada pelo agente analista-midia-paga-crm (usa os benchmarks dele). Use quando precisar saber quais criativos performam melhor no funil, não só no CTR.
---

# Skill: Criativos Campeões — Caveo

Ranqueia criativos por **resultado no funil** (oportunidades + MQL/SQL), não só
por métrica de plataforma. Operada pelo agente **`analista-midia-paga-crm`** —
os benchmarks (🔴🟡🟢) e o julgamento vêm dele.

## Fonte única de regras
Filtro de canal pago, estágios e contratante: **`docs/fundacao-dados.md`**
(cpc + cruzamento, duas datas). Atribuição por criativo = **`UtmCon__c`**
(utm_content = conjunto/grupo de anúncios).

## Contas
Meta `act_438086148409254` · Google `3921127876` · Salesforce `caveo.my.salesforce.com`

## Fase 0 — Período e escopo
Perguntar (ou assumir mês corrente 01→D-1): período, plataforma (Meta/Google/ambas),
contratante (RF/MM/ambos).

## Fase 1 — Coleta (paralela)

### 1A. Performance por criativo (plataforma)
- **Meta:** `get_insights` `level=ad`, campos `ad_name, adset_name, campaign_name,
  impressions, clicks, spend, ctr, actions` (lead), `time_range`.
- **Google:** `search` em `ad_group_ad` com `metrics.*` por anúncio/grupo.

### 1B. Funil por criativo (Salesforce)
```sql
-- rodar por plataforma com [FILTRO_META]/[FILTRO_GOOGLE] da fundação
SELECT UtmCon__c, StageName, COUNT(Id) qtd
FROM Opportunity
WHERE CreatedDate >= [START]T00:00:00-03:00
  AND CreatedDate <= [END]T23:59:59-03:00
  AND UtmCon__c != null
  AND ([FILTRO_META | FILTRO_GOOGLE])
GROUP BY UtmCon__c, StageName
ORDER BY COUNT(Id) DESC
```
> Definir MQL/SQL a partir dos grupos de estágio da fundação (em tratamento →
> MQL/SQL; proposta+; ganho). Se `UtmCon__c` tiver baixa cobertura, **avisar**
> que o ranking é parcial antes de confiar nele.

## Fase 2 — Cruzamento e ranking
Casar `UtmCon__c` (SF) com o criativo da plataforma (`adset_name`/`ad_name`).
Para cada criativo: Investimento, CTR, Leads, **Oportunidades**, **MQL**, **SQL**,
Custo/Oportunidade, taxa Lead→Opp.

Ranquear por **custo por oportunidade** e por **volume de MQL/SQL** (não por CTR).

## Formato de saída
```
CRIATIVOS CAMPEÕES — [Plataforma] | [Período]

┌ Criativo (utm_content) ┬ Invest ┬ CTR ┬ Leads ┬ Opps ┬ MQL ┬ SQL ┬ Custo/Opp ┬ Status ┐
│ [nome]                 │ R$ ..  │ ..% │ ..    │ ..   │ ..  │ ..  │ R$ ..     │ 🟢/🟡/🔴 │
...

TOP 2 CAMPEÕES: [nome] — [por quê: bom custo/opp + volume de MQL]
ALERTA DE COBERTURA: UtmCon__c preenchido em [x]% das opps [se < 80%]
```

Ao final, se um criativo campeão sugerir uma linha a escalar/replicar, emitir
`HANDOFF → criativos` para gerar variações.
