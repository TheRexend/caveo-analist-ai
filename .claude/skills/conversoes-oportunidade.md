---
name: conversoes-oportunidade
description: Playbook para configurar, validar e reconciliar conversões personalizadas no Meta Ads e Google Ads que só registram quando um Lead vira Oportunidade no Salesforce da Caveo. Use ao implementar tracking de conversão server-side, criar campos de click ID, montar a automação no middleware ou auditar a contagem de eventos vs. oportunidades.
---

# Playbook: Conversões Personalizadas por Oportunidade no Salesforce

Operacionaliza a criação de uma conversão server-side que dispara apenas quando um Lead vira
**Oportunidade** no Salesforce — fazendo Meta e Google otimizarem para oportunidade real, não
para cadastro bruto na landing page.

> Princípio: *"CPL barato que não fecha não é eficiência — é desperdício com boa aparência."*
> Conecta-se ao agente `analista-midia-paga-crm` — use as queries dele para reconciliar.

## Contas

| Plataforma | Identificador |
|---|---|
| Salesforce | `caveo.my.salesforce.com` |
| Meta Ads | `act_438086148409254` |
| Google Ads | Caveo Tecnologia `3921127876` (MCC `5029399396`) |

## Fonte única de regras

O **filtro de canal pago** (Meta/Google) usado no gatilho do middleware e na
reconciliação vem de **`docs/fundacao-dados.md`** (modelo cpc + cruzamento).
Não reescrever listas de `UtmSou__c` aqui.

## Arquitetura

```
LP → GTM captura UTMs + click IDs + consentimento
   → Salesforce Lead → resposta qualificadora → Opportunity criada
      → middleware (Make/Zapier) detecta nova Opportunity
         ├─ Meta Conversions API → evento "OportunidadeQualificada"
         └─ Google Offline Conversion Import → "Lead Qualificado"
```

## Estado real (auditado 2026-05-19)

- O tráfego das LPs cria **Opportunity diretamente** (LeadSource `LP Turbo` / `LP MM`) — não há
  conversão Lead→Opportunity. Gatilho do middleware = criação de Opportunity.
- `UrlUtm__c` da Opportunity já recebe a URL de entrada com `gclid`/`gbraid`, mas é tipo URL
  (limite 255 caracteres) e **trunca o gclid** — inutilizável para importação. Daí os campos
  dedicados da Fase 1.
- Tráfego de Meta não traz `fbclid` na URL — o match no Meta depende de `_fbc`/`_fbp` (Pixel) +
  PII hasheada.
- Duas landing pages: `lp.caveo.com.br` (LP Turbo) e `lp2.caveo.com.br` (LP MM).
- Acesso: a Caveo controla o **GTM**; a LP e a integração LP→Salesforce são de **outro time**.

## Quando o usuário pede algo, identifique a fase

| Pedido do usuário | Fase a executar |
|---|---|
| "o tracking está certo?" / "o que a LP captura?" | Fase 0 — Auditoria |
| "como capturo o gclid/fbclid?" | Fase 1 — Captura via GTM + campos Salesforce |
| "como crio a conversão no Meta/Google?" | Fase 2 — Configuração nas plataformas |
| "como monto a automação?" | Fase 3 — Middleware |
| "está funcionando?" / "como testo?" | Fase 4 — Validação |
| "quando troco o evento de otimização?" | Fase 5 — Ativação |
| "os números batem?" | Reconciliação (ver final) |

## Fase 0 — Auditoria de tracking

1. Verificar campos do Lead/Opportunity com `salesforce_describe`. Estado conhecido: existem os
   campos UTM (`UtmSou__c`, `UtmMed__c`, `UtmCam__c`, `UtmCon__c`, `UtmTer__c`, `UrlUtm__c`) —
   **não existem campos de click ID**.
2. Conferir se `UrlUtm__c` já guarda a URL completa de entrada (pode conter `gclid`/`fbclid` na
   query string — aproveitável mas frágil; usar campos dedicados mesmo assim).
3. Confirmar Pixel/Dataset do Meta e tag do Google instalados na LP.
4. Confirmar captura de consentimento LGPD no formulário.

