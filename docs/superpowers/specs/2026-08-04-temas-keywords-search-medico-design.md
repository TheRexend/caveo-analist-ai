# Levantamento de Temas de Keyword — Google Ads Search (Público Médico)

> Spec de brainstorm, não de implementação de código. Ponto de partida pra
> pesquisa de volume de busca (Google Keyword Planner ou equivalente) — o
> próximo passo natural depois deste documento, fora do escopo aqui.
> Data: 2026-08-04

## 1. Objetivo e escopo

Expandir a lista inicial de temas de keyword trazida pelo usuário (contabilidade
para médico, contador para médico, abrir PJ/CNPJ médica, emitir nota fiscal
plantão/médica) numa estrutura organizada, cruzando com o que já existe na
conta Google Ads e com o material estratégico já validado do projeto
(Mapa Temático de Criativos, personas, achado de potencial de keywords).

**Escopo confirmado com o usuário:**
- Só **Google Ads Search** — SEO/conteúdo orgânico e públicos de Meta ficam de
  fora; volume de busca só faz sentido pesquisar pra Search.
- Público **Médico nacional** (100% do budget de mídia paga hoje). **Revalida**
  fica fora desta rodada — existe ad group dormente pronto, mas é decisão
  separada.
- **Concorrentes (conquesting)** ficam fora — a conta já trata nomes de
  concorrente como negativo (lista de ~180 termos hoje só numa campanha
  pausada, não portada pras ativas); disputar busca de marca alheia é decisão
  estratégica à parte, não expansão orgânica de tema.
- Eixo de organização: **intenção de funil** (transacional / comparativo /
  informacional), não pilar de produto nem estágio de carreira — a lente que
  já explica o achado de CAC real da conta (ver Seção 3).
- Profundidade do entregável: cada tema é um **candidato a ad group**
  completo (nome, seeds, risco de intenção, status na conta), não só uma
  lista solta de sementes.

## 2. Por que intenção de funil (não pilar de produto ou persona)

Achado já validado na conta (`docs/superpowers/specs/` anteriores e memória
de projeto, análise de 2026-08-04): o ad group ativo **"Contabilidade"**
(campanha `[MM] Persona Médico Maduro`) tem CAC R$2.009 (14x pior que brand,
4x pior que o cluster `cnpj_medico`) e win-rate de só 25% (vs 92% do
`cnpj_medico`). A causa raiz confirmada via GA4 **não é a landing page** —
mesma URL física, mesmo ou melhor engajamento no tráfego desse cluster. A
causa é **descolamento entre intenção de busca e oferta/copy**: "contabilidade
para médico" sem modificador atrai tanto quem quer contratar quanto quem só
está pesquisando o conceito.

Por isso o eixo de organização deste levantamento é a intenção de funil —
permite sinalizar, tema a tema, qual risco de repetir esse erro cada um
carrega, antes de qualquer decisão de ativação.

## 3. Candidatos a ad group

Template usado por candidato:

```
### [Nome do ad group candidato]
- Seeds: keyword 1, keyword 2, keyword 3...
- Balde de funil: 🟢 transacional / 🟡 comparativo-decisão / 🔴 informacional
- Risco de intenção: nota curta do porquê
- Status na conta: novo / já existe ativo / já existe dormente
```

### 🟢 Transacional (já decidiu, busca quem executa)

#### Abertura de CNPJ Médico
- Seeds: abrir cnpj médico, abrir pj médico, cnpj médico online, abertura de
  empresa médica, quanto custa abrir cnpj médico
- Balde de funil: 🟢
- Risco de intenção: baixo — cluster já validado com dado real (CAC R$511,
  92% win-rate)
