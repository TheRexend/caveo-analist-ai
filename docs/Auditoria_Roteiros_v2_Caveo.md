# Auditoria dos Roteiros v2 (Oferta + Funcionalidade) — Caveo

> **Objeto auditado:** `ROTEIROS_ Ofertas v2` (6 roteiros) e
> `ROTEIROS_ Funcionalidades v2` (6 roteiros) — 12 no total.
> **Critérios:** `DosDonts_Oferta_Roteiros_Caveo.md` (call 03/08/2026),
> `DosDonts_Funcionalidade_Roteiros_Caveo.md` (call 04/08/2026) e os guardrails
> de `Mapa_Tematico_Pilares_Criativos_Caveo.md`.
> **Data da auditoria:** 05/08/2026. **Contexto de urgência:** gravação
> marcada para quarta-feira, material bruto na quinta ([00:54:57] pt2) —
> ou seja, tudo que muda **fala** ou **direção de captação** precisa ser
> decidido antes do set.

---

## Veredicto em uma linha

Os roteiros aplicaram bem a maior parte das decisões de *frase* (ganchos
aprovados estão quase todos verbatim), mas **falharam nas decisões
transversais** — as que precisavam ser aplicadas em busca-e-substitui em
todos os roteiros. O resultado: **11 ocorrências de "empresa" onde ficou
decidido "PJ"**, três claims de tempo diferentes para a mesma
funcionalidade, o termo "suporte" oscilando entre duas versões, e **duas
decisões de produção que não entraram em nenhum dos 12 roteiros**.

Além disso há **4 achados que não são de checklist, e sim de risco**: um dado
estatístico cuja fonte e cujo conteúdo mudaram, uma composição de custo que só
fecha somando categorias diferentes, dois roteiros construídos sobre uma
premissa que o próprio time da Caveo contradisse na reunião, e um tema que os
guardrails mandavam segurar para o 2º lote.

**Contagem de roteiros:** confirmados **12** (6+6) — resolve a divergência
"10 vs 12" que ficou aberta em [00:26:41] da call de 03/08.

---

## P0 — Bloqueadores antes da gravação

Mudam o que o porta-voz fala. Se não forem resolvidos, geram regravação.

### P0.1 — "empresa" no lugar de "PJ": 11 ocorrências

A instrução foi explícita e do próprio lado da agência: *"entra aquele ponto
que a gente falou no comecinho, **troca tudo para PJ**"* ([01:08:10]). O
público não fala "empresa" nem "CNPJ" — fala "PJ", e sempre no feminino
([00:46:08], [01:03:14]). Não foi aplicado:

| Roteiro | Trecho | Onde |
|---|---|---|
| Oferta R01 | "por que confiaria **sua empresa** a uma contabilidade..." | Gancho var. 02 |
| Oferta R01 | "necessidades da **sua empresa médica**" | Oferta |
| Oferta R03 | "pedem todos os dados da **sua empresa**" | Problema |
| Oferta R03 | "Deixe **sua empresa** pronta antes que o próximo plantão apareça" | Fechamento |
| Oferta R04 | "acham normal pagar para abrir **sua empresa médica**" | Gancho var. 02 |
| Oferta R04 | "para abrir **uma empresa médica**" | Problema |
| Oferta R04 | "a **abertura da sua empresa** é 100% gratuita" | Solução |
| Oferta R05 | "o **faturamento da sua empresa**" | Solução imediata |
| Oferta R06 | "Tem uma dúvida sobre **a empresa**? Espera de novo." | O Vilão |
| Func R04 | "você acompanha o **faturamento da sua empresa**" | Solução |
| Func R06 | "toda documentação da **sua empresa** fica organizada" | Solução |

