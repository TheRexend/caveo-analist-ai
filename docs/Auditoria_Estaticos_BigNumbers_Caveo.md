# Auditoria — 5 Estáticos "Big Numbers" — Caveo

> **Objeto auditado:** lote de 5 estáticos 1080×1080 construídos sobre números
> institucionais da Caveo (R$ 100 milhões em tributos, 500 mil horas, 20 mil
> médicos, 600 horas/ano).
> **Critérios:** `Manual_Comunicacao_Oferta_Caveo.md` e
> `Manual_Comunicacao_Funcionalidade_Caveo.md` (regras de copy),
> `Mapa_Tematico_Pilares_Criativos_Caveo.md` (spec de tema),
> `Hot_Topics_Busca_ICP_Caveo.md` (demanda de busca).
> **Escala:** P0 bloqueador · P1 corrigir antes de publicar · P2 ajuste de
> qualidade · P3 observação.
> **Documento irmão:** `Auditoria_Criativos_PMax_Caveo.md` (8 estáticos, 07/08).
> **Data:** 19/08/2026.

---

## Veredicto em uma linha

**O lote acerta o que o lote anterior errava em léxico e erra o que o lote
anterior já errava em CTA — mas o problema maior não é regra, é aritmética: os
três números não fecham entre si.** Zero ocorrências de "empresa", zero
"solução", zero "suporte personalizado", "sua PJ" no feminino, "médicos Caveo"
usado corretamente. Em compensação:

1. **`Contrate a Caveo` em 5 de 5 peças** — é a terceira rodada consecutiva com
   o mesmo bloqueador (R2.1 da auditoria de 07/08), agora em 100% do lote e no
   botão, não na legenda.
2. **Os números se contradizem dentro do próprio lote.** 500 mil horas ÷ 20 mil
   médicos = **25 horas por médico**. A peça 03 anuncia **600 horas**. É 24× a
   média que o próprio lote publica ao lado.
3. **4 de 5 peças não têm marcador médico visual** (§8 Oferta exige verbal
   **e** visual). Só a peça 04 cumpre.

E um ponto estratégico acima de todos: **este é um lote institucional dentro de
um framework construído para ser anti-institucional.** O tom de voz aprovado é
"colega de profissão falando com colega, sério mas não institucional", e "para
você, médico" foi rejeitado nominalmente por soar "muito Itaú". Big number
corporativo é exatamente o registro oposto. Não é proibido — mas é uma aposta
que contraria a diretriz vigente e precisa ser assumida como tal, não entrar
por descuido.

---

## 1. O problema aritmético (transversal, P0)

Os três números foram criados isoladamente e não foram testados um contra o
outro. Colocados na mesma campanha, o público faz a divisão.

| Claim | Peça | Implicação |
|---|---|---|
| +20 mil médicos | 04, 05 | Base declarada |
| +500 mil horas economizadas | 02, 05 | **25 h por médico** |
| Até 600 horas do seu ano | 03 | **24× a média do próprio lote** |
| +R$ 100 milhões/ano em tributos | 01, 05 | **R$ 5.000 por médico/ano** |

**Três defeitos derivados:**

**1.1 — As 600 horas não se sustentam.** 600 h/ano = 11,5 h por semana = ~1,6 h
por dia útil cuidando de rotina financeira. Nenhum médico reconhece esse número
como o seu, e quem for conferir contra as "500 mil horas" da peça ao lado acha
a inconsistência em uma conta. §4.1: *"o dado precisa existir e ser
verificável"*; §4.2: *"um item inflado invalida o número inteiro"*.
**Correção:** ou 600 h sai, ou as 500 mil horas saem — as duas não convivem na
mesma campanha.

**1.2 — R$ 5.000/médico/ano subvende e não tem base declarada.** "Economizados
em tributos" em relação a quê? Se for contra pessoa física, R$ 5.000/ano é
baixo demais para um médico de plantão — o número real seria muito maior e a
peça está entregando menos do que poderia. Se for contra mensalidade de
contador, entra direto na proibição do §3.2 (custo de manutenção como argumento
de venda). **A composição precisa ser definida antes de a peça rodar**, mesmo
que não apareça no criativo.

**1.3 — "por ano" aparece numa peça e some na outra.** Peça 01: *"+R$ 100
MILHÕES economizados em tributos **por ano**"*. Peça 05: *"+R$ 100 MILHÕES
economizados em tributos"* (acumulado?). Mesmo número, dois escopos.
Estruturalmente é o mesmo defeito do claim de tempo ("segundos" × "1 minuto",
P0.2 da auditoria de roteiros) que a área já corrigiu uma vez. **Fixar um
escopo e propagar.**

