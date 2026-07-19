# Google Ads — Estudo de Segmentos Personalizados e Combinados · Caveo

> **Versão:** 2026-06-16
> **Conta:** Caveo / Boomer — `392-112-7876`
> **Objetivo:** desenhar **Segmentos Personalizados** e **Segmentos Combinados** no Gerenciador de
> públicos-alvos para impactar com precisão os dois públicos centrais — **Médicos Recém-formados (RF)** e
> **Médicos Maduros / plantonistas PJ (MM)** — com base nas dores/desejos mapeados e no que já converte na conta.
> **Fontes:** `docs/Dores_Desejos_Publicos_Caveo.md`, `personas_recem_formados.md`, `personas_medico_maduro.md`
> e dados de 90 dias da própria conta (campanhas, termos de pesquisa, públicos existentes).

---

## Sumário executivo (leia isto primeiro)

**O achado central que muda tudo:** o Google **não tem um público nativo de "médico"**. Não existe
afinidade, in-market ou demográfico que diga "essa pessoa é médica". A especificidade médica da Caveo
**só pode vir de Segmentos Personalizados** (construídos com palavras-chave, URLs e apps do ecossistema
médico). Tudo o mais — in-market, eventos da vida, demografia — só serve para dizer **o momento/intenção**
(vai abrir empresa, está se formando, procura contador). A estratégia vencedora, portanto, é:

> **Segmento Combinado = (QUEM é médico → segmento personalizado) E (QUANDO/intenção → in-market + evento da vida) MENOS (clientes atuais).**

**3 lacunas críticas da conta hoje:**

1. **Não há onde rodar esses segmentos.** A conta é ~99% Search + um PMax minúsculo. Segmentos
   personalizados e combinados brilham em **Demand Gen, Vídeo (YouTube) e Display** — que **não existem**.
   Sem um veículo de prospecção, os segmentos ficam parados.
2. **Os segmentos personalizados existentes são RF-pesados, desorganizados e o MM está descoberto.**
   Há 9 segmentos personalizados, quase todos de residência/faculdade, com nomes-lixo (`AUTO`,
   `Segmento personalizado1721656983039`) e redundantes. O Médico Maduro tem cobertura fraca.
3. **Nenhum Segmento Combinado existe** — toda a lógica de precisão (QUEM ∩ QUANDO − clientes) ainda
   precisa ser construída, e há ótimas listas de cliente para usar como **exclusão**.

**Prioridade recomendada (detalhe na §9):**

1. Arrumar a casa: renomear/arquivar segmentos personalizados existentes e adotar a taxonomia `CS-RF-*` / `CS-MM-*`.
2. Construir os **segmentos personalizados de MM** (hoje quase inexistentes) e os **eventos da vida**.
3. Montar os **Segmentos Combinados** (QUEM ∩ QUANDO − clientes).
4. **Abrir uma campanha Demand Gen** (veículo nativo desses segmentos) + alimentar o PMax existente com os segmentos como **sinais de público**.
5. Adicionar os combinados em **modo Observação** nas campanhas de Search para ler dados antes de restringir.

---

## 1. Como o Google Ads "enxerga" público (e por que isso muda a estratégia da Caveo)

Antes de listar segmentos, é preciso entender as peças do Gerenciador de públicos-alvos e onde cada uma funciona.

| Tipo de segmento | O que é | Como se constrói | Traz especificidade "médico"? |
|---|---|---|---|
| **Personalizado** (Custom) | Você descreve o público por **interesses/intenção** | Palavras‑chave que pesquisa + **URLs** que consome + **apps** que usa | **SIM — é a única peça que consegue isolar "médico"** |
| **In-market** (No mercado) | Pessoas pesquisando/comparando ativamente uma categoria | Pré-construído pelo Google | Não (só categoria: contabilidade, impostos, software, emprego…) |
| **Afinidade** | Interesse de hábito/estilo de vida, mais amplo | Pré-construído | Não |
| **Eventos da vida** | Marcos: formatura, abertura de empresa, novo emprego | Pré-construído | Não (mas casa perfeitamente com RF/MM) |
| **Dados demográficos detalhados** | Educação, setor de atuação, renda, status parental | Pré-construído | Parcial ("setor: saúde" existe, mas cobertura fraca no BR) |
| **Seus dados** (remarketing/CRM) | Quem já visitou/converteu/é cliente | Tags, GA4, upload de CRM | Já são médicos (base da Caveo) — ótimos p/ **excluir** ou **semear** |
| **Combinado** (Combined) | **União lógica** dos tipos acima com **E / OU / NÃO** | Combina os de cima | Herda a especificidade do personalizado |

