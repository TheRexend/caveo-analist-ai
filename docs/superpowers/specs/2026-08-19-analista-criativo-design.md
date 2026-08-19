# Design — Agente `analista-criativo` + skill `criativos-semanal`

> Spec de design. Data: 2026-08-19. Origem: brainstorm com o cliente interno
> (Matheus), a partir dos dois slides acordados com a Caveo — **cadência
> criativa** e **framework de teste do Meta Ads**.

## 1. Objetivo

Entregar um ciclo semanal de análise de criativo de Meta Ads que produza um
**deck de apresentação** com quatro blocos:

1. **Consolidado do mês** — Leads, MQL, SQL, fechamentos e investimento de mídia
   paga até a data, contra a meta do mês.
2. **O que funcionou** — 2 a 3 destaques, analisados por data de inclusão do
   criativo, com o que se testou, por que funcionou e o que isso ensina sobre o
   médico PJ.
3. **O que não funcionou** — 1 a 2 criativos abaixo do esperado e a causa
   provável. O produto é aprendizado, não justificativa de performance.
4. **Hipóteses da semana seguinte** — o que testar de criativo, tema e hook.

## 2. Decisões tomadas no brainstorm

| # | Decisão | Alternativas descartadas |
|---|---|---|
| 1 | DOE = três camadas **dentro de um único arquivo de agente** (Directive / Orchestration / Execution) | Três agentes separados; camadas divididas entre agente e skill |
| 2 | Nome do agente: **`analista-criativo`** | `criativos-semanal` |
| 3 | Hold rate via **helper Python na Graph API** — o MCP do Meta não expõe os campos de vídeo | Rodar sem retenção; adiar o helper para backlog |
| 4 | Metas do mês **perguntadas na Fase 0** da skill | Ler `data/goals.db`; acrescentar chaves `mql`/`sql` ao goals.db |
| 5 | Entregável: **`.pptx` na identidade verde** já existente no projeto | Template novo azul/teal; Markdown + Artifact; Markdown + PPTX |
| 6 | O agente é **dono do ciclo** e aciona `analista-midia-paga-crm` e `criativos` por handoff | Agente autossuficiente; ampliar o `criativos` existente |
| 7 | Pipeline **A**: helper Python determinístico para cálculo, MCPs para coleta, agente para julgamento | Tudo no modelo; helper end-to-end |
| 8 | Atribuição por criativo usa **só cpc direto**, sem o ramo de cruzamento | cpc + cruzamento (padrão da fundação) |
| 9 | Piso de **500 impressões** para julgar qualquer KPI | Sem piso |
| 10 | Janela criativa de **14 dias**, cobrindo duas coortes de entrada | 7 dias |
| 11 | **Sem filtro de campanha** — todas as campanhas da conta são de conversão | Filtro `[LEADS]` |
| 12 | Registro histórico em **`data/criativos_registro.jsonl`** | Tabela em Markdown em `docs/` |

### 2.1. Justificativa da decisão 8 (só cpc direto)

A fundação (`docs/fundacao-dados.md`) define canal pago como **cpc +
cruzamento**, onde o ramo de cruzamento casa oportunidades por click ID quando
`UtmMed__c` não é cpc. Esse ramo captura justamente as linhas **sem UTM
confiável** — que não têm `UtmCon__c` preenchido e portanto não são atribuíveis
a um criativo. Para atribuição em nível de criativo, o ramo de cruzamento
adiciona ruído sem adicionar informação. Mesma decisão já tomada pela skill
`dados-lp-caveo`.

**Isto é um desvio consciente da fundação, restrito ao nível de criativo.** Para
qualquer número agregado de canal (bloco 1 do deck), vale a regra da fundação.

## 3. Arquitetura

### 3.1. Peças

