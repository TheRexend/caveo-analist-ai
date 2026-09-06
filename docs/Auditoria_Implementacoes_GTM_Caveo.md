# Auditoria de Implementações no GTM — LP Caveo (03/09/2026)

> Levantamento das tags, variáveis e acionadores (triggers) criados ou alterados no Google Tag Manager da Caveo no dia 03/09/2026, e o cenário atual dessa implementação. Escopo: conta **LP Caveo** (accountId 6290263120) — contêiner web **GTM-WZZC6BHZ** (Lp Caveo - Web) e contêiner servidor **GTM-WPPKV55J** (Lp Caveo - Server), workspace "Default Workspace" em ambos.

> **Método de verificação:** o GTM registra em cada tag um campo `fingerprint` (carimbo de data/hora da última edição). Tags antigas de controle (ex.: a tag de Lead do Meta Ads, parada em 12/08/2026) foram comparadas às tags do dia 03/09/2026 para confirmar quais mudanças são realmente do dia. Acionadores e variáveis não têm esse carimbo individual na API — foram identificados por associação direta às tags novas (todo trigger/variável referenciado exclusivamente pelas tags novas é tratado como parte da mesma implementação).

## Resumo executivo

- Dois blocos de mudança no mesmo dia, ambos no contêiner **web**:
  - **Bloco 1** (≈12h41–12h43 UTC / 09h41–09h43 em Brasília): ajuste em **3 tags GA4 já existentes**, adicionando dados de Enhanced Conversions (`user_data`) e `event_id`.
  - **Bloco 2** (≈14h38–19h11 UTC / 11h38–16h11 em Brasília): criação de **34 tags novas**, **33 acionadores novos** e **3 variáveis novas** — um tracking granular de funil para os dois formulários da LP (Hero e Rodapé).
- O contêiner **servidor** (Stape) e as tags de **Meta Ads (Facebook Conversions API)** não tiveram nenhuma alteração nesse dia — os eventos novos alimentam **só o GA4**.
- Foram encontradas **2 inconsistências de configuração** no Bloco 2 (detalhe na seção "Cenário atual e achados").
- Não há, nas ferramentas de auditoria disponíveis via API, como confirmar se uma versão do contêiner já foi **criada e publicada** — as mudanças estão confirmadas no workspace, mas o status de publicação precisa ser checado direto no GTM.

---

## Bloco 1 — Ajustes em tags GA4 existentes (Enhanced Conversions)

| Tag | ID | Evento GA4 | Status | O que mudou |
|---|---|---|---|---|
| 00 🟠 GA4 - page_view - lp.caveo.com.br | 26 | `page_view` | ativa | Adicionado `event_id` + `user_data.email_address/phone_number/first_name/last_name`, lidos dos cookies `email_cookie`, `phone_cookie`, `fn_cookie`, `ln_cookie` |
| 02 🟠 GA4 - generate_lead - Envio Forms | 54 | `generate_lead` | **pausada** | Adicionado `event_id` + `user_data.*`, lidos das variáveis do formulário (`jsv - user - email`, `jsv - telefone form`, `jsv - First name`, `jsv - Last name`) |
| 02 🟠 GA4 - lead_cadastrado | 92 | `lead_cadastrado` | **pausada** | Editada no mesmo horário (fingerprint de 03/09), mas a configuração atual não mostra `event_id`/`user_data` nem qualquer outro campo novo — pode ter sido apenas uma revisão/teste sem alteração final. Vale confirmar com quem mexeu. |

**Objetivo provável:** essas três tags já alimentavam o GA4; a adição de `user_data` é o padrão do Google para **Enhanced Conversions**, permitindo que o Google Ads/GA4 combine o evento com dados do usuário (e-mail/telefone) em vez de depender só de cookies de clique.

---

## Bloco 2 — Novo tracking de funil dos formulários (Hero e Rodapé)

A LP tem o formulário de lead em dois lugares (**Hero**, topo da página, e **Rodapé/CTA**, seção final). A implementação de 03/09 passou a rastrear cada micro-etapa do preenchimento nos dois locais, em 3 etapas (Step 1, 2 e 3), via eventos customizados enviados ao **dataLayer** pela própria LP e capturados pelo GTM.

### Eventos rastreados por etapa

