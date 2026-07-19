# Fundação de Dados — Design

> Subprojeto 1 de 5 da reformulação do Caveo Analyst AI (ver "Decomposição" abaixo).
> Data: 2026-07-16

## Contexto

O projeto atual (agente `analista-midia-paga-crm`, skills `planilha-resultados`,
`reporte-resultados-ka`, `reporte-semanal-caveo`, `conversoes-oportunidade`, e o
dashboard Next.js) reimplementa as mesmas regras de negócio — mapeamento
UTM→canal, agrupamento de estágios do Salesforce, segmentação de contratante —
em pelo menos 4 lugares diferentes, com pequenas divergências de sintaxe entre
eles (`LIKE 'facebook%'` vs `IN ('facebook', 'Instagram_Feed', ...)` vs
`LIKE '%facebook%'`). O dashboard, além disso, tem uma lógica de atribuição por
"cruzamento" (click ID) que as skills desconhecem totalmente.

Esta reformulação decompõe o projeto em 5 subprojetos independentes:

1. **Fundação de dados** ← este documento
2. Sistema de agentes + orquestrador (inclui o novo "agente guardião de
   organização", que é o mesmo orquestrador — ver Nota de Escopo Futuro)
3. Dashboard (expansão com GA4, revisão de arquitetura)
4. Skills operacionais (reescritas sobre a fundação nova)
5. Novos MCPs (GA4 e outros)

## Objetivo

Criar uma fonte única de verdade para as regras de negócio de atribuição
(canal, estágio, contratante), consumível de forma **desacoplada** pelo
dashboard (TypeScript) e pela camada agêntica (skills/agente em Markdown) —
sem que uma dependa da outra em tempo de execução. O dashboard deve continuar
funcionando de forma isolada; skills/agente não devem chamar a API do
dashboard para obter essas regras.

## Escopo

Incluído:
- Mapeamento UTM→canal (Meta / Google / Não Digital / Sem UTM)
- Lógica de "cruzamento" por click ID (hoje exclusiva do dashboard)
- Agrupamento de estágios do Salesforce (em tratamento, proposta, ganho,
  perdido)
- Segmentação de contratante (RF/MM) — com a correção de nomenclatura abaixo
- Catálogo de campos disponíveis nas MCPs (Salesforce, Meta, Google)

Fora de escopo (fica para os subprojetos 2–5):
- Gestão de credenciais/secrets
- Contrato de API formal entre sistemas
- Qualquer mudança no dashboard além de importar a nova fonte de regras

## Correção de negócio — Contratante (TipCte__c)

A regra de segmentação RF/MM mudou e precisa ser corrigida na fundação
(o filtro atual do dashboard está desatualizado):

| Grupo | Valores de `TipCte__c` |
|---|---|
| **RF — Recém Formados** | `Formando`, `Médico Faculdades` |
| **MM — Médico Maduro** | `Médico`, `Revalida` |

Mudança importante: o valor `Médico` **inverte de grupo** — antes contava
como RF, agora conta como MM. O valor antigo `Médicos Maduros` (usado hoje
pelo dashboard) foi substituído e não precisa mais ser considerado nos
filtros (confirmado: não há necessidade de manter compatibilidade com
registros históricos que usem esse valor).

## Regra das duas datas e coorte de fechamento

**Regra (já existe parcialmente no dashboard, formalizada aqui para toda a
camada agêntica também saber):** métricas de entrada do funil (`no_crm`,
`em_tratamento`, `proposta`) contam por `CreatedDate` da oportunidade dentro
do período. Métricas de fechamento (`ganho`, `perdido`) contam por
`LastStageChangeDate` dentro do período — **mesmo que a oportunidade tenha
sido criada em um período anterior**. Uma oportunidade criada em junho e
fechada em julho conta como captação de junho e fechamento de julho,
simultaneamente, em relatórios diferentes.

**Coorte de fechamento (novo):** para o volume de Fechado Ganho de um
período, quebrar por mês de origem da captação (`CreatedDate`), para deixar
visível que parte do fechamento de julho veio de captações de meses
anteriores. Escopo: apenas Ganho (Fechado + Ganho não Identificado) —
Perdido fica de fora por agora.

```ts
export const DATE_MODEL = {
  entryDateField: "CreatedDate",       // no_crm, em_tratamento, proposta
  closeDateField: "LastStageChangeDate", // ganho, perdido
  description:
    "Entrada do funil conta pela data de criação; fechamento/perda conta " +
    "pela data da última mudança de estágio, mesmo que a oportunidade " +
    "tenha sido criada em período anterior.",
};

export const COHORT_RULES = {
  scope: "ganho", // Fechado + Ganho não Identificado — não inclui Perdido
  originField: "CreatedDate",      // mês de captação de origem
  closeField: "LastStageChangeDate", // período de referência (mês do fechamento)
  bucketing:
    "mês civil (YYYY-MM) do CreatedDate, calculado client-side a partir de " +
    "DAY_ONLY(convertTimezone(CreatedDate)) — evita o problema de fuso do " +
    "CALENDAR_MONTH/YEAR nativo do SOQL (avaliam em UTC; ver memória de fuso horário SOQL)",
};
```

Padrão de query (reaproveita o padrão já usado em `sfDaily`):

```sql
SELECT DAY_ONLY(convertTimezone(CreatedDate)) d, COUNT(Id) cnt
FROM Opportunity
WHERE (IsWon = true OR StageName = 'Ganho não Identificado')
  AND LastStageChangeDate >= [PERIODO_INICIO] AND LastStageChangeDate <= [PERIODO_FIM]
  -- + filtros de canal/contratante da fundação
GROUP BY DAY_ONLY(convertTimezone(CreatedDate))
```

O resultado (por dia) é agregado em buckets de mês (`YYYY-MM`) fora do SOQL.
Shape de saída sugerido:

```ts
interface FechamentoCoorte {
  mesReferencia: string;                        // mês do fechamento, ex: "2026-07"
  origem: { mes: string; qtd: number }[];        // ex: [{mes:"2026-07", qtd:25}, {mes:"2026-06", qtd:10}, ...]
}
```

**Onde isso é implementado:** a regra e o formato de dado são definidos aqui
(fundação); a **implementação** — o componente visual no dashboard e a
inclusão nos relatórios das skills (`reporte-semanal-caveo`,
`planilha-resultados`) — é trabalho dos subprojetos #3 (Dashboard) e #4
(Skills operacionais), não deste subprojeto. Isso segue o mesmo padrão das
outras regras (canal, estágio, contratante): a fundação define, os
consumidores implementam.

## Arquitetura

```
config/
  business-rules.ts       ← fonte única, TypeScript tipado
  generate-docs.ts        ← gera docs/fundacao-dados.md a partir do acima
docs/
  fundacao-dados.md        ← GERADO — não editar à mão
  data-catalog.md          ← catálogo de campos MCP — mantido manualmente
```

Direção do fluxo: **TypeScript → gera → Markdown**, nunca o inverso. Isso
mantém o dashboard isolado (ele nunca lê o `.md`) e evita que a camada
agêntica precise interpretar/executar código TypeScript.

### `config/business-rules.ts`

Seis blocos de constantes tipadas (os 4 originais + `DATE_MODEL` e
`COHORT_RULES`, detalhados na seção "Regra das duas datas e coorte de
fechamento" acima):

```ts
export const CHANNEL_RULES = {
  meta:   { utmSourcePatterns: ["facebook%", "Instagram%", "messenger%", "audience_network%", "{{placement}}"] },
  google: { utmSourcePatterns: ["google%", "Youtube%"] },
  naoDigital: { description: "Todo UtmSou__c preenchido que não bate em meta/google" },
  semUtm: { description: "UtmSou__c = null" },
};

export const CRUZAMENTO_RULES = {
  meta:   { clickIdFields: ["fbc__c", "fbclid__c"] },
  google: { clickIdFields: ["gclid__c", "gbraid__c"], excludeIfMetaClickId: true },
};

export const STAGE_GROUPS = {
  emTratamento: ["Nova", "Contato Realizado", "Aguardando Resposta", "Reunião Agendada", "Standy-By", "Stand By", "Transferido para humano"],
  proposta: ["Proposta Enviada"],
  ganho: { wonClause: "IsWon = true OR StageName = 'Ganho não Identificado'" },
  perdido: ["Perdido"],
};

export const CONTRATANTE_RULES = {
  rf: ["Formando", "Médico Faculdades"],
  mm: ["Médico", "Revalida"],
};
```

O dashboard importa diretamente: `import { CHANNEL_RULES, ... } from "@/config/business-rules"`.

### `config/generate-docs.ts`

Script Node (`npx tsx config/generate-docs.ts` ou `npm run docs:rules`) que lê
`business-rules.ts` e escreve `docs/fundacao-dados.md` com um cabeçalho de
aviso (`<!-- GERADO AUTOMATICAMENTE — não editar. Fonte: config/business-rules.ts -->`)
e uma tabela por bloco de regra.

**Checagem de divergência (`docs:check`)**: script que gera o Markdown em
memória e compara com o arquivo commitado; falha (exit code ≠ 0) se
divergirem. Roda localmente antes de commit — sem CI por enquanto.

### `docs/data-catalog.md`

Não é gerado por código — documenta campos das APIs externas (Salesforce,
Meta, Google), não regras internas. Uma tabela por fonte/objeto, com colunas
`Campo | Tipo | Descrição | Usado hoje?`. A coluna "Usado hoje?" serve como
mapa de possibilidades analíticas (campos disponíveis mas não explorados).

Levantamento inicial via `salesforce_describe` (Salesforce) e documentação
dos campos de `get_insights` (Meta) e `campaign`/`keyword_view` (Google Ads)
já usados nas skills existentes. Mantido manualmente daqui para frente.

## Consumo pela camada agêntica

Cada skill/agente (`analista-midia-paga-crm.md`, `planilha-resultados.md`,
`reporte-resultados-ka.md`, `reporte-semanal-caveo.md`,
`conversoes-oportunidade.md`) passa a ter, no início, uma instrução do tipo:

> "Antes de montar qualquer query SOQL/GAQL, leia `docs/fundacao-dados.md`
> para os mapeamentos vigentes de canal, estágio e contratante — não usar
> listas fixas embutidas neste arquivo."

**As listas de UTM/estágio hoje copiadas dentro de cada skill são removidas**
e substituídas por essa referência. Isso é o que efetivamente elimina a
duplicação — sem migrar as skills existentes, o problema que motivou este
subprojeto continua. A migração das 5 skills/agente faz parte do trabalho
de implementação deste subprojeto (não é um passo opcional/futuro).

## Testes / validação

- `docs:check` (Markdown gerado == Markdown commitado) é a validação
  primária deste subprojeto.
- Validação ao vivo contra picklists reais do Salesforce (via
  `salesforce_describe`) fica fora de escopo por agora — revisitar se
  houver suspeita de nova divergência de nomenclatura (como a do
  `TipCte__c` corrigida aqui).

## Nota de escopo futuro (capturado durante o brainstorming, não faz parte deste subprojeto)

- **Esqueleto completo do projeto**: ao final de todos os 5 subprojetos,
  produzir um documento com a árvore de pastas/arquivos do projeto
  reformulado.
- **Agente orquestrador**: além de rotear para agentes especialistas de
  mídia/dados, também deve manter a organização estrutural do projeto e
  poder consultar outros agentes quando uma mudança de estrutura for
  necessária. É um único agente com as duas responsabilidades (não dois
  agentes separados). A ser detalhado no brainstorming do subprojeto 2.
- **Estratégia de versionamento**: hoje `.gitignore` exclui `docs/`,
  `.claude/`, `.agents/`, `.codex/`, `scripts/` etc. inteiros — só o código
  do dashboard vai para o GitHub. Isso foi intencional, mas o usuário quer
  revisitar essa decisão durante a reformulação (especialmente porque
  `docs/fundacao-dados.md` passa a ser uma dependência real das
  skills/agente, não só documentação de referência). Este documento
  (`config/business-rules.ts`, `docs/fundacao-dados.md`,
  `docs/data-catalog.md`) permanece **não commitado por enquanto**,
  seguindo a convenção atual, até essa decisão ser tomada.