### Nuance importante sobre Segmento Personalizado por URL
Quando você coloca uma **URL** (ex.: `sanarmed.com`) num segmento personalizado, o Google **não** mira os
visitantes daquele site. Ele **lê o conteúdo da URL para entender o tema** e busca pessoas com interesse
*semelhante*. Por isso vale listar muitos sites do ecossistema médico — quanto mais sinais temáticos,
melhor o Google entende "essa pessoa orbita o mundo médico".

### Onde cada segmento pode ser usado (matriz campanha × segmento)

| Segmento | Demand Gen | Vídeo (YouTube) | Display | Search | PMax (como **sinal**) |
|---|:---:|:---:|:---:|:---:|:---:|
| Personalizado (por palavra‑chave) | ✅ | ✅ | ✅ | ✅ (segm./observ.) | ✅ |
| Personalizado (por URL/app) | ✅ | ✅ | ✅ | ❌¹ | ✅ |
| **Combinado** | ✅ | ✅ | ✅ | ✅ (use **Observação**) | ❌² |
| In-market / Afinidade / Evento da vida | ✅ | ✅ | ✅ | ✅ | ✅ |
| Remarketing / CRM | ✅ | ✅ | ✅ | ✅ | ✅ |

¹ Em Search, o personalizado só funciona pela vertente "interesse de pesquisa" (palavra‑chave), não por URL/app.
² PMax não aceita **combinado**; alimente-o com os segmentos **individuais** (personalizado + in-market + remarketing) como *sinais de público*.

> **Implicação direta:** os segmentos abaixo só geram valor se houver **Demand Gen / Vídeo / Display** rodando,
> ou se forem usados como **sinal no PMax** e em **Observação no Search**. Construir os segmentos sem o
> veículo é meio caminho — por isso a §9 prioriza abrir um Demand Gen.

---

## 2. Diagnóstico da conta (90 dias)

### 2.1 Estrutura de campanhas — quase só Search

| Campanha | Tipo | Investimento (90d) | Conversões | Leitura |
|---|---|---:|---:|---|
| `[Search] [Max Conv] - Institucional` | Search | R$ 13.012 | 433 | Marca ("caveo") — dominante; não é prospecção |
| `[RF] [Search] [Max Conv] - Cnpj médico` | Search | R$ 9.835 | 98 | Núcleo de aquisição RF |
| `[MM] [Search] - Contabilidade - BR` | Search | R$ 5.704 | 20 | MM nacional — caro por conversão |
| `[MM] [Search] - Contabilidade SP\|RJ\|BA` | Search | R$ 3.901 | 16 | MM regional |
| `[MM] [Pmax] Plataforma Médico PJ - Novo` | PMax | R$ 394 | 2 | Único canal não-Search; subutilizado |

**Conclusão:** zero Demand Gen, zero Vídeo, zero Display. O CPA do MM em Search é alto (R$ 285–244/conv),
sinal clássico de público de baixa intenção difícil de capturar só por palavra-chave — exatamente o caso
que **prospecção por segmento personalizado em Demand Gen/Vídeo resolve melhor**.

### 2.2 Termos que convertem (insumo direto para os personalizados)

- **Marca:** `caveo`, `caveo contabilidade`, `caveo cnpj`, `caveo app`, `mensalidade caveo` → não usar em prospecção (já conhecem).
- **RF (abertura):** `abrir pj medico`, `abrir cnpj medico`, `cnpj medico`, `pj medica`, `abrir um cnpj`,
  `como abrir cnpj medico`, `cnpj para medicos`, `medico mei`, `tipos de pj para medicos`.