```
.claude/agents/analista-criativo.md      JULGAMENTO — camadas D / O / E
.claude/skills/criativos-semanal.md      PROCEDIMENTO — fases 0 a 5
.claude/commands/criativos-semanal.md    invólucro fino do comando de chat
scripts/criativos_semanal/
  ├── meta_video.py      I/O  — Graph API: campos de vídeo ausentes no MCP
  ├── registro.py        I/O  — leitura e escrita do JSONL
  ├── gerar_deck.py      I/O  — monta o .pptx
  ├── framework.py       PURO — hook/hold/CTR/CPA + classificação + veredito
  ├── coorte.py          PURO — agrupa anúncios por data de entrada
  ├── matriz.py          PURO — células PDA já gastas × livres
  ├── conftest.py
  └── test_framework.py · test_coorte.py · test_matriz.py
data/criativos_registro.jsonl            registro append-only
outputs/criativos-semanal-AAAAMMDD-caveo/caveo-criativos-semanal.pptx
```

### 3.2. Fronteira pura × I/O

`framework.py`, `coorte.py` e `matriz.py` são **puros**: recebem listas de
dicionários e devolvem listas de dicionários. Sem rede, sem arquivo, sem
credencial. É o que os torna testáveis sem depender do Meta estar no ar, e é o
padrão já estabelecido por `scripts/acompanhamento_diario/qualification.py`.

Todo I/O fica isolado em `meta_video.py`, `registro.py` e `gerar_deck.py`.

### 3.3. Credencial

`meta_video.py` lê o token de `.mcp.json`, em
`mcpServers.meta-ads-mcp.env.META_ACCESS_TOKEN` — o mesmo caminho que
`scripts/push_env_to_vercel.sh` já usa. **Nenhuma credencial nova.**

### 3.4. Contas

