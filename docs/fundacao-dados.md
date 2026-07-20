<!-- GERADO AUTOMATICAMENTE — não editar. Fonte: config/business-rules.ts. Rode `npm run docs:rules`. -->

# Fundação de Dados — Regras de Atribuição (Caveo)

Fonte única de verdade para a camada agêntica (skills/agentes). Antes de montar
qualquer query SOQL, use os mapeamentos abaixo — **não** embutir listas fixas
próprias nos arquivos de skill/agente.

## 1. Canal — UTM source → plataforma

| Plataforma | Regra |
|---|---|
| Meta Ads | `UtmSou__c LIKE` `facebook%`, `Instagram%`, `messenger%`, `audience_network%`, `{{placement}}` |
| Google/YouTube | `UtmSou__c LIKE` `google%`, `Youtube%` |
| Não Digital | Todo UtmSou__c preenchido que não bate em meta/google (indicações, faculdade, WhatsApp, etc.) |
| Sem UTM | UtmSou__c = null — pipeline não atribuído |

## 2. Cruzamento — click ID quando `UtmMed__c` != cpc

Oportunidades cujo medium NÃO é cpc mas tiveram interferência de mídia paga via
click ID. Meta tem prioridade sobre Google em caso de conflito.

| Plataforma | Campos de click ID |
|---|---|
| Meta | `fbc__c`, `fbclid__c` |
| Google | `gclid__c`, `gbraid__c` (excluído se houver click ID Meta) |

## 3. Estágios do funil

| Grupo | Estágios |
|---|---|
| Em tratamento | `Nova`, `Contato Realizado`, `Aguardando Resposta`, `Reunião Agendada`, `Standy-By`, `Stand By`, `Transferido para humano` |
| Proposta | `Proposta Enviada` |
| Ganho | `IsWon = true OR StageName = 'Ganho não Identificado'` |
| Perdido | `Perdido` |

## 4. Contratante — `TipCte__c` (corrigido 2026-07)

| Grupo | Valores |
|---|---|
| RF — Recém Formados | `Formando`, `Médico Faculdades` |
| MM — Médico Maduro | `Médico`, `Revalida` |

> Correção: `Médico` passou de RF para MM. O valor antigo `Médicos Maduros` foi
> substituído e não é mais considerado.

## 5. Modelo de duas datas

- Entrada do funil (no_crm/em tratamento/proposta) → `CreatedDate`
- Fechamento/perda (ganho/perdido) → `LastStageChangeDate`

Entrada do funil conta pela data de criação; fechamento/perda pela data da última mudança de estágio, mesmo que a oportunidade tenha sido criada em período anterior.

## 6. Coorte de fechamento

Escopo: **ganho** (Fechado + Ganho não Identificado; não inclui Perdido).
Origem por `CreatedDate`; referência por `LastStageChangeDate`.
Fechamentos Ganho de um período quebrados por mês de origem da captação (CreatedDate), agregados em buckets YYYY-MM fora do SOQL.

## 7. Qualificação — MQL / SQL (nomenclatura interna)

Cumulativo via `OpportunityHistory` (a opp conta se **já atingiu** o estágio).
O dia do MQL/SQL é o da **primeira transição** que cruza o gate.

| Nível | Já atingiu (qualquer um) | Ganho também conta |
|---|---|---|
| MQL | `Aguardando Resposta`, `Reunião Agendada`, `Proposta Enviada` | sim |
| SQL | `Proposta Enviada` | sim |

## 8. Alocação de segmento (campanhas de mídia paga)

Marcadores no nome da campanha: MM = `[MM]`, RF = `[RF]`.
Campanha **sem** marcador de segmento (institucional) → investimento e leads
rateados pela participação de opps do segmento naquela campanha (SF). Fallback
(gasto no dia, 0 opps) = 50/50.

## Fragmentos SOQL prontos (gerados dos builders)

| Filtro | all | meta | google |
|---|---|---|---|
| cpc (direto) | `UtmMed__c LIKE '%cpc%'` | `(UtmMed__c LIKE '%cpc%' AND (NOT UtmSou__c LIKE '%google%'))` | `(UtmMed__c LIKE '%cpc%' AND UtmSou__c LIKE '%google%')` |
| cruzamento | `((UtmMed__c = null OR (NOT UtmMed__c LIKE '%cpc%')) AND (fbc__c != null OR fbclid__c != null OR gclid__c != null OR gbraid__c != null))` | `((UtmMed__c = null OR (NOT UtmMed__c LIKE '%cpc%')) AND (fbc__c != null OR fbclid__c != null))` | `((UtmMed__c = null OR (NOT UtmMed__c LIKE '%cpc%')) AND (gclid__c != null OR gbraid__c != null) AND fbc__c = null AND fbclid__c = null)` |

Contratante: all → `AND TipCte__c IN ('Formando','Médico Faculdades','Médico','Revalida')` · rf → `AND TipCte__c IN ('Formando','Médico Faculdades')` · mm → `AND TipCte__c IN ('Médico','Revalida')`

Ganho: `(IsWon = true OR StageName = 'Ganho não Identificado')`
