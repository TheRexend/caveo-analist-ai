# Esqueleto de Landing Page de Alta Conversão — Público Médico

> Spec de estrutura, não de copy nem de implementação. Define **quais seções**
> as landing pages têm, **qual pilar de comunicação é dono de cada uma** e
> **quais regras dos manuais valem em cada bloco**. A copy final e o wireframe
> visual são etapas seguintes, fora do escopo aqui.
> Data: 2026-08-06

## 1. Objetivo e escopo

Estruturar landing pages de aquisição para o público médico que carreguem os
**dois pilares de comunicação** da Caveo — Oferta e Funcionalidade — numa única
página, sem violar as regras de nenhum dos dois manuais.

**Escopo confirmado com o usuário:**

- **Duas landing pages**, separadas pelo estado da PJ do visitante:
  **LP A — médico sem PJ** e **LP B — médico que já tem PJ**. A separação é por
  estado da PJ, **não** por estágio de carreira: os manuais tratam o público
  como audiência única, do formando ao especialista consolidado (o estágio muda
  a intensidade da dor, não o público).
- **Página longa com atalho no topo.** Profundidade suficiente para o tráfego
  frio da Meta, com oferta e CTA acessíveis na primeira dobra para quem chega
  do Google com intenção. Duas LPs no total — não uma versão por canal.
- **Formulário na segunda dobra**, decisão explícita do usuário.
- **Espinha de argumentação: "custo do não-agir"**, com a seção de contraste
  tradicional × Caveo embutida como bloco interno de peso variável.
- Entregável desta rodada: **o esqueleto**. Sem copy final, sem wireframe, sem
  código.

**Fontes de verdade da linguagem:** `docs/Manual_Comunicacao_Oferta_Caveo.md` e
`docs/Manual_Comunicacao_Funcionalidade_Caveo.md`. Toda referência do tipo §N
neste documento aponta para um desses dois manuais, identificado pelo nome do
pilar.

## 2. Por que "custo do não-agir" como espinha

Três espinhas foram consideradas:

| Espinha | Trade-off | Decisão |
|---|---|---|
| **A. Custo do não-agir** — dor reconhecível → o que ela custa → a Caveo → app tangibilizando → prova → objeção | Serve tráfego frio e de intenção; a dor faz o trabalho de qualificação. Exige dor bem escolhida por público, senão vira genérico | **Escolhida** como espinha mestra das duas LPs |
| **B. Contraste tradicional × Caveo como fio condutor** — cada bloco é um par de contraste | Formato já validado em criativo. Forte para quem já tem PJ e tem referência de comparação; fraco para quem nunca teve contador. Puxa risco do corolário de Oferta §3.2 | **Embutida** como bloco interno (7), com peso variável por LP |
| **C. Anamnese/diagnóstico** — estrutura de consulta clínica | Pertencimento imediato e diferenciado de mercado, mas a metáfora consome dobra antes da oferta e encosta no limite de Oferta §6.2 (não comparar com a saúde do paciente) | **Descartada** como estrutura; liberada como recurso de tom em headline |

A escolha de A se sustenta numa verdade transversal já documentada do público
(`docs/Dores_Desejos_Publicos_Caveo.md`): o que trava o médico é **inércia, não
desinteresse** — ele já sabe que tem um problema fiscal, falta um gatilho que
torne o custo de não agir maior que o custo percebido de agir. Uma página
construída sobre esse eixo faz exatamente esse trabalho.

## 3. O problema central: dois pilares numa página

Os dois manuais dizem que Oferta e Funcionalidade são **testados um contra o
outro** e não devem falar a mesma coisa (Oferta §9, Funcionalidade §10). Essa
regra vale para **criativo de anúncio**, que é a unidade de teste. A landing
page é o **destino comum dos dois pilares** e legitimamente carrega os dois.

O que a regra obriga, então, é declarar **propriedade por bloco** e resolver as
cinco regras que se invertem entre os manuais (Funcionalidade §1):