| Plataforma | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` |
| Salesforce | `caveo.my.salesforce.com` |

### 3.5. Fonte única de regras

Canal, estágios de funil, contratante e o modelo de duas datas vêm de
`docs/fundacao-dados.md` (gerada de `config/business-rules.ts`). Se este
documento divergir da fundação, **a fundação vence** — exceto no desvio
explicitado em §2.1.

Benchmarks de **funil** (Lead→MQL, MQL→SQL etc.) pertencem ao agente
`analista-midia-paga-crm` e **não são duplicados aqui**. Benchmarks de
**criativo** (§4.1) são deste agente.

## 4. O agente `analista-criativo`

Arquivo: `.claude/agents/analista-criativo.md`, estruturado nas três camadas
DOE.

### 4.1. D — Directive

**Identidade.** Analista de criativo de performance para o público Médico da
Caveo. A pergunta que ele responde é sempre *"o que este número ensina sobre o
médico PJ?"* — nunca *"este criativo foi bom?"*.

**Benchmarks de criativo.** As faixas do slide do cliente, lidas como **piso**
(acima da faixa é melhor, não "fora do padrão"):

| Etapa | KPI | Fórmula | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|---|
| Atenção | hook rate | views 3s ÷ impressões | < 20% | 20–30% | > 30% |
| Retenção | hold rate | p75 ÷ views 3s | < 10% | 10–15% | > 15% |
| Interesse | CTR link | link_click ÷ impressões | < 1,5% | 1,5–2,5% | > 2,5% |
| Conversão | CPA | spend ÷ registro concluído | > R$150 | R$140–150 | < R$140 |

**Denominador do hold rate.** A régua oficial é **p75 ÷ views 3s**, como no
slide do cliente. O deck exibe **também** p75 ÷ impressões, porque boa parte
dos benchmarks públicos de mercado usa esse segundo denominador e a comparação
direta entre os dois é inválida. Exibir os dois evita conclusão errada em
reunião.

**Regras invioláveis.**

1. Nunca declarar vencedor nem perdedor abaixo de **500 impressões**.
2. Nunca inventar número de performance — na falta do dado, dizer que falta.
3. Nunca escrever copy. Copy é do agente `criativos`.
4. Nunca justificar performance. Toda causa provável termina em aprendizado
   sobre o médico PJ. *"CTR baixo porque o público saturou"* não passa;
   *"hook alto e CTR baixo — o médico para para ver o gancho de imposto mas não
   acredita na entrega em 72h; a prova precisa vir antes da promessa"* passa.
5. Nunca duplicar benchmark de funil — esse é do `analista-midia-paga-crm`.

### 4.2. O — Orchestration

**Cascata diagnóstica.** Aplicada em ordem; o **primeiro nível que falha é a
causa** e os níveis abaixo não são lidos:

| Padrão | Leitura | Onde está o problema |
|---|---|---|
| hook 🔴 | o gancho não para o scroll | os 3 primeiros segundos |
| hook 🟢 · hold 🔴 | para mas não segura | o meio da peça |
| hook 🟢 · hold 🟢 · CTR 🔴 | assiste mas não quer | a promessa não gera desejo |
| hook 🟢 · hold 🟢 · CTR 🟢 · CPA 🔴 | clica e não converte | descasamento criativo ↔ LP |
| tudo 🟢 | validado | escalar e reaproveitar em formatos |

**Tratamento do 🟡.** Amarelo **não quebra a cascata** — ela segue para o nível
seguinte. Só 🔴 interrompe e define a causa. Os 🟡 do caminho são listados como
atenção no slide, sem virar diagnóstico. Um criativo 🟡 em todos os níveis é
tratado como `iterar`, não como validado.

**Acionamentos.**

| Agente | Para quê | Quando |
|---|---|---|
| `analista-midia-paga-crm` | funil por `UtmCon__c` (MQL/SQL/fechamento) | sempre, na Fase 1 |
| `criativos` | escrever hooks e conceitos do bloco 4 | sempre, na Fase 4 |
| `tracking-conversoes` | investigar LP ou medição | só no padrão "tudo 🟢 e CPA 🔴" |

O HANDOFF para `criativos` carrega, além do diagnóstico, a **estrutura de copy
recomendada** (§5.2), para que ele não escolha no escuro.

### 4.3. E — Execution

Carrega o formato de saída, a cascata já operacionalizada e o checklist de
auto-verificação:

- [ ] Nenhum criativo abaixo de 500 impressões classificado como destaque ou fracasso
- [ ] Cobertura de `UtmCon__c` declarada explicitamente
- [ ] Toda causa provável ancorada em um nível da cascata
- [ ] Toda causa provável termina em aprendizado sobre o médico PJ
- [ ] Hold rate exibido nos dois denominadores
- [ ] Hipótese da semana anterior confrontada com o que aconteceu

Os procedimentos concretos (chamadas MCP, queries) vivem na skill.

## 5. Camada de ideação

### 5.1. Frameworks adotados

| Framework | Papel no ciclo |
|---|---|
| **Angle → Hook → Format** | vocabulário base da cadência criativa |
| **PDA** (Persona × Desire × Awareness) | geração de conceitos novos |
| **PAS** (Problem → Agitate → Solution) | estrutura de corpo, copy curta |
| **BAB** (Before → After → Bridge) | estrutura de corpo quando o argumento é transformação |
| **4 Ps** (Promise → Picture → Proof → Push) | estrutura de anúncio de resposta direta completo |

> **Nota de procedência.** O P.D.A. cunhado pela Pilothouse Digital é
> *Persona · Desire · **Angle***. O framework com **Awareness** no terceiro eixo
> é o **Hi5** (5×5×5 = 125 ângulos). Adotamos o rótulo **PDA** por ser o termo
> em uso interno, com os eixos Persona × Desire × Awareness — tecnicamente os do
> Hi5. Registrado aqui para evitar surpresa se alguém citar a fonte original.

O eixo **Awareness** segue os 5 níveis de Eugene Schwartz (*Breakthrough
Advertising*, 1966): Inconsciente → Consciente do problema → Consciente da
solução → Consciente do produto → Totalmente consciente. Princípio operante:
copy não cria desejo, só canaliza desejo existente. Leitura vigente para a
Caveo — o médico entra majoritariamente **consciente do problema**
(imposto/burocracia), raramente consciente da solução.

### 5.2. Regra única: o nível quebrado escolhe o framework

| Diagnóstico | O que se gera | Framework |
|---|---|---|
| hook 🔴 | 2–3 hooks novos, **mesmo ângulo** | Angle→Hook→Format, nível Hook |
| hold 🔴 | reescrita do corpo, mesmo hook | **PAS** ou **BAB** |
| CTR 🔴 | trocar **Desire** e/ou **Awareness** | **PDA** — conceito novo |
| CPA 🔴 e resto 🟢 | nada de criativo | handoff → LP / `tracking-conversoes` |
| tudo 🟢 | mesmo ângulo em outros formatos | Angle→Hook→Format, nível Format |

Só a linha do CTR gera **conceito novo**. As demais são iteração. É isso que
sustenta os 12–20 criativos/mês da cadência sem estourar os 3–4 ângulos
acordados.

### 5.3. Instanciação da matriz PDA com fontes da Caveo

Os eixos não são inventados — vêm da documentação existente:

| Eixo | Fonte |
|---|---|
| Persona | `docs/personas_medico.md` — Larissa, Diego, Rafael, Camila |
| Desire | `docs/Dores_Desejos_Publicos_Caveo.md` — mapas D1–D7 |
| Awareness | 5 níveis de Schwartz |

`matriz.py` cruza os eixos com o registro histórico e devolve as **células ainda
não testadas**. Sem isso a matriz repete conceito e o bloco 4 vira sorteio.

Regras de copy continuam sendo dos manuais existentes
(`Manual_Comunicacao_Oferta_Caveo.md` e
`Manual_Comunicacao_Funcionalidade_Caveo.md`) e são aplicadas pelo agente
`criativos`, não aqui.

### 5.4. Check de diversidade (Andromeda)

O Andromeda do Meta é um estágio de recuperação pré-leilão que avalia cada
criativo por mensagem, visual, tema, hook e linguagem, e **suprime entrega de
peças repetitivas**. A prática decorrente é **um criativo conceitualmente
distinto por conjunto**, para não competirem entre si.

Como a skill já coleta `adset_id` e o conteúdo de cada criativo, ela sinaliza no
anexo do deck os **conjuntos com mais de um criativo conceitualmente
semelhante**. É um alerta, não um bloqueio.

## 6. A skill `criativos-semanal`

### 6.1. Fases

| Fase | O quê |
|---|---|
| 0 | Escopo e metas |
| 1 | Coleta paralela |
| 2 | Cálculo determinístico |
| 3 | Julgamento (`analista-criativo`) |
| 4 | Ideação (handoff → `criativos`) |
| 5 | Geração do `.pptx` |

Como nas demais skills do projeto, o usuário pode pedir uma fase isolada
("só coleta", "gera o deck com a análise pronta").

### 6.2. Fase 0 — Escopo e metas

Calcular a partir de `TODAY` e apresentar para confirmação **antes de qualquer
chamada de API**:

| Variável | Fórmula | Uso |
|---|---|---|
| `CRIA_END` | TODAY − 1 | fim da janela criativa |
| `CRIA_START` | TODAY − 14 | início da janela criativa |
| `MES_START` | dia 01 do mês corrente | início do consolidado |
| `MES_END` | TODAY − 1 | fim do consolidado |

A janela de 14 dias cobre **duas coortes de entrada**: `D-14→D-8` (madura, já
passada a fase de aprendizado de 5–7 dias) e `D-7→D-1` (leitura preliminar).
Destaque do bloco 2 sai preferencialmente da coorte madura.

Perguntar as **5 metas do mês**: Leads, MQL, SQL, Fechamentos, Investimento.

### 6.3. Fase 1 — Coleta

Cinco coletas em paralelo. **Sem filtro de campanha** — todas as campanhas da
conta são de conversão.

| # | Origem | O quê |
|---|---|---|
| 1A | MCP Meta `get_insights` `level=ad` | impressões, cliques, spend, ctr, actions — janela criativa **e** mês |
| 1B | MCP Meta `get_ads` | `created_time`, `adset_id`, `creative.id`, `status` |
| 1C | MCP Meta `get_ad_creatives` | título, corpo, thumbnail — **só dos anúncios que entram no deck** |
| 1D | helper `meta_video.py` | `video_play_actions`, `video_thruplay_watched_actions`, `video_p25/p50/p75/p100_watched_actions` |
| 1E | handoff → `analista-midia-paga-crm` | funil por `UtmCon__c` (cpc direto) |

**1C é deliberadamente restrita.** `get_ad_creatives` é uma chamada por anúncio;
buscar o criativo dos 40 anúncios da conta para usar 5 no deck é desperdício.

**Sobre 1D.** O MCP do Meta tem lista de campos fixa — `impressions, clicks,
spend, cpc, cpm, ctr, reach, frequency, actions, action_values, conversions,
unique_clicks, cost_per_action_type`. Dela sai hook rate (via
`actions[video_view]`, que é a view de 3s), CTR link e CPA. **Não sai retenção**:
os campos `video_p*_watched_actions` e `video_thruplay_watched_actions` não são
expostos. Daí o helper.

**1E** usa `UtmCon__c` como chave de criativo, com filtro cpc direto (§2.1), e
declara a cobertura (% de oportunidades pagas com `UtmCon__c` preenchido).

### 6.4. Fase 2 — Cálculo

`framework.py` e `coorte.py` produzem, por anúncio: os quatro KPIs, o hold rate
nos dois denominadores, o status 🔴🟡🟢 de cada KPI, o `nivel_quebrado` pela
cascata e o `veredito`.

Vereditos possíveis: `escalar` · `iterar` · `matar` · `inconclusivo` ·
`fora_criativo`.

**Regra `matar` × `iterar`.** A cadência acordada com o cliente manda testar
2–3 aberturas de 3s antes de descartar um conceito. Traduzido em regra
determinística, consultando o registro histórico:

| Condição | Veredito |
|---|---|
| < 500 impressões | `inconclusivo` |
| algum KPI 🔴, e o ângulo tem **menos de 2** hooks já testados no registro | `iterar` |
| hook 🔴, e o ângulo já tem **2 ou mais** hooks testados, todos 🔴 no hook | `matar` (o ângulo, não só a peça) |
| tudo 🟢 · CPA 🔴 | `fora_criativo` |
| tudo 🟢 | `escalar` |
| demais casos | `iterar` |

`matar` é o único veredito que condena o **ângulo**; os outros tratam a peça.

`coorte.py` agrupa por `created_time` nas duas coortes de entrada da janela.

### 6.5. Fases 3 a 5

Fase 3 — o agente recebe a tabela já classificada e produz a narrativa dos
blocos 2 e 3. Fase 4 — handoff para `criativos` com diagnóstico + estrutura de
copy recomendada + células PDA livres. Fase 5 — `gerar_deck.py` e escrita do
registro.

## 7. O deck

`scripts/criativos_semanal/gerar_deck.py`, herdando a identidade visual de
`scripts/gerar_slides_hot_topics.py` (verde `#0E8A5F`, fundo `#E8F4EF`, Calibri,
16:9) e seus helpers `txt` / `rect` / `header`.

