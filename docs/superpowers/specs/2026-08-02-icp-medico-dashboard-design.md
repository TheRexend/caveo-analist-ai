# Design — Dashboard: 100% Médico + indicador de Formando (sub-projeto 3/4)

> Data: 2026-08-02 · URGENTE — build de produção da Vercel quebrado desde que
> os PRs #5 (fundação) e #6 (camada agêntica) foram mergeados em `main` sem o
> dashboard ter sido atualizado. `tsc` confirma 4 erros em
> `lib/integrations/salesforce.ts` (linhas 131, 244, 305, 373):
> `Argument of type 'Contratante' is not assignable to parameter of type 'ContratanteKey'`.
> Sub-projeto 3 de 4 da reformulação de ICP — depende da fundação
> (`config/business-rules.ts`, já mergeada) e não depende do sub-projeto 2
> (skills Python, também já mergeado, sem sobreposição de arquivos).

## 1. Contexto e problema

`lib/types.ts` ainda define `Contratante = "all" | "rf" | "mm"`, mas
`config/business-rules.ts` já expõe `ContratanteKey = "all" | "formando" |
"medico" | "revalida"`. `lib/integrations/salesforce.ts` importa `Contratante`
e passa direto pra `tipcteFilter()` (que espera `ContratanteKey`) — os dois
tipos divergiram e o TypeScript não compila mais.

Durante o brainstorm, a visão de produto mudou além de uma simples troca de
nomenclatura: o dashboard deixa de ter um filtro de segmento selecionável pelo
usuário. Ele passa a olhar **100% para Médico** por padrão — Formando vira um
indicador informativo à parte, sem entrar na soma principal. Além disso, o
filtro de campanha por mídia paga (Meta/Google) deixa de olhar qualquer tag de
segmento (`[RF]`/`[MM]`) — já que a fundação não tem mais essa tag como regra
de negócio (mídia paga mira 100% Médico, sem necessidade de marcador por
campanha, decisão do sub-projeto 1).

## 2. Decisões de negócio fechadas com o usuário

- **Sem dropdown de segmento na UI.** O seletor "Ambos/Recém-Formado/Médicos
  Maduros" do TopBar é removido por completo — não existe mais escolha de
  segmento pelo usuário.
- **Total principal = só Médico.** KPIs, funil, timeline, coorte, tabela de
  campanhas — tudo isso já vinha do Salesforce filtrado por `contratante`;
  agora esse filtro fica fixo em `"medico"` (a classificação real vem de
  `TipCte__c`, por oportunidade — não é uma tag de campanha).
- **Formando vira indicador à parte, não somado.** Uma busca adicional (mesmo
  período/plataforma) com `contratante = "formando"` alimenta um contador
  simples (oportunidades + fechamentos) mostrado à parte dos números
  principais — não entra em nenhuma soma do funil/KPIs.
- **Mídia paga (Meta/Google): nenhum filtro por tag de campanha.** Investimento,
  impressões e cliques somam 100% das campanhas retornadas pela API — sem
  olhar `[RF]`/`[MM]`/institucional. Isso é uma simplificação real: o
  `Contratante` sai completamente das funções de Meta/Google.
- **Novo toggle "Somente Leads" (Meta), default ligado.** Controla só o filtro
  de objetivo de campanha `[LEADS]` do Meta (que é sobre o TIPO de campanha —
  geração de lead vs. awareness/vídeo — não sobre segmento de público). Ligado
  por padrão (mantém o comportamento atual de só contar campanhas de geração
  de lead); desligado mostra todas as campanhas ativas, sem esse filtro. Google
  não tem um filtro equivalente hoje — nada muda ali além de parar de olhar
  tag de segmento.

## 3. Abordagem escolhida

**Separar por fonte de verdade (Abordagem A).** Salesforce tem classificação
real por oportunidade (`TipCte__c`) — mantém `contratante` como parâmetro,
fixo em `"medico"` pro funil principal e `"formando"` pra busca adicional do
indicador. Mídia paga (Meta/Google) nunca teve uma forma confiável de saber o
segmento no momento do clique — a tag de campanha sempre foi um proxy
imperfeito; agora que mídia paga mira 100% Médico por decisão de negócio, essa
tentativa de proxy é removida e o parâmetro `Contratante` sai inteiramente das
funções de Meta/Google.