| Tema | Resolução nesta LP |
|---|---|
| A palavra **"app"** | Existe apenas nos blocos 8 e 9. Nos blocos de Oferta o app não é o argumento central. "app" e "aplicativo" nunca no mesmo trecho (Func. §3.2) |
| **"contador" / contabilidade** | Vive só nos blocos 5 e 7. **Nunca** nos blocos 11 e 12 — "contabilidade" não aparece no fechamento nem no CTA (Oferta §3.6). No bloco 9 o benefício contábil se comunica pela ação, sem nomear o contador (Func. §6.2) |
| **"de médico para médico"** | Banido como slogan em toda a página. Porta única de entrada: bloco 10, em primeira pessoa por médico real ("nós médicos..."), com a palavra "médicos" obrigatória na construção (Func. §7.1) |
| **Repetição de palavra** | Regra dura de Oferta §5.2 vale em todos os blocos de Oferta. Bloco 9 aceita ênfase consciente |
| **CTA** | **Um CTA por página**, repetido nos blocos 2, 3 e 12. Nunca convite a baixar ou usar o app, nunca badge de loja de aplicativo (Func. §3.1) |

**Ambiguidade resolvida:** Oferta §7.3 ("um CTA por peça") lida numa LP significa
uma única **instrução**, que vive no botão e se repete nele. O corpo de texto
nunca reescreve a frase do botão como sentença — isso violaria também
Oferta §3.5 (gancho e CTA não repetem a mesma frase).

**Propriedade do CTA:** o fechamento da página (bloco 12) é de Oferta, então o
CTA único sai da lista de Oferta §7.1, mesmo com blocos de Funcionalidade no
miolo. Nenhum dos CTAs escolhidos está na lista proibida de Funcionalidade §8.2.

## 4. Estrutura mestra

Vale para as duas LPs. O recheio de cada bloco varia por público (seções 5 e 6).

| # | Bloco | Dobra | Pilar dono | Função | Restrição que governa |
|---|---|---|---|---|---|
| 1 | Barra de topo mínima | 1ª | — | Logo + selo de especialização médica. **Sem menu de navegação** — nenhuma rota de saída | Identidade médica visual já presente aqui (Oferta §8) |
| 2 | **Hero** | 1ª | Oferta | Nomear o médico e o estado da PJ dele. Promessa de **controle, tempo ou clareza** — nunca de patrimônio. CTA-atalho que ancora no formulário do bloco 3 | Teto da promessa (Oferta §1). Headline ≠ frase do CTA (§3.5) |
| 3 | **Formulário** | 2ª | Oferta | Conversão. Nome, WhatsApp, e-mail. Expectativa explícita de que **um especialista entra em contato** | Não existe autocredenciamento — nada de "contrate agora" nem instrução de uso do app (Oferta §7.2, Func. §3.1) |
| 4 | Faixa de prova imediata | 2ª | Oferta | Credibilidade em uma linha logo abaixo do formulário, para quem hesitou no campo: especialização na rotina médica, time com especialistas, suporte especializado, emissão ilimitada de notas sem custo adicional | "suporte especializado", nunca "personalizado" (Oferta §2.3). Bloco de prova, não de comparação — o concorrente não é citado aqui |
| 5 | A dor nomeada | 3ª | Oferta | Três sintomas reconhecíveis na língua do público. **Único bloco, junto com o 7, onde "contador tradicional" pode aparecer** | Provocar sim, agredir não (Oferta §6.2). Nenhum jargão sem tradução (§3.7) |
| 6 | O custo do não-agir | 3ª–4ª | Oferta | Dimensionar o custo em números autorizados. Mostra o número e cala | Nunca "caro"/"barato" (Oferta §3.3). Só números da lista sancionada (§4) |
| 7 | **Comparativo tradicional × Caveo** | 4ª | Oferta | O contraste que fecha o argumento racional. Peso variável por LP | Corolário de Oferta §3.2 — decisão registrada na seção 7 deste spec |
| 8 | Reposicionamento | 5ª | Transição | A dobradiça que autoriza o miolo de produto: a Caveo é **plataforma financeira / ecossistema financeiro completo**, não contabilidade | Nunca "solução" nem "sistema" (Oferta §2.3) |
| 9 | **Tangibilização no app** | 5ª–6ª | Funcionalidade | Três a quatro features que o app faz **hoje**, descritas pelo resultado, não como instrução de uso | Nenhum convite a baixar/usar (Func. §3.1). Claim de tempo idêntico em texto, título e visual (§5.1). Feature em roadmap ou beta não entra (§2) |
| 10 | Prova de colega | 6ª | Oferta | Depoimento de **médico real**, não ator, em primeira pessoa. Única porta para o tom "de médico para médico" | Func. §7.1. Sem documento real com dado sensível (Oferta §8) |
| 11 | Objeções (FAQ) | 7ª | Ambos | Quebra de objeção específica do público da LP | "contabilidade" proibida aqui (Oferta §3.6). Honestidade de escopo (§5.4) |
| 12 | Fechamento + formulário repetido | 8ª | Oferta | Reposiciona para **plataforma financeira / app / parceiro** e repete o CTA único | "contabilidade" proibida no fechamento e no CTA (Oferta §3.6). Frase diferente da do gancho (§3.5) |

