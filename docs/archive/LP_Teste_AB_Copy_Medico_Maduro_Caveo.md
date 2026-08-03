# Teste A/B de Copy — Landing Page para Médico Maduro

> **Cliente:** Caveo · **Agência:** Boomer · **Versão:** 2026-06-16
> **Página em teste:** https://lp2.caveo.com.br/
> **Insumos:** `docs/personas_medico_maduro.md` · `docs/Dores_Desejos_Publicos_Caveo.md` · copy atual da lp2 (extraída 2026-06-16)
>
> **Decisões travadas com o time:**
> - **Arquitetura do teste:** desafiante radical — uma página inteira reescrita e requalificada para o Médico Maduro (Variante B) vs. a lp2 atual (Variante A / controle).
> - **Foco de persona:** tronco comum do Médico Maduro — verdades compartilhadas por Rafael (consolidado, contador "amigo") e Camila (híbrida cooperativa + RPA), sem personalizar a página por arquétipo.

---

## 0. Sumário executivo — a aposta

A lp2 atual é uma página **competente, mas genérica**. Ela fala com "médicos" no geral, mistura sinais de recém-formado e de maduro, e repete o argumento racional ("pagar menos impostos") sem tocar nas três alavancas que realmente movem o **Médico Maduro**:

1. **A inércia / o medo de trocar de contador** — a maior barreira do segmento. A página atual não menciona migração assistida nem reduz o risco percebido da troca. O lead concorda com tudo e mesmo assim não age.
2. **A Reforma Tributária 2026** — o gatilho de urgência mais forte do ano para esse público. Hoje está **ausente** da página. Sem urgência, o custo da inação parece zero.
3. **A prova social cirúrgica** — "+15.000 médicos confiam" aparece 3x, mas sem nenhuma especificidade (especialidade, cidade, número, depoimento real). Para um público cético, prova social genérica não converte.

**Insight-âncora das personas:** *"Economia abre, confiança fecha."* O número (até 30%) traz o lead para a página; o que destrava a conversão é **quebrar a inércia/medo** (migração sem risco) e **provar a especialização** (especialistas em médico PJ, não contabilidade genérica).

**A hipótese central do teste** está na seção 4. A copy pronta do desafiante está na seção 5.

---

## 1. Por que esta arquitetura

**Desafiante radical** é a escolha certa para o primeiro round porque:

- A distância entre a página atual e uma página requalificada para o MM é grande (vários elementos mudam ao mesmo tempo). Mudanças de elemento único renderiam ganhos pequenos demais para justificar o tempo de teste com o tráfego de uma LP de nicho médico.
- Efeito esperado maior → **significância estatística mais rápida** com menos tráfego.
- O custo: aprendemos que "o pacote venceu", não qual elemento isolado pesou mais. Por isso a seção 8 já deixa o **backlog de testes isolados** pronto para os rounds seguintes, que vão refinar o vencedor.

**Tronco comum do MM** mantém uma única página servindo Rafael e Camila. A copy é construída sobre as dores que os dois compartilham (paga demais, contador genérico, medo de trocar, colcha de retalhos de fontes de renda) e evita personalizações que alienariam um dos dois. Onde a prova social precisar de especificidade, usamos **dois depoimentos** — um de perfil Rafael, um de perfil Camila — para que cada um se reconheça sem dividir a página.

---

## 2. Diagnóstico da lp2 atual — onde a página vaza para o Médico Maduro