| Evento (dataLayer) | Quando dispara | Etapas em que existe |
|---|---|---|
| `form_step_view` | etapa é exibida ao usuário | 1, 2, 3 |
| `form_start` | usuário começa a preencher | 1 |
| `form_submit_attempt` | usuário clica em avançar/enviar | 1, 2, 3 |
| `form_validation_error` | validação de campo falha | 1, 2, 3 |
| `form_step_complete` | etapa concluída com sucesso | 1, 2, 3 |
| `form_submit_lead` | envio final do lead com sucesso | 3 |
| `form_submit_lead_error` | envio final falha | 3 |
| `form_whatsapp_redirect` | fallback: redirecionamento automático pro WhatsApp | 3 |
| `form_whatsapp_manual_click` | fallback: clique manual no botão de WhatsApp | 3 |

Todas as 34 tags são do tipo **GA4 Event** (`gaawe`), apontando para a métrica `G-GS20D2S7DZ` (00 \| Google Analytics 4 - lp.caveo.com.br), com `first_party_collection` e transporte via `stape.lp.caveo.com.br`. Nenhuma delas dispara tag equivalente no Meta Ads — os eventos de funil **não chegam ao Facebook Conversions API**, só ao GA4.

### Tags novas (34)

| # | Nome do evento GA4 | Origem | Etapa | Tag ID | Trigger ID |
|---|---|---|---|---|---|
| 03.01 | `form_step_view` | Hero | 1 | 108 | 107 |
| 03.01 | `form_step_view` | Rodapé | 1 | 159 | 127 |
| 03.02 | `form_start` | Hero | 1 | 143 | 112 |
| 03.02 | `form_start` | Rodapé | 1 | 160 | 128 |
| 03.03 | `form_submit_attempt` | Hero | 1 | 144 | 113 |
| 03.03 | `form_submit_attempt` | Rodapé | 1 | 161 | 129 |
| 03.04 | `form_validation_error` | Hero | 1 | 145 | 114 |
| 03.04 | `form_validation_error` | Rodapé | 1 | 162 | 130 |
| 03.05 | `form_step_complete` | Hero | 1 | 152 | 116 |
| 03.05 | `form_step_complete` | Rodapé | 1 | 164 | 132 ⚠️ |
| 03.06 | `form_step_view` | Hero | 2 | 146 | 115 |
| 03.06 | `form_step_view` | Rodapé | 2 | 163 | 131 |
| 03.07 | `form_submit_attempt` | Hero | 2 | 148 | 117 |
| 03.07 | `form_submit_attempt` | Rodapé | 2 | 165 | 133 |
| 03.08 | `form_validation_error` | Hero | 2 | 158 | 118 |
| 03.08 | `form_validation_error` | Rodapé | 2 | 166 | 134 |
| 03.09 | `form_step_complete` | Hero | 2 | 151 | 120 |
| 03.09 | `form_step_complete` | Rodapé | 2 | 168 | 136 |
| 03.10 | `form_step_view` | Hero | 3 | 150 | 119 |
| 03.10 | `form_step_view` | Rodapé | 3 | 167 | 135 |
| 03.11 | `form_submit_attempt` | Hero | 3 | 153 | 121 |
| 03.11 | `form_submit_attempt` | Rodapé | 3 | 169 | 137 |
| 03.12 | `form_validation_error` | Hero | 3 | 149 | 138 |
| 03.12 | `form_validation_error` | Rodapé | 3 | 170 | 122 |
| 03.13 | `form_submit_lead` | Hero | 3 | 154 | 123 |
| 03.13 | `form_submit_lead` | Rodapé | 3 | 171 | 139 |
| 03.14 | `form_submit_lead_error` | Hero | 3 | 155 | 124 |
| 03.14 | `form_submit_lead_error` | Rodapé | 3 | 172 | 140 |
| 03.15 | `form_whatsapp_redirect` | Hero | 3 | 156 | 125 |
| 03.15 | `form_whatsapp_redirect` | Rodapé | 3 | 173 | 141 |
| 03.16 | `form_whatsapp_manual_click` | Hero | 3 | 157 | 126 |
| 03.16 | `form_whatsapp_manual_click` | Rodapé | 3 | 174 | 142 |
| 03.17 | `form_step_complete` | Hero | 3 | 178 | 120 ⚠️ |
| 03.17 | `form_step_complete` | Rodapé | 3 | 176 | 175 |

⚠️ = trigger com problema de configuração — ver seção "Cenário atual e achados".

### Variáveis novas