**1.4 — Três verbos para o mesmo benefício.** "horas **economizadas**" (02),
"horas **recuperadas**" (05), "horas podem **voltar** para você" (03). Em peças
testadas uma contra a outra, variar o verbo junto com o tema polui a leitura do
teste (§7.4). Escolher um.

---

## 2. O CTA (transversal, P0)

**`Contrate a Caveo ↗` está no botão de todas as 5 peças.**

Já está documentado duas vezes: `Manual_Comunicacao_Oferta_Caveo.md` §7.2 e
`Auditoria_Criativos_PMax_Caveo.md` R2.1. A justificativa é o **verbo**, não o
advérbio — tirar "agora" não resolveu no lote anterior e não resolve aqui:

> *"Implica contratação self-service, que não existe — todo cliente passa pelo
> comercial."*

Sem autocredenciamento, "Contrate a Caveo" promete um fechamento que o clique
não entrega. É o caminho mapeado para frustração e review negativo em loja.

**Correção (lista fechada):** `CONHEÇA A CAVEO` · `CONTE COM A CAVEO` ·
`FALE COM NOSSOS ESPECIALISTAS` · `TRAGA SUA PJ PARA A CAVEO` ·
`ABRA SUA PJ GRATUITAMENTE`.

**Ponto positivo real:** o CTA está **igual nas 5 peças**, que é exatamente o
que §7.4 pede num teste. O conserto é uma troca única de string em 5 arquivos —
custo zero, e o lote sai limpo nesse item.

---

## 3. Identidade médica visual (transversal, P1)

§8 Oferta: toda peça precisa de **dois** marcadores — verbal e visual.

| Peça | Verbal | Visual | Status |
|---|---|---|---|
| 01 | "médicos Caveo" ✅ | formas abstratas | ❌ |
| 02 | "Médico," ✅ | ícone de relógio | ❌ |
| 03 | "carreira médica" ✅ | despertador cromado | ❌ |
| 04 | "MÉDICOS" ✅ | jaleco + estetoscópio ✅ | ✅ |
| 05 | "médicos Caveo" ✅ | formas abstratas | ❌ |

**4 de 5 falham.** O verbal está resolvido no lote inteiro; o visual não existe
em nenhuma peça exceto a 04. Sem marcador visual, a peça compete com qualquer
fintech genérica no feed — e a especialização médica é o maior ativo da marca.