**Rodapé:** legal, dados da Caveo, política de privacidade. Não é bloco de
argumentação.

**Restrições visuais que atravessam a página inteira** (Oferta §8,
Funcionalidade §9): identidade médica em marcador verbal **e** visual; jaleco,
estetoscópio, crachá ou consultório simulado — **nunca ambiente hospitalar
real**; nenhum documento real com dado sensível (CRM, CNPJ de pessoa real);
elemento visual de preço/economia com acabamento profissional, que é o maior
risco de imagem do pilar Oferta.

## 5. LP A — Médico sem PJ

**Eixo emocional:** começar certo, sair na frente.
**CTA único: ABRA SUA PJ GRATUITAMENTE** (Oferta §7.1).

| # | Recheio |
|---|---|
| 2 | A PJ como pré-requisito das boas oportunidades. Formulação segura obrigatória: *"sem PJ, as melhores oportunidades não chegam até você"*. **Nunca** afirmar que sem PJ o médico não consegue plantão — na prática a maioria dos plantões exige só o número do CNPJ e a regularização corre em paralelo (Oferta §5.4) |
| 4 | Abertura 100% gratuita · especialização na rotina médica · emissão ilimitada de notas fiscais sem custo adicional |
| 5 | Abrir PJ é um labirinto · ninguém ensinou nada disso em **6 anos** de formação · medo de errar imposto no começo |
| 6 | **R$ 2.500** como custo de abrir no modelo tradicional, **sempre com a composição** (certificados digitais, taxas, serviço de abertura, endereço virtual). **R$ 1.500** para dimensionar o que um bom plantão representa |
| 7 | **Peso leve.** O que o mercado cobra para abrir × **abertura 100% gratuita** na Caveo |
| 9 | Nota fiscal sai em **menos de 1 minuto** · documentos na palma da mão · quanto sobra pra você |
| 10 | Depoimento de médico em início de carreira que já regularizou a PJ |
| 11 | A gratuidade é real e cobre o quê? · quanto tempo leva? · preciso já ter plantão fechado? · **Plano de Residência** (ver pendência na seção 8) |
| 12 | Fecha em plataforma financeira ou parceiro. Nunca em contabilidade |

**Nota de público:** a objeção que mais adia a decisão nesse grupo é o
adiamento — *"vou esperar mais perto da formatura/residência"* e *"vou fechar
com o contador do meu pai"*. O bloco 11 é o lugar de neutralizá-la; o Plano de
Residência é o argumento mais forte disponível para isso, com a ressalva
registrada na seção 8.

## 6. LP B — Médico que já tem PJ

**Eixo emocional:** parar de perder tempo e ser finalmente entendido.
**CTA único: TRAGA SUA PJ PARA A CAVEO** (Oferta §7.1).

| # | Recheio |
|---|---|
| 2 | Quem cuida da sua PJ hoje entende plantão, clínica e cooperativa? Provocação de reconhecimento, não de julgamento da escolha dele (Oferta §6.2) |
| 4 | Especialização na rotina médica · suporte especializado · emissão ilimitada de notas fiscais sem custo adicional |
| 5 | Contador tradicional que não entende a rotina · **enquadramento incorreto** · renda espalhada entre plantão, clínica e cooperativa sem clareza · tempo perdido correndo atrás de documento |
| 6 | **Multa** — a palavra que mais chama atenção (Oferta §2.4) · enquadramento incorreto · tempo perdido. **Nunca "até 30% de economia"**: viola o teto da promessa (§1) e não está na lista de números autorizados (§4) |
| 7 | **Peso pesado — é a seção principal desta LP.** Três pares: **até 72 horas × menos de 1 minuto** para emitir nota · contador tradicional × suporte especializado · depender de alguém para conseguir um documento × documentos na palma da mão |
| 9 | Faturamento consolidado num lugar só · quanto sobra pra você · lembrete de pagamento. Se falar de organização financeira, respeitar a ordem real do dinheiro: **contas → gastos → investimento** (Func. §6.1) |
| 10 | Depoimento de médica real que trocou de contabilidade — formato já validado pelo cliente como poderoso, e explicitamente **médico de verdade, não ator** |
| 11 | Migrar dá trabalho? · risco com a Receita na transição? · meu caso é complexo demais (sociedade, várias fontes)? · app substitui contador de verdade? → resposta é **suporte especializado humano** por trás do app |
| 12 | Fecha em plataforma financeira ou parceiro. Nunca em contabilidade |