Saída: `outputs/criativos-semanal-AAAAMMDD-caveo/caveo-criativos-semanal.pptx`

| Slide | Conteúdo |
|---|---|
| 01 | **Consolidado do mês** — Leads, MQL, SQL, Fechamentos, Investimento × meta × ritmo do mês |
| 02 | **O que funcionou** — 2–3 destaques por coorte de entrada: o que se testou, por que funcionou, o que ensina sobre o médico PJ |
| 03 | **O que não funcionou** — 1–2 casos + causa provável pela cascata |
| 04 | **Hipóteses da semana seguinte** — abre com "a hipótese da semana passada: o que aconteceu", segue com o que testar, em que nível e por quê |
| Anexo | Ainda em leitura (< 500 impressões) · cobertura de `UtmCon__c` · conjuntos com criativos concorrentes (§5.4) · campanhas incluídas |

O anexo lista as **campanhas incluídas** para que uma eventual campanha que não
seja de conversão apareça em vez de ser diluída na média.

**Definição de "ritmo"** (slide 01): `realizado ÷ (meta × dias decorridos ÷ dias
do mês)`. Ritmo 100% significa que a métrica está exatamente no passo necessário
para bater a meta até o fim do mês. Separar ritmo de "% da meta" evita a leitura
errada de que 60% da meta no dia 20 seria atraso — no ritmo, 60% no dia 20 é 92%.

