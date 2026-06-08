# Handoff — Captura de Click IDs para Conversões de Oportunidade

**Solicitante:** time de Mídia Paga · **Destinatários:** Admin Salesforce + Time da Landing Page
**Data:** 2026-05-19

## Contexto

A área de mídia paga está implementando uma melhoria de mensuração: as campanhas de Meta Ads e
Google Ads passarão a otimizar para **oportunidade real** (cadastro que vira Oportunidade no
Salesforce), e não para cadastro bruto na landing page.

Para isso, o identificador do clique no anúncio (*click ID*) precisa viajar da landing page até o
registro de **Opportunity** no Salesforce. Hoje esse dado chega apenas parcialmente: a URL
completa de entrada é gravada no campo `UrlUtm__c`, mas esse campo é do tipo URL (limite de 255
caracteres) e **trunca o `gclid` no meio** — tornando-o inutilizável para a importação de
conversão no Google Ads.

A solução são campos dedicados no Salesforce, alimentados pelo formulário da LP.

**O que o time de mídia já fez:** uma tag no Google Tag Manager captura os click IDs (`gclid`,
`gbraid`, `wbraid`, `fbclid`) e os cookies do Meta (`_fbc`, `_fbp`) e os grava num cookie
first-party `caveo_attribution` no domínio `.caveo.com.br`, válido por 90 dias.

Este documento descreve as **duas tarefas pendentes**.

---

## Tarefa 1 — Admin Salesforce: criar 8 campos no objeto Opportunity

Em Setup → Object Manager → **Opportunity** → Fields & Relationships, criar:

| Label sugerida | API Name | Tipo | Tamanho |
|---|---|---|---|
| Google Click ID | `gclid__c` | Text | 255 |
| Google GBRAID | `gbraid__c` | Text | 255 |
| Google WBRAID | `wbraid__c` | Text | 255 |
| Meta Click ID (fbclid) | `fbclid__c` | Text | 255 |
| Meta _fbc | `fbc__c` | Text | 255 |
| Meta _fbp | `fbp__c` | Text | 255 |
| Consentimento Marketing | `Consentimento_Marketing__c` | Checkbox | — |
| Data de Envio do Formulário | `Data_Envio_Formulario__c` | Date/Time | — |

Observações:
- Os campos precisam ficar editáveis para o perfil/integração que cria as Opportunities a partir
  da landing page.
- `Data_Envio_Formulario__c` é recomendado, porém opcional — se não for preenchido, o processo
  posterior usará o `CreatedDate` da Opportunity.
- **Não** reaproveitar o campo `UrlUtm__c` — ele continua truncando o `gclid`.

---

## Tarefa 2 — Time da Landing Page: enviar os valores ao Salesforce

No envio do formulário das LPs (`lp.caveo.com.br` e `lp2.caveo.com.br`) que cria a Opportunity,
incluir 6 valores lidos do cookie `caveo_attribution`, além do consentimento e do timestamp.

### Estrutura do cookie `caveo_attribution`

Conteúdo: JSON URL-encoded. Exemplo decodificado:

```json
{
  "gclid": "Cj0KCQjw...",
  "gbraid": "0AAAAA9l07ll...",
  "wbraid": "",
  "fbclid": "IwAR3x...",
  "fbc": "fb.1.1716130000000.IwAR3x...",
  "fbp": "fb.1.1716130000000.1098765432",
  "ts": "2026-05-19T18:40:48.000Z"
}
```

Qualquer chave pode vir vazia — tráfego do Google não traz `fbclid`; tráfego do Meta não traz
`gclid`. Enviar o valor mesmo quando vazio.

### Como ler o cookie

```js
function getCaveoAttribution() {
  var m = document.cookie.match(/(?:^|;)\s*caveo_attribution\s*=\s*([^;]+)/);
  if (!m) return {};
  try { return JSON.parse(decodeURIComponent(m[1])); }
  catch (e) { return {}; }
}
```

### Mapeamento cookie → campo Salesforce

| Origem | Campo Salesforce |
|---|---|
| `gclid` (cookie) | `gclid__c` |
| `gbraid` (cookie) | `gbraid__c` |
| `wbraid` (cookie) | `wbraid__c` |
| `fbclid` (cookie) | `fbclid__c` |
| `fbc` (cookie) | `fbc__c` |
| `fbp` (cookie) | `fbp__c` |
| consentimento do formulário | `Consentimento_Marketing__c` |
| momento do envio do formulário | `Data_Envio_Formulario__c` |

### Pergunta a responder ao time de mídia

**O formulário envia ao Salesforce via POST de formulário tradicional ou via JavaScript/SPA**
(React, fetch/AJAX com lista fixa de campos)?

- **POST tradicional** → o time de mídia consegue injetar os campos ocultos via GTM. Basta o time
  da LP confirmar os atributos `name=` dos `<input>` e que esses campos chegam ao Salesforce.
- **JavaScript/SPA** → o time da LP precisa ler o cookie no próprio código (função acima) e
  incluir os 8 valores no payload enviado ao Salesforce.

---

## Critério de pronto

1. Os 8 campos existem no objeto Opportunity.
2. Ao enviar o formulário numa LP acessada com `?gclid=TESTE123` na URL, a Opportunity criada tem
   `gclid__c = TESTE123`.
3. Em tráfego real do Google, `gclid__c` grava o valor **completo** (≈70–100 caracteres), sem
   truncamento.
