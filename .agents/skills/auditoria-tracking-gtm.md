---
name: auditoria-tracking-gtm
description: Roda a checagem de saúde do tracking da Caveo — estrutura do container GTM (tags, triggers, variáveis), captura de click IDs e cookie caveo_attribution, campos de click ID no Salesforce, consentimento LGPD, e reconciliação eventos × oportunidades. Operada pelo agente tracking-conversoes. Use para auditar o tracking antes de confiar nas conversões.
---

# Skill: Auditoria de Tracking / GTM — Caveo

Checagem de saúde ponta a ponta da medição. Operada pelo agente
**`tracking-conversoes`**. Complementa a skill `conversoes-oportunidade`
(Fase 0/Fase 4).

## Fonte única de regras
Filtro de canal pago (reconciliação): **`docs/fundacao-dados.md`**.

## Ferramentas
`gtm` (container das LPs) · `salesforce-mcp` (campos + reconciliação).

## Fase 1 — GTM (client-side)
- `gtm_list_tags` / `gtm_list_triggers` / `gtm_list_variables` no container.
- Conferir: variáveis de click ID (gclid/gbraid/wbraid/fbclid, cookies _fbc/_fbp),
  tag de persistência do cookie `caveo_attribution`, tag de disponibilização no
  formulário, Pixel/Dataset Meta e tag Google instalados.
- Sinalizar tags pausadas, triggers quebrados, variáveis não usadas.

## Fase 2 — Salesforce (server-side)
- `salesforce_describe Opportunity` → confirmar campos `gclid__c`, `gbraid__c`,
  `wbraid__c`, `fbclid__c`, `fbc__c`, `fbp__c`, `Consentimento_Marketing__c`,
  `Data_Envio_Formulario__c`.
- Amostrar oportunidades recentes: quantos % têm click ID gravado?
```sql
SELECT Id, Name, gclid__c, fbclid__c, fbc__c, fbp__c, UtmSou__c, CreatedDate
FROM Opportunity
WHERE CreatedDate = LAST_N_DAYS:7
ORDER BY CreatedDate DESC
```

## Fase 3 — Reconciliação
Nº de eventos de conversão enviados × nº de Oportunidades de canal pago
(filtro da fundação) no período. Apontar divergência e causa provável.

## Fase 4 — LGPD
Confirmar que só há envio de PII com `Consentimento_Marketing__c = true`;
Data Processing Options (Meta) e Consent Mode (Google) configurados.

## Formato de saída
```
AUDITORIA DE TRACKING — [Data]

GTM:        [🟢/🟡/🔴] [resumo: tags/triggers/variáveis; gaps]
CLICK IDS:  [x]% das opps (7d) com gclid; [y]% com fbc/fbclid
SALESFORCE: [campos presentes/faltando]
RECONCIL.:  [eventos] vs [opps pagas] → [divergência]
LGPD:       [🟢/🟡/🔴] [consentimento + DPO/Consent Mode]

GAPS PRIORITÁRIOS:
1. [o mais crítico + ação]
2. ...
```
