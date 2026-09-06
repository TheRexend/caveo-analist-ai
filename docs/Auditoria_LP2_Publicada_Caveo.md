# Auditoria — LP publicada `lp2.caveo.com.br` — formatação e hierarquia de títulos

> **Objeto:** página no ar em `https://lp2.caveo.com.br/`, coletada em 2026-08-18.
> **Escopo pedido:** formatação e relação/hierarquia de títulos — onde há quebra.
> **Escopo secundário:** delta contra `docs/Auditoria_LP_v2_Caveo.md` (13/08), já
> que a v2 auditada era documento de copy e esta é a versão que foi publicada.
> **Limitação de método:** não consegui acesso ao HTML bruto (comando de rede
> negado na sessão). Tudo marcado ✅ vem do texto renderizado e é firme; tudo
> marcado ⚠️ é nível de tag/atributo e precisa de 1 minuto de confirmação no
> DevTools antes de virar tarefa.

---

## Veredicto em uma linha

A página publicada **corrigiu 3 achados da v2 e regrediu em 3**, e tem
**5 quebras de formatação factuais** (ano do rodapé, capitalização título×`<title>`,
pontuação entre títulos irmãos, três grafias do mesmo número, legendas de card
quebradas no meio da frase) — mas a quebra mais cara não é de formatação: o
**campo E-mail está opcional** no formulário, e é justamente o campo de que a
conversão offline do Google Ads depende.

---

## 1. Hierarquia de títulos

### Árvore de headings na ordem do documento

| # | Nível | Texto |
|---|---|---|
| 1 | **H1** | A Plataforma Financeira para a rotina médica |
| 2 | ⚠️ H3 | Fale com nosso time *(formulário do hero)* |
| 3 | H2 | Conheça a nova Caveo |
| 4 | H2 | Quanto tempo e dinheiro você ainda perde com a sua PJ? |
| 5 | H2 | O único App financeiro criado para médicos. |
| 6–9 | H3 ×4 | Abra sua PJ gratuitamente · Especialistas que entendem médicos · Mais autonomia para sua rotina · Mais clareza sobre o seu dinheiro |
| 10 | H2 | O App Caveo simplifica tarefas que ainda tomam tempo da rotina médica |
| 11–15 | H3 ×5 | Emita sua NF em menos de 1 minuto · Saiba o saldo que fica disponível · Saiba o valor que sobra antes de aceitar o plantão · Sua documentação sempre pronta para enviar · Não espere meses pelo dinheiro de um plantão já realizado |
| 16 | H2 | Por que mais de 20.000 médicos escolheram a Caveo? |
| 17–18 | H3 ×2 | Especialização médica · Plataforma financeira completa |
| 19 | H2 | Sua rotina médica já é complexa. Sua PJ não precisa ser. |
| 20 | H2 | Sua PJ pode funcionar de um jeito muito mais simples |
| 21 | ⚠️ H3 | Fale com nosso time *(formulário final)* |

**H1 único e correto** ✅ — não há H1 duplicado, e o miolo H2→H3 está bem aninhado.
Os problemas estão nas bordas.

### H1 — Salto de nível: H1 → H3 sem H2 ⚠️

O `Fale com nosso time` do formulário do hero aparece como **H3 logo depois do
H1**, antes de qualquer H2 existir. É o único salto de nível da página e ele
está na primeira dobra.

**Correção:** rótulo de formulário não precisa ser heading. Ou vira `<h2>`
(se você quer o formulário na navegação por títulos), ou vira `<p>`/`<legend>`
com o mesmo estilo visual. `<legend>` é o mais correto semanticamente e ainda
melhora o formulário para leitor de tela.

### H2 — Dois headings idênticos na mesma página ⚠️

`Fale com nosso time` aparece **duas vezes como H3** (hero e seção final).
Navegação por headings fica ambígua — quem pula de título em título ouve o mesmo
título duas vezes sem saber que são formulários diferentes.

**Correção:** diferenciar (`Fale com nosso time` / `Comece agora com nosso time`)
ou tirar os dois da árvore de headings, junto com a correção acima.

### H3 — Inversão: o nome da feature está fora da hierarquia ✅

Na seção do app, cada card tem **duas linhas de título**, e a hierarquia está
invertida:

| Linha | Exemplo | Tag |
|---|---|---|
| Nome da feature | "Emissão ilimitada de notas fiscais" | texto solto (não-heading) |
| Frase de benefício | "Emita sua NF em menos de 1 minuto" | **H3** |