## Fase 1 — Captura de click IDs

Dividida em duas frentes: GTM (controlado pela Caveo) e handoff (outro time — LP + admin Salesforce).

### Frente GTM (controlada internamente)

**Variáveis** (Variáveis → Nova):
- `URL - gclid` / `URL - gbraid` / `URL - wbraid` / `URL - fbclid` — tipo "Variável de URL",
  Componente "Consulta", Chave de consulta = o nome do parâmetro.
- `Cookie - _fbp` / `Cookie - _fbc` — tipo "Cookie primário".
- `JS - fbc` — Variável JavaScript personalizada: se `Cookie - _fbc` vazio e `URL - fbclid`
  presente, retorna `fb.1.<timestamp atual>.<fbclid>`; senão retorna `Cookie - _fbc`.

**Tag 1 — Persistência** (HTML personalizado, aciona em todas as páginas das LPs):
lê os parâmetros; havendo qualquer click ID, grava/atualiza um cookie 1st-party próprio
`caveo_attribution` (JSON com gclid, gbraid, wbraid, fbclid, fbc, fbp, ts) com validade ~90 dias.
Modelo last-touch: sobrescreve quando uma nova URL traz click ID.

**Tag 2 — Disponibilização** (HTML personalizado, aciona na visibilidade do formulário):
lê o cookie `caveo_attribution` e injeta os valores em `<input type="hidden">` dentro do `<form>`.
Atenção: se o formulário for SPA/React e enviar via JS com lista fixa de campos, inputs injetados
podem ser ignorados — nesse caso o time da LP precisa ler o cookie diretamente (ver handoff).

### Frente handoff (outro time — LP + admin Salesforce)

**Campos personalizados no objeto Opportunity** (a LP cria Opportunity direto — não precisa no Lead):

| API Name | Tipo | Função |
|---|---|---|
| `gclid__c` | Text(255) | Click ID do Google |
| `gbraid__c` | Text(255) | Click ID iOS (app→web) |
| `wbraid__c` | Text(255) | Click ID iOS (web) |
| `fbclid__c` | Text(255) | Click ID do Meta |
| `fbc__c` | Text(255) | Cookie `_fbc` do Meta |
| `fbp__c` | Text(255) | Cookie `_fbp` do Meta |
| `Consentimento_Marketing__c` | Checkbox | Consentimento LGPD |
| `Data_Envio_Formulario__c` | DateTime | Vira o `event_time` da conversão |

**Pedido ao time da LP:** incluir esses 8 valores no envio do formulário ao Salesforce —
preferencialmente lendo o cookie `caveo_attribution` gravado pela Tag 1 do GTM — e mapeá-los
aos campos `*__c` acima na integração LP→Salesforce.

> Não reutilizar `UrlUtm__c`: é tipo URL (limite 255 caracteres) e **trunca o gclid**, tornando-o
> inutilizável. Os campos dedicados acima resolvem isso.

## Fase 2 — Configurar as conversões

### Meta (Events Manager — conta `act_438086148409254`)

1. Events Manager → abrir o **Dataset** (antigo Pixel) da conta. Anotar o **Dataset ID**.
2. Settings → Conversions API → **Generate access token**. Guardar com segurança — entra no
   middleware na Fase 3.
3. O evento custom `OportunidadeQualificada` passa a existir assim que o primeiro evento chega
   via API; não precisa criar antes.
4. Criar a **Custom Conversion** "Oportunidade Qualificada (Salesforce)": Data Sources → Custom
   Conversions → Create → origem = Dataset → regra pelo nome do evento `OportunidadeQualificada`
   → categoria "Lead".
5. LGPD: revisar Data Processing Options se aplicável.

### Google Ads (Caveo Tecnologia `3921127876`)

1. Auto-tagging deve estar ATIVO (confirmado: `gclid`/`gbraid` já aparecem nas URLs).
2. Ferramentas → Conversões → Nova ação → **Importar** → "Importações de conversões de cliques"
   → "Acompanhar conversões de cliques (com GCLID)".