- **MM (estabelecido):** `contabilidade médica`, `pj medico`, `cnpj para médicos`, `contabilidade para fisioterapeuta` (vizinhança de saúde).
- **Ruído a observar:** `kirvano`, `custom medical software`, `sistema/software gestão clínica`, `gestao medica` — intenção de software clínico, não de contabilidade.

> Esses termos reais validam os blocos de palavras‑chave dos segmentos personalizados na §4.

### 2.3 Segmentos personalizados que **já existem** (auditoria)

| Nome atual | Tipo | Ação recomendada |
|---|---|---|
| `Segmento personalizado1721656983039` | AUTO | **Arquivar** (auto-gerado, sem controle) |
| `palavras chave médicos` | SEARCH | Renomear → `CS-RF-01` ou consolidar; auditar termos |
| `PJ médico` | SEARCH | **Base do MM** — renomear → `CS-MM-01`, expandir termos |
| `pós-graduação em medicina` | PURCHASE_INTENT | Manter → renomear `CS-RF-aux` (sinal de formação) |
| `faculdades de medicina` | PURCHASE_INTENT | Manter → sinal RF |
| `cursos preparatórios para residência` | PURCHASE_INTENT | Manter → sinal RF forte |
| `Palavras chaves e sites de residência` | AUTO | Revisar/consolidar em `CS-RF-01` |
| `Palavras chaves: Residência` | SEARCH | Consolidar em `CS-RF-01` |
| `Palavras chave - cnpj médico + residência + cont. médica` | SEARCH | Misturado RF+MM — **dividir** em `CS-RF-02` e `CS-MM-01` |

**Diagnóstico:** cobertura RF redundante e desorganizada; **MM praticamente descoberto**; nomes sem
taxonomia dificultam combinar e medir. **Nenhum Segmento Combinado existe.**

### 2.4 Listas de público / remarketing (matéria-prima p/ combinar e excluir)

| Lista | Tamanho | Uso no estudo |
|---|---:|---|
| `Lista de clientes pagantes 9.10` (CRM) | 7.100 | **EXCLUIR** de toda prospecção |
| `Clientes Caveo SalesForce` (CRM) | 1.100 | **EXCLUIR** |
| `All Converters` | 700 | **EXCLUIR** de prospecção; usar p/ remarketing de upsell |
| `All Users of lp.caveo.com.br/` | 14.000 | Remarketing combinado |
| `TP - Visitantes LP - 30/60/90/180/365/540D` | 1.4k–8.1k | Escadas de remarketing por recência |
| `All Users of Caveo Tecnologia` | 19.000 | Base ampla p/ remarketing/semelhantes |
| `Similar to ...` (SIMILAR) | — | **Legado** — públicos semelhantes foram descontinuados pelo Google; substituir por *segmentação otimizada* |

> Há matéria-prima rica de 1ª parte. O que falta é **organizá-la em combinados e usá-la como exclusão**.

---

## 3. Da persona ao sinal — tabela de tradução

O criativo ataca a dor; **o segmento captura o sinal**. Aqui as dores/desejos viram palavras‑chave, URLs,
apps, in-market e eventos da vida.

### 3.1 Recém-formado (RF)

| Dor / desejo / momento | Palavra‑chave (interesse de pesquisa) | URL / app (interesse semelhante) | In-market / Evento da vida |
|---|---|---|---|
| Está se formando / residência | `prova de residência`, `revalida`, `enem residência`, `internato medicina`, `colação de grau medicina` | sanarmed.com, jaleko.com.br, medway.com.br, estrategiamed.com.br, aristo.com.br, medcel.com.br · apps Whitebook, Jaleko, Sanar, Medway | **Evento da vida: Formatura recente** · In-market: Emprego/Educação |
| "Não tenho CNPJ p/ pegar plantão" | `abrir cnpj medico`, `abrir pj medico`, `cnpj ou clt medico`, `preciso de cnpj para plantão`, `vaga plantão recém formado` | sites de vagas/escala de plantão | **Evento da vida: Criação de empresa** · In-market: Serviços de contabilidade |
| "Abrir PJ é um labirinto e caro" | `como abrir cnpj`, `simples nacional médico`, `medico mei pode`, `quanto custa abrir cnpj` | gov.br, contabilidades digitais | In-market: Software/serviços de contabilidade |
| "Minha renda é uma bagunça" | `quanto ganha plantão médico`, `quanto sobra plantão`, `gestão financeira médico` | apps de finanças pessoais | Afinidade: Entusiastas de finanças pessoais |
| Identidade: "começar certo / sair na frente" | `dicas início carreira médica`, `primeiro plantão` | perfis/canais de carreira médica | — |