**Agravante na 03:** o despertador cromado em stock 3D é o tipo de acabamento
que §8 sinaliza como risco (*"peça de oferta com estética amadora é o maior
risco de imagem do pilar"*). Não é amador, mas é genérico e sem nenhuma
ancoragem médica — o mesmo asset serviria para um anúncio de academia.

---

## 4. Análise peça a peça

### Peça 01 — "+R$ 100 MILHÕES economizados em tributos por ano"

> Headline: *+R$ 100 MILHÕES economizados em tributos por ano*
> Apoio: *Economia gerada para médicos Caveo*
> Botão: *Contrate a Caveo*

**Pilar:** Oferta ✅ (não cita o app, argumento é posicionamento).

| # | Sev | Achado |
|---|---|---|
| 1.a | **P0** | `Contrate a Caveo` — §7.2 (ver seção 2) |
| 1.b | **P1** | *"Economia **gerada**"* — a Caveo não gera nada; §1 é literal: *"a Caveo não gera renda nova"*. O verbo "gerar" atribui à marca uma criação de valor que ela não faz. ✅ Trocar por *"Resultado dos médicos Caveo"* ou *"Já economizados por médicos Caveo"* |
| 1.c | **P1** | Escopo do número indefinido — "por ano" aqui, sem "por ano" na 05 (ver 1.3) |
| 1.d | **P1** | Sem marcador médico visual (§8) |
| 1.e | **P2** | *"economizados"* + *"Economia"* em linhas coladas — §5.2 (*"em 95% dos casos é melhor trocar a palavra"*) |
| 1.f | **P3** | *"médicos Caveo"* ✅ — conceito validado, usado corretamente. Melhor uso de léxico do lote |

**Sobre o teto da promessa (§1):** vale a nuance. A tabela do §1 bane
*"Economize / ganhe mais"* — mas isso é uma **promessa em 2ª pessoa ao leitor**.
Aqui é um **fato agregado no passado**, que é outra coisa. A peça não diz "você
vai economizar"; diz "médicos Caveo economizaram". Isso sobrevive ao teste
rápido do §1 (não promete estado futuro de patrimônio *ao leitor*). **Passa —
mas por pouco, e só enquanto a construção ficar em 3ª pessoa e no passado.** Se
alguma variação virar *"economize R$ 5 mil por ano"*, é violação direta.

---

### Peça 02 — "+500 mil horas economizadas pelos clientes Caveo"

> Headline: *+500 mil horas economizadas pelos clientes Caveo*
> Apoio: *Médico, resolva sua rotina financeira com mais agilidade pelo App Caveo.*
> Botão: *Contrate a Caveo*

**Pilar:** ⚠️ **contaminado.** A headline é prova social institucional (Oferta);
o apoio cita o App Caveo, o que por §9/§classificação joga a peça em
Funcionalidade. Os dois pilares são testados um contra o outro — uma peça que é
os dois não responde nada.

| # | Sev | Achado |
|---|---|---|
| 2.a | **P0** | `Contrate a Caveo` — §7.2 |
| 2.b | **P0** | *"**resolva** sua rotina financeira ... **pelo App Caveo**"* — instrução imperativa de uso do app. É literalmente o padrão banido em Funcionalidade §8.2 (*"EMITA SUA NOTA PELO APP — instrução de uso = convite implícito ao download"*). Sem autocredenciamento, quem baixar não resolve nada. Mesmo defeito R2.3 do lote anterior |
| 2.c | **P1** | *"clientes Caveo"* — o conceito validado é **"médicos Caveo"**. "Clientes" apaga o marcador médico da linha e troca uma expressão aprovada por uma genérica. A peça 01 e a 05 acertam isso; a 02 não |
| 2.d | **P1** | Contaminação de pilar (acima). Decidir: ou tira "pelo App Caveo" e vira Oferta pura, ou reconstrói a headline em torno da feature e vira Funcionalidade |
| 2.e | **P1** | Sem marcador médico visual (§8) |
| 2.f | **P2** | Vocativo *"Médico,"* — é a construção que o cliente rejeitou por soar *"muito Itaú"* ([01:37:45]); a recomendação registrada é usar **"para você"** sozinho ou **"para sua rotina"** |
| 2.g | **P2** | Dois CTAs: o imperativo do apoio + o botão (§7.3, *"dois CTAs empilhados se anulam"*) |

**É a peça mais fraca do lote.** Acumula bloqueador de CTA, bloqueador de
imperativo de app, contaminação de pilar e o único erro de léxico do lote.

---

### Peça 03 — "Até 600 horas do seu ano podem voltar para você!"

> Headline: *Até 600 horas do seu ano podem voltar para você!*
> Apoio: *Mais autonomia para sua PJ. Mais tempo para sua carreira médica.*
> Botão: *Contrate a Caveo*

**Pilar:** Oferta ✅.

| # | Sev | Achado |
|---|---|---|
| 3.a | **P0** | `Contrate a Caveo` — §7.2 |
| 3.b | **P0** | **600 horas é incompatível com as 500 mil horas do próprio lote** (ver 1.1). Número não autorizado e não sustentável |
| 3.c | **P1** | Sem marcador médico visual — despertador stock (§8) |
| 3.d | **P2** | *"podem voltar"* + *"Até"* = duplo hedge. Duas atenuações na mesma frase enfraquecem o claim até ele não afirmar nada. §5.1 (*"se a frase perde palavras sem perder sentido, corte"*) |
| 3.e | **P2** | Ponto de exclamação — §3.4 (tom apelativo, "nada de grito de oferta") |
| 3.f | **P2** | *"autonomia para sua **PJ**"* — a autonomia é do médico, não da PJ. O eixo canônico registrado é *"tudo na palma da sua mão"* |
| 3.g | **P3** | *"sua PJ"*, feminino ✅. Correto |

**Nota de oportunidade:** o fechamento validado pelo cliente para exatamente
este ângulo já existe e é melhor que a headline atual — **"A Caveo devolve o
seu tempo."** (ponto final, sem complemento). É a formulação aprovada em call,
não tem número frágil para defender e é mais curta. Vale testá-la contra a
versão numérica.

---

### Peça 04 — "+20 MIL MÉDICOS já escolheram a Caveo"

> Headline: *+20 MIL MÉDICOS já escolheram a Caveo*
> Apoio: *Faça parte da maior plataforma financeira para médicos do Brasil.*
> Botão: *Contrate a Caveo*

**Pilar:** Oferta ✅. **É a melhor peça do lote.**

| # | Sev | Achado |
|---|---|---|
| 4.a | **P0** | `Contrate a Caveo` — §7.2. **É o único bloqueador da peça** |
| 4.b | **P1** | *"a **maior** plataforma financeira para médicos do Brasil"* — superlativo é afirmação factual comparativa, não retórica. Precisa de lastro documentado antes de rodar (risco CONAR/concorrente). §4.1 item 2 vale por analogia: *"se citar, a atribuição precisa estar correta"* |
| 4.c | **P2** | Dois CTAs: *"Faça parte..."* no apoio + botão (§7.3) |
| 4.d | **P2** | ⚠️ *"plataforma financeira **para médicos**"* — checar contra a família banida do §3.1 (*criada para médicos · pensada para médicos · feita para médicos*). **Minha leitura: passa** — o que o §3.1 bane é o particípio + "para médicos" como slogan de diferenciação; aqui é descritor de categoria, sem particípio. Mas é a fronteira, e o histórico do lote anterior (R2.2) foi exatamente escorregar nela. Se quiser margem zero: *"a maior plataforma financeira especializada em médicos"* |
| 4.e | ✅ | **Único marcador visual médico do lote** (jaleco + estetoscópio + celular). §8 cumprido |
| 4.f | ✅ | *"plataforma financeira"* — termo aprovado do §2.3 |
| 4.g | ✅ | *"já escolheram"* — passado, fato, sem promessa. Passa limpo no §1 |

**Com o CTA trocado e o superlativo validado, esta peça sai.** É a única do
lote a um passo de aprovada.

---

### Peça 05 — "20 mil médicos Caveo e +R$ 100 MILHÕES economizados em tributos"

> Headline: *20 mil médicos Caveo e +R$ 100 MILHÕES economizados em tributos*
> Apoio: *+500 mil horas recuperadas na sua rotina médica*
> Botão: *Contrate a Caveo*

**Pilar:** Oferta ✅.

| # | Sev | Achado |
|---|---|---|
| 5.a | **P0** | `Contrate a Caveo` — §7.2 |
| 5.b | **P0** | *"+500 mil horas recuperadas na **sua** rotina médica"* — o possessivo atribui ao leitor um número coletivo. 500 mil horas não foram recuperadas na rotina dele. É afirmação falsa por construção gramatical, não por exagero. ✅ *"+500 mil horas recuperadas nas rotinas dos médicos Caveo"* |
| 5.c | **P1** | Três números na mesma peça, sem hierarquia. §5.1/§5.3: quando tudo é destaque, nada é |
| 5.d | **P1** | **A peça não é testável.** Sendo a soma das outras quatro, se ela vencer não se sabe qual número venceu. Ou sai do teste, ou entra declaradamente como braço "combo/controle", ciente de que não gera aprendizado isolado |
| 5.e | **P1** | *"por ano"* ausente aqui e presente na 01 — mesmo número, escopo diferente (ver 1.3) |
| 5.f | **P1** | Sem marcador médico visual (§8) |
| 5.g | **P2** | *"recuperadas"* × *"economizadas"* (02) para a mesma métrica (ver 1.4) |
| 5.h | ✅ | *"20 mil médicos Caveo"* — conceito validado, e a construção mais forte do lote inteiro |

---

## 5. Placar

| # | P0 | P1 | P2 | Estado |
|---|---|---|---|---|
| 01 | 1 | 3 | 1 | ❌ |
| 02 | 2 | 3 | 2 | ❌ pior do lote |
| 03 | 2 | 1 | 3 | ❌ |
| 04 | 1 | 1 | 2 | ⚠️ **mais próxima de sair** |
| 05 | 2 | 4 | 1 | ❌ |

**Nenhuma das 5 sai como está. 4 das 5 dependem de uma decisão de número, não
de uma troca de palavra.**

**O que o lote acertou (não regride do anterior):**
- Zero ocorrências de "empresa" — a violação histórica mais comum, resolvida.
- Zero "solução", zero "sistema", zero "suporte personalizado".
- "sua PJ" no feminino, correto.
- "médicos Caveo" usado em 3 peças — conceito validado, aplicado certo.
- "plataforma financeira" no lugar de "contabilidade" no posicionamento.
- Nenhum "de médico para médico" na forma banida.
- CTA idêntico nas 5 peças (§7.4) — errado, mas consistente. Fácil de consertar.

---

## 6. Leitura estratégica — isto faz sentido com o que temos?

Três respostas, em ordem de peso.

### 6.1 O tema existe no spec, a execução não

`Mapa_Tematico_Pilares_Criativos_Caveo.md` tem **"Prova social / indicação"**
como tema válido de Oferta. Mas o ângulo registrado é *"UGC + embaixadora
(Amanda)"*, com a dor/desejo *"confiança de colega"*. **Big number corporativo
é prova social de escala, não de colega** — é a versão institucional do mesmo
tema, e é justamente o registro que o tom de voz aprovado evita ("colega de
profissão falando com colega, sério mas não institucional"; "para você, médico"
rejeitado por soar "muito Itaú").

Não é motivo para matar o lote. É motivo para **rodá-lo declaradamente como
teste de uma hipótese nova** — "autoridade por escala funciona neste público?"
— e não como se fosse a execução já validada do tema de prova social. As duas
respondem perguntas diferentes.

### 6.2 Falta a oferta dentro das peças de oferta

Nenhuma das 5 carrega os diferenciais que o manual chama de centrais:
**abertura de PJ 100% gratuita · emissão ilimitada de notas fiscais sem custo
adicional · conta PJ integrada · suporte especializado.**

Big number é **prova**, não é **oferta**. Prova responde "dá pra confiar?";
oferta responde "por que agora?". Este lote responde só a primeira. Se ele
substituir as peças de oferta no ar, o funil perde o argumento de conversão; se
rodar **ao lado** delas, funciona como camada de credibilidade — que é
provavelmente o papel certo.

### 6.3 O canal importa para o veredicto

`Hot_Topics_Busca_ICP_Caveo.md` mostra demanda de busca ~12:1 a favor de
Oferta, mas concentrada em intenção concreta: *contabilidade especializada em
médicos* (2.780/mês), *abrir a PJ do médico* (1.630/mês). **Nenhum big number
tem demanda de busca** — ninguém pesquisa "quantas horas economizo com
contabilidade".

Consequência prática:
- **Meta / PMax prospecção / display:** faz sentido. Público frio, autoridade
  e escala funcionam como primeiro contato, e a peça 04 (20 mil médicos) é o
  formato clássico disso.
- **Busca / captura de intenção:** não faz sentido sozinho. Quem pesquisa
  "abrir pj medico" quer saber quanto custa e quanto demora, não quantos
  médicos já são clientes.

---

## 7. Plano de correção, em ordem de esforço

**Troca única de string, 5 arquivos, resolve 5 P0:**
1. `Contrate a Caveo` → `CONHEÇA A CAVEO` (ou outro da lista fechada), igual
   nas 5 peças.

**Decisão de número — precisa do cliente, trava 4 peças:**
2. Definir o escopo de R$ 100 milhões: por ano ou acumulado? Economia contra
   qual baseline? — e propagar igual nas peças 01 e 05.
3. Decidir entre **600 horas** e **500 mil horas**. As duas não podem rodar
   juntas.
4. Fixar um verbo único para o benefício de tempo (economizadas / recuperadas /
   devolvidas).
5. Validar lastro do superlativo "a maior plataforma financeira para médicos do
   Brasil" (peça 04).

**Reescrita de linha:**
6. Peça 01: *"Economia gerada"* → *"Já economizados por médicos Caveo"*.
7. Peça 02: cortar *"pelo App Caveo"* (bloqueador) e *"Médico,"* (Itaú);
   *"clientes Caveo"* → *"médicos Caveo"*.
8. Peça 05: *"na sua rotina médica"* → *"nas rotinas dos médicos Caveo"*.
9. Peça 03: cortar o "!" e resolver o duplo hedge; considerar testar
   *"A Caveo devolve o seu tempo."* como variação.
10. Peça 04: cortar *"Faça parte"* do apoio (segundo CTA).

**Direção de arte:**
11. Marcador médico visual nas peças 01, 02, 03 e 05 (§8). A 04 é a referência
    do lote.

---

## 8. Pontos em aberto para o cliente

1. **Baseline da economia tributária** — contra pessoa física ou contra
   contador tradicional? Se for a segunda, esbarra no §3.2 (custo de manutenção
   como argumento). Precisa de resposta antes de qualquer peça com R$ 100
   milhões rodar.
2. **Lastro do superlativo "a maior do Brasil"** — fonte e data.
3. **Origem das 600 horas** — de onde saiu, e como convive com as 500 mil.
4. **"Prova social por escala" é um pilar novo?** Hoje o tema existe no spec
   como UGC de colega. Se big number vira linha permanente, o
   `Mapa_Tematico_Pilares_Criativos_Caveo.md` precisa registrar o ângulo, e o
   `Manual_Comunicacao_Oferta_Caveo.md` §4 precisa absorver os números na lista
   autorizada.
5. **Papel no funil** — estas peças substituem ou acompanham as de oferta? A
   recomendação desta auditoria é acompanhar (ver 6.2).