| # | Elemento atual | O que vaza para o MM | Princípio violado |
|---|---|---|---|
| 1 | **Headline:** "Mais tempo para o que importa. Mais dinheiro no seu bolso." | Benefício vago e "soft". Não quantifica, não dispara a indignação central ("pago imposto demais"), não diferencia da concorrência. Para um cético inerte, não para o scroll. | Número-choque / indignação |
| 2 | **Ausência total de "migração sem risco"** | A maior barreira do MM (medo de trocar de contador) não é endereçada em lugar nenhum. O lead concorda com a proposta e trava na hora de agir. | Confiança fecha / quebra de objeção |
| 3 | **Reforma Tributária ausente** | O maior gatilho de urgência de 2026 não aparece. Sem custo da inação, o "depois eu vejo isso" vence. | Inércia é o inimigo |
| 4 | **Prova social rasa:** "+15.000 médicos confiam" repetido 3x | Zero especificidade — nenhum depoimento, especialidade, cidade ou número real. Para esse perfil, prova social genérica é ruído. | Prova social cirúrgica |
| 5 | **CTAs desalinhados:** "Fale com Nosso Time", "Quero pagar menos impostos" (2x), "Descubra quanto posso economizar" | Mistura de promessas e alta fricção. "Falar com um time" soa como vendas. O gatilho nº1 do MM é o **diagnóstico/raio-X** que quantifica o quanto ele perde — e isso não está oferecido como tal. | CTA ancorado no gatilho mais forte |
| 6 | **"30% Economia média em impostos"** na barra de métricas | Afirmação categórica e arriscada (compliance + credibilidade). As personas pedem **sempre "até 30%"**. A própria página oscila entre "30%" e "até 30%". | Honestidade da promessa |
| 7 | **Linguagem não-clínica** | Não usa o vocabulário que cria pertencimento imediato (raio-X, diagnóstico, anamnese, check-up). Perde o maior atalho de confiança "feito por médicos". | Falar a língua clínica |
| 8 | **"Múltiplas fontes de renda" como feature** | A colcha de retalhos (vários hospitais + cooperativa + RPA + consultório) é uma **dor reconhecível**, não uma funcionalidade. Tratada como feature, não gera identificação. | Dor antes da feature |
| 9 | **Formulário pede "Você é médico? Sim/Não"** | Para um público 100% médico, é fricção desnecessária e sinaliza página genérica. "Faturamento mensal" logo de cara, antes de construir valor, aumenta o atrito. | Reduzir fricção / pertencimento |
| 10 | **Sem âncora de identidade** | Não toca o desejo de identidade do MM ("ser o médico esperto com o próprio dinheiro, que não é passado para trás"). Fica só no funcional. | Camada de identidade |

**O que a página atual acerta e deve ser preservado:**
- ✅ Subhead "criada **por médicos, para médicos**" — é o maior ativo de confiança do segmento. Manter e elevar.
- ✅ A tabela comparativa Caveo × Contabilidades Tradicionais — boa estrutura; só precisa de afiação (seção 5.9).
- ✅ "Sem compromisso. Sem taxas escondidas." — boa redução de risco; reaproveitar.
- ✅ Métricas de tração (+15.000 médicos, 21 estados) — boas; só ajustar o "30%" → "até 30%".

---

## 3. Os 6 princípios de copy para o Médico Maduro

Toda a copy do desafiante obedece a estes princípios, extraídos das personas:

1. **Economia abre, confiança fecha.** Liderar com o dinheiro concreto (até 30% / quanto você perde), mas dedicar mais espaço à quebra de objeção do que à promessa.
2. **A inércia é o inimigo, não a falta de interesse.** Ele já sabe que paga demais. O trabalho é tornar o **custo de não agir** maior que o custo percebido da mudança. A Reforma Tributária 2026 é a alavanca.
3. **Não atacar o contador "amigo".** Atacar gera defensividade. Posicionar a troca como **evolução natural da carreira** ("seu contador não está errado — ele só não é especialista em médico"), não como correção de um erro.
4. **Prova social cirúrgica.** Especificidade converte: "anestesista, 3 hospitais, Curitiba"; "intensivista, cooperativa + RPA, São Paulo". Quanto mais o lead se reconhece no porta-voz, mais rápido decide.
5. **Falar a língua clínica.** Raio-X, diagnóstico, anamnese, check-up. Cria pertencimento e reforça "feito por médicos" sem dizer.
6. **Migração sem risco é o fecho.** Tornar a transição explicitamente segura e assistida ("a gente cuida da troca, você não fica sem nota um dia, sem risco de malha") é o que transforma concordância em ação.

---

## 4. Hipóteses do teste

### Hipótese central (a aposta)
> **Se** reescrevermos a lp2 para liderar com a indignação quantificada ("quanto do seu plantão vira imposto"), oferecer um **Raio-X tributário gratuito** como CTA principal, e dedicar seções explícitas a **migração sem risco** + **Reforma Tributária 2026** + **prova social cirúrgica**, **então** a taxa de conversão de visitante → lead qualificado (médico) aumentará, **porque** removemos a inércia e o medo de trocar — as duas barreiras reais do Médico Maduro — em vez de apenas reforçar um benefício que ele já conhece.

