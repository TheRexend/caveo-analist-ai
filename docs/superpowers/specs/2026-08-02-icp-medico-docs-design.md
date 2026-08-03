# Design — Docs Estratégicos + Agente Criativos (Médico único) — sub-projeto 4/4

> Data: 2026-08-02 · Último sub-projeto da reformulação de ICP da Caveo
> (RF/MM → Formando/Médico/Revalida, virada em 2026-07-31). Depende dos
> sub-projetos 1-3 (fundação, camada agêntica, dashboard), já mergeados em
> `origin/main`. Deferido desde o sub-projeto 2 porque tem alto acoplamento de
> conteúdo de negócio — não é find-replace mecânico, é reescrita editorial.

## 1. Contexto e problema

`.claude/agents/criativos.md` é o único agente que restou 100% RF/MM (identidade,
fontes de conhecimento, regras). Os docs estratégicos que ele consome —
personas, dores/desejos, estudos de Google Ads, testes de LP — também foram
todos escritos em torno da dicotomia Recém-Formado × Médico Maduro, que deixou
de existir como eixo de segmentação de mídia (mídia paga agora mira 100%
Médico; recência de formatura virou atributo informativo).

Durante a exploração de contexto surgiu um achado relevante: existe um arquivo
novo, `docs/Mapa_Tematico_Pilares_Criativos_Caveo.md`, não rastreado no git —
spec de pilares de criativo (Oferta × Funcionalidades) derivado de uma reunião
real com o cliente em 23/07/2026, já 100% na estratégia de audiência única de
médicos. E durante o brainstorm o usuário forneceu a transcrição completa de
uma segunda reunião — "Alinhamento Oferta e Produto Boomer" (30/07/2026), que é
literalmente a sessão de validação ao vivo desse mesmo mapa temático. Os dois
documentos entram no escopo deste sub-projeto como insumo primário, não só os
docs antigos de RF/MM.

## 2. Decisões de negócio fechadas com o usuário

- **Personas:** um documento único (`docs/personas_medico.md`), mas **mantendo
  as 4 personas específicas já existentes** (Larissa, Diego, Rafael, Camila)
  com suas falas/dores/gatilhos — só reorganizadas por **estágio de carreira**
  em vez do eixo RF×MM. Rejeitado: colapsar num arquétipo genérico único (perde
  a especificidade que hoje faz a copy converter).
- **Dores/desejos:** mesma lógica — fundir `Dores_Desejos_Publicos_Caveo.md`
  num documento único, preservando os mapas de dor em camadas (D1-D6) por
  estágio, sem a moldura comparativa RF×MM.
- **Docs de Ad Groups reais** (`Google_Ads_AdGroups_RF_Captura_Caveo.md`,
  `Google_Ads_AdGroups_MM_Captura_Caveo.md`) — **arquivados, não reescritos**.
  São blueprint de conta real (públicos/campanhas já montadas); a conta pode
  ter mudado o suficiente que vale relevantar do zero numa sessão dedicada de
  mídia paga, fora deste sub-projeto de docs.