**Nota de público:** economia abre a conversa, confiança fecha. O peso de
investimento desta LP vai nos blocos 7, 10 e 11 — a barreira desse grupo é
inércia e medo de trocar, não desconhecimento do problema.

## 7. Números autorizados, por bloco

Nenhum número novo entra sem validação (Oferta §4, Funcionalidade §5).

| Número | Onde pode aparecer | Regra |
|---|---|---|
| **R$ 2.500** | LP A, blocos 6 e 7 | Sempre com a composição. **Nunca R$ 4.000.** Não cabe no hero — sem a composição o número não se sustenta |
| **R$ 1.500** | LP A bloco 6; opcional LP B bloco 6 | Valor de um bom plantão. R$ 2.000 soa alto demais |
| **100% gratuita** | LP A: hero, formulário, blocos 4 e 7 | Só para a **abertura**. Nunca estender a "abrir e manter". O CTA usa a forma "gratuitamente" |
| **6 anos** | LP A bloco 5 | Livre |
| **Menos de 1 minuto** | Ambas, blocos 7 e 9 | **Claim único de tempo em toda a página.** Texto, título e visual dizem o mesmo número — nada de cronômetro contando segundos (Func. §5.1) |
| **Até 72 horas** | LP B bloco 7 | Só como contraste com o claim acima |
| **Emissão ilimitada, sem custo adicional** | Ambas, blocos 4 e 9 | É o diferencial que **substitui** o argumento de preço |
| **7 em cada 10** | **Bloqueado** | Fonte não validada — ver seção 8 |
| Mensalidade do contador tradicional | **Decisão consciente: não exibir** | Exibir convida a pergunta "e quanto a Caveo cobra por mês?", que é a única disputa que a marca não quer travar (Oferta §3.2 e corolário) |
| Preço de plano da Caveo | **Fora** | Comunicação de preço deliberadamente adiada (Func. §12.3) |
| "até 30% de economia" | **Proibido** | Circula em material antigo do repositório, mas viola Oferta §1 e §4 |

## 8. Pendências que precisam de decisão antes da copy

| Item | Problema | Recomendação |
|---|---|---|
| **Dado "7 em cada 10"** | Instituição, ano e enunciado exato da pesquisa não confirmados (Oferta §11.4). Numa LP o dado é afirmação factual permanente e indexável, não retórica passageira de criativo — a exposição é maior que num anúncio | Não usar até confirmar a fonte. Se confirmar, entra no bloco 5 |
| **Plano de Residência** | O benefício é isenção de **mensalidade** por 12 meses, e Oferta §3.2 proíbe custo de manutenção como argumento de venda — inclusive para dizer que é barato | Nomear o plano no bloco 11 sem detalhar valor, e deixar o comercial abrir a mecânica. Precisa de aval do cliente |
| **Composição do R$ 2.500 sem a mensalidade** | A composição sancionada no manual inclui a mensalidade do contador, mas esta LP decidiu não exibi-la (seção 7) — e Oferta §4.2 proíbe misturar custo recorrente num total anunciado como custo de abertura. Sem esse item, o total precisa continuar fechando com custo único, e §11.3 registra a composição como decisão aberta | Revalidar o R$ 2.500 apenas com itens de custo único antes de publicar o bloco 6 da LP A. Se não fechar, o número muda ou o bloco perde o total |
| **Recebimento garantido** | Tema aparece nos dois pilares de propósito, mas o mapa temático manda **segurar para o 2º lote** — tema financeiro tende a poluir a rede e atrair público de baixa qualidade | Fora da v1 das duas LPs |
| **Wellhub incluso** | Perk tangível, nunca headline | Cabe no bloco 4 como reforço, ou fica fora da v1 |
| **"app" ou "parceiro" no fechamento** | Sem regra única definida (Oferta §11.1) | "app" quando o bloco 12 fechar na ferramenta; "parceiro" quando fechar na jornada. Escolher um por LP e manter |
| **"time com especialistas" ou "time especializado"** | Ambas circularam (Oferta §11.2) | Escolher uma e usar igual nas duas LPs |