Vale para os 5 cards ("Separação automática de tributos", "Calculadora de
tributos", "Documentos da PJ", "Receba pelo plantão no mesmo dia").
O resultado é que **o termo que a pessoa busca fica fora da estrutura de
títulos** e o que entra na estrutura é a frase de marketing.

**Correção:** ou o nome da feature vira o H3 e o benefício vira parágrafo, ou os
dois entram no mesmo H3 com o nome dentro de um `<span>`. Hoje o Google indexa a
frase e ignora o termo.

### H4 — Menu com 3 âncoras para 5 seções, e um rótulo que não bate ✅

| Link do menu | Âncora | Seção de destino | Problema |
|---|---|---|---|
| Funcionalidades | `#features` | (a confirmar) | — |
| Aplicativo | `#app` | "O App Caveo simplifica…" | rótulo ≠ título ("Aplicativo" × "App") |
| Por que Caveo? | `#comparison` | **Comparativo** — "Sua rotina médica já é complexa…" | **rótulo aponta para a seção errada** |

A página tem uma seção que se chama literalmente **"Por que mais de 20.000
médicos escolheram a Caveo?"** (eyebrow "Nossos pilares") — e o link "Por que
Caveo?" **não leva a ela**, leva ao Comparativo. Duas seções (o bloco de dor
"Quanto tempo e dinheiro você ainda perde…" e a de pilares) não são alcançáveis
pelo menu.

⚠️ Uma das extrações indicou que **as três âncoras não têm `id` correspondente no
HTML** (menu inteiro sem destino). Não consegui confirmar sem o DOM — **essa é a
checagem número 1 da lista**, porque se for verdade o menu inteiro está morto.

### H5 — "Identificação" solto ⚠️

Logo após o H2 "Conheça a nova Caveo" aparece a palavra **"Identificação"**
isolada, sem função aparente. Tem cara de sobra de componente (rótulo de step,
label de campo ou legenda de vídeo que vazou). "Assista" ao lado é claramente
eyebrow intencional; "Identificação" não é.

**Correção:** conferir visualmente essa dobra. Se for sobra, remover.

---

## 2. Formatação

### F1 — Rodapé com o ano errado ✅

> `Todos os Direitos Reservados © **2025** - Caveo Tecnologia LTDA`

Estamos em 2026. Trocar por 2026 ou, melhor, gerar o ano dinamicamente para não
repetir o problema.

### F2 — `<title>` e H1 divergem na capitalização ✅

| Onde | Texto |
|---|---|
| `<title>` | Caveo - A **plataforma financeira** para a rotina médica |
| H1 | A **Plataforma Financeira** para a rotina médica |

Além de divergirem entre si, o próprio H1 é **capitalização mista sem regra**:
"Plataforma Financeira" em maiúscula, "rotina médica" em minúscula, na mesma
frase. Escolher uma norma (recomendo minúscula, como no `<title>`) e aplicar.

### F3 — Ponto final inconsistente entre títulos irmãos ✅

Dos 5 H2 de seção, **só um termina com ponto**:

- "O único App financeiro criado para médicos**.**" ← com ponto
- "Quanto tempo e dinheiro você ainda perde com a sua PJ?" ← interrogação (ok)
- "O App Caveo simplifica tarefas que ainda tomam tempo da rotina médica" ← sem
- "Sua PJ pode funcionar de um jeito muito mais simples" ← sem

("Sua rotina médica já é complexa. Sua PJ não precisa ser." tem ponto porque são
duas frases — é caso legítimo.)

### F4 — Ponto final inconsistente entre listas ✅

| Lista | Termina com ponto? |
|---|---|
| S2 — "Quanto tempo e dinheiro você ainda perde…" | **Sim** — "…para emitir uma nota." |
| S5 — bullets dos pilares | Não — "Emissão ilimitada de NFs" |
| S6 — tabela comparativa | Não — "Abertura de PJ gratuita" |
| S7 — bullets finais | Não — "Abertura de PJ gratuita" |

Uma lista da página segue uma regra e as outras três seguem outra.

### F5 — Três grafias para o mesmo número ✅

| Dado | Grafias na mesma página |
|---|---|
| Base de médicos | "**+20.000**" (card) · "**mais de 20.000**" (H2 da S5) · "**+20.000** médicos confiam na Caveo" (S7) |
| Economia gerada | "**R$ 100 mi**" (card) · "**+R$ 100 milhões**" (bullet S5) |
| Economia dos clientes | "**72%** — Dos clientes passaram a economizar mais" (card) · "**72%** dos clientes Caveo já economizam com a nossa ajuda" (bullet S5) |

Padronizar uma grafia por dado e repetir igual. Hoje o mesmo número aparece com
três roupas diferentes, o que faz o leitor achar que são estatísticas distintas.

### F6 — As três legendas dos cards do hero quebram no meio da frase ✅

> **+20.000** / **M**édicos confiam na Caveo
> **R$ 100 mi** / **E**m economia para médicos Caveo
> **72%** / **D**os clientes passaram a economizar mais