- **Outros 5 docs de Google Ads** (Segmentos, Segmentos Personalizados, Demand
  Gen, Demand Gen Anúncios, Search CNPJ) — leitura completa (não só o
  cabeçalho) revelou que não são conteúdo editorial parecido com
  persona/dores-desejos: são **arquitetura de campanha inteira** construída em
  cima de dois públicos concorrendo por orçamento/segmento (`CS-RF-*` vs
  `CS-MM-*`, 2 conjuntos de campanha, faixa etária e geo diferentes por
  segmento, um alerta explícito de que o orçamento compartilhado "drena verba
  pro RF e sufoca o MM"). Redesenhar isso pra um público único é trabalho de
  estratégia de mídia paga (dados de conta atualizados, decisão de
  campanha/orçamento), não reescrita editorial de doc. **Decisão revista:
  arquivados**, mesmo tratamento do AdGroups.
- **Docs de LP** (`LP_Caveo_Medico_Maduro_Conteudo.md`,
  `LP_Teste_AB_Copy_Medico_Maduro_Caveo.md`, `Hero_Variacoes_Copy_LP_Caveo.md`)
  — são a copy e o desenho de um teste A/B pra `lp2.caveo.com.br`
  especificamente qualificada pro perfil "Médico Maduro". **Arquivados**, não
  reescritos — o teste pode estar obsoleto do jeito que está desenhado; LP fica
  pra uma sessão dedicada depois.
- **Convenção de arquivamento:** mover pra `docs/archive/`, sem editar o
  conteúdo nem adicionar nota de topo.
- **Transcrição do alinhamento (30/07):** (a) salva como doc de referência
  versionado; (b) usada pra atualizar o `Mapa_Tematico_Pilares_Criativos_Caveo.md`
  com os refinamentos; (c) usada pra incorporar dores/objeções na dores-desejos
  unificada; (d) usada pra escrever uma seção nova de guia de execução criativa
  no `criativos.md`.
- **`docs/projeto-mapa.md`** — atualizado agora, como parte deste sub-projeto
  (fecha o papel de "guardião de organização" junto com o resto).
- **`docs/data-catalog.md`** — sem mudança. A referência a `LeadSource` picklist
  "LP MM" é valor real e existente do Salesforce, não rótulo de negócio — o
  campo continua se chamando isso no CRM até uma mudança de admin lá, fora de
  escopo.

## 3. Abordagem escolhida

**Preservar especificidade, trocar o eixo de organização.** RF×MM deixou de ser
eixo de *targeting de mídia*, mas as diferenças reais de comportamento entre
"alguém que ainda não fatura" e "alguém que já fatura R$30k/mês com contador
antigo" continuam existindo — só não são mais usadas pra separar campanhas. Por
isso, em vez de apagar a diferenciação (o que produziria personas/dores-desejos
genéricas e menos úteis pra copy), a reescrita troca o cabeçalho de organização
de "Público 1: Recém-Formados / Público 2: Médicos Maduros" para algo como
"estágio de carreira dentro do público Médico único", preservando texto,
falas reais, gatilhos e a estrutura de camadas (dor superficial → profunda →
fala → consequência → o que a Caveo endereça) que já existe e é validada.

Alternativa descartada: colapsar tudo num arquétipo/dor genérica só. Rejeitada
porque a nota de integridade do próprio doc de dores/desejos já avisa que
generalizar demais é o oposto do que converte — o comparativo do doc mostra
gatilhos, objeções e formatos de criativo bem diferentes entre "sair na frente"
(quem está começando) e "parar de perder dinheiro" (quem já fatura bem), e essa
diferença é editorial, não uma tag de campanha.

## 4. Mudanças por arquivo

### `docs/personas_medico.md` (novo — substitui os 2 antigos)

Mantém as 4 personas (Larissa Ferreira, Diego Moraes, Rafael Mendes, Camila
Prado) com dados pessoais, biografia, mapa de empatia, dores, ganhos, objeções,
gatilhos, desejos e canais — conteúdo já validado, sem reescrever do zero.
Muda:
- Título e intro: "Personas — Público Médico" (não mais "Público Faculdade" /
  "Público Médico Maduro" como dois docs separados).
- Estrutura em 2 blocos por **estágio de carreira** (ex.: "Começando a carreira"
  = Larissa + Diego; "Carreira consolidada" = Rafael + Camila) em vez de
  "RF" / "MM" como rótulo de segmento de mídia.
- As duas tabelas comparativas internas (uma por antigo doc) e a lógica de
  "Tensões estratégicas do segmento" (hoje só no doc de MM) — consolidadas
  numa única seção de comparativo entre os 4 estágios, no fim do doc.
- Nenhuma fala, dado pessoal, dor, gatilho ou objeção é reescrita — só a
  moldura/cabeçalho de organização muda.

### `docs/Dores_Desejos_Publicos_Caveo.md` (editado in-place)

Mantém os mapas de dor em camadas D1-D6 de cada público, a seção "Verdades
transversais" (já é segmento-agnóstica, sem mudança) e o formato de Job To Be
Done. Muda:
- Título/escopo: "os dois públicos centrais" → "o público Médico, ao longo do
  estágio de carreira".
- Seção "Comparativo rápido — RF × MM" → reframe sem rótulo RF/MM.
- Seção final "Implicações para mídia e mensagem" — hoje tem duas entradas
  literais "RF: lidere com..." / "MM: lidere com..."; reescrever por estágio de
  carreira, sem o rótulo de segmento de mídia (o conteúdo tático continua
  válido, é só a moldura RF/MM que sai).
- **Novo conteúdo da transcrição de 30/07**, incorporado nos pontos certos:
  - Objeção "vou esperar a residência pra decidir" / "vou fechar com o
    contador do meu pai" (concorrente informal identificado na call) — entra
    nas objeções do estágio "começando a carreira", junto com o mecanismo real
    de contra-objeção: **Plano de Residência** (isenção de mensalidade por 12
    meses pra quem passa na residência, cobrando só no mês que o médico
    fatura).
  - Para quem já atua: "falta de clareza da vida, da rotina, dos recebimentos,
    dos tributos" e medo de "ficar pra trás" por não ter PJ — reforça e
    detalha o D3 existente ("Não tenho clareza dos meus números").
  - Nuance sobre contador genérico: **dois modos de falha distintos** — erro
    técnico (CNAE/tributo aplicado errado) vs. falta de entendimento de
    rotina (o contador não entende a dinâmica de plantão/hospital) — reforça o
    D2 existente com essa distinção mais precisa.

### 5 docs de Google Ads — arquivados (revisão pós-leitura completa)

`Google_Ads_Segmentos_Caveo.md`, `Google_Ads_Segmentos_Personalizados_Caveo.md`,
`Google_Ads_Demand_Gen_Caveo.md`, `Google_Ads_Demand_Gen_Anuncios_Caveo.md`,
`Google_Ads_Search_CNPJ_Caveo.md` — a leitura completa (feita na etapa de
plano, não na de design) mostrou que são arquitetura de campanha real (nomes de
segmento `CS-RF-*`/`CS-MM-*`, conjuntos de anúncio por público, orçamento
competindo entre RF e MM, faixa etária/geo por segmento), não conteúdo
editorial fundível como persona/dores-desejos. Redesenhar isso pra audiência
única de Médico é decisão de estratégia de mídia paga com dados de conta
atuais — fora do escopo deste sub-projeto de docs. **Movidos pra
`docs/archive/` sem edição**, mesmo tratamento do AdGroups.

### `docs/Mapa_Tematico_Pilares_Criativos_Caveo.md` (commitado + atualizado)

Hoje não rastreado no git — primeiro passo é commitar como está. Depois,
incorporar da transcrição de 30/07:
- **Tema novo no Pilar Oferta: "Plano de Residência"** — isenção de mensalidade
  por 12 meses pra quem passa na residência (cobra só no mês que fatura);
  ângulo central: ataca direto a objeção #1 de não-fechamento
  ("esperar a formatura/residência", "contador do pai"); dor/desejo: medo de
  perder oportunidade de plantão por CNPJ suspenso durante a residência.
- **Refina o tema "Contador genérico erra com médico"**: acrescentar a
  distinção de dois modos de falha (erro técnico de CNAE/tributo vs. falta de
  entendimento de rotina) como duas variações de ângulo dentro do mesmo tema.
- **Refina o tema "Documentos na palma da mão"**: acrescentar a camada de que a
  Caveo também **atualiza** os documentos proativamente pro médico (não só
  guarda/organiza).
- **Nova seção de guardrails de execução** (vale também de insumo direto pro
  `criativos.md`): preferir estático antes de vídeo; evitar tom de "anúncio
  financeiro" genérico (gera desconfiança, "pé atrás"); formato validado de
  comparação cronológica (tempo de mensagem pro contador vs. tempo de emitir
  na Caveo); preferir testemunho de médico real a ator/tom de anúncio
  institucional genérico.

### `docs/Transcricao_Alinhamento_Produto_Boomer_2026-07-30.md` (novo)

Transcrição da call, com a codificação corrompida (mojibake UTF-8/Latin-1: "Ã©"
→ "é", "nÃ£o" → "não" etc.) corrigida. Escrito diretamente pelo orquestrador
(não delegado a subagente de implementação) — é transcrição fiel de uma fonte
que só existe no contexto desta conversa, sem risco de o texto ser
reinterpretado ou resumido incorretamente por um implementador que não viu o
original. Citado como fonte primária nos docs acima que incorporam seu
conteúdo.

### `.claude/agents/criativos.md` (reescrito)

- Identidade e papel: "Recém-Formados (RF) e Médicos Maduros (MM)" → público
  Médico único, com estágio de carreira como nuance interna, não como duas
  audiências.
- Tabela de fontes de conhecimento: `docs/personas_recem_formados.md` +
  `docs/personas_medico_maduro.md` → `docs/personas_medico.md`; remove
  `docs/Hero_Variacoes_Copy_LP_Caveo.md` (arquivado, não é mais fonte viva);
  adiciona `docs/Mapa_Tematico_Pilares_Criativos_Caveo.md` e
  `docs/Transcricao_Alinhamento_Produto_Boomer_2026-07-30.md` à tabela.
- Regra "nunca quebram" #4 ("RF e MM têm dores diferentes — nunca usar a mesma
  copy pra ambos sem adaptar") → adaptada pra "estágios de carreira diferentes
  têm dores diferentes dentro do mesmo público Médico — adaptar o ângulo ao
  estágio, sem tratar como duas audiências".
- **Nova seção: Guia de execução criativa**, com o conteúdo da transcrição
  (estático antes de vídeo; evitar tom de anúncio financeiro genérico;
  comparação cronológica; testemunho real).

### `docs/projeto-mapa.md` (atualizado)

Hoje descreve uma reformulação anterior (2026-07-16, 6 sub-projetos) que já
está implementada e não reflete a virada de ICP atual. Atualiza:
- Tabela de status: os 4 sub-projetos da reformulação de ICP (fundação ✅,
  camada agêntica ✅, dashboard ✅, docs estratégicos — este).
- Índice de docs estratégicos em `docs/`: lista os docs vigentes (personas,
  dores-desejos, Mapa_Tematico, a transcrição) e menciona `docs/archive/`
  (12 arquivos) como histórico pré-virada, incluindo os 7 de mídia paga/LP que
  aguardam releitura dedicada.

### Arquivamento (`docs/archive/`, criado nesta tarefa)

Move sem editar conteúdo, 12 arquivos: `personas_recem_formados.md`,
`personas_medico_maduro.md`, `Google_Ads_AdGroups_RF_Captura_Caveo.md`,
`Google_Ads_AdGroups_MM_Captura_Caveo.md`, `Google_Ads_Segmentos_Caveo.md`,
`Google_Ads_Segmentos_Personalizados_Caveo.md`, `Google_Ads_Demand_Gen_Caveo.md`,
`Google_Ads_Demand_Gen_Anuncios_Caveo.md`, `Google_Ads_Search_CNPJ_Caveo.md`,
`LP_Caveo_Medico_Maduro_Conteudo.md`, `LP_Teste_AB_Copy_Medico_Maduro_Caveo.md`,
`Hero_Variacoes_Copy_LP_Caveo.md`.

### Housekeeping

`docs/superpowers/plans/2026-07-31-icp-medico-fundacao.md` está órfão no
working tree de `main` (não rastreado, nunca commitado em nenhum branch,
confirmado via `git log --all`). Verificar se é idêntico a algum plano já
commitado em outro branch/worktree do sub-projeto 1; se for lixo remanescente
sem valor histórico, remover.

## 5. O que NÃO muda

`docs/fundacao-dados.md` (já regenerado no sub-projeto 1, incluindo a nota
histórica sobre a virada — está correto como está). `docs/data-catalog.md`
(campo `LeadSource` documenta valor real do Salesforce). Qualquer doc fora do
escopo de personas/dores-desejos/Google Ads/LP/criativos (ex.: matriz de
poder-interesse, specs de fundação/skills/dashboard já entregues).

## 6. Testes / verificação

Não há suíte automatizada pra conteúdo markdown. Verificação por tarefa:
1. Grep por resíduo de "RF"/"MM"/"recém-formado"/"médico maduro" fora de
   contexto histórico explícito (ex.: "até a virada de ICP (2026-07-31)...") —
   deve dar zero.
2. Toda referência cruzada entre docs (ex.: `criativos.md` → `personas_medico.md`)
   aponta pra um arquivo que de fato existe no caminho citado.
3. Revisão de fidelidade ao material-fonte: nenhuma fala, dado pessoal, dor,
   gatilho ou objeção das 4 personas/dos mapas D1-D6 foi alterada ou inventada
   — só a moldura de organização mudou. Conteúdo novo (Plano de Residência,
   nuances de contador, guia de execução criativa) é rastreável de volta à
   transcrição de 30/07 ou ao Mapa_Tematico original.
4. `docs/archive/` contém exatamente os 12 arquivos listados, sem alteração de
   conteúdo em relação ao commit anterior (`git diff` vazio além do rename).

## 7. Ressalvas conhecidas

- Os 7 docs de mídia paga/LP (5 de Google Ads + 2 de LP, além dos 2 AdGroups)
  ficam arquivados sem substituto — mídia paga/LP para o público Médico único
  precisará de uma releitura dedicada da conta/página real, com dados
  atualizados, fora do escopo deste sub-projeto.
- A seção "Implicações para mídia e mensagem" dos dores-desejos, ao perder o
  rótulo RF/MM, precisa de cuidado editorial pra não virar genérica — a tarefa
  de implementação deve preservar a diferenciação tática por estágio de
  carreira, só sem o rótulo de segmento de mídia.