### 3.2 Médico Maduro (MM)

| Dor / desejo / momento | Palavra‑chave (interesse de pesquisa) | URL / app (interesse semelhante) | In-market / Evento da vida |
|---|---|---|---|
| "Pago imposto demais" | `quanto médico paga de imposto`, `como pagar menos imposto pj`, `imposto plantão médico`, `lucro presumido médico` | conteúdos de planejamento tributário | In-market: **Serviços de preparação de impostos** |
| "Meu contador é genérico" | `contador para médico`, `contabilidade especializada médico`, `trocar de contador`, `contabilidade online médico` | doctoralia, iclinic.com.br, feegow.com, sites de contabilidade médica | In-market: **Serviços de contabilidade / Software corporativo** |
| Múltiplas fontes / cooperativa / RPA | `cooperativa médica imposto`, `RPA médico imposto`, `pró-labore médico`, `holding médica` | unimed cooperado, sites de cooperativa | In-market: Serviços financeiros |
| Consultório / sociedade | `abrir consultório médico`, `sociedade médica`, `contrato social clínica`, `faturamento clínica` | iclinic, feegow, amplimed, ninsaude · apps de gestão de clínica | **Evento da vida: Criação de empresa** |
| Reforma Tributária (gatilho 2026) | `reforma tributária médico`, `reforma tributária pj 2026`, `split payment médico` | g1/portais de economia, conteúdos tributários | In-market: Serviços de preparação de impostos |
| Desejo: clareza/controle, investir | `melhor investimento médico`, `planejamento financeiro médico` | btg, xp, nubank pj | Afinidade: Investidores ativos · Renda alta |

---

## 4. Segmentos Personalizados a construir (prontos para colar)

> **Onde:** Ferramentas → **Gerenciador de públicos-alvos** → **Segmentos** → **Segmentos personalizados** → **+**.
> Para cada um: cole as **palavras‑chave**, depois adicione **URLs** e **apps** (campos separados).
> Em "otimizar para", escolha **Relevância** (público mais qualificado/estreito) para os núcleos e
> **Alcance** apenas se for usar em Vídeo de topo.

### 4.1 RF — Recém-formado

**`CS-RF-01 · Médico em formação / residência`** — *otimizar para: Relevância*
- **Palavras‑chave:** `residência médica`, `prova de residência`, `revalida`, `enem residência`, `sanar residência`, `medcurso`, `aristo residência`, `medway residência`, `internato medicina`, `colação de grau medicina`, `último ano medicina`, `recém formado medicina`, `crm provisório`
- **URLs:** `sanarmed.com`, `jaleko.com.br`, `medway.com.br`, `estrategiamed.com.br`, `aristo.com.br`, `medcel.com.br`, `pebmed.com.br`, `afya.com.br`, `qconcursos.com`
- **Apps:** Whitebook, Jaleko, Sanar, Medway, Estratégia MED, Aristo, Medcel

**`CS-RF-02 · Primeiro CNPJ / primeiro plantão`** — *otimizar para: Relevância*
- **Palavras‑chave:** `como abrir cnpj medico`, `abrir pj medico`, `abrir cnpj medico`, `cnpj para medicos`, `cnpj ou clt medico`, `preciso de cnpj para plantão`, `simples nacional médico`, `medico mei`, `quanto custa abrir cnpj`, `abrir empresa recém formado`, `tipos de pj para medicos`, `vaga plantão recém formado`, `quanto ganha plantão médico`
- **URLs:** `gov.br/empresas-e-negocios`, contabilidades digitais (ex.: `contaazul.com`, concorrentes), sites de vagas de plantão
- **Apps:** apps de escala/plantão e bancos PJ digitais (ex.: Nubank PJ, InfinitePay)