3. Nome: `Oportunidade Qualificada (Salesforce)`. Categoria: **Lead qualificado**.
4. Valor: "usar valores diferentes" (o middleware envia o `Amount`). Contagem: **Uma**.
5. Janela de conversão: 30–90 dias. Modelo de atribuição: padrão da conta.
6. Iniciar como conversão **secundária** (só observação); promover a **primária** na Fase 5 após
   validar volume. Anotar o nome/ID da ação — entra no middleware.
7. Ativar **Enhanced Conversions for Leads** (Conversões → Configurações) — habilita o fallback
   por e-mail hasheado quando faltar `gclid`.

## Fase 3 — Automação no middleware (Make/Zapier)

- **Gatilho:** nova Opportunity. Para tempo real, Flow do Salesforce chamando webhook do
  middleware (melhor que polling).
- **Filtro de canal pago:** usar a regra de canal da fundação
  (`docs/fundacao-dados.md`) — Meta ∪ Google.
- **Ramo Meta — Conversions API:**
  - `event_name: "OportunidadeQualificada"`, `action_source: "system_generated"`,
    `event_time` = `Data_Envio_Formulario__c`.
  - `user_data`: `fbc`, `fbp` + PII hasheada SHA-256 (`em`, `ph`, `fn`, `ln`, `ct`, `st`, `zp`,
    `country`, `db`) — normalizar (lowercase + trim) antes de hashear.
  - `event_id` = Id da Opportunity (dedup).
  - `custom_data`: `value` = `Amount`, `currency: "BRL"`.
- **Ramo Google — Click Conversion upload:**
  - `gclid` (ou `wbraid`/`gbraid`), `conversion_action`, `conversion_date_time`,
    `conversion_value` = `Amount`, `currency_code: "BRL"`, `order_id` = Id da Opportunity.
  - Fallback Enhanced Conversions for Leads: e-mail hasheado quando faltar `gclid`.
- Retry e log das chamadas.

## Fase 4 — Validação

- Meta: Test Events / Payload Helper; Event Match Quality alvo > 6.0.
- Google: Conversion Action deve ir para "Gravando conversões"; checar diagnósticos.
- Teste ponta a ponta: preencher LP com resposta que qualifica → confirmar Lead + Opportunity →
  confirmar click IDs gravados → confirmar evento nas duas plataformas (Meta em minutos; Google
  em 24–72h).

## Reconciliação (mensal)

Nº de eventos enviados deve bater com o nº de Oportunidades de canal pago. Query de referência
(reaproveitada do agente `analista-midia-paga-crm`):

```sql
-- filtro de canal pago (Meta ∪ Google) = cláusula da fundação (docs/fundacao-dados.md)
SELECT UtmSou__c, COUNT(Id) total
FROM Opportunity
WHERE CreatedDate >= [DATA_INICIO]T00:00:00-03:00
  AND CreatedDate <= [DATA_FIM]T23:59:59-03:00
  AND ([FILTRO_CANAL_PAGO])
GROUP BY UtmSou__c
```

Conferir click IDs gravados:

```sql
SELECT Id, Name, gclid__c, fbclid__c, fbc__c, fbp__c, UtmSou__c, Amount, CreatedDate
FROM Opportunity
WHERE CreatedDate = TODAY
ORDER BY CreatedDate DESC
```

## Pontos de atenção

- **LGPD:** só enviar PII hasheada com `Consentimento_Marketing__c = true`; configurar Data
  Processing Options (Meta) e Consent Mode (Google).
- **Deduplicação:** Id da Opportunity como chave única nos dois lados (`event_id` / `order_id`).
- **iOS:** priorizar `wbraid`/`gbraid` quando `gclid` ausente.
- **Testes:** não poluir produção — usar sandbox ou limpar os registros de teste.

## Fase 5 — Ativação

- Após acumular volume, trocar o evento de otimização das campanhas para `OportunidadeQualificada`.
- Meta rende melhor com ~50 conversões/semana por conjunto; volume baixo → otimizar por campanha
  ou manter evento intermediário em paralelo.
- CPL bruto vira métrica secundária; acompanhar custo por oportunidade real.