| Variável | ID | Tipo | O que captura |
|---|---|---|---|
| `Step` | 109 | Variável de Data Layer (`step`) | Número da etapa atual do formulário (1, 2 ou 3) — usado por todos os 33 triggers novos para diferenciar a etapa |
| `form_location` | 111 | Variável de Data Layer (`form_location`) | Qual instância do formulário disparou o evento (`hero` ou `cta`/rodapé) — usado por todos os 33 triggers novos |
| `branch` | 110 | Variável de Data Layer (`branch`) | Criada junto às duas acima, mas **sem nenhum uso** em trigger ou tag até o momento (variável órfã — não aparece em nenhum dos 51 triggers do contêiner nem nas 34 tags novas) |

### Acionadores novos (33)

Todos são do tipo **Evento Personalizado** (Custom Event), dividido em duas condições: `{{_event}} equals <nome do evento>` e `{{Step}} contains <n>`, combinado com `{{form_location}} contains hero` (Hero) ou `{{form_location}} contains cta` (Rodapé). Seguem o padrão 1 trigger por combinação evento×etapa×origem, com 2 exceções (ver abaixo). A tabela de tags acima já traz o ID de cada trigger correspondente.

---

## Cenário atual e achados

1. **Tag "Hero – form_step_complete – Step 3" (id 178) disparando no gatilho errado.** Não existe, nos 51 acionadores do contêiner, um trigger "hero - form_step_complete - Step 3". A tag 178 foi amarrada ao trigger **120**, que na real é a condição de **Step 2** (`{{Step}} contains "2"` + `{{form_location}} contains "hero"`). Na prática: toda vez que a Etapa 2 do Hero é concluída, o GTM dispara ao mesmo tempo o evento correto `hero_form_step_complete_step_2` (tag 151) **e** o evento incorreto `hero_form_step_complete_step_3` (tag 178) — mesmo que o usuário não tenha chegado na etapa 3. Isso infla artificialmente as conclusões de Etapa 3 do Hero no GA4, e a Etapa 3 real do Hero nunca é registrada de fato.

2. **Trigger "Rodapé – form_step_complete – Step 1" (id 132) com filtro de evento errado.** O filtro desse trigger está configurado para o evento `form_start`, não `form_step_complete` — condição idêntica à do trigger 128 (que alimenta corretamente a tag `rodape_form_start_step_1`). Na prática: o evento `rodape_form_step_complete_step_1` (tag 164) é enviado no exato momento em que o usuário **começa** a preencher a Etapa 1 do rodapé, não quando a conclui. O nome do evento no GA4 não corresponde ao que de fato aconteceu nessa etapa.

3. **Tag "02 GA4 - lead_cadastrado" (id 92)** foi salva no mesmo dia, mas sua configuração atual não tem nenhum sinal visível de mudança (sem `event_id`/`user_data`). Pode ter sido apenas aberta e resalva sem alteração real — vale confirmar com quem implementou.

4. **Variável "branch" sem uso.** Foi criada junto ao pacote de variáveis do funil, mas nenhum trigger ou tag lê seu valor hoje. Se for parte de um teste A/B planejado, ainda falta ligá-la a algo.

5. **Contêiner servidor (Stape) e tags de Meta Ads intocados.** As 34 tags novas mandam dado só pro GA4 (measurement ID `G-GS20D2S7DZ`). Se a intenção for também otimizar campanhas de Meta Ads pela métrica de funil (ex.: público de quem chegou na Etapa 2 mas não completou), isso ainda não existe — precisaria de tags equivalentes no contêiner servidor (Facebook CAPI).

6. **Status de publicação não confirmado via API.** As ferramentas de auditoria disponíveis não têm um recurso para listar versões/publicações do contêiner. As mudanças estão confirmadas no workspace de edição ("Default Workspace"), mas não foi possível confirmar por essa via se uma versão já foi criada e publicada em produção, ou se ainda está em rascunho.

---

## Próximos passos sugeridos

- [ ] Corrigir a tag 178: criar um trigger dedicado "hero - form_step_complete - Step 3" (evento `form_step_complete`, `Step` contém "3", `form_location` contém "hero") e reatribuí-la a esse trigger novo.
- [ ] Corrigir o trigger 132: trocar o filtro de evento de `form_start` para `form_step_complete`.
- [ ] Confirmar com quem implementou se a tag 92 teve alguma mudança real, e se uma versão do contêiner já foi publicada.
- [ ] Decidir se os eventos de funil também devem alimentar o Meta Conversions API (contêiner servidor), caso o objetivo inclua otimização de campanhas de Meta Ads por etapa do formulário.
