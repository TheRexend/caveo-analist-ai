# Auditoria — LP "Oferta e Funcionalidade" — Caveo

> **Objeto auditado:** copy completa de uma landing page de 7 seções (Hero →
> Identificação → Por que escolher a Caveo → Funcionalidades do App → Os 3
> Pilares → Antes×Depois → Formulário), compartilhada pelo time em
> 2026-08-10 como arquivo `LP [OFERTA e FUNCIONALIDADE].md`.
> **Critérios:** `Manual_Comunicacao_Oferta_Caveo.md`,
> `Manual_Comunicacao_Funcionalidade_Caveo.md`, `DosDonts_Oferta_Roteiros_Caveo.md`,
> `DosDonts_Funcionalidade_Roteiros_Caveo.md`, `Mapa_Tematico_Pilares_Criativos_Caveo.md`
> e `Hot_Topics_Busca_ICP_Caveo.md` (para a leitura de CRO/demanda).
> **Data da auditoria:** 2026-08-10.
> **Nota de enquadramento:** a regra-mãe Oferta×Funcionalidade foi criada para
> roteiros de anúncio isolados, que precisam ficar "puros" para o teste A/B não
> se contaminar. Uma LP é outro formato — cobrir os dois pilares na mesma
> página é esperado e correto. O que continua valendo é a higiene **por
> seção**: cada bloco precisa seguir o manual do pilar que representa (Seção 3
> = regras de Oferta; Seção 4 = regras de Funcionalidade). Foi assim que esta
> auditoria foi conduzida.

---

## Veredicto em uma linha

