# Auditoria — LP "Oferta e Funcionalidade" **v2** — Caveo

> **Objeto auditado:** `LP [OFERTA e FUNCIONALIDADE] (1).md`, segunda versão da
> copy de landing page de 7 seções, compartilhada pelo time em 2026-08-13.
> **Documento anterior:** `Auditoria_LP_Oferta_Funcionalidade_Caveo.md`
> (v1, 2026-08-10). Este documento é o **delta** — não repete os achados que
> continuam idênticos, remete a eles pelo código (P0.1, CRO#3 etc.).
> **Critérios:** `Manual_Comunicacao_Oferta_Caveo.md`,
> `Manual_Comunicacao_Funcionalidade_Caveo.md`,
> `docs/superpowers/specs/2026-08-06-lp-alta-conversao-medico-design.md`
> (spec de estrutura aprovado), `Hot_Topics_Busca_ICP_Caveo.md` (leitura de CRO).
> **Data:** 2026-08-13.

---

## Veredicto em uma linha

A v2 fechou **5 dos 14 itens** do checklist de 10/08 e acertou o mais teimoso
deles ("suporte especializado"), mas **os três achados mais graves seguem
intactos** — a família "para médicos" nas 3 posições de maior visibilidade, a
promessa de "30% de economia" e os dois "Contrate agora" — e a versão
**introduziu 5 problemas novos**, incluindo um estratégico: o hero fechou o
funil para o público que menos converte.

---

## 1. Corrigido na v2 ✅

| Código | O que era | Como ficou |
|---|---|---|
| **P0.7** | "Suporte personalizado" (S5) | **"Suporte especializado"** — decisão da call de 03/08 finalmente aplicada |
| **P0.2** | "empresa" em 4 pontos | 3 corrigidas: S3 Benefício 03, S4 Documentos da PJ, S5 texto de apoio |
| **P0.3** | "solução" em 4 pontos | 3 corrigidas: S3 headline, S4 recebimento, S5 texto de apoio |
| **P3** | CTA do hero fora do padrão ("Abra sua PJ 100% grátis") | Agora usa string aprovada — mas ver **N5** |
| **CRO#2** | Hero com dois CTAs concorrentes | Um só — mas resolvido para o lado errado, ver **N5** |

**Continua correto e não deve mudar:** "menos de 1 minuto" consistente nas 3
ocorrências (S4, S6) sem contradizer com "segundos" · "enquadramentos
incorretos" · "multas" · "emissão ilimitada e sem custo por nota" · "conta PJ
integrada" · "tudo na palma da sua mão" · "previsibilidade" usada só em texto,
nunca em fala (Oferta §6.4) · zero "caro/barato" · zero urgência artificial ·
identidade médica verbal presente em todas as seções · "contabilidade" aparece
só no problema (S2, S3 B02), nunca no fechamento.

---

## 2. Pendente — não foi corrigido ❌

### P0.1 — Família "de médico para médico": 3/3 ocorrências seguem

Continua sendo o achado mais grave. A regra é a lista mais curta e explícita do
manual inteiro (Oferta §3.1) e a v2 mantém as três posições:

| Seção | Trecho | Padrão banido |
|---|---|---|
| 1 — Hero (subheadline) | "Um Aplicativo **criado para médicos**" | = "criada por médicos" / "pensada para médicos" |
| 3 — Headline | "O único App financeiro **criado para médicos**." | idem |
| 7 — **Selo** | **"FEITA PARA MÉDICOS"** | **string banida verbatim**, logo acima do formulário |

A S3 atenuou de *"criada por médicos, para médicos"* para *"criado para
médicos"* — mas *"feita para médicos"* está **nominalmente na lista**. Não saiu
da família.

**Correção:** alternativas já aprovadas no próprio manual — *"especializada na
rotina médica"*, *"quem conhece a sua rotina"*, *"só a Caveo entende a sua
rotina"*.

### P0.2 — "empresa": 1 ocorrência restante, a pior das quatro

> S7, subheadline: *"Abra sua **empresa** gratuitamente ou traga sua **PJ**
> para uma plataforma financeira..."*

A mesma frase usa os dois termos para a **mesma ação**, com três palavras de
distância. É a evidência de que a busca-e-substitui foi feita por varredura
visual, não literal — Oferta §2.1 pede busca literal pela palavra antes de
aprovar qualquer peça.

### P0.3 — "soluções": 1 ocorrência restante

> S6, tabela (coluna "Com a Caveo"): *"Ter acesso a **soluções** para receber
> no mesmo dia"*

### P0.4 — "Contrate agora": 2/2 seguem (S5 e S6)

Proibido nominalmente por Oferta §7.2 e Func §8.2. Numa LP o dano é maior que
num anúncio: o visitante clica esperando transacionar e a S7 entrega um
formulário de contato. É quebra de expectativa no passo da conversão.

### P0.5 — "Conheça o App Caveo" (S4)

Func §8.2: *"Decidido: o convite é para conhecer a Caveo, não o app."* Terceira
recorrência documentada do mesmo erro (roteiros v2 Func R05 → LP v1 → LP v2).

### P0.6 — "NF" / "NFs": 3/3 seguem

S4 headline ("Emita sua **NF**"), S5 bullet ("Emissão ilimitada de **NFs**"),
S6 tabela ("Emitir **NF** em menos de 1 minuto"). Func §3.7 é explícito que a
regra vale **inclusive em bullet e texto de apoio**.

### P1.1 — "30% Economia média em impostos" — **piorou**

Segue no card de prova social do hero, e a formulação regrediu: a régua antiga
do time era *"sempre 'até 30%', nunca '30%' categórico"*. A v2 usa **"economia
média"**, que não é hedge — é afirmação estatística sobre a base de clientes,
mais forte e mais exposta que a versão anterior.

Viola a regra-mãe dos dois manuais (§1, *"a Caveo não gera renda nova, não
promete enriquecimento e não garante resultado financeiro"*), está na coluna
❌ da tabela ("economize/ganhe mais") e não consta da lista de números
autorizados (§4). O spec de LP de 06/08 já registrava o número como
**proibido**, nominalmente.

### P1.2 / P1.3 — seguem idênticos

- S4 Documentos: *"quando surgir uma nova oportunidade de pegar um plantão"* —
  honestidade de escopo (Oferta §5.4, Func §6.5).
- S6 tabela: *"Depender de **terceiros** para tudo"* — Func §4.3 manda
  "hospital", não o genérico.

### CRO — os quatro pontos de estrutura seguem abertos

| # | Achado | Estado na v2 |
|---|---|---|
| CRO#1 | Fragmentação de CTA | **6 frases distintas** em 7 seções: "Traga sua PJ para a Caveo" (2x) · "Fale com nosso time" (2x) · "Conte com a Caveo" · "Conheça o App Caveo" · "Contrate agora" (2x) |
| CRO#3 | Sem tratamento de objeção | Nenhum FAQ, apesar dos 56 cliques/90d buscando preço da marca |
| CRO#4 | "milhares de reais" (S3 B01) | Vago, com o número validado (**R$ 2.500 com composição**) disponível e não usado |
| P3 | Nome da feature de recebimento | **Piorou: 3 nomes.** "Receba pelo plantão no mesmo dia" (S4) · "Recebimento Simplificado" (S5) · "receber no mesmo dia" (S6). Novo caso irmão: "Calculadora de tributos" (S4) × "Simulador de tributos" (S5) |

---

## 3. Novo na v2 🆕

### N1 — "+20.000 médicos": número novo sem validação

Era "+15.000" na v1 e é "+15.000 médicos em 21 estados" no registro do próprio
repositório (`Dores_Desejos_Publicos_Caveo.md`). A v2 usa **20.000 em dois
pontos** (card do hero e headline da S5).

Oferta §4: *"Nenhum número novo entra em peça sem validação."* Numa LP a
exposição é maior que num criativo — o número vira afirmação permanente e
indexável. Precisa de confirmação do cliente, e se confirmado, o repositório
inteiro deve ser atualizado junto.

### N2 — "O único App financeiro criado para médicos" (S3): claim de exclusividade

Além de estar na família banida (P0.1), *"o único"* é superlativo absoluto sem
lastro. O mapa de busca registra concorrentes nominais ativos na categoria
(`pavao contabilidade medica`, `multipla contabilidade medica`), e a afirmação
é verificável por qualquer visitante. Somado ao artigo definido do hero (*"**A**
Plataforma Financeira"*), a página faz duas alegações de exclusividade em duas
dobras.

### N3 — Três nomes para o produto na primeira dobra

> H1: "A **Plataforma Financeira** para a rotina médica"
> Subhead: "Um **Aplicativo** criado para médicos..."
> S3 em diante: "**App Caveo**"

Func §12.1 já registra a padronização como pendência aberta com quatro formas
circulando; a v2 empilha três delas — duas das quais na mesma dobra, em linhas
consecutivas. Func §3.2 proíbe "app" e "aplicativo" no mesmo trecho.

### N4 — O hero virou bloco de Funcionalidade

O spec de 06/08 dá o **bloco 2 (Hero) ao pilar Oferta** e restringe a palavra
"app" aos blocos 8 e 9. O hero da v2 abre nomeando o aplicativo — gasta a dobra
mais cara da página com vocabulário que deveria estar no miolo, e deixa o
argumento de aquisição ("por que a Caveo, por que agora") sem nenhuma
representação acima da linha de corte.

### N5 — O hero fechou o funil para o público que menos converte ⚠️

**Achado estratégico.** O CTA único do hero passou a ser *"Traga sua PJ para a
Caveo"*, que só endereça quem **já tem PJ**. O dado da conta contradiz a
escolha:

| Evidência | Fonte |
|---|---|
| **100%** das conversões em termos não-marca vieram do cluster "abrir a PJ do médico" | Relatório de termos de busca, Google Ads 3921127876, 09/05–06/08 |
| 1.630 buscas/mês, CAC **R$ 536**, **29% de fechamento** — travado por rank, não por orçamento | `Hot_Topics_Busca_ICP_Caveo.md` §2.2 e §8.2 |
| Cluster de migração de quem já é PJ: **~130/mês**; `trocar contador medico` = **0** | idem §4 |

Na v2 o argumento de abertura sobrevive só como benefício na S3 e enterrado no
subhead da S7 — onde está escrito com a palavra errada ("Abra sua **empresa**").

**Encaminhamento decidido com o time (13/08):** manter **uma página** servindo
os dois estados de PJ, com hero construído sobre eixos transversais e a
bifurcação resolvida na subheadline em uma linha, nunca em dois botões. Ver
`Heros_LP_Medico_Caveo.md`.

### N6 — Claim de recebimento com três forças diferentes

| Onde | O que promete |
|---|---|
| S4, título da feature | "RECEBA PELO PLANTÃO **NO MESMO DIA**" — afirmação categórica |
| S4, corpo da mesma feature | "com **mais rapidez** e previsibilidade" — hedge |
| S6, tabela | "Ter acesso a soluções para receber no mesmo dia" — hedge diferente |

Título e corpo do **mesmo bloco** dizem coisas de força distinta. Func §2 exige
que toda funcionalidade comunicada corresponda ao que o app faz hoje, e §9.3
exige que texto, título e visual contem a mesma coisa ao mesmo tempo. Ou o
mesmo-dia é entregável e o corpo assume, ou não é e o título cai.

### N7 — "contador" solto na S6

> S6, tabela (coluna "Antes"): *"Esperar o **contador** emitir a nota"*

Func §4.3: se for nomear, nomear certo — **"contador tradicional"**. A v1 tinha
100% de acerto nesse termo; a v2 abriu uma exceção. Sem o qualificador, a linha
pode ser lida como crítica ao contador da própria Caveo.

### N8 — Jargão residual: "líquido"

S4 ("entenda o valor **líquido**") e S6 ("Descobrir o **líquido** depois do
plantão"). Func §3.7 pede a tradução para benefício funcional — a forma
validada é **"quanto sobra pra você"**, que a própria LP usa corretamente em
outros pontos.

---

## 4. Desvios do spec de estrutura de 06/08

Não são violações de manual — são divergências da estrutura aprovada. Cada uma
pode ser decisão consciente; nenhuma deveria ser silenciosa.

| Bloco do spec | Previsto | Na v2 |
|---|---|---|
| 2 — Hero | Pilar Oferta, sem "app" | Abre em Funcionalidade (**N4**) |
| 3 — Formulário | **2ª dobra**, decisão explícita do usuário | 1ª dobra, dentro do hero, junto com vídeo |
| 6 — Custo do não-agir | R$ 2.500 com composição · R$ 1.500 | Ausente; "milhares de reais" no lugar (**CRO#4**) |
| 10 — **Prova de colega** | Depoimento de **médico real, não ator** — formato que o cliente chamou de "poderoso" | **Ausente da página inteira** |
| 11 — Objeções (FAQ) | Migração, complexidade, "app substitui contador?" | **Ausente** (**CRO#3**) |
| 12 — CTA único repetido | Uma instrução, repetida nos blocos 2, 3 e 12 | 6 frases (**CRO#1**) |
| Recebimento | *"Fora da v1 das duas LPs"* — decisão registrada | Presente em **4 pontos** (S2, S4, S5, S6) |

Sobre o último: em 10/08 isso era pergunta em aberto. O spec de 06/08 **já
tinha respondido** — o tema fica fora da v1. Passou a ser desvio de decisão
registrada, não tensão a resolver.

---

## 5. Checklist de correção — pronto para o time

**Busca-e-substitui literal (10 min de trabalho, elimina 9 achados):**

- [ ] `empresa` → `PJ` — 1 ocorrência (S7 subheadline). Confirmar com busca literal, não visual
- [ ] `soluções` → `formas` ou reescrever — 1 ocorrência (S6 tabela)
- [ ] `NF` → `nota fiscal` · `NFs` → `notas fiscais` — 3 ocorrências (S4, S5, S6)
- [ ] `Contrate agora` → `CONTE COM A CAVEO` — 2 ocorrências (S5, S6)
- [ ] `Conheça o App Caveo` → `CONHEÇA A CAVEO` — 1 ocorrência (S4)
- [ ] `terceiros` → `hospital` — 1 ocorrência (S6 tabela)
- [ ] `contador` → `contador tradicional` — 1 ocorrência (S6 tabela) — **N7**
- [ ] `líquido` → `quanto sobra pra você` — 2 ocorrências (S4, S6) — **N8**

**Reescrita (exige decisão de copy):**

- [ ] Hero subheadline — remover "criado para médicos" (**P0.1**) e resolver os três nomes do produto (**N3**)
- [ ] S3 headline — remover "criado para médicos" **e** "o único" (**P0.1**, **N2**)
- [ ] S7 selo "FEITA PARA MÉDICOS" — substituir pela alternativa aprovada (**P0.1**)
- [ ] S3 B01 — trocar "milhares de reais" por **R$ 2.500 com a composição** (**CRO#4**)
- [ ] S4 Documentos — tirar a implicação de perda de oportunidade (**P1.2**)
- [ ] Unificar o nome da feature de recebimento (3 nomes) e da calculadora/simulador (2 nomes) (**P3**)
- [ ] Alinhar título e corpo do bloco de recebimento — mesmo-dia ou não (**N6**)

**Decisão de negócio (não é copy):**

- [ ] Remover o card "30% Economia média em impostos" (**P1.1**) — recomendado: 2 cards factuais só
- [ ] Validar "+20.000 médicos" e propagar para o repositório, ou voltar a 15.000 (**N1**)
- [ ] Consolidar a página em **2 strings de CTA**: `CONTE COM A CAVEO` (botões de seção) e `FALE COM NOSSOS ESPECIALISTAS` (botão do formulário) (**CRO#1**)
- [ ] Decidir se recebimento sobe agora ou volta para o 2º lote, como o spec definiu
- [ ] Incluir bloco de depoimento de médico real (bloco 10 do spec) e bloco de objeções (bloco 11)

---

## 6. Perguntas para o cliente

1. **"+20.000 médicos" é número atual e verificável?** Se sim, o repositório
   inteiro precisa ser atualizado; se não, volta para 15.000. (**N1**)
2. **O recebimento no mesmo dia é entregável hoje, como está no título da S4?**
   O corpo do mesmo bloco hedgeia para "mais rapidez" — os dois não podem
   coexistir. (**N6**)
3. **Recebimento entra nesta LP ou volta para o 2º lote?** O spec de 06/08
   decidiu "fora da v1"; a página traz em 4 pontos.
4. **Vale abrir o bloco de objeções com resposta a preço?** 56 cliques/90d
   buscando "caveo planos", "mensalidade caveo", "caveo valores" — responder a
   quem já procura é diferente de usar preço como gancho (Oferta §3.2).

---

## 7. Referências

- `docs/Auditoria_LP_Oferta_Funcionalidade_Caveo.md` — auditoria da v1 (10/08)
- `docs/Heros_LP_Medico_Caveo.md` — variações de hero derivadas desta auditoria
- `docs/Manual_Comunicacao_Oferta_Caveo.md` · `docs/Manual_Comunicacao_Funcionalidade_Caveo.md`
- `docs/superpowers/specs/2026-08-06-lp-alta-conversao-medico-design.md` — spec de estrutura
- `docs/Hot_Topics_Busca_ICP_Caveo.md` — demanda de busca e leitura de CRO