### Hipóteses de apoio (o que cada bloco do desafiante testa dentro do pacote)
| ID | Bloco | Hipótese |
|---|---|---|
| H1 | Hero | Headline de indignação/número-choque para mais scroll e cliques no CTA do que a headline de benefício genérico. |
| H2 | CTA | "Fazer meu raio-X tributário gratuito" (baixa fricção, alto valor percebido) converte mais que "Fale com nosso time" (alta fricção, sinal de vendas). |
| H3 | Migração | Uma seção dedicada a "trocar sem risco" reduz o abandono no fundo da página (onde o medo trava a ação). |
| H4 | Reforma 2026 | O bloco de custo da inação + Reforma aumenta a urgência e reduz o "depois eu vejo". |
| H5 | Prova social | Depoimentos específicos (especialidade/cidade/estrutura) elevam credibilidade vs. "+15.000" genérico. |
| H6 | Formulário | Remover "Você é médico? Sim/Não" e suavizar a ordem dos campos aumenta a taxa de preenchimento. |

---

## 5. A copy do desafiante (Variante B)

> Notação: **[A]** = copy atual (controle) · **[B]** = desafiante proposto · **Por quê** = racional ligado à persona.
> Onde houver mais de uma opção de headline/CTA, a **primeira é a recomendada**; as demais são alternativas para um round de refino (seção 8).

### 5.0 Mapa da nova página (estrutura e ordem)

A ordem das seções foi desenhada como uma **anamnese**: sintoma → diagnóstico → causa → tratamento → prova → segurança → ação.

1. Hero (indignação + promessa + CTA raio-X)
2. Barra de prova/tração
3. **Custo da inação + Reforma Tributária 2026** *(novo)*
4. **"Seu contador não está errado"** — reframe sem atacar *(novo)*
5. Como a Caveo resolve (economia, clareza, tempo — reorganizado em torno de dores)
6. **Migração sem risco** *(novo, elevado a seção própria)*
7. Prova social cirúrgica *(reescrito)*
8. Caveo × Contabilidade tradicional *(afiado)*
9. Oferta / Raio-X tributário gratuito (formulário reformulado)
10. FAQ / quebra de objeção *(novo)*
11. Rodapé (mantido)

---

### 5.1 Hero

**[A] atual**
- H1: "Mais tempo para o que importa. Mais dinheiro no seu bolso."
- Sub: "A única plataforma financeira criada por médicos, para médicos. Tecnologia + especialistas que entendem sua rotina."
- CTAs: "Fale com Nosso Time" · "Saiba Mais"

**[B] desafiante**
- **Eyebrow:** PLATAFORMA FINANCEIRA FEITA POR MÉDICOS, PARA MÉDICOS
- **H1 (recomendada):** "Você faz plantão até de madrugada. Quanto disso vai embora em imposto?"
  - *Alt 1:* "Médico PJ paga imposto demais. A Caveo reduz até 30% — dentro da lei."
  - *Alt 2:* "Pare de deixar dinheiro na mesa todo mês."
- **Subhead:** "A Caveo é a plataforma financeira feita por médicos que reduz **até 30%** da sua carga tributária, organiza todas as suas fontes de renda e resolve sua vida fiscal em **15 minutos por mês**. E a migração é assistida: **a gente cuida da troca do seu contador** — você não fica sem nota um dia."
- **CTA primário:** "Fazer meu raio-X tributário gratuito →"
- **CTA secundário:** "Ver como funciona"
- **Microcopy sob o CTA:** "Diagnóstico gratuito e sem compromisso. Em minutos você descobre quanto está deixando na mesa."

**Por quê:** abre com a **indignação concreta** (a fala literal da persona: *"faço plantão até de madrugada pra ver metade ir embora em imposto"*) → para o scroll. A subhead empacota as 4 dores do tronco comum (economia, colcha de retalhos, tempo, **medo de trocar**) e fecha com migração assistida. O CTA troca "falar com vendas" pelo **gatilho nº1 do MM** — o raio-X que quantifica a perda — com fricção e compromisso baixos.

---

### 5.2 Barra de prova / tração