### 4.2 MM — Médico Maduro

**`CS-MM-01 · Médico plantonista PJ estabelecido`** — *otimizar para: Relevância* — (evoluir do existente `PJ médico`)
- **Palavras‑chave:** `pj medico`, `cnpj para medicos`, `escala de plantão`, `plantão hospital`, `cooperativa médica`, `RPA médico`, `pró-labore médico`, `quanto médico paga de imposto`, `imposto plantão médico`, `médico múltiplas fontes de renda`
- **URLs:** `doctoralia.com.br`, `iclinic.com.br`, `feegow.com`, `unimed.coop.br`, portais de cooperativas e escala de plantão
- **Apps:** iClinic, Feegow, Doctoralia, Conexa Saúde, Whitebook

**`CS-MM-02 · Otimização tributária / troca de contador`** — *otimizar para: Relevância*
- **Palavras‑chave:** `contador para médico`, `contabilidade para médico`, `contabilidade especializada médico`, `trocar de contador`, `pago muito imposto`, `como pagar menos imposto pj`, `planejamento tributário médico`, `otimização tributária médico`, `lucro presumido médico`, `holding médica`, `contabilidade online médico`, `reforma tributária médico`, `reforma tributária pj 2026`
- **URLs:** portais de economia/tributário, sites de contabilidade médica concorrentes
- **Apps:** apps de bancos PJ e de gestão financeira

**`CS-MM-03 · Consultório / sociedade / clínica`** — *otimizar para: Relevância*
- **Palavras‑chave:** `abrir consultório médico`, `como abrir clínica`, `sociedade médica`, `contrato social clínica`, `faturamento clínica`, `gestão financeira consultório`, `cnpj clínica médica`
- **URLs:** `iclinic.com.br`, `feegow.com`, `amplimed.com.br`, `ninsaude.com`
- **Apps:** iClinic, Feegow, Amplimed, Ninsaúde

> **Reforma Tributária = alavanca de 2026.** `CS-MM-02` carrega os termos de Reforma; eles são o gatilho
> que quebra a inércia do MM neste ano (vide dores). Vale isolá-los num conjunto de anúncio próprio para medir.

---

## 5. Segmentos pré-construídos para "camada" (in-market, afinidade, evento da vida, demografia)

Estes **não** identificam médicos — servem para cruzar com os personalizados nos combinados (§6).

**Eventos da vida** (alta precisão de momento):
- **Formatura no ensino superior / recém-formado** → RF
- **Criação de empresa / abertura de negócio** → RF (1º CNPJ) e MM (novo consultório/sociedade)
- **Novo emprego / mudança de carreira** → RF (1º plantão)

**In-market (No mercado):**
- **Serviços de contabilidade / Software de contabilidade e finanças** → RF + MM
- **Serviços de preparação de impostos / tributário** → MM (forte)
- **Software corporativo / Serviços empresariais** → MM
- **Emprego** (busca de vaga) → RF
- **Serviços de investimento / financeiros** → MM (renda alta)

**Afinidade:**
- **Profissionais de negócios / Tomadores de decisão** → MM
- **Entusiastas de finanças pessoais / Investidores ativos** → MM
- **Aficionados por tecnologia (early adopters)** → conforto com app (RF + MM)

**Dados demográficos detalhados:**
- Educação: **superior completo / pós-graduação** → ambos
- Setor de atuação: **Saúde** (cobertura BR limitada — usar só como reforço, nunca sozinho)
- **Renda familiar alta (faixas superiores)** → MM
- Idade: **23–30** (RF) · **30–55** (MM); ajustar por gênero quando o criativo for segmentado (ex.: persona Camila)

---

## 6. Segmentos Combinados (a lógica E / OU / NÃO) — prontos