- Status na conta: **já existe, ativo** (`cnpj_medico` / ad group "Abertura
  Empresa"). Cobre os termos "Abrir PJ médica" / "Abrir CNPJ Médica" do
  usuário. Alavanca aqui não é keyword nova — é resolver os 58% de impression
  share perdido por rank.

#### Migração de Contabilidade Médica
- Seeds: trocar de contador médico, migrar contabilidade médica, sair do
  contador atual médico pj
- Balde de funil: 🟢
- Risco de intenção: baixo — "trocar/migrar" é sinal forte de decisão já
  tomada
- Status na conta: novo, não existe hoje como tema isolado

#### Emissão de Nota Fiscal — Sistema para Médico PJ
- Seeds: sistema de emissão de nota fiscal médico, emitir nota fiscal
  automática plantão, app para emitir nota fiscal médico
- Balde de funil: 🟢 (variante qualificada)
- Risco de intenção: médio-baixo — modificador "sistema/app/automática"
  filtra quem quer ferramenta, não só tirar dúvida
- Status na conta: novo. Cobre "Emitir nota fiscal plantão" do usuário, só na
  variante qualificada

### 🟡 Comparativo / decisão (avaliando opções)

#### Reforma Tributária para Médico PJ
- Seeds: reforma tributária médico pj, como fica o imposto de médico com a
  reforma tributária, simples nacional médico reforma tributária
- Balde de funil: 🟡
- Risco de intenção: médio — tema de urgência 2026, mas parte de quem busca
  pode ainda estar só se informando sobre o assunto em geral, não sobre
  trocar de contabilidade
- Status na conta: novo. Nenhum ad group ativo cobre isso hoje — gatilho de
  conversão identificado pra persona Rafael (carreira consolidada)

#### Contabilidade Especializada em Plantão/Cooperativa
- Seeds: contabilidade para médico plantonista, contador que entende
  cooperativa médica, contabilidade médico pj cooperativa e rpa
- Balde de funil: 🟡
- Risco de intenção: médio-baixo — já tem modificador de especialização
  (plantão/cooperativa), reduz ambiguidade
- Status na conta: novo. Mais qualificado que o ad group "Contabilidade"
  atual (ver 🔴 abaixo)

#### Melhor Contador/Contabilidade para Médico
- Seeds: melhor contabilidade para médico, melhor contador para médico pj,
  contabilidade especializada em médico
- Balde de funil: 🟡
- Risco de intenção: médio — "melhor" sinaliza comparação ativa, mas ainda
  mistura pesquisa com decisão
- Status na conta: novo. Variante qualificada do termo "Contador para médico"
  do usuário

### 🔴 Informacional (sinalizado — cautela antes de ativar)

#### "Contabilidade/Contador para Médico" genérico
- Seeds: contabilidade para médico, contador para médico, contador médico
- Balde de funil: 🔴
- Risco de intenção: **alto** — é literalmente o padrão do ad group ativo
  "Contabilidade" (CAC R$2.009, win-rate 25%). Termo genérico sem modificador
  de urgência/decisão atrai quem só está pesquisando o conceito.
- Status na conta: **já existe e já performa mal por esse motivo exato** —
  não é tema novo pra testar, é o tema que já está queimando budget.
  Recomendação: não expandir volume aqui sem antes resolver copy/oferta, ou
  aceitar deliberadamente como topo de funil com LP diferente.

#### Dúvidas Básicas sobre CNPJ Médico
- Seeds: como funciona cnpj para médico, vale a pena abrir cnpj médico, cnpj
  médico simples nacional como funciona
- Balde de funil: 🔴
- Risco de intenção: alto — mesmo padrão do achado acima, aplicado ao tema de
  abertura em vez de contabilidade recorrente
- Status na conta: novo. Considerar como conteúdo/SEO ou remarketing, não
  Search pago direto

#### Nota Fiscal Médica — dúvidas gerais
- Seeds: como emitir nota fiscal médica, emitir nota fiscal plantão (sem
  qualificador), nota fiscal médico pessoa física
- Balde de funil: 🔴
- Risco de intenção: alto — inclui quem só quer um emissor avulso/gratuito de
  NF, não contratar uma contabilidade completa; "pessoa física" pode inclusive
  sinalizar público fora do ICP
- Status na conta: novo. Cobre a variante não-qualificada de "Emitir nota
  fiscal médica" do usuário — sinalizar antes de investir aqui

### Nota à parte — fora da lista acima

**Gestão Financeira Médico** — ad group dormente já existente na campanha
`cnpj_medico`, tema próximo do balde 🟡 (#5/#6 acima), mas fora do escopo dos
termos que o usuário trouxe nesta sessão. Sinalizado aqui só porque já existe
pronto na conta, caso valha reativar junto numa próxima decisão.

## 4. Ressalvas transversais

- **Negativação sugerida** ao configurar campanhas com esses temas: termos de
  "curso"/"faculdade"/"estágio" (intenção de estudante, não de quem já
  fatura), "MEI" (regime que normalmente não se aplica a médico PJ — pode
  indicar público fora do ICP), "declaração imposto de renda pessoa física"
  isolado (sem "pj"/"médico pj" junto).
- Temas 🔴 **não devem virar ad group novo de Search pago sem antes decidir
  tratamento de LP/copy** — entram nesta lista pra dimensionar volume/mercado,
  não como recomendação de ativação imediata.
- Concorrentes e Revalida ficam fora deste levantamento por decisão do
  usuário — retomar em sessão dedicada se fizer sentido depois.

## 5. Próximos passos (fora do escopo desta sessão)

1. Rodar os ~30 seeds deste documento no Google Keyword Planner (ou
   ferramenta equivalente) pra puxar volume de busca e CPC estimado por
   termo.
2. Priorizar por volume × risco de intenção — favorecer 🟢 e 🟡 com volume
   relevante antes de considerar escalar qualquer 🔴.
3. Cruzar o resultado com o achado de rank do cluster `cnpj_medico` (58%
   impression share perdido) — pode ser mais eficiente resolver isso antes de
   somar keyword nova ali.
4. Decidir com o time se algum tema 🔴 vira conteúdo/SEO (blog, LP de topo de
   funil) em vez de Search pago.

## 6. Fontes internas usadas neste levantamento

- Memória de projeto: potencial de keywords Google Ads (2026-08-04), ICP
  Formando/Médico/Revalida (2026-07-31/08-02)
- `docs/Mapa_Tematico_Pilares_Criativos_Caveo.md` — pilares Oferta/
  Funcionalidades
- `docs/personas_medico.md` — buscas reais citadas por persona (Larissa,
  Diego, Rafael, Camila)
- `docs/business-plan-midia-paga-tam-sam-som.md` — contexto de CAC
  real/teórico por canal