**[A]** "+15.000 Médicos confiam na Caveo" · "21 Estados atendidos" · "**30%** Economia média em impostos"

**[B]** "+15.000 médicos PJ" · "21 estados" · "**até 30%** de economia tributária" · "**15 min/mês** no lugar de ~600h/ano de burocracia"

**Por quê:** corrige "30%" → "**até 30%**" (compliance + credibilidade — princípio da honestidade da promessa) e acrescenta a métrica-tempo (~600h/ano → 15 min/mês), que materializa a dor D4 do MM.

---

### 5.3 Custo da inação + Reforma Tributária 2026 *(seção nova)*

**Eyebrow:** REFORMA TRIBUTÁRIA 2026
**Headline:** "As regras mudaram. Não fazer nada também tem um custo."
**Corpo:** "A Reforma Tributária está reescrevendo como o médico PJ é taxado — e a maioria dos contadores genéricos não vai reposicionar a sua estrutura proativamente. Quem não revisar agora corre o risco de pagar mais do que precisa pelos próximos anos. No seu raio-X tributário, a gente mostra **o impacto da Reforma no seu caso específico** e o que dá para fazer antes que ela pese no seu bolso."
**CTA:** "Quero entender o impacto no meu caso →"

**Por quê:** transforma a inércia — o verdadeiro inimigo — em **custo da inação**, usando o gatilho de urgência mais forte de 2026. Posiciona a Caveo como quem traz clareza sobre a Reforma (desejo declarado de Rafael e Camila), sem prometer números fechados.

---

### 5.4 "Seu contador não está errado" — reframe sem atacar *(seção nova)*

**Headline:** "Seu contador não está errado. Ele só não é especialista em médico."
**Corpo:** "A maioria dos contadores trata uma padaria e uma PJ médica do mesmo jeito — e faz isso bem. O problema é que plantão, cooperativa, RPA, sociedade e consultório têm uma lógica tributária própria. Trocar para um especialista não é desfazer uma relação de confiança: é a **evolução natural** de quem chegou a um patamar de renda que pede mais. A Caveo é feita por médicos, para médicos — e essa é a única coisa que a gente faz."

**Por quê:** endereça a objeção emocional nº1 de Rafael (*"já tenho contador de confiança há anos"*) **sem gerar defensividade**. Reposiciona a troca como evolução de carreira (princípio 3) e crava a especialização (maior ativo de confiança).

---

### 5.5 Como a Caveo resolve — reorganizado em torno das dores

Em vez de "features", cada card abre com a **dor reconhecível** e entrega a solução.

| Dor (a fala do MM) | Card [B] | Detalhe |
|---|---|---|
| *"Pago imposto demais e nem sei quanto."* | **Economia tributária real** | "Planejamento por perfil que reduz **até 30%** da sua carga — legalmente. No raio-X, você vê quanto dá para economizar antes de decidir." |
| *"Minhas fontes de renda são uma colcha de retalhos."* | **Todas as suas fontes em um só lugar** | "Plantões de vários hospitais, cooperativa, RPA, consultório e sociedade — consolidados e organizados, sem planilha." |
| *"Só descubro como foi o mês quando o contador manda."* | **Clareza em tempo real** | "Dashboard que mostra quanto você ganha, gasta e economiza — agora, não no fim do mês." |
| *"Toda vez é a mesma novela com a papelada."* | **15 minutos por mês** | "Emissão ilimitada de notas em segundos e tributos pagos pelo app. ~600h/ano de burocracia viram 15 min." |
| *"App não substitui contador de verdade."* | **Especialistas de verdade por trás do app** | "Não é só tecnologia: tem gente que entende plantão, cooperativa e sociedade resolvendo com você." |

**Por quê:** dor antes da feature (princípio do reconhecimento). O card de múltiplas fontes nomeia explicitamente cooperativa + RPA (Camila) e múltiplos hospitais + sociedade (Rafael) — atende os dois arquétipos do tronco comum. O último card antecipa a objeção "app não substitui contador".

---

### 5.6 Clareza e controle (camada de identidade)

**Headline:** "Tenha o controle do seu dinheiro à altura de quem ganha bem."
**Corpo:** "Você não precisa virar contador. Precisa de uma visão clara o suficiente para tomar decisões — e da tranquilidade de saber que sua vida fiscal está resolvida. É o controle que um médico no seu nível merece ter."