> **Onde:** Gerenciador de públicos-alvos → **Segmentos** → **Segmentos combinados** → **+**.
> A UI monta na forma **(Grupo 1) E (Grupo 2) E NÃO (Exclusões)**, com **OU** dentro de cada grupo.
> Use em **Demand Gen, Vídeo, Display** (segmentação) e em **Search** (apenas **Observação**). PMax não aceita combinado.

### 6.1 RF — prospecção fria

**`SC-RF-PROSPECT`**
- **Grupo 1 — QUEM (OU):** `CS-RF-01` **OU** `cursos preparatórios para residência` **OU** `faculdades de medicina` **OU** demográfico *Educação: superior/cursando*
- **E Grupo 2 — QUANDO/INTENÇÃO (OU):** `CS-RF-02` **OU** Evento da vida *Formatura recente* **OU** Evento da vida *Criação de empresa* **OU** In-market *Serviços de contabilidade*
- **E NÃO (excluir):** `Lista de clientes pagantes 9.10` **+** `All Converters` **+** `Clientes Caveo SalesForce`
- **Estreitar por demografia:** idade **23–30**.

> **Variante "ampla" (`SC-RF-REACH`)** para topo em Vídeo/Demand Gen: use **só o Grupo 1** + exclusões.
> Dois personalizados em **E** podem encolher demais o alcance num nicho como médicos no BR (ver §7).

### 6.2 MM — otimização tributária (núcleo de valor)

**`SC-MM-PROSPECT`**
- **Grupo 1 — QUEM (OU):** `CS-MM-01` **OU** `CS-MM-03`
- **E Grupo 2 — DOR/INTENÇÃO (OU):** `CS-MM-02` **OU** In-market *Serviços de preparação de impostos* **OU** In-market *Software de contabilidade*
- **E NÃO (excluir):** clientes pagantes + converters + `Clientes Caveo SalesForce`
- **Estreitar por demografia:** idade **30–55** + **renda alta** (faixas superiores).

**`SC-MM-REFORMA`** (sazonal/gatilho 2026)
- **Grupo 1 (OU):** `CS-MM-01` **OU** `CS-MM-02`
- **E Grupo 2 (OU):** termos de Reforma (subconjunto de `CS-MM-02`) **OU** In-market *Serviços de preparação de impostos*
- **E NÃO:** clientes + converters

### 6.3 Remarketing combinado (os dois públicos)

**`SC-RMKT-NAO-CONVERTEU`**
- **Grupo 1 (OU):** `All Users of lp.caveo.com.br/` **OU** `TP - Visitantes LP - 90D`
- **E NÃO:** `All Converters` **+** `Lista de clientes pagantes 9.10`
- Uso: reengajar quem visitou a LP e não converteu (decisão do MM é longa — retargeting é essencial).

### 6.4 Tabela-resumo de exclusões (aplicar em **toda** campanha de prospecção)

| Excluir sempre | Motivo |
|---|---|
| `Lista de clientes pagantes 9.10` (7.100) | Não pagar para reimpactar quem já paga |
| `Clientes Caveo SalesForce` (1.100) | Idem |
| `All Converters` (700) | Já converteu — vai para fluxo de remarketing/upsell, não prospecção |

---

## 7. Riscos e cuidados (para não estreitar demais)

- **Médico no BR é nicho.** Empilhar muitos `E` (dois personalizados + in-market + demografia + renda)
  pode reduzir o público a um tamanho **inservível** em Display/Vídeo. Regra: **no máximo 2 grupos `E`**
  em prospecção fria; comece amplo (`SC-*-REACH`) e aperte com base em dados.
- **Comece em Observação, não em Segmentação,** nas campanhas de Search existentes — adicionar como
  segmentação corta volume imediatamente. Observação lê performance sem restringir; depois aplica ajuste de lance.
- **PMax usa sinais, não combinados.** No PMax existente, adicione `CS-RF-*`, `CS-MM-*`, in-market e a
  lista de remarketing como **sinais de público** (orientam, não limitam) e **exclua** clientes via configuração da conta.
- **"Públicos semelhantes" acabaram.** As listas `Similar to ...` são legado inativo. Para expandir,
  confie em **segmentação otimizada** (Demand Gen/Display) e **sinais de público** (PMax) — não recrie semelhantes.