## 9. Requisitos que não são seção, mas quebram a LP se faltarem

1. **HTML renderizado no servidor.** A LP atual (`lp.caveo.com.br`) é uma SPA
   JS-only e entrega HTML vazio para robô — causa-raiz documentada do
   "Relevância pouco clara" no Google Ads. Repetir essa arquitetura invalida a
   página como destino de tráfego de busca, independentemente da qualidade da
   copy.
2. **LeadSource distinto por LP**, mais UTMs gravadas nos campos do Salesforce.
   Sem isso as duas páginas viram uma só na atribuição e o teste entre elas não
   responde nada.
3. **Um único evento de conversão, no submit.** Não disparar por etapa do
   formulário — o container de GTM já teve esse defeito e inflou conversões em
   Google, Meta e GA4 simultaneamente.
4. **E-mail é campo obrigatório do formulário.** A conversão de Oportunidade no
   Google Ads casa por e-mail (~92% de cobertura), não por gclid (~0,25%).
   Formulário sem e-mail derruba a medição de fundo de funil.

## 10. Checklist de aprovação da página

Derivado dos dois manuais, adaptado ao formato LP. Rodar antes de publicar.

**Herdado de ambos os manuais:**

- [ ] Busca literal por "empresa" na página inteira → zero ocorrências (tudo é "PJ", feminino)
- [ ] Nenhuma variação de "de médico para médico" fora do bloco 10, e lá só em 1ª pessoa com a palavra "médicos" na frase
- [ ] Nenhuma promessa de ganho, riqueza ou garantia de resultado
- [ ] "contador tradicional", nunca "generalista"; "suporte especializado", nunca "personalizado"
- [ ] Nenhuma menção a custo de manutenção da Caveo, nem preço de plano
- [ ] Nenhum "caro"/"barato" qualificando o custo do mercado
- [ ] Nenhuma sigla ou jargão sem tradução (NF, CNAE, DAS, regime tributário)
- [ ] Nenhuma afirmação absoluta de perder plantão por falta de PJ ou de documento
- [ ] Identidade médica presente: marcador verbal **e** visual
- [ ] Nenhum documento real com dado sensível; nenhum ambiente hospitalar real
- [ ] Números apenas da lista da seção 7; dado estatístico com fonte verificada

**Específico desta estrutura de duas páginas:**

- [ ] "app" aparece só nos blocos 8 e 9; "app" e "aplicativo" nunca no mesmo trecho
- [ ] "contador"/"contabilidade" aparece só nos blocos 5 e 7 — ausente nos blocos 11 e 12 e no CTA
- [ ] Um CTA único por página, repetido nos blocos 2, 3 e 12; nenhum segundo CTA concorrendo
- [ ] Nenhum convite a baixar ou usar o app; nenhum badge de loja de aplicativo
- [ ] Headline do hero não repete a frase do CTA
- [ ] Claim de tempo idêntico em texto, título e visual em toda a página
- [ ] Toda feature do bloco 9 existe e funciona hoje como está descrita
- [ ] Formulário está na segunda dobra e informa que um especialista entra em contato
- [ ] Página entrega HTML renderizado no servidor
- [ ] LeadSource próprio, UTMs gravadas, conversão única no submit, e-mail obrigatório

## 11. Fora de escopo desta rodada

- Copy final de cada bloco (headline, corpo, bullets, microcopy do formulário)
- Wireframe visual, layout e direção de arte
- Implementação da página
- Plano de teste entre as duas LPs e entre variações de hero
- Qualquer LP para público Revalida — a mídia paga mira 100% médico hoje

## 12. Referências internas

- `docs/Manual_Comunicacao_Oferta_Caveo.md` — regras do pilar Oferta
- `docs/Manual_Comunicacao_Funcionalidade_Caveo.md` — regras do pilar Funcionalidade
- `docs/Mapa_Tematico_Pilares_Criativos_Caveo.md` — temas por pilar e guardrails de execução
- `docs/Dores_Desejos_Publicos_Caveo.md` — dores, objeções e gatilhos por estágio de carreira
- `docs/personas_medico.md` — as quatro personas do público médico
- `docs/archive/Hero_Variacoes_Copy_LP_Caveo.md` e `docs/archive/LP_Caveo_Medico_Maduro_Conteudo.md` — material de LP anterior, útil como fonte de linguagem já validada (Oferta §5.5), **com a ressalva de que precede os manuais e contém termos hoje banidos**