**Por quê:** ativa a camada de **identidade/aspiração** do MM ("ser o médico esperto com o próprio dinheiro, que não é passado para trás") e a emocional ("tranquilidade"). Conversa com o padrão de exigência premium (Nubank/BTG) da Camila sem excluir Rafael.

---

### 5.7 Migração sem risco *(seção própria — antes era ausente)*

**Headline:** "Trocar de contador, sem dor de cabeça e sem risco."
**Como funciona (3 passos):**
1. **Raio-X gratuito** — a gente analisa sua estrutura atual e mostra o quanto dá para economizar.
2. **A gente cuida da transição** — assumimos toda a comunicação com a Receita e o seu contador atual.
3. **Você não para** — continua emitindo nota e operando normalmente. Sem ficar um dia no escuro, sem risco de malha.
**Selo de segurança:** "Migração assistida por especialistas. Sem taxas escondidas. Sem compromisso para fazer o raio-X."

**Por quê:** ataca de frente a barreira nº1 do segmento (D5: *"sei que podia ser melhor, mas mudar agora é dor de cabeça"*). É o bloco que transforma concordância em conversão — o "confiança fecha".

---

### 5.8 Prova social cirúrgica *(reescrito)*

Substituir as repetições de "+15.000 médicos confiam" por **dois depoimentos específicos**, um por arquétipo:

- **Perfil Rafael:** "Anestesista, 3 hospitais, Curitiba. Eu tinha contador há anos e nunca tinha parado pra ver o quanto pagava a mais. O raio-X me mostrou em 10 minutos. A migração foi tranquila — não fiquei sem nota um dia." — *(nome, CRM/UF)*
- **Perfil Camila:** "Intensivista, recebo por cooperativa e RPA, São Paulo. Achei que minha situação era complicada demais pra qualquer plataforma entender. Foi o primeiro lugar que olhou minha estrutura de verdade." — *(nome, CRM/UF)*

Abaixo, manter a faixa de tração: "+15.000 médicos em 21 estados já fazem parte."

> ⚠️ **Integridade:** os depoimentos acima são **modelos baseados nas personas** — devem ser substituídos por depoimentos **reais** com autorização antes do go-live. Ver seção 9.

**Por quê:** especificidade (especialidade + estrutura de renda + cidade) é o que converte o MM cético (princípio 4). Cobre os dois lados do tronco comum: o inerte com contador antigo (Rafael) e a híbrida que se acha "complexa demais" (Camila).

---

### 5.9 Caveo × Contabilidade tradicional *(afiado)*

Manter a estrutura de duas colunas, afiando cada linha com a fala da dor:

| Contabilidade tradicional | Caveo |
|---|---|
| Trata sua PJ médica como trata uma padaria | Especialistas em plantão, cooperativa, RPA, sociedade e consultório |
| Você paga o imposto que vier — sem otimização | Planejamento que reduz **até 30%**, dentro da lei |
| Você só sabe como foi o mês quando o contador manda | Dashboard em tempo real, na palma da mão |
| Juntar nota, mandar, conferir, repetir | Emissão e tributos pelo app — 15 min/mês |
| Atendimento lento e burocrático | Suporte que entende sua rotina e resolve rápido |
| Trocar parece um risco | Migração assistida — a gente cuida da troca |

**Por quê:** ancora cada contraste na linguagem real da persona (*"padaria e PJ médica do mesmo jeito"*) e fecha a tabela com migração — repetindo o sinal de segurança no ponto de decisão.

---

### 5.10 Oferta / Raio-X tributário gratuito *(formulário reformulado)*

**[A] atual:** "Fale com nosso time" · campos: Nome, Email*, Telefone*, **Você é médico? Sim/Não***, Faturamento mensal*, Como conheceu*.

**[B] desafiante:**
- **Headline:** "Descubra em minutos quanto você está deixando na mesa."
- **Sub:** "Faça seu raio-X tributário gratuito. Um especialista em médico PJ analisa seu caso — incluindo o impacto da Reforma 2026 — e mostra quanto dá para economizar. Sem compromisso."
- **Campos (nesta ordem):** Nome completo · WhatsApp* · E-mail* · Faturamento mensal aproximado* · Como você atua hoje? *(plantonista PJ / cooperativa + RPA / consultório / sociedade — múltipla escolha)*
- **CTA do botão:** "Quero meu raio-X gratuito →"
- **Reforço sob o botão:** "Sem compromisso · Sem taxas escondidas · Resposta em até 1 dia útil"