- **Segmentação otimizada pode "furar" o alvo.** Em Demand Gen, se ativada, o Google pode ir além do seu
  combinado. Para testes de leitura limpa de um segmento, **desligue** a segmentação otimizada; para escala, ligue.
- **URL ≠ visitante.** Reforçando a §1: URL no personalizado vira **tema de interesse**, não lista de visitantes daquele site.

---

## 8. Como implantar — veículo por segmento (plano de ativação)

| Segmento | Veículo recomendado | Modo |
|---|---|---|
| `CS-RF-*`, `CS-MM-*` (personalizados) | **Demand Gen** (novo) + **PMax** existente | Segmentação (DG) / Sinal (PMax) |
| `SC-RF-PROSPECT`, `SC-MM-PROSPECT` | **Demand Gen** / **Vídeo** | Segmentação |
| `SC-*` em campanhas de Search atuais | Search `[RF]` e `[MM]` | **Observação** |
| In-market / Evento da vida / Afinidade | Demand Gen / Vídeo / PMax (sinal) | Segmentação / Sinal |
| `SC-RMKT-NAO-CONVERTEU` | Demand Gen / Display / Vídeo | Segmentação |
| Exclusões (clientes) | **Todas** as campanhas de prospecção | Exclusão |

**Maior desbloqueio:** abrir **1 campanha Demand Gen** (objetivo: leads), com:
- Conjunto A (RF): `SC-RF-PROSPECT` — criativos de "começar certo / CNPJ grátis".
- Conjunto B (MM): `SC-MM-PROSPECT` — criativos de "até 30% / migração sem risco / Reforma".
- Exclusões de cliente aplicadas; segmentação otimizada **desligada** nas 2 primeiras semanas para leitura limpa.

---

## 9. Roadmap priorizado

**Semana 1 — Arrumar a casa (rápido, alto impacto)**
1. Renomear segmentos personalizados para a taxonomia `CS-RF-01/02`, `CS-MM-01/02/03`; arquivar os `AUTO`/lixo.
2. Dividir o segmento misto `cnpj médico + residência + cont. médica` em RF e MM.
3. Criar/atualizar `CS-MM-01/02/03` (o MM está descoberto hoje).

**Semana 1–2 — Construir a inteligência de público**
4. Criar os **eventos da vida** e listar os **in-market** relevantes.
5. Montar os **Segmentos Combinados** `SC-RF-PROSPECT`, `SC-MM-PROSPECT`, `SC-MM-REFORMA`, `SC-RMKT-NAO-CONVERTEU`.
6. Configurar **exclusões de cliente** como regra padrão de prospecção.

**Semana 2–3 — Ativar o veículo**
7. Lançar **Demand Gen** (conjuntos RF e MM) — onde os combinados realmente performam.
8. Adicionar segmentos como **sinais no PMax** existente.
9. Adicionar combinados em **Observação** nas campanhas de Search.

**Semana 4+ — Ler e apertar**
10. Ler performance por segmento; promover Observação→Segmentação onde houver sinal; ligar segmentação otimizada para escalar; podar o que não converte.

---

## 10. Medição — amarrar ao funil (Salesforce)

- Etiquetar cada combinado/campanha por público (`RF` / `MM`) e ler **não só CPL, mas qualidade**:
  conversão Lead → Oportunidade → Cliente no Salesforce (a conta já dispara `opportunity_created`).
- O MM tem **LTV alto e imediato**; tolere CPL maior se a taxa Lead→Cliente justificar. O RF tem **LTV de
  carreira** (forma hábito cedo); avalie por coorte, não só pelo CPA do mês.
- KPI por segmento: CPL, taxa Lead→Oportunidade, CPA de Oportunidade. Comparar `SC-*-PROSPECT` (Demand Gen)
  vs. Search de prospecção para realocar verba.

---

> **Limite de execução:** este documento é "pronto para colar" no Gerenciador de públicos-alvos (UI).
> A criação/edição de segmentos via API **não** está disponível pelo conector atual (somente leitura),
> então os segmentos precisam ser montados manualmente na interface seguindo as listas acima.