Alternativa descartada: manter o parâmetro `Contratante` em `meta.ts`/
`google.ts` só que sempre chamado com `"medico"` (sem removê-lo). Rejeitada —
deixaria parâmetro morto (nunca outro valor é passado) e a lógica de filtro
por tag que o usuário explicitamente pediu pra remover.

## 4. Mudanças por arquivo

### `lib/types.ts`
```ts
/**
 * Segmento real do público, vindo de TipCte__c (ver docs/fundacao-dados.md,
 * seção 4). Só usado no lado Salesforce — mídia paga (Meta/Google) não filtra
 * mais por segmento.
 *  - "medico"   → ICP único de mídia paga (o funil principal do dashboard)
 *  - "formando" → indicador à parte (oportunidades/fechamentos fora do funil
 *                 principal), nunca somado aos números de "medico"
 */
export type Contratante = "formando" | "medico";
```
Novo campo em `DashboardPayload`:
```ts
/** Indicador à parte — oportunidades/fechamentos Formando, fora da soma do funil principal (que é só Médico). */
formandoAside?: { oport: number; ganho: number };
```

### `lib/integrations/salesforce.ts`
Nenhuma mudança estrutural — só os 3 valores-padrão `= "all"` (em `sfFunnel`,
`sfDaily`, `sfCohort`) viram `= "medico"`, já que `"all"` não existe mais no
tipo. `sfOpportunities` já não tinha valor-padrão. Todas as chamadas reais
(seção seguinte) já passam o valor explícito de qualquer forma.

### `lib/integrations/meta.ts`
Remove o import de `Contratante` e a função `leadsFilter(contratante)`.
Substitui por um filtro fixo com toggle:
```ts
function leadsFilter(apenasLeads: boolean): string {
  const conds: Array<{ field: string; operator: string; value: string }> = [];
  if (apenasLeads) conds.push({ field: "campaign.name", operator: "CONTAIN", value: "[LEADS]" });
  return JSON.stringify(conds);
}
```
`metaInsights`/`metaInsightsDaily` trocam o parâmetro `contratante: Contratante = "all"`
por `apenasLeads: boolean = true`; a chave de cache troca `${contratante}` por
`${apenasLeads}`.

### `lib/integrations/google.ts`
Remove o import de `Contratante` e a função `matchesContratante`. Remove os
`.filter((r) => matchesContratante(...))` em `googleCampaignsUncached`/
`googleDailyUncached` — soma tudo que a query GAQL já retorna (`cost_micros >
0`, sem filtro de nome). `googleCampaigns`/`googleDaily` perdem o parâmetro
`contratante` inteiramente; a chave de cache perde `${contratante}`.

### `app/api/dashboard/route.ts`
- Remove a leitura de `contratante` de `searchParams`.
- Adiciona `const apenasLeads = sp.get("apenasLeads") !== "0";` (default
  ligado, mesmo padrão do `includeCruzamento`).
- Adiciona `const CONTRATANTE_PRINCIPAL: Contratante = "medico";`, usado nas
  6 chamadas que hoje passam `contratante` (`sf`, `sfPrevF`, `sfD`, `sfCoh`,
  `sfMeta`, `sfGoogle`).
- As 3 chamadas a `metaInsights`/`metaInsightsDaily` passam `apenasLeads` em
  vez de `contratante`; as 3 chamadas a `googleCampaigns`/`googleDaily` não
  passam mais esse argumento.
- Nova busca paralela: `sfFunnel(dateFrom, dateTo, platform, "formando", fresh, includeCruzamento)`.
  Calcula `formandoAside = { oport: no_crm+em_tratamento+proposta, ganho }` a
  partir do resultado (ou `undefined` se a busca falhar) e inclui no `out`.