A legenda continua a frase iniciada pelo número, mas começa com **maiúscula** nos
três casos. Ou a legenda vira frase independente ("Médicos confiam na Caveo" /
"Economia gerada para médicos" / "Dos clientes economizam mais" → reescrever),
ou começa em minúscula. Hoje é o pior dos dois.

Bônus: **"Em economia para médicos Caveo"** está truncado — falta o verbo.
"Economia gerada para médicos Caveo" resolve.

### F7 — "App" × "app" × "Aplicativo" na mesma página ✅

| Onde | Grafia |
|---|---|
| Menu | **Aplicativo** |
| Subheadline do hero | Um **aplicativo** criado para médicos |
| H2 da S4 e corpo | O **App** Caveo · direto no **App** |
| Rodapé | Baixe o **app** |

Quatro grafias. `Manual_Comunicacao_Funcionalidade_Caveo.md` §3.2 proíbe "app" e
"aplicativo" no mesmo trecho, e §12.1 já registra a padronização como pendência
aberta. Continua aberta, agora no ar.

### F8 — Dois CTAs do hero possivelmente colados ⚠️

Na extração os dois botões saíram como `Traga sua PJ para a CaveoConheça a nova
Caveo`, sem separador. Costuma indicar falta de espaçamento/separador no markup,
mas pode ser artefato da conversão para texto. **Conferir visualmente.**

### F9 — Sem erro de ortografia ou acentuação ✅

Varri acentuação, ortografia, espaço duplo, espaço antes de pontuação, aspas e
hífen: **nada encontrado**. Também não há texto truncado tipo `undefined`,
`{{ }}` ou lorem. A copy está limpa nesse nível.

---

## 3. Quebra fora do escopo pedido, mas cara: o formulário

### C1 — E-mail está opcional ⚠️ (prioridade máxima)

Campos dos dois formulários (idênticos entre si ✅):

| Campo | Obrigatório |
|---|---|
| Nome completo | * sim |
| Telefone | * sim |
| **E-mail** | **não** |
| Já tem CNPJ? (Sim/Não) | * sim |

O projeto tem conversão offline de Google Ads por **Enhanced Conversions for
Leads via e-mail**, escolhida exatamente porque o `gclid` chega em 0,25% dos
casos e o e-mail em 92% (`project_google_ads_conversao_oportunidade_zapier`).
Com o campo opcional, todo lead que pular o e-mail é um fechamento que **não
volta para o Google Ads** — e a LP2 é a página do público que mais converte.

**Correção:** marcar E-mail como obrigatório.

### C2 — Consentimento nomeia "Sofia" sem dizer o que ela é ✅

> "Aceito receber contato da **Sofia** no WhatsApp sobre a Caveo."

Sofia é a automação de atendimento. Para quem está preenchendo, "Sofia" lê como
pessoa. Além do ponto de LGPD (consentimento deve ser informado), o formulário
**não tem link para o Aviso de Privacidade ao lado do checkbox** — o aviso só
existe no rodapé, via Google Drive.

### C3 — Documentos legais hospedados no Google Drive ✅

Aviso de Privacidade, Termos de uso e Políticas de Cookies apontam para
`drive.google.com`; Solicitação do titular aponta para `forms.gle`. São
documentos legais em host de terceiro, sem controle de versão nem garantia de
disponibilidade, numa página que roda mídia paga.

---

## 4. Delta contra a auditoria de 13/08

### Corrigido na versão publicada ✅

| Código | O que era | Como está no ar |
|---|---|---|
| **P0.2** | "Abra sua **empresa** gratuitamente ou traga sua PJ" (S7) | "Traga ou abra gratuitamente sua **PJ**" — a última ocorrência de "empresa" caiu |
| **P1.1** | Card "30% Economia média em impostos" | Substituído por "72% — dos clientes passaram a economizar mais" |
| **N5 (parcial)** | Hero só falava com quem já tem PJ | O campo **"Já tem CNPJ? Sim/Não"** resolve a bifurcação dentro do formulário, como a call de 13/08 decidiu |

### Continua no ar ❌

| Código | Ocorrências vivas |
|---|---|
| **P0.1** "de médico para médico" | **piorou para 4**: eyebrow "Feita para médicos" (hero) · subhead "criado para médicos" · H2 "criado para médicos" · eyebrow "Feita para médicos" (S7) |
| **P0.3** "soluções" | 1 — S6: "Ter acesso a **soluções** para receber no mesmo dia" |
| **P0.4** "Contrate agora" | 2 — S5 e S6 |
| **P0.5** "Conheça o App Caveo" | 1 — S4 |
| **P0.6** "NF" / "NFs" | 3 — H3 da S4, bullet da S5, tabela da S6 |
| **N2** "o único" | 1 — H2 da S3 |
| **N7** "contador" sem "tradicional" | 1 — S6, "Esperar o contador emitir a nota" |
| **N8** "líquido" | 2 — S4 e S6 |
| **P1.3** "terceiros" | 1 — S6, "Depender de terceiros para tudo" |
| **N1** "+20.000" não validado | 3 pontos |
| **CRO#3** sem FAQ / objeções | página inteira |
| Spec bloco 10 | depoimento de médico real: **ausente** |