A LP acerta a estrutura (dor → por que a Caveo → demonstração → prova social →
comparação → formulário) e usa corretamente boa parte do léxico aprovado
("multa", "enquadramento incorreto", "conta PJ integrada", "tudo na palma da
mão", "menos de 1 minuto"), mas repete — em título, selo e subheadline, ou
seja, nos pontos de maior visibilidade da página — as duas regras mais
violadas historicamente: **"de médico para médico" em 3 variações** e
**"empresa" no lugar de "PJ" em 4 ocorrências**, além de **"solução" 4x**,
**dois CTAs "Contrate agora"** (proibido, autocredenciamento não existe) e uma
promessa de **"30% de economia em impostos"** que viola diretamente o teto da
promessa. Nenhum desses achados é sutil — todos têm regra explícita e
precedente documentado nos roteiros v2.

---

## P0 — Bloqueadores antes de publicar

### P0.1 — Família "de médico para médico": 3 ocorrências, nos 3 pontos mais lidos da página

Banido "em qualquer variação" pelo §3.1 do Manual de Oferta — é a lista mais
curta e mais explícita do documento inteiro (*contabilidade de médico para
médico · feita por médicos para médicos · feita para médicos · criada por
médicos · pensada para médicos*). A LP recria o padrão três vezes, cada uma no
elemento de maior destaque da própria seção:

| Seção | Trecho | Padrão banido |
|---|---|---|
| 1 — Hero (subheadline) | "Um App **criado para médicos**, com tudo o que você precisa..." | = "feita/pensada **para médicos**" |
| 3 — Por que escolher (headline, H2) | "A única solução financeira **criada por médicos, para médicos**." | = a frase banida quase literal |
| 7 — Formulário (selo) | "**FEITA PARA MÉDICOS**" | = string banida verbatim |

O caso da Seção 7 é o mais grave dos três: é a frase banida **exata**,
funcionando como selo/badge logo acima do formulário — ou seja, no momento de
maior intenção de conversão da página inteira.

**Correção sugerida:** trocar por qualquer uma das alternativas já aprovadas
no próprio manual — *"contabilidade especializada em médicos"*, *"plataforma
financeira especializada na rotina médica"*, *"só a Caveo entende a sua
rotina"*, *"quem conhece a sua rotina"*.

### P0.2 — "empresa" no lugar de "PJ": 4 ocorrências

§2.1 do Manual de Oferta chama isso de "a regra mais violada historicamente" e
pede busca literal pela palavra antes de aprovar qualquer peça. A mesma
auditoria dos roteiros v2 (05/08) já tinha encontrado 11 ocorrências desse
erro — a LP mostra que o problema não ficou só nos roteiros de vídeo.

| Seção | Trecho |
|---|---|
| 3 — Benefício 03 | "Resolva tarefas da **sua empresa** pelo App Caveo" |
| 4 — Documentos da PJ | "Acesse os documentos da **sua empresa** pelo celular" |
| 5 — Texto de apoio | "simplificar **a empresa médica** em todas as fases da carreira" |
| 7 — Formulário (subheadline) | "**Abra sua empresa** gratuitamente ou traga **sua PJ**..." |

O caso da Seção 5 usa a expressão **"empresa médica"**, nominalmente rejeitada
pelo cliente na call de 03/08 (*"não funciona 'uma empresa médica'"*). O caso
da Seção 7 é o mais revelador: a mesma frase usa "empresa" e "PJ" para a
**mesma ação** ("abrir a empresa" / "traga sua PJ") — prova de que é
inconsistência de redação, não escolha deliberada, já que o termo certo
aparece a três palavras de distância do errado.

**Correção:** busca-e-substitui "empresa" → "PJ" (feminino) nas 4 ocorrências.

### P0.3 — "solução" no lugar de "app"/"plataforma financeira": 4 ocorrências

§2.3 do Manual: *"'Solução' é vago e não vende; a Caveo é um app."* Termo
proibido, com substituto definido.

| Seção | Trecho |
|---|---|
| 3 — Headline | "A única **solução** financeira criada por médicos, para médicos" |
| 4 — Receba pelo plantão | "Conte com **uma solução** para ter acesso ao valor do seu trabalho..." |
| 5 — Texto de apoio | "**Uma solução** criada para simplificar a empresa médica..." |
| 6 — Tabela (Depois) | "Ter acesso a **soluções** para receber no mesmo dia" |

Vale notar: os dois piores parágrafos da LP em termos de compliance (Seção 3
headline e Seção 5 texto de apoio) empilham **"solução" + "empresa" + a
família "para médicos"** na mesma frase — os três problemas mais críticos do
documento convergem exatamente nesses dois pontos.

### P0.4 — CTA "Contrate agora": 2 ocorrências (Seção 5 e Seção 6)

Proibido nominalmente pelo §7.2 do Manual de Oferta: *"Implica contratação
self-service, que não existe — todo cliente passa pelo comercial."* A Caveo
não tem autocredenciamento — é, nas palavras do próprio cliente na call de
04/08, o "calcanhar de Aquiles" da operação. Numa LP isso é ainda mais sério
que num anúncio: o visitante que clica em "Contrate agora" espera transacionar
ali mesmo, e a página só entrega um formulário de contato (Seção 7). É
quebra de expectativa no exato momento da conversão — ver seção de CRO abaixo.

**Correção:** substituir pelas opções aprovadas — "CONHEÇA A CAVEO", "CONTE
COM A CAVEO", "TRAGA SUA PJ PARA A CAVEO" ou "ABRA SUA PJ GRATUITAMENTE".

### P0.5 — CTA "Conheça o App Caveo" (Seção 4)

Explicitamente rejeitado pelo Manual de Funcionalidade §8.2: *"Decidido: o
convite é para conhecer a Caveo, não o app."* Mesmo erro já flagado na
Auditoria de Roteiros v2 (Func R05). Recorrência confirmada.

**Correção:** "CONHEÇA A CAVEO" ou "CONTE COM A CAVEO".

### P0.6 — "NF" / "NFs" como jargão: 3 ocorrências

§3.7 do Manual de Funcionalidade é explícito: *"Vale inclusive em bullet e
texto de apoio — o público diz 'nota fiscal', não 'NF'."*

| Seção | Trecho |
|---|---|
| 4 — Emissão ilimitada (headline) | "Emita sua **NF** em menos de 1 minuto" |
| 5 — Bullet | "Emissão ilimitada de **NFs**" |
| 6 — Tabela (Depois) | "Emitir **NF** em menos de 1 minuto" |

### P0.7 — "Suporte personalizado" (Seção 5)

A decisão final da call de 03/08 foi **"suporte especializado"** — o flip-flop
está documentado no §1.10/P3.1 da Auditoria de Roteiros v2, e o mesmo erro
("personalizado") já tinha sido pego em dois roteiros. A LP repete o termo
rejeitado.

---

## P1 — Riscos de claim (exposição factual e de confiança)

### P1.1 — "30% Economia média em impostos" (Seção 1, provas sociais)

Este é o achado mais sério da auditoria, e não é terminológico — é de
**promessa**. O §1 dos dois manuais ("O teto da promessa") é a regra que
"governa todas as outras" e **não muda entre pilares**:

> *"A Caveo não gera renda nova, não promete enriquecimento e não garante
> resultado financeiro."*

A tabela do próprio manual lista "economize/ganhe mais" na coluna ❌ **Nunca
prometa**, ao lado de "mais dinheiro para o seu futuro" (slogan já rejeitado
pelo cliente em 00:14:42 da call de 03/08, pelo motivo estrutural de que "a
Caveo não gera dinheiro, só organiza"). "30% de economia em impostos" é
exatamente esse tipo de promessa: um resultado financeiro quantificado, que o
produto não controla e que a Caveo não pode garantir de forma genérica (o
tanto que cada médico "economiza" depende do enquadramento anterior dele, não
é uma constante). Também não está na lista de números autorizados (§4) — é um
número novo, não validado.

**Correção sugerida:** remover o card ou reformular para o que a Caveo
realmente entrega — clareza, não economia. Ex.: *"Enquadramento correto desde
o primeiro dia"* ou simplesmente manter os dois cards factuais (+15.000
médicos, 21 estados) e cortar o terceiro.

### P1.2 — "Documentos da PJ" ecoa a dramatização já contestada pela Caveo (Seção 4)

*"Acesse os documentos [...] quando surgir uma nova oportunidade de pegar um
plantão"* sugere que documentação pronta = plantão garantido. A Auditoria de
Roteiros v2 (P1.3) já registrou que Tiago, do time Caveo, esclareceu que **a
maioria dos plantões exige só o número do CNPJ** — a regularização completa
pode correr em paralelo. É uma versão mais suave do exagero já flagado nos
roteiros (Oferta R03, Func R06), mas ainda ancorada na mesma premissa
contestada. Formulação mais segura, alinhada ao §5.4/§6.5 dos manuais: focar
em "tempo perdido procurando documentos", não em "oportunidade que depende
deles".

### P1.3 — "Depender de terceiros para tudo" (Seção 6, tabela)

O Manual de Funcionalidade §4.3 é direto: *"❌ prazos de terceiros | ✅ sem
depender do hospital"* — o público e o time comercial nomeiam "hospital", não
usam o genérico "terceiros". A própria LP faz isso certo em outros pontos
("sem depender do horário ou da resposta do contador tradicional"); esta linha
da tabela ficou com o termo vago.

---

## P2 — Tensão estratégica: o tema "recebimento" sobe antes do previsto

O `Mapa_Tematico_Pilares_Criativos_Caveo.md` tem um guardrail explícito:

> *"Ambos os temas de recebimento devem ser segurados para o 2º lote — só
> sobem após validar a tese de CNPJ/oferta (tema financeiro tende a poluir a
> rede / atrair público de baixa qualidade)."*

A LP usa o tema em **três pontos**: a dor em Seção 2 ("Espera 30, 60 ou até 90
dias para receber"), a funcionalidade em Seção 4 ("Receba pelo plantão no
mesmo dia") e de novo na tabela da Seção 6.

**Mas atenção ao escopo do guardrail:** ele foi escrito pensando em mídia paga
(a "poluição de rede" é sobre segmentação de público em anúncio/PMax, onde o
tema atrai clique de baixa qualidade). Numa LP — que só é vista por quem **já
clicou** em algum anúncio — esse risco específico de contaminação de público
não se aplica da mesma forma. Ainda assim, isso é uma decisão estratégica que
vale confirmar explicitamente com o time/cliente, não assumir por omissão:
**o guardrail foi pensado para sequenciar anúncios, e essa LP decidiu incluir
o tema — é intencional, ou o guardrail deveria valer aqui também?**

---

## P3 — Inconsistências terminológicas menores

- **Nome da mesma funcionalidade em duas versões:** Seção 4 chama de "Receba
  pelo plantão no mesmo dia"; Seção 5 chama de "Recebimento Simplificado". É a
  mesma feature com dois nomes diferentes em duas seções — confunde a
  arquitetura de informação da página, ainda que nenhuma das duas violem o
  manual isoladamente.
- **CTA do Hero** ("Abra sua PJ 100% grátis") é uma reformulação livre do CTA
  aprovado ("ABRA SUA PJ GRATUITAMENTE" — Manual §7.1). Não é errado, mas
  como a página já tem CTAs fragmentados (ver seção de CRO), padronizar para o
  texto exato ajuda.
- **Nomenclatura do app** ("App Caveo" nesta LP) segue sem padronização
  fechada com o cliente — item já registrado como pendente desde a call de
  04/08 (`DosDonts_Funcionalidade_Roteiros_Caveo.md`, item 1) e confirmado
  "piorando" na Auditoria de Roteiros v2 (P3.6, 4 formas circulando). Aqui a
  LP é ao menos consistente internamente ("App Caveo" em toda a página) —
  registrar, não é um problema desta peça especificamente.
- **"Multa"** — identificada nas calls como "a palavra que mais chama
  atenção" do léxico aprovado — aparece na Seção 3 (Benefício 02), mas não no
  checklist de dores da Seção 2, que é o lugar natural para ela (a Seção 2
  lista "espera 30/60/90 dias", "documentos espalhados" etc., mas não usa a
  palavra que o próprio cliente validou como a de maior gancho). Oportunidade
  de reforço, não erro.

---

## Análise de CRO e alta conversão

Isto vai além do manual de comunicação — é leitura de estrutura de página e
comportamento de conversão.

### 1. Fragmentação de CTA — 6 textos diferentes na mesma jornada

A página usa: *"Abra sua PJ 100% grátis"* → *"Traga sua PJ para a Caveo"* →
*"Conte com a Caveo"* → *"Traga sua PJ para a Caveo"* (de novo) → *"Conheça o
App Caveo"* → *"Contrate agora"* (2x) → *"Fale com nosso time"*. Isso soma **6
frases de ação distintas** em 7 seções. Para uma LP (diferente de um teste A/B
de criativos, onde cada peça precisa de variável travada), o princípio de CRO
é o oposto: repetir a **mesma** frase de ação a cada scroll-stop reduz carga
cognitiva e reforça o hábito de clique. Recomendo consolidar para no máximo
2 variantes fixas — uma para "abrir PJ nova" e uma para "trazer PJ existente"
— usadas de forma idêntica em toda a página, eliminando "Contrate agora" e
"Conheça o App Caveo" (que já são proibidos por regra, ver P0.4/P0.5).

### 2. Bifurcação de audiência prematura no Hero

O Hero já abre com dois CTAs concorrentes — "Abra sua PJ 100% grátis" (quem
não tem PJ) vs. "Traga sua PJ para a Caveo" (quem já tem PJ em outro lugar) —
antes de qualquer prova ou benefício ter sido apresentado. Isso força o
visitante a se autoclassificar no primeiro segundo de página, o que aumenta
fricção. Pelo dado do `Hot_Topics_Busca_ICP_Caveo.md`, o cluster de maior
volume e melhor conversão de busca é justamente "abrir a PJ do médico"
(1.630/mês, CAC R$ 536, 29% de fechamento) — sugiro tornar esse o CTA primário
único do Hero, e reposicionar "traga sua PJ" como link secundário
(menos destaque visual), não como botão co-igual.

### 3. Objeção de preço sem resposta na página

O `Hot_Topics_Busca_ICP_Caveo.md` (seção 10) documenta sinal real de busca por
preço na marca — *"caveo planos"*, *"mensalidade caveo"*, *"caveo valores"* —
56 cliques em 90 dias, com a conclusão explícita: *"a LP e o comercial
precisam ter resposta pronta"*. Esta LP não tem nenhuma seção de FAQ ou
tratamento de objeção — nem para preço, nem para "como funciona o comercial",
nem para "quanto tempo leva para abrir". Isso não colide com a regra de "não
falar de custo de manutenção como argumento de venda" (§3.2 do Manual) — dar
uma resposta a quem já está procurando por preço é diferente de usar preço
como gancho de venda. Recomendo uma seção curta de objeções antes do
formulário, mesmo que a resposta sobre valores redirecione para "fale com o
time" em vez de expor um número.

### 4. Números vagos onde já existe número validado e mais persuasivo

Seção 3, Benefício 01, usa *"evite gastar milhares de reais"* — vago. O
Manual de Oferta já validou um número específico e defensável para esse
exato argumento: **R$ 2.500** para abrir uma PJ médica no modelo tradicional,
com composição explicada (certificados, taxas, serviço de abertura, endereço
virtual + mensalidade do contador). Especificidade aumenta credibilidade;
"milhares de reais" é o tipo de vaguidão que o próprio cliente rejeitou
quando o número virou R$ 4.000 ("não quero que seja um número que todo mundo
olha e fala 'p\*\*\* que pariu'") — a solução para isso já existe e é usar o
número certo, com a composição.

### 5. Estrutura geral da página é sólida

Dor (Seção 2) → resolução institucional (Seção 3) → demonstração de produto
(Seção 4) → prova social + reforço (Seção 5) → comparação direta (Seção 6) →
conversão (Seção 7) é uma sequência clássica de alta conversão e não precisa
mudar. A tabela Antes×Depois (Seção 6) em particular é um formato
comprovadamente eficaz — lado a lado, sem enumeração excessiva, mantém.

### 6. Quebra de expectativa no momento da conversão

Consequência direta do achado P0.4: dois "Contrate agora" aparecem **antes**
do formulário, prometendo uma ação transacional imediata. Quando o visitante
chega à Seção 7, o que existe é um formulário de contato ("Fale com nosso
time"). Esse descompasso entre o que o CTA promete e o que a página entrega é
um dos padrões mais conhecidos de queda de conversão no último passo — o
visitante se prepara mentalmente para "assinar agora" e recebe "preencha seus
dados e espere contato". Resolver o P0.4 resolve este ponto também.

---

## O que já está correto (não alterar)

- **"menos de 1 minuto"** usado de forma consistente nas 3 ocorrências (Seções
  4, 5 e 6) — sem contradizer com "segundos" em nenhum ponto, diferente do que
  aconteceu nos roteiros de vídeo (P0.2 da Auditoria de Roteiros v2).
- **CTAs aprovados usados corretamente:** "Conte com a Caveo" (Seção 2) e
  "Traga sua PJ para a Caveo" (Seções 1 e 3) batem exatamente com a lista do
  manual.
- **Léxico aprovado presente e correto:** "enquadramentos incorretos",
  "multas", "contador tradicional" (todas as ocorrências), "conta PJ
  integrada", "tudo na palma da sua mão" / "documentos na palma da mão",
  "PJ regularizada"-equivalente, "vaga do plantão" não aparece mas também não
  é usada errada.
- **Nenhum "caro"/"barato"** qualificando preço em nenhum ponto da página
  (§3.3 do Manual de Oferta).
- **Nenhum tom apelativo ou urgência artificial** — tom se mantém no registro
  "colega de profissão", sem estética de liquidação.
- **Identidade médica verbal** presente em todas as seções (a palavra
  "médico/médica" aparece de forma natural em cada bloco).
- **"Fale com nosso time"** (CTA final, Seção 7) é o único CTA de toda a
  página que sinaliza corretamente o fluxo real (contato comercial, não
  self-service) — é o modelo a generalizar para os outros CTAs, não o
  contrário.
- **Nenhuma menção a custo de manutenção da Caveo** como argumento de venda.

---

## Perguntas para levar ao cliente/time antes de publicar

1. O tema "recebimento" pode subir nesta LP mesmo com o guardrail de
   "segurar para o 2º lote" nos anúncios? (P2) — proponho tratar como decisão
   consciente, não corte automático, já que o risco original é de mídia, não
   de página.
2. Vale incluir uma seção de FAQ/objeções antes do formulário, dado o sinal
   real de busca por preço (56 cliques/90d)? (CRO #3)
3. Consolidar os CTAs da página em 1–2 variantes fixas, eliminando "Contrate
   agora" e "Conheça o App Caveo"? (P0.4, P0.5, CRO #1)

---

## Checklist de correção antes de publicar

- [ ] Reescrever os 3 pontos com a família "de médico para médico" (Hero
      subheadline, headline da Seção 3, selo da Seção 7) — P0.1
- [ ] Busca-e-substitui "empresa" → "PJ" (4 ocorrências) — P0.2
- [ ] Busca-e-substitui "solução"/"soluções" → "app"/"plataforma financeira"
      (4 ocorrências) — P0.3
- [ ] Trocar os dois "Contrate agora" (Seções 5 e 6) por CTA aprovado — P0.4
- [ ] Trocar "Conheça o App Caveo" (Seção 4) por "Conheça a Caveo" — P0.5
- [ ] Trocar "NF"/"NFs" por "nota fiscal"/"notas fiscais" (3 ocorrências) — P0.6
- [ ] Trocar "suporte personalizado" por "suporte especializado" — P0.7
- [ ] Remover ou reformular "30% Economia média em impostos" — P1.1
- [ ] Suavizar "Documentos da PJ" para não implicar perda de oportunidade — P1.2
- [ ] Trocar "terceiros" por "hospital" na tabela da Seção 6 — P1.3
- [ ] Unificar nome da funcionalidade de recebimento entre Seções 4 e 5 — P3
- [ ] Decidir com o cliente as 3 perguntas abertas acima
- [ ] Consolidar CTAs da página em no máximo 2 variantes fixas — CRO #1