As definições de **MQL** e **SQL** vêm da fundação (`docs/fundacao-dados.md`),
não deste documento. Vale lembrar que MQL passou a ser "Contato Realizado" em
2026-08-18, o que aproximou MQL de Leads.

## 8. Registro histórico

`data/criativos_registro.jsonl`, append-only, uma linha por criativo testado.
Lido na Fase 0 (para saber quais células PDA já foram gastas) e escrito na
Fase 5.

```jsonl
{"ad_id":"120246069173850088","ad_name":"CAV082611SV1","entrou":"2026-08-12",
 "persona":"Rafael","desire":"D3","awareness":"problema","angulo":"plantão como moeda",
 "hook":"...","formato":"video","hipotese_origem":"S33-H2",
 "impressoes":4210,"hook_rate":0.24,"hold_rate_hook":0.11,"hold_rate_impr":0.026,
 "ctr_link":0.019,"cpa":163.40,"veredito":"iterar","nivel_quebrado":"conversao"}
```

**Por que JSONL e não tabela em Markdown:** o registro é consumido
programaticamente na Fase 0 — `registro.py` lê o arquivo e entrega as linhas a
`matriz.py`, que é puro e só recebe a lista já carregada. Parsear tabela
Markdown em Python é frágil. O
registro **narrativo** — a história de por que se testou aquilo — continua nos
decks em `outputs/`.