### Regrediu 🔻

| # | O que | Estado |
|---|---|---|
| **CRO#2** | Hero com CTAs concorrentes — a v2 tinha resolvido para um só | Voltou a **dois botões** ("Traga sua PJ para a Caveo" + "Conheça a nova Caveo") **e mais o formulário** na mesma dobra: 3 destinos concorrendo na primeira tela |
| **CRO#1** | Fragmentação de CTA — eram 6 strings | Agora são **7**: Fale Conosco · Traga sua PJ para a Caveo · Conheça a nova Caveo · Conte com a Caveo · Conheça o App Caveo · Contrate agora · Fale com nosso time |
| **N6** | Claim de recebimento com forças diferentes | Agora **4 forças, e o corpo ficou mais categórico que o título**: card "no mesmo dia" · H3 "Não espere meses" · corpo "**Receba o dinheiro na hora que finalizar o plantão**" · S5 "Recebimento simplificado" · S6 "acesso a soluções para". A v2 hedgeava no corpo ("mais rapidez"); a publicada afirma. Se "na hora" não é entregável hoje, é o achado mais exposto da página |

---

## 5. O que fazer, em ordem

**Confirmar no DevTools (5 min, destrava o resto):**

- [ ] As âncoras `#features`, `#app`, `#comparison` têm `id` correspondente? Se não, o menu inteiro está morto
- [ ] `Fale com nosso time` é mesmo `<h3>`? (salto H1→H3)
- [ ] Os nomes de feature dos cards são mesmo não-heading?
- [ ] A palavra "Identificação" na dobra do vídeo é sobra?
- [ ] Os dois botões do hero têm espaçamento?
- [ ] **A página serve HTML com conteúdo para robô, ou é SPA como `lp.caveo.com.br`?** (`curl -s https://lp2.caveo.com.br/ | grep -c "rotina médica"`) — é a causa-raiz registrada de "Relevância pouco clara" no Google Ads

**Correção de 15 minutos, sem decisão de copy:**

- [ ] E-mail obrigatório no formulário **(C1 — faça este primeiro)**
- [ ] Rodapé: 2025 → 2026 **(F1)**
- [ ] `Fale com nosso time` deixa de ser H3 → `<legend>` **(H1 + H2)**
- [ ] "Por que Caveo?" no menu aponta para a seção de pilares, não para o Comparativo **(H4)**
- [ ] Tirar o ponto final de "O único App financeiro criado para médicos" **(F3)**
- [ ] Padronizar ponto final das 4 listas **(F4)**
- [ ] Padronizar "+20.000" / "R$ 100 milhões" / "72%" numa grafia só **(F5)**
- [ ] Legendas dos 3 cards do hero em minúscula + arrumar "Em economia para médicos Caveo" **(F6)**
- [ ] `<title>` e H1 na mesma capitalização **(F2)**
- [ ] Busca-e-substitui literal do checklist de 13/08: `NF`→`nota fiscal` (3) · `Contrate agora`→`Conte com a Caveo` (2) · `Conheça o App Caveo`→`Conheça a Caveo` (1) · `soluções` (1) · `líquido` (2) · `contador`→`contador tradicional` (1) · `terceiros`→`hospital` (1)

**Exige decisão:**

- [ ] "Receba o dinheiro **na hora**" é entregável hoje? Se não, cai — e as 4 grafias do recebimento viram uma **(N6)**
- [ ] Remover as 4 ocorrências da família "feita/criado para médicos" **(P0.1)** e o "o único" **(N2)**
- [ ] Hero: um CTA ou dois? Hoje são dois botões + formulário na mesma dobra **(CRO#2)**
- [ ] Padronizar produto: "Plataforma Financeira" × "aplicativo" × "App Caveo" × "app" **(F7 / N3)**
- [ ] Validar "+20.000 médicos" ou voltar para 15.000 **(N1)**
- [ ] Tirar os documentos legais do Google Drive **(C3)**

---

## 6. Referências

- `docs/Auditoria_LP_v2_Caveo.md` — auditoria da copy v2 (13/08), base do delta
- `docs/Auditoria_LP_Oferta_Funcionalidade_Caveo.md` — v1 (10/08)
- `docs/Manual_Comunicacao_Oferta_Caveo.md` · `docs/Manual_Comunicacao_Funcionalidade_Caveo.md`
- `docs/superpowers/specs/2026-08-06-lp-alta-conversao-medico-design.md` — spec de estrutura
- `docs/Heros_LP_Medico_Caveo.md` — variações de hero