**Por quê:**
- Remove "Você é médico? Sim/Não" — fricção inútil numa LP 100% médica e sinal de página genérica (vaza nº9).
- Troca a pergunta genérica por **"Como você atua hoje?"** — qualifica o lead E faz o médico se reconhecer (e alimenta segmentação/atendimento por estrutura de renda).
- Reposiciona toda a oferta como **raio-X** (o gatilho nº1), não como "falar com um time".

---

### 5.11 FAQ / quebra de objeção *(seção nova)*

Espelha as objeções catalogadas nas personas:

- **"Até 30% de economia é promessa de marketing?"** → "Não prometemos número fechado. No raio-X mostramos o **como** (planejamento por perfil) e quanto dá pra economizar **no seu caso** — por isso falamos sempre em *até* 30%."
- **"App substitui contador de verdade?"** → "Não. Tem especialistas em médico PJ por trás do app. A tecnologia tira a burocracia; as pessoas cuidam da estratégia."
- **"E se der problema com a Receita na migração?"** → "A migração é assistida do começo ao fim. Você não fica sem nota, e a gente cuida da comunicação com a Receita."
- **"Meu caso é complexo demais (cooperativa, RPA, sociedade)."** → "Complexidade é exatamente a nossa especialidade. Quanto mais fontes, mais a gente ajuda a organizar — e mais imposto evitável aparece."
- **"Já tenho contador."** → "Ótimo. O raio-X é gratuito e sem compromisso: serve para você comparar e decidir com número na mão."

**Por quê:** o MM tem decisão longa e racional — a FAQ no fundo da página derruba a última objeção antes do formulário e reduz o abandono.

---

## 6. Tom de voz e vocabulário

**Faça:**
- Falar de igual para igual, como especialista que respeita o tempo do médico.
- Usar vocabulário clínico: **raio-X, diagnóstico, anamnese, check-up tributário**.
- Sempre **"até 30%"**, nunca "30%" categórico.
- Números concretos e a fala literal da persona ("metade vai embora em imposto", "colcha de retalhos").
- Reduzir risco em cada CTA ("gratuito", "sem compromisso", "sem taxas escondidas").

**Não faça:**
- Atacar ou ridicularizar o contador atual (gera defensividade).
- Prometer "30%" fechado ou economia garantida.
- Jargão contábil sem tradução (especialmente para Camila, que pede clareza humana).
- CTA que cheire a "time de vendas" / alta fricção no topo.
- Tratar múltiplas fontes de renda como "feature" em vez de dor reconhecível.

---

## 7. Framework de mensuração

**Métrica primária (decisão):** taxa de conversão visitante → **lead qualificado** (formulário enviado por médico). É a métrica mais próxima do objetivo de negócio e sensível à copy.

**Métricas secundárias (leitura):** cliques no CTA do hero, scroll depth até a seção de migração, taxa de início × conclusão do formulário, tempo na página.

**Guardrail (qualidade):** % de leads que são médicos e faixa de faturamento declarada — para garantir que um eventual aumento de volume **não** venha às custas da qualidade do lead. Idealmente, acompanhar até a etapa de Oportunidade no Salesforce (atribuição por UTM) para confirmar que o ganho de topo se sustenta no funil.

**Desenho estatístico:** split 50/50, **95% de confiança, 80% de poder**, hipótese e métrica primária **pré-registradas**. Não interromper nem declarar vencedor antes de atingir o tamanho de amostra e ao menos **2 semanas inteiras** (cobrir ciclos de dias úteis/fim de semana e evitar viés de peeking).

**Tamanho de amostra aproximado** (por variante; teste bicaudal, α=0,05, poder 0,80). Ajustar com a CR real da lp2:

| CR base (controle) | Detectar +20% relativo | Detectar +30% relativo |
|---|---|---|
| 3% | ~13.900 / variante | ~6.450 / variante |
| 5% | ~8.150 / variante | ~3.770 / variante |
| 8% | ~4.900 / variante | ~2.250 / variante |