### `app/api/opportunities/route.ts`
Remove a leitura de `contratante` de `searchParams`; usa `const contratante:
Contratante = "medico";` fixo (o drill-down sempre lista oportunidades do
funil principal, que é só Médico).

### `lib/api-client.ts`
- `fetchDashboardAll`: troca o parâmetro `contratante: Contratante` por
  `apenasLeads: boolean`; monta a query string sem `contratante`, e adiciona
  `if (!apenasLeads) qs.set("apenasLeads", "0");` (mesmo padrão do
  `cruzamento`).
- `fetchOpportunities`: remove o parâmetro `contratante` inteiramente (o
  servidor já fixa `"medico"`).

### `components/top-bar.tsx`
Remove `CONTRATANTE_OPTS`, as props `contratante`/`onContratante`, o bloco
`<FilterDropdown<Contratante>>` e o import agora não usado do ícone `Users`.
Adiciona as props `apenasLeads`/`onApenasLeads` e um novo toggle (mesmo
componente `<label className="toggle...">` do Cruzamento), rotulado "Somente
Leads".

### `components/dashboard.tsx`
- Remove `useState<Contratante>("all")` e o import de `Contratante`.
- Adiciona `useState(true)` para `apenasLeads`, mais um novo state pro
  indicador: `useState<{ oport: number; ganho: number } | null>(null)` para
  `formandoAside`, atualizado no handler de fetch (`setFormandoAside(d.formandoAside ?? null)`).
- `TopBar`: troca `contratante`/`onContratante` por `apenasLeads`/
  `onApenasLeads`.
- `fetchDashboardAll`/`fetchOpportunities`: trocam `contratante` por
  `apenasLeads` (só na primeira — a segunda não leva mais esse argumento) nas
  chamadas e nos arrays de dependência dos dois `useEffect`.
- Remove `contratante={contratante}` de `<OpportunitiesChart>`.
- Novo badge informativo na área do cabeçalho da seção "Visão geral"
  (`section-head`), exibido só quando `formandoAside` tem algum valor > 0:
  `Formando: {oport} oportunidades · {ganho} fechamentos (fora do funil
  principal)`.

### `components/opportunities-chart.tsx`
Remove o import de `Contratante`, o `CONTRATANTE_LABEL` e a prop
`contratante` — o subtítulo do gráfico deixa de mencionar segmento (fica
implícito que é sempre Médico).

## 5. O que NÃO muda

`lib/mock.ts` (não referencia `Contratante`), `app/api/ga4/*`, GA4 e qualquer
outra aba/rota fora do fluxo de mídia+funil. `cruzamento` (click ID) continua
funcionando exatamente como hoje — é uma dimensão ortogonal (como o lead foi
atribuído), não relacionada a segmento de público.

## 6. Testes / verificação

Não há suíte de testes automatizada para o dashboard hoje (só
`config/business-rules.test.ts`, inalterado). Verificação:
1. `npx tsc --noEmit` — zero erros.
2. `npm run build` — build de produção completo (Next.js) sem falhas.
3. Verificação manual no navegador: dashboard carrega, TopBar sem dropdown de
   segmento, toggle "Somente Leads" funciona, badge de Formando aparece
   quando há dado, funil/KPIs batem com escopo Médico.

## 7. Ressalvas conhecidas

- **Sem teste automatizado do dashboard** — a verificação é manual +
  compilação. Não é uma lacuna introduzida por este sub-projeto (já era assim
  antes).
- **Google não tem filtro `[LEADS]` equivalente hoje** — o toggle "Somente
  Leads" só afeta a filtragem via Meta; Google já soma todas as campanhas com
  `cost_micros > 0`, sem seleção por objetivo. Se o cliente quiser o mesmo
  controle para Google no futuro, é um item separado (não há convenção de
  nome de campanha equivalente hoje).
- **`formandoAside` é uma soma simples do período**, sem comparação com
  período anterior (ao contrário de `metrics`/`metricsPrev`) — por decisão de
  manter o indicador simples ("apenas indicar").