⚠️ Atenção especial em **Oferta R04** e **Func R06**: "empresa médica" foi
*nominalmente rejeitado* em [01:07:17]–[01:08:10] (*"não funciona 'uma empresa
médica'"*), e o Func R06 é o roteiro **cuja dor é justamente a documentação da
PJ** — dizer "documentação da sua empresa" ali contradiz o próprio tema.

### P0.2 — Três claims de tempo diferentes para emitir nota

A decisão em [00:42:12]–[00:43:05] (pt2) foi **"menos de um minuto"**, por
maioria (Undiciatti, Tiago, Mariana), justamente porque "segundos" pode ser
lido como menos do que o produto entrega. Os roteiros usam as duas versões —
**inclusive dentro do mesmo roteiro e da mesma seção**:

| Roteiro | Diz "segundos" | Diz "menos de 1 minuto" |
|---|---|---|
| Func R01 | Título + texto na tela ("EMITA NOTA FISCAL DO PLANTÃO EM SEGUNDOS") | Fala da solução |
| Func R02 | Fala da solução ("em poucos segundos") | Texto na tela ("EMITA SUA NF EM MENOS DE 1 MINUTO") |
| Func R05 | Gancho var. 02 ("pode levar segundos") **e** texto na tela ("Emita sua nota em segundos") | Fala da solução |

**Por que muda:** em Func R02 e R05 o espectador **ouve um número e lê outro
ao mesmo tempo**. Isso não é só inconsistência de marca — é um claim de
produto contraditório dentro de 9 segundos, e é o tipo de coisa que um médico
que já usa o app percebe. Escolher um único número e propagar em fala, texto
na tela e título.

Agravante em **Func R01**: a direção visual pede *"usar relógio na tela
contando os segundos"*. Se o claim é "menos de 1 minuto", um cronômetro
contando segundos reforça o claim errado — e um relógio que precisa sugerir
um minuto não caberia na janela de 9s da seção.

### P0.3 — Func R05 está sem a seção de PROBLEMA (e é o roteiro nº 1 do cliente)

O roteiro pula de **GANCHO | 0–6s** direto para **SOLUÇÃO | 13–24s**. Faltam
os 7 segundos de 6 a 13s, e falta a seção inteira.

Isso não é um lapso de formatação: em [00:38:21]–[00:41:15] (pt2) esse foi
**o pedido mais enfático da reunião**. O cliente classificou esse roteiro como
o carro-chefe (*"de todas as nossas funcionalidades, essa aqui é 01... a que
mais todo mundo olha e fala 'que produto maneiro'"*) e pediu explicitamente
que se construísse a objeção:

> *"esse é o creme de la creme do nosso produto. Esse é o que a gente mais tem
> que criar essa objeção do contador, do quanto demora, do quanto que o fluxo
> é ruim pra gente poder gerar esse valor da solução aqui"*

O enredo pedido — contador tradicional levando até 72 horas, o tempo passando
— **não existe no roteiro**. Sem ele, o "menos de 1 minuto" não tem contra
que se comparar, e o roteiro perde exatamente o efeito que o cliente quer.

### P0.4 — Func R06 var. 02 mantém a incoerência que o cliente diagnosticou

Var. 02: *"percebe que sua PJ ainda não está pronta"* — mas a seção de
problema é sobre **procurar documentos** ("no e-mail, no computador, no
WhatsApp").

Paolla levantou isso em [00:48:55]: *"eu tenho dúvida se esse problema conecta
com a variação dois, porque se a PJ dele não tá pronta, ele não vai ter os
documentos, né?"* — e Undiciatti concordou e ditou a correção: *"na real é os
documentos não estão prontos... **Você não tem os documentos necessários na
mão**"*. A correção não foi aplicada.

### P0.5 — Oferta R03: a consequência trocou de tema e desconectou da oferta

Aprovado em [00:58:44]: *"Enquanto você **tenta abrir sua PJ**, o médico Caveo
tem tudo na palma da mão e fica com o plantão."*
No roteiro: *"Enquanto você **tenta procurar todos os documentos**, o médico
Caveo tem tudo na palma da mão..."*

Duas consequências:
1. **Quebra o encadeamento da oferta.** A oferta desse roteiro é *abertura de
   PJ gratuita*. Se o obstáculo passa a ser "achar documentos", a solução
   ofertada (abrir PJ de graça) não resolve o problema mostrado.
2. **Invade o tema de Func R06**, que é literalmente "procurar os documentos
   no e-mail, no computador, no WhatsApp". Dois roteiros de pilares diferentes
   disputando a mesma dor.

### P0.6 — Falas não cabem na janela de tempo (sistemático)

A duração de 30s foi **travada de propósito** para isolar a variável de teste
([00:01:28]). Se a fala não cabe, o set improvisa ou a edição corta — e o
controle do experimento se perde silenciosamente. Medindo a ~2,5 palavras/s
(ritmo normal de locução em PT-BR):

| Trecho | Janela | Orçamento | Real | Excesso |
|---|---|---|---|---|
| Oferta R03 fechamento | 5s | ~12 pal. | 30 pal. | **2,4x** |
| Func R04 fechamento | 6s | ~15 pal. | 32 pal. | **2,1x** |
| Oferta R02 problema | 7s | ~18 pal. | 33 pal. | **1,9x** |
| Oferta R06 "O Herói" | 9s | ~22 pal. | 34 pal. | 1,5x |
| Func R01 solução | 9s | ~22 pal. | 31 pal. | 1,4x |
| Func R06 problema | 7s | ~18 pal. | 23 pal. | 1,3x |
| Oferta R05 oferta | 9s | ~22 pal. | 28 pal. | 1,2x |
| Func R03 contexto | 10s | ~25 pal. | 20 pal. | ✅ cabe |

O padrão se concentra nos **fechamentos** — as janelas mais curtas, e onde
mais texto foi adicionado depois da reunião. O cliente já sinalizou isso três
vezes na própria call: *"é só muita palavra, né gente? Muita palavra"*
[00:01:08 pt2], *"difícil de gravar, mas tá bom. Tem bastante pausa"*
[00:07:25 pt2], *"até duro de gravar"* [00:37:21 pt2].

### P0.7 — Personas incompatíveis com um único porta-voz

A gravação é uma sessão só, com a Amanda. As faixas declaradas nos roteiros
vão de **24–30** (Oferta R03) a **35–50** (Oferta R05), passando por 28–40 e
28–45. Em [00:21:07] (pt2) a faixa fechada foi **28–45**.

Não é só inconsistência de documento: se o roteiro pede recém-formado de
24–30 e outro pede 35–50, **nenhuma das duas pontas é entregável** com a mesma
porta-voz. Ou se alinha tudo em 28–45, ou se decide antes do set qual roteiro
justifica outra pessoa/figurino.

---

## P1 — Riscos de claim (exposição factual e de confiança)

### P1.1 — Oferta R05: a fonte E o conteúdo do dado mudaram

Três problemas empilhados no mesmo gancho:

1. **Fonte diferente.** A reunião registrou "Fire Research Center"
   [01:20:59]; o roteiro traz rodapé *"\*Afya Research Center"*. "Afya" é
   plausivelmente o nome **correto** (a Afya é real e tem braço de pesquisa) e
   "Fire" provavelmente foi erro da transcrição automática. Mas isso precisa
   ser **verificado**, não assumido.
2. **O dado virou outro dado.** O que foi validado foi *"7 em cada 10 médicos
   não sabem quanto faturam"*. A var. 01 afirma: *"7 a cada 10 médicos já
   estão comprometidos com despesas fixas **e dívidas**"*. Isso é uma
   afirmação diferente — e **"dívidas" nunca apareceu em nenhuma das duas
   reuniões**. Pior: em [01:23:56] Undiciatti pediu para **remover** "despesa
   fixa" (*"Eu só tiraria despesa fixa"*) — a var. 01 manteve e ainda
   adicionou dívidas.
3. **Citar a fonte eleva a régua.** A decisão foi que o dado podia ser usado
   *"sem dar pepino, sem a gente ter comprado"* [01:20:59] — ou seja, sem
   citação formal. O roteiro **adiciona** um rodapé atribuindo o número a uma
   instituição nomeada. Com citação, deixa de ser retórica e passa a ser
   afirmação factual atribuída — e a regra da própria reunião era o risco de
   *"alguém que conhece o dado"* contestar.

Note a assimetria: a **var. 02** ("7 em cada 10 médicos já comprometem boa
parte da sua renda com despesas") está mais próxima do aprovado, aplicou o
corte pedido e **não tem rodapé**. Duas variações que fazem afirmação
estatística precisam do mesmo tratamento de fonte.

Ainda: "7 **a** cada 10" (var. 01) vs "7 **em** cada 10" (var. 02) — a forma
aprovada é "em cada 10" [01:21:59].

### P1.2 — Oferta R04: a composição de R$ 2.500 só fecha misturando categorias

Somando o que está na tela:

| | |
|---|---|
| Itens **únicos** (Cert. PF 180 + Cert. PJ 180 + DARE 594,28 + Serviço 800 + Endereço 142) | **R$ 1.896,28** |
| Itens **mensais** (Contador 600/mês + Licenciamento 73/mês) | **R$ 673,00** |
| Total com 1 mês de recorrentes | R$ 2.569,28 → "**+ de R$ 2.500**" ✅ fecha |
| Total **sem** os recorrentes | R$ 1.896,28 → ❌ falta R$ 603,72 |

**O problema:** a fala diz *"pode custar mais de 2,5 mil reais **para
abrir**"*, mas **26% do total é custo mensal recorrente**, não custo de
abertura. Sem embutir um mês de mensalidade, o custo de abrir fica em
R$ 1.896 — abaixo do número anunciado. É exatamente o tipo de número que o
cliente rejeitou quando era R$ 4.000: *"não quero que seja um número que todo
mundo olha e fala 'p*** que pariu'"* [01:05:20].

**Agravante de notação:** a mensalidade do contador está marcada com "**X**"
enquanto os outros itens usam "→". Se o "X" significa *excluído do total*, a
soma cai para R$ 1.969,28 e o claim quebra por R$ 530. A notação não está
definida em lugar nenhum — e é ela que decide se o número fecha ou não.

Dois pontos menores no mesmo bloco:
- ✅ "Serviço de abertura = R$ 800" **aplicou corretamente** a correção de
  [01:10:04] (era R$ 2.000, foi reduzido para ~meio salário mínimo). Bom.
- ⚠️ "Taxa de abertura (DARE) = R$ 594,28" é valor **estadual (SP)**. Numa
  campanha nacional, com a variação regional que a própria reunião mapeou
  (Belém ~5.000, Salvador/Rio ~2.500), vale checar se o item se sustenta como
  número genérico.
- ⚠️ Mostrar "Mensalidade do contador = R$ 600/mês" na tela convida a
  pergunta *"e quanto a Caveo cobra por mês?"* — exatamente o terreno que
  [01:01:48] mandou evitar para não ser comparada a "contabilidade barata".

### P1.3 — Oferta R03 e Func R06 partem de uma premissa que a própria Caveo contradisse

- **Oferta R03:** *"sem a PJ aberta, você não consegue pegar um plantão
  sequer"*
- **Func R06:** *"só perde tempo e também a chance de pegar o plantão"*

Em [00:47:48] (pt2), Tiago (Caveo) descreveu o processo real: a maioria dos
plantões **exige apenas o número do CNPJ**; certidões vencidas se renovam sob
demanda pelo suporte; a regularização pode correr em paralelo porque a
primeira nota só sai cerca de um mês depois. E a frase que fecha:
**"ele não vai perder uma oportunidade por conta dessa certidão."**

Ou seja: dois roteiros dramatizam uma perda que a operação diz que não
acontece. A reunião de 03/08 já tinha classificado a versão do R03 como
"mentirinha do bem" válida na maioria dos casos — mas isso foi **antes** do
esclarecimento de Tiago. O público é médico e conhece o processo; é o tipo de
exagero que custa credibilidade justamente no atributo que é o maior ativo da
marca. Recomendação: suavizar para "as melhores oportunidades não chegam até
você" (que já é a var. 02 do R03 e é mais defensável) em vez de bloqueio
absoluto.

### P1.4 — Promessas novas, mais amplas que a rejeitada

O slogan *"mais dinheiro para o seu futuro"* foi **rejeitado** em [00:14:42]
com um motivo estrutural: *"a gente não gera mais dinheiro pro futuro do cara.
No máximo a gente organiza as finanças dele"*. Os roteiros trazem promessas
da mesma família — e maiores:

| Roteiro | Trecho | Problema |
|---|---|---|
| Func R04 | "te dar a **liberdade financeira que você tanto deseja**" | Promessa maior que a rejeitada; nunca discutida em nenhuma das reuniões |
| Oferta R05 | "**te garantindo** mais saúde financeira" | "Garantir" resultado financeiro é promessa que o produto não controla |
| Oferta R01 | "só a Caveo... **pode resolver tudo pra você**" | O aprovado era "pode **acompanhar** tudo isso" [00:12:32] — "resolver tudo" é escopo bem maior |

### P1.5 — Func R03: o claim escala de "mesmo dia" para "na hora", e o hedge cai no CTA

Dentro do mesmo roteiro:

1. Gancho: "recebe... no mesmo dia" / "o dinheiro **pode** cair... no mesmo dia"
2. Solução: "pode cair na sua conta **na mesma hora**"
3. CTA: "**Receba na hora** pelos seus plantões"

Duas coisas erradas: a promessa **aperta** de dia → hora sem decisão por trás,
e o **"pode"** — o hedge que Undiciatti aprovou nominalmente (*"o gancho do
'pode cair'"*, [00:10:59]) — **desaparece justamente no CTA**, o elemento mais
lido. Se o hedge existe porque o recebimento é condicional, ele precisa
sobreviviver no CTA.

---

## P2 — Quebras do desenho de teste

O lote inteiro existe para descobrir **qual tema/gancho funciona**, com todas
as outras variáveis travadas ([00:01:28] e Kaue: *"se a gente colocar todas as
variáveis variando, a gente não vai saber qual dos fatores gerou o sucesso ou
o fracasso"*). Estes itens contaminam essa leitura:

### P2.1 — CTAs de botão variando sem controle

| Padrão do lote | Exceções |
|---|---|
| "CONHEÇA A CAVEO" (Oferta R01, Func R01/R04) · "CONTE COM A CAVEO" (Oferta R05/R06, Func R03) | **"CONTRATE AGORA"** (Oferta R02) · "ABRA SUA PJ GRÁTIS NA CAVEO" (Oferta R03) · "EMITA SUA NOTA PELO APP" (Func R02) · "TENHA TUDO NO APP CAVEO" (Func R06) |

Se o CTA muda junto com o tema, não se sabe se a diferença de conversão veio
do tema ou do botão. Além disso, dois casos têm problema próprio:

- **"CONTRATE AGORA"** (Oferta R02) é o único CTA transacional do lote.
  Implica contratação self-service, que **não existe** — a Caveo não tem
  autocredenciamento [00:35:06 pt2]. E puxa para o registro "Casas Bahia" que
  [01:12:58] pediu explicitamente para evitar.
- **"EMITA SUA NOTA PELO APP"** (Func R02) é uma instrução para usar o app, o
  que colide com a regra de **não induzir download/uso sem contato comercial**
  [00:33:16]–[00:35:06 pt2] — quem baixar sem passar pelo comercial não
  consegue emitir nada. Agrava que a **fala** do mesmo fechamento diz
  "Conheça a Caveo" (correto) e o botão diz outra coisa.
  *(Nota: "TENHA TUDO NO APP CAVEO" foi dito e aprovado pelo cliente em
  [00:52:55], depois da discussão de download — então é aceito; vale só
  conferir se ele lê os dois casos da mesma forma.)*

### P2.2 — Variações não comparáveis entre si (Func R03 e Func R05)

Nos dois roteiros, a **var. 01 apresenta só o problema** e a **var. 02 já
entrega a solução no gancho**:

- Func R03 var. 02: *"...então por que ainda precisa esperar para receber?
  **Com a Caveo, o dinheiro pode cair na sua conta no mesmo dia.**"*
- Func R05 var. 02: *"...**Emitir sua nota fiscal pode levar segundos**, sem
  depender de um contador tradicional."*

Isso viola a lógica do teste: as variações deveriam diferir no **enquadramento
do gancho**, não na **estrutura narrativa**. Comparar um gancho-pergunta com
um gancho-que-já-resolve não diz qual mensagem funciona melhor — diz qual
estrutura funciona, que era justamente a variável que se queria travar. E
contraria a orientação de [00:15:04 pt2]: *"a gente não falar agora, só criou
o problema"*.

### P2.3 — Sobreposição de tema entre roteiros e entre pilares

| Sobreposição | Roteiros |
|---|---|
| **Emissão de nota fiscal** — 3 de 6 roteiros de Funcionalidade | Func R01 ("Emitir nota em segundos"), Func R02 ("O atraso para emitir notas"), Func R05 ("Emita sua nota sem depender de contador") |
| **Quanto sobra / tributos** — mesmo argumento nos dois pilares | Oferta R05 ("Médicos não sabem quanto faturam") ≈ Func R04 ("Quanto sobra para você?") |
| **Sem depender do contador** — mesmo argumento nos dois pilares | Oferta R06 ("Pare de depender do seu contador") ≈ Func R05 |

Paolla de fato sugeriu explorar várias variações de emissão [00:43:55] — mas
enquadrou como *"pros próximos"*, lote futuro. Com 3/6 na mesma feature, este
lote testa menos temas do que se propôs, e as duplicações entre pilares
impedem responder "Oferta ou Funcionalidade performa melhor?" quando o
argumento é o mesmo nos dois.

### P2.4 — Vazamento entre pilares (a regra-mãe)

A regra de [00:00:00]: *"se a gente falou do app, citou alguma coisa do
aplicativo, automaticamente cai em funcionalidade"*, criada para ser
*"o mais purista possível"*.

| Caso | O que acontece |
|---|---|
| **Oferta R06** | Argumento central é "você conta com um **app** feito exclusivamente para médicos"; texto na tela "**App** especializado em médicos". Pela regra do cliente, este roteiro é de **Funcionalidade**. *(Vale notar: foi o próprio Undiciatti que pediu a troca de "contabilidade" por "app" em [01:35:32] — a tensão foi criada pela instrução dele, e é ele quem precisa resolver.)* |
| **Oferta R03** | Direção visual mostra "a tela do app onde aparecem os documentos dos usuários" — tela de app + tema de documentos, os dois de Funcionalidade |
| **Oferta R05** | "tudo isso através da **conta digital no nosso app**" |
| **Func R01** | Fechamento é vocabulário de Oferta: "uma **plataforma financeira** que entende o dia a dia do médico" — deveria fechar no app/benefício |

### P2.5 — Func R03 sobe recebimento no 1º lote (guardrail do Mapa Temático)

O guardrail é explícito e tem justificativa de mídia:

> *"Ambos os temas de recebimento devem ser **segurados para o 2º lote** — só
> sobem após validar a tese de CNPJ/oferta (tema financeiro tende a poluir a
> rede / atrair público de baixa qualidade)."*

Func R03 é integralmente um roteiro de recebimento ("Dinheiro na conta no
mesmo dia"). Além do risco de qualidade de público, o campo **Tema** do
roteiro usa o termo proibido: *"Previsibilidade e **antecipação de
recebimentos**"* — o Mapa determina "recebimento garantido", **nunca**
"antecipação de recebíveis". Campos de tema alimentam nomenclatura de
campanha/UTM, então isso não fica só no documento interno.

---

## P3 — Inconsistências de terminologia (checklist puro)

### P3.1 — "suporte personalizado" vs "especializado"

Decisão final em [01:10:57]–[01:11:55]: **"suporte especializado"** (o cliente
aceitou repetir a palavra ao longo dos roteiros; clareza acima de variação).

| Roteiro | Está escrito | Correto? |
|---|---|---|
| Oferta R02 | "Suporte **personalizado**" (apoio na tela) | ❌ |
| Oferta R03 | "Suporte **personalizado** para médicos" (apoio) | ❌ |
| Oferta R04 | "suporte **especializado** para médicos" | ✅ |

### P3.2 — "time com especialistas" vs "time especializado"

| Roteiro | Está escrito |
|---|---|
| Oferta R01 | "TIME **ESPECIALIZADO** EM MÉDICOS" |
| Oferta R05 | "Time **com especialistas**" |

Ambas as formas foram ditas na reunião ([01:27:49] fechou em "time com
especialistas"; [01:31:10] Kaue reabriu preferindo "time especializado"). O
✅ é que o número "100" foi corretamente removido dos dois. Falta só escolher
uma das duas formas.

### P3.3 — "previsibilidade" na fala (deveria ser só lettering)

Duas regras convergem: o Mapa Temático manda usar **"segurança financeira"**,
não "previsibilidade"; e [00:36:10]–[00:37:21] (pt2) resolveu que, como o
termo tem valor com o público mas é *"duro de gravar"* / *"é forçar muito"*,
ele vai **no texto na tela, não na fala**.

- ❌ **Oferta R05** põe na fala: "uma plataforma especialista em médicos que
  desejam **previsibilidade**"
- ✅ **Func R04** faz certo: fala sem o termo, texto na tela "Mais
  previsibilidade para você."
- ⚠️ **Func R03** põe no campo Tema

Como Func R04 é o exemplo correto, é ele que serve de modelo. **Nota de
governança:** o guardrail do Mapa ("não usar previsibilidade") está **superado**
pela decisão de pt2 — o Mapa precisa ser atualizado, senão a contradição
volta no próximo lote.

### P3.4 — "saúde" vs "vida" financeira dentro do mesmo fechamento (Oferta R05)

- Fala: "tenha mais controle sobre sua **saúde** financeira"
- Texto na tela: "MAIS CONTROLE SOBRE SUA **VIDA** FINANCEIRA"

Em [01:31:10] a escolha foi explicitamente **saúde**. Ouvir uma palavra e ler
outra na mesma tela, com o resto da frase idêntico, lê como erro de revisão.

### P3.5 — "app" e "aplicativo" no mesmo trecho (Func R05)

Regra de Paolla [00:03:37]: nunca as duas formas encostadas. Em Func R05 a
solução diz "Com o **app** Caveo..." e o texto na tela da mesma seção diz
"Direto pelo **aplicativo**".

### P3.6 — Nomenclatura do app ainda oscilando (item pendente confirmado)

| Forma | Onde |
|---|---|
| "nosso app" | Func R01, Func R06, Oferta R05 ("nosso **A**pp", com maiúscula) |
| "o app Caveo" | Func R04, Func R05 |
| "um app" | Oferta R06 |
| "pelo aplicativo" | Func R05 (texto na tela) |

Confirma que a ação pendente *"Padronizar Terminologia Aplicativo"* do resumo
de pt2 continua aberta — e agora com 4 formas circulando em 12 roteiros.

### P3.7 — "contador" sem "tradicional" (Func R02)

A terminologia validada com o time comercial é **"contador tradicional"**
[00:38:28]. Func R02 diz só "sem depender do contador". Func R05 e Oferta
R02/R06 usam a forma completa corretamente. *(Em Funcionalidade, a opção
melhor ainda seria não nomear — [00:10:00] pt2 mostrou que dá para comunicar
o benefício sem a palavra.)*

### P3.8 — Menores

- **Oferta R01 (título):** "CONTABILIDADE FEITA **PARA** MÉDICOS" — família da
  frase banida. "Feita para médicos" foi sugerida por Izabela [00:24:48] e
  Undiciatti respondeu *"não sei se é forte"* — nunca foi aprovada. O aprovado
  é "especializada em médicos" / "na carreira médica". Títulos costumam virar
  nome de asset e `utm_content`, então vaza para o relatório.
- **Oferta R03 (título):** "GARANTIR PLANTÕES COM **CNPJ** 100% GRATUITO" — o
  corpo usa PJ corretamente, só o título ficou com CNPJ. Oferta R04 acertou no
  título ("PJ PARA MÉDICOS").
- **Oferta R02:** "ERROS BÁSICOS PODEM CUSTAR **CARO**" — a regra de não usar
  juízo de valor [01:04:24] foi formulada para o custo de abertura; aqui é
  outro contexto. Vale um "ok?" rápido com o cliente em vez de mudança
  unilateral.
- **Func R02/R05:** "**NF**" / "**NFs**" no texto na tela — jargão. O
  guardrail do Mapa pede traduzir jargão para benefício funcional; o público
  fala "nota fiscal".
- **Oferta R01:** "entende a rotina médica" aparece no **texto na tela do
  gancho** e volta quase idêntico na **fala do fechamento** ("Escolha quem
  entende a sua rotina médica"). É a repetição gancho↔CTA de [00:20:31] em
  outra roupagem. Somando tudo, "rotina" aparece **4x** em 30s nesse roteiro.
- **Oferta R03:** fala do fechamento "Abra sua PJ gratuitamente" + CTA "ABRA
  SUA PJ GRÁTIS NA CAVEO" — mesma frase em fala e botão.
- **Func R01/R05:** "aproveitar **com a família**" / "estar **com a família**"
  — o ângulo "tempo em família" foi explicitamente reservado para campanhas
  futuras em [00:04:27] (*"vou colocar como sugestão para as próximas"*), e
  [00:44:50] resolveu usar o generalista **"cuidar do que realmente
  importa"** justamente para não enumerar. Func R05 enumera três coisas
  (descansar, família, próximo plantão).
- **Func R05:** fala diz "**Conheça o app Caveo**" — [00:45:44] resolveu o
  contrário: *"Conheça a Caveo, porque chamar 'conheça o app' não é o melhor
  caminho"*. O botão acertou; a fala manteve a versão rejeitada.
- **Func R03:** perdeu a palavra "médicos" na frase de 1ª pessoa. Paolla
  formulou *"**nós médicos** estamos acostumados"* [00:14:04]; o roteiro diz
  só "Nós estamos acostumados". É a palavra que faz o "médico para médico
  implícito" funcionar e que atende a identidade médica obrigatória do Mapa.
- **Oferta R03:** "hospital **dos sonhos**" — o aprovado em [00:55:21] era
  "hospital **perto**". Mudança não discutida.
- **Oferta R04:** "plantões, clínicas, e cooperativas e hospitais" — o
  aprovado era "plantões, clínicas e cooperativas" [01:13:41]; "hospitais"
  entrou sem discussão (além da vírgula e do "e" duplicado).
- **Oferta R04 (Resultado):** diz "uma **plataforma** que entende a rotina" —
  mas a instrução específica para **esta linha** em [01:13:41]–[01:15:26] foi
  trocar por "**app**" (*"no final do dia a gente é um app e é muito melhor
  que solução"*, e *"até porque a gente vai estar mostrando uma tela do
  app"*). "Plataforma" não é errado como posicionamento, mas o pedido pontual
  não foi aplicado.
- **Oferta R02 (fechamento):** "Troque o contador tradicional **pela Caveo**"
  — em [00:45:05] Kaue defendeu "por uma **plataforma financeira feita para
  médicos**" porque o tema do roteiro é especialização médica; "pela Caveo"
  perde essa âncora.

---

## P4 — Lacunas de produção (custam regravação)

### P4.1 — Fundo verde (croma) não aparece em nenhum dos 12 roteiros

Decisão de [00:28:38]–[00:29:47] (pt2): takes que mostram a tela do celular
devem ser gravados com **fundo verde/croma**, para permitir prototipagem
precisa da UI do app na pós.

Roteiros com take de tela de celular e **sem** instrução de croma: Oferta R03,
Oferta R05, Func R01, Func R02, Func R03, Func R04, Func R05, Func R06. A
decisão entrou em **zero** roteiros. Como a gravação é quarta, isso é o item
com maior chance de virar regravação.

### P4.2 — A linha de "direcionamento de captação" não foi criada

Lucas se comprometeu em [00:29:47]: *"a gente pode adicionar uma nova linha
com direcionamento da gravação, da captação"* — distinta do "direcionamento
visual do take" que já existe. Era um dos next-steps nominais do resumo
("Adicionar Direcionamento Captação"). Nenhum roteiro tem o campo. Era a
salvaguarda pedida por Paolla contra *"a frustração de expectativa versus
realidade quando chega na edição"*.

### P4.3 — Func R04 direciona para a atuação caricata que foi rejeitada

Direção visual: *"o porta-voz mexendo no celular com **olhar desconfiado e
expressão confusa**"*.

Hector foi explícito em [00:27:32]: *"eu **não** iria para um lado tão
caricato, só realmente ele vendo que o saldo não tá batendo"*. ✅ A tela
dividida foi aplicada corretamente; a nota sobre o tom, não.

### P4.4 — Func R03: a legenda longa que foi apontada continua igual

Legenda: *"Por que esperar pelo dinheiro do plantão que você já fez?"*

Em [00:12:04] Undiciatti apontou: *"é uma legenda bem grande pro mobile...
a chance dessa legenda ficar comida com aquela parte da descrição de baixo é
grande"*, e a conversa evoluiu para legenda **dinâmica** (frase trocando
conforme o vídeo). A legenda ficou idêntica e não há instrução de legenda
dinâmica.

### P4.5 — Oferta R03: tela com documentos de usuário

Direção visual pede *"a tela do app onde aparecem **os documentos dos
usuários**"*. Em [00:51:34] a orientação foi usar **ícone**, não documento
real, por dado sensível. Mesmo com dados mockados, vale alinhar: o take é de
uma tela de documentos identificáveis ou de ícones?

---

## P5 — Defeitos de texto e campos faltando

Erros que, num documento que vai para o set e para a edição, viram ambiguidade
de execução.

### Erros de digitação / gramática

| Roteiro | Erro |
|---|---|
| Oferta R03 (fechamento) | "conte com **auma** plataforma financeira" — e a construção "com a uma plataforma... da Caveo" está quebrada; o aprovado [01:03:14] era "conte com uma plataforma financeira especializada na sua rotina médica" |
| Oferta R04 (tela) | "Mensalidade do **contator**" |
| Oferta R04 (fechamento) | "em meio **a** sua rotina" → "**à** sua rotina" |
| Func R03 (solução) | "esperar tanto tempo para **receber.por** ele" — ponto no meio da frase |
| Func R04 (dor) | "planejar **seusos** investimentos" |
| Func R04 (solução) | "fica disponível **praara** você" |
| Func R04 (gancho var. 02) | "**Que** você vai receber pelo plantão não é novidade" — começa com "Que", não é falável. A versão limpa de [00:23:11] era "Você sabe que vai receber pelo plantão, mas sabe quanto realmente vai ficar no seu bolso?" |

### Campos obrigatórios vazios ou ausentes

| Roteiro | Falta |
|---|---|
| Oferta R05 | **"Texto na tela:"** vazio nas **duas** variações do gancho |
| Oferta R04 | **Nenhuma marcação de tempo** em nenhuma das 5 seções (único do lote); e **nenhum campo CTA** — "Texto na tela: CONTE COM A CAVEO" parece acumular a função |
| Oferta R04 | 5 seções (Gancho/Problema/Solução/**Resultado**/Fechamento) contra 4 nos outros — precisa validar se cabe em 30s |
| Oferta R02 | Solução termina em **23s**, fechamento começa em **27s** — 4 segundos sem seção |
| Func R05 | Faltam a seção de problema e a janela **6–13s** (ver P0.3) |
| Func R06 | Gancho **sem "Texto na tela"** (todos os outros ganchos têm) |
| Func R02 | Campo "Fala" **duplicado** — o texto aparece dentro da direção visual e de novo em "Fala:", com diferença entre as versões ("na conta" vs "na sua conta"). Qual o porta-voz fala? |

---

## O que foi corretamente aplicado (não mexer)

Registro para não "consertar" o que já está certo numa próxima rodada:

- **Oferta R06** é o roteiro mais aderente do lote — gancho, "O Vilão", "O
  Herói" e fechamento estão praticamente verbatim do aprovado, incluindo
  terminar em "devolve o seu tempo." sem complemento, e "MAIS TEMPO PARA
  VOCÊ." (sem o "médico" que soava "muito Itaú"). Só o "dúvida sobre a
  empresa" e a classificação de pilar precisam de ajuste.
- **Func R01 (problema)** — verbatim do aprovado, inclusive a correção
  "informações de novo".
- **Func R04 (dor)** — a ordem de consumo validada foi aplicada corretamente:
  pagar as contas → organizar gastos → **investimentos por último**; e sem
  citar item de consumo específico (carro/viagem).
- **Func R04 (fechamento)** — "previsibilidade" no lettering, não na fala.
  Exatamente a resolução pedida.
- **Func R03 (contexto)** — 1ª pessoa + "acostumados" (em vez de "normal") +
  "dias, semanas e até meses". Três decisões finas aplicadas de uma vez. E é
  a única fala do lote que **cabe folgada** na janela.
- **Oferta R02 (problema)** — "contador tradicional" + "enquadramento
  incorreto" + "multas". As três escolhas de terminologia certas.
- **Oferta R04 (gancho var. 01)** — a simplificação do Lucas aplicada ao pé da
  letra, com "manter" removido.
- **R$ 1.500** como valor de plantão, consistente em Oferta R03, Func R03 e
  Func R04. E **Av. Paulista** como praça reconhecível — confirmada em
  [00:23:11] pt2.
- **"Vaga do plantão preenchida"**, **"PJ regularizada"**, **"médico Caveo"**,
  **"documentos na palma da mão"**, **"emissão ilimitada sem custo
  adicional"**, **"conta PJ integrada"** — todos corretos.
- Nenhum roteiro fecha em "contabilidade" no CTA. ✅
- Nenhuma menção a custo de manutenção da Caveo como argumento. ✅

---

## Perguntas para levar ao cliente

Itens que **não** devem ser resolvidos unilateralmente:

1. **O dado do Afya Research Center existe e diz o quê exatamente?** Sem isso,
   a var. 01 do Oferta R05 não sobe (P1.1).
2. **A composição do R$ 2.500 pode somar mensalidade dentro do "custo de
   abrir"?** Se não, ou o número cai para ~R$ 1.900 ou a fala muda para
   "abrir e manter no primeiro mês" — o que reabre o problema do "manter" que
   [01:07:17] mandou remover (P1.2).
3. **Oferta R03 e Func R06 mantêm a dramatização** de perder o plantão, agora
   que Tiago esclareceu que o número do CNPJ basta? (P1.3)
4. **Func R03 sobe neste lote** ou vai para o 2º, como o guardrail determina?
   (P2.5)
5. **Oferta R06 fica em Oferta** com o argumento de app, ou migra para
   Funcionalidade / troca o "app" de volta? A instrução que criou o conflito
   foi do próprio cliente (P2.4).
6. **"App CAV" ou "app da Caveo"?** — decidir agora, são 4 formas circulando
   (P3.6).
7. **Claim de tempo: "menos de 1 minuto" em tudo?** Incluindo títulos,
   letterings e o cronômetro do Func R01 (P0.2).
8. **Faixa de persona única (28–45)?** Ou algum roteiro justifica outro
   porta-voz (P0.7).

---

## Ordem sugerida de execução

**Antes da gravação de quarta** (mexe em fala/set):
1. Busca-e-substitui "empresa" → "PJ" (11 ocorrências) — P0.1
2. Fixar um único claim de tempo — P0.2
3. Escrever a seção de problema do Func R05 — P0.3
4. Corrigir Func R06 var. 02 e Oferta R03 "consequência" — P0.4, P0.5
5. Cortar as falas que estouram (prioridade nos fechamentos) — P0.6
6. Inserir croma + linha de captação nos 12 roteiros — P4.1, P4.2
7. Alinhar persona e ajustar direção do Func R04 — P0.7, P4.3
8. Corrigir os 7 erros de digitação e preencher os campos vazios — P5

**Antes de subir campanha** (decisão com cliente):
9. Resolver as 8 perguntas acima
10. Padronizar CTAs de botão e terminologia (suporte / time / app) — P2.1, P3
11. Decidir sobre sobreposição de temas e recebimento no lote — P2.3, P2.5

**Depois** (governança de docs):
12. Atualizar o guardrail de "previsibilidade" no Mapa Temático — P3.3