> Valores são referência — usar uma calculadora de tamanho de amostra com a CR base medida. Quanto maior a CR base e o efeito esperado, menor o tráfego necessário.

**Implementação:** a lp.caveo é SPA (HTML renderizado por JS — ver `[[project_lp_caveo_spa_policy]]`). Confirmar se a lp2 tem o mesmo comportamento; se sim, o teste exige ferramenta client-side (ex.: VWO/AB Tasty) **ou** split server-side entre duas URLs com divisão de tráfego na mídia. Garantir parâmetros UTM consistentes para atribuição no Salesforce.

---

## 8. Backlog priorizado para os próximos rounds (ICE)

Depois que o desafiante radical vencer, isolar os elementos de maior impacto. Score ICE = Impacto × Confiança × Facilidade (1–5 cada).

| Round | Teste isolado | I | C | E | ICE | Nota |
|---|---|---|---|---|---|---|
| 2 | Headline: indignação (recomendada) × "até 30%" (Alt 1) × identidade (Alt 2) | 5 | 4 | 5 | 100 | Maior alavanca isolada |
| 2 | CTA: "raio-X gratuito" × "ver quanto economizo" × "falar com especialista" | 5 | 4 | 5 | 100 | Fricção × valor percebido |
| 3 | Seção Reforma 2026: presente × ausente | 4 | 4 | 4 | 64 | Mede o peso real da urgência |
| 3 | Prova social: 2 depoimentos específicos × faixa "+15.000" | 4 | 3 | 4 | 48 | Depende de depoimentos reais |
| 4 | Formulário: campos enxutos × atual; ordem dos campos | 3 | 4 | 5 | 60 | Ganho de conclusão |
| 4 | Posição do bloco "migração sem risco" (alto × fundo) | 3 | 3 | 4 | 36 | Onde o medo trava |

> Round 5+ (se houver tráfego): split por arquétipo (Rafael × Camila) em páginas dedicadas — o teste que ficou de fora desta decisão e pode ser o próximo salto.

---

## 9. Riscos, integridade e validação

- **Depoimentos:** os textos da seção 5.8 são **modelos derivados das personas**, não citações reais. Devem ser substituídos por depoimentos reais e autorizados (nome, especialidade, CRM/UF) antes do go-live. Sem isso, é risco de credibilidade e de compliance.
- **"Até 30%":** manter sempre o "até". Nunca afirmar economia garantida. O raio-X mostra o potencial caso a caso.
- **Reforma Tributária:** validar as afirmações da seção 5.3 com a equipe técnica/contábil da Caveo. Falar de impacto e revisão — não de números específicos.
- **Personas como inferência:** conforme nota de integridade do documento de dores/desejos, as falas e camadas emocionais são inferências qualificadas. Recomenda-se validar com leitura de atendimento real, comentários e 3–5 entrevistas com clientes do perfil MM antes de tratar como dogma.
- **Tronco comum × especificidade:** uma página única para Rafael e Camila é um compromisso. Monitorar se a copy ressoa de forma desigual entre os dois (via qualidade de lead por "Como você atua hoje?") — sinal para evoluir ao split (round 5).

---

## 10. Checklist de implementação / QA

- [ ] Confirmar comportamento SPA da lp2 e escolher ferramenta de teste (client-side × split de URL).
- [ ] Medir a CR base atual da lp2 (visitante → lead) para dimensionar a amostra.
- [ ] Coletar e aprovar 2 depoimentos reais (perfil Rafael + perfil Camila).
- [ ] Validar copy da Reforma 2026 com a equipe contábil da Caveo.
- [ ] Montar a Variante B com a estrutura da seção 5.0.
- [ ] Garantir UTMs consistentes nas duas variantes p/ atribuição no Salesforce.
- [ ] Pré-registrar hipótese central, métrica primária, MDE e duração mínima.
- [ ] Configurar guardrail de qualidade de lead (médico + faixa de faturamento).
- [ ] QA mobile-first (público consome no celular: Instagram/WhatsApp/Google).
- [ ] Definir critério de parada e não declarar vencedor antes da amostra + 2 semanas cheias.

---

*Boomer · Caveo · Documento de uso interno · 2026-06-16*