`hipotese_origem` usa o formato `S<semana ISO>-H<n>` e é o que permite ao slide
04 confrontar a hipótese anterior com o resultado.

## 9. Casos de borda

| Situação | Comportamento |
|---|---|
| Token do Meta expirado ou ausente | helper falha alto; a skill **para**. Não gera deck com retenção faltando em silêncio |
| Nenhum criativo novo na janela | blocos 2 e 3 saem vazios dizendo isso. Não promove criativo antigo a destaque para preencher slide |
| Anúncio estático (sem vídeo) | hook e hold = `N/A`; cascata pula os dois primeiros níveis; julgamento por CTR e CPA |
| Cobertura de `UtmCon__c` < 80% | ressalva no slide 01 e no anexo; ranking de funil vira indicativo |
| Todos os criativos < 500 impressões | deck sai só com bloco 1 e anexo, declarando que a semana não tem leitura |
| Registro JSONL inexistente | primeira execução cria o arquivo; matriz PDA trata todas as células como livres |
| Anúncio sem `UtmCon__c` correspondente no SF | entra na análise de plataforma (hook/hold/CTR), fica fora do ranking de funil, é contado no cálculo de cobertura |

## 10. Fora de escopo

- Google Ads. O framework de teste acordado é de Meta Ads.
- Escrever copy final — é do agente `criativos`.
- Alterar `config/business-rules.ts` ou o dashboard.
- Acrescentar metas de MQL/SQL ao `goals.db` (decisão 4 tornou desnecessário).
- Criar identidade visual nova de deck (decisão 5).

## 11. Riscos e lacunas conhecidas

1. **Volume por criativo.** Sondagem em 2026-08-19 mostrou anúncios com 1.663 e
   113 impressões em 7 dias. A janela de 14 dias e o piso de 500 mitigam, mas é
   possível que semanas inteiras saiam sem leitura conclusiva. O deck diz isso
   em vez de fabricar destaque.
2. **Nomes de anúncio são códigos** (`CAV082611SV1`), não descrevem o criativo.
   Daí a dependência de 1C para o deck ter conteúdo legível.
3. **Tags de campanha desatualizadas.** As campanhas ainda carregam `[MM]`
   apesar da virada de ICP de 2026-07-31. Não afeta o cálculo — a skill não
   filtra por segmento — mas os nomes aparecem nos slides.
4. **Classificação PDA dos criativos existentes.** O registro nasce vazio; os
   criativos já rodando precisarão ser classificados manualmente na primeira
   execução, ou a matriz tratará células já gastas como livres.
5. **Benchmark de hold rate.** A faixa 10–15% do cliente é mais permissiva que
   os ~25% citados em fontes públicas de 2026, mas as fontes usam denominador
   possivelmente diferente. Mitigado pela exibição dupla (§4.1); vale revisitar
   com dados reais depois de alguns ciclos.
