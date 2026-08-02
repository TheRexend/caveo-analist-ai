# Dashboard: 100% Médico + indicador de Formando — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir o build de produção quebrado (tipo `Contratante` desatualizado) e, na mesma passada, remover o filtro de segmento da UI — o dashboard passa a olhar 100% para Médico, com Formando como indicador à parte, e mídia paga (Meta/Google) para de filtrar por tag de campanha.

**Architecture:** Bottom-up por dependência — tipos primeiro (`lib/types.ts`), depois as integrações (`salesforce.ts`/`meta.ts`/`google.ts`), depois as rotas de API, depois o client-side (`api-client.ts` → componentes). Sem suíte de testes automatizada para o dashboard — a verificação é `tsc --noEmit` (incremental, por task) + `npm run build` no final + checagem manual no navegador.

**Tech Stack:** Next.js (App Router), TypeScript, React.

## Global Constraints

- `Contratante` = `"formando" | "medico"` — sem `"all"` (nada mais usa).
- Sem dropdown de segmento na UI — nenhum lugar do dashboard deixa o usuário escolher segmento.
- Funil principal (KPIs, funil, timeline, coorte, campanhas) sempre com `contratante = "medico"` fixo no servidor.
- Formando é uma busca adicional, só oportunidades+fechamentos, nunca somada ao funil principal.
- Meta/Google (mídia paga) não filtram mais por tag de campanha de segmento (`[RF]`/`[MM]`/institucional) — somam 100% do que a API retornar.
- Novo toggle "Somente Leads" (só Meta) controla o filtro `[LEADS]` (objetivo de campanha, não segmento) — default ligado.
- Spec de referência: `docs/superpowers/specs/2026-08-02-icp-medico-dashboard-design.md`.

---

### Task 1: `lib/types.ts` — tipo `Contratante` e novo campo do payload

**Files:**
- Modify: `lib/types.ts:1-12` (tipo `Contratante`), `lib/types.ts:120-133` (`DashboardPayload`)

**Interfaces:**
- Produces: `export type Contratante = "formando" | "medico";`; `DashboardPayload.formandoAside?: { oport: number; ganho: number }`.
- Consumes: nada (primeira task).

- [ ] **Step 1: Reescrever o tipo `Contratante`**

Trocar (linhas 5-12):

```ts
/**
 * Segmento de público. O segmento vem de TipCte__c; a recência do médico, de
 * Tempo_de_Formado__c. Ver docs/fundacao-dados.md (seção 4).
 *  - "all" → Ambos (RF + MM)
 *  - "rf"  → Recém-Formado (Formando, ou Médico com recência recente)
 *  - "mm"  → Médico Maduro (Revalida, ou Médico maduro / sem recência)
 */
export type Contratante = "all" | "rf" | "mm";
```

por:

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

- [ ] **Step 2: Adicionar `formandoAside` em `DashboardPayload`**

Trocar:

```ts
/** Payload consolidado do endpoint /api/dashboard (uma resposta = todo o dashboard). */
export interface DashboardPayload {
  metrics: Metrics;
  metricsPrev: Metrics;
  funnel: FunnelData;
  timeline: TimelineDay[];
  dailyFunnel: DailyFunnelPoint[];
  campaigns: Campaign[];
  /** Coorte de fechamento (fechados no período por mês de origem). */
  cohort?: CohortPoint[];
  /** Presente apenas quando platform === "all". */
  platformCompare?: PlatformCompareData;
  _mock: boolean;
}
```

por:

```ts
/** Payload consolidado do endpoint /api/dashboard (uma resposta = todo o dashboard). */
export interface DashboardPayload {
  metrics: Metrics;
  metricsPrev: Metrics;
  funnel: FunnelData;
  timeline: TimelineDay[];
  dailyFunnel: DailyFunnelPoint[];
  campaigns: Campaign[];
  /** Coorte de fechamento (fechados no período por mês de origem). */
  cohort?: CohortPoint[];
  /** Presente apenas quando platform === "all". */
  platformCompare?: PlatformCompareData;
  /** Indicador à parte — oportunidades/fechamentos Formando, fora da soma do funil principal (que é só Médico). */
  formandoAside?: { oport: number; ganho: number };
  _mock: boolean;
}
```

- [ ] **Step 3: Rodar `tsc` e confirmar que os erros mudam de arquivo**

Run: `npx tsc --noEmit`
Expected: os 4 erros antigos em `lib/integrations/salesforce.ts` (linhas 131, 244, 305, 373 — `"rf"`/`"mm"` não existem mais) continuam, mas agora por causa do **valor padrão** `= "all"` nas funções (`sfFunnel`, `sfDaily`, `sfCohort`), não mais por `tipcteFilter`. Além disso, novos erros devem aparecer em `lib/integrations/meta.ts`, `google.ts`, `components/top-bar.tsx`, `components/opportunities-chart.tsx` (comparações com `"rf"`/`"mm"` que não existem mais no tipo). Isso é esperado — as próximas tasks resolvem cada um.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts
git commit -m "feat(dashboard): Contratante vira formando/medico, adiciona formandoAside ao payload"
```

---

### Task 2: `lib/integrations/salesforce.ts` — valores-padrão

**Files:**
- Modify: `lib/integrations/salesforce.ts:113,225,286`

**Interfaces:**
- Consumes de Task 1: `Contratante = "formando" | "medico"`.
- Produces: nenhuma mudança de assinatura pública (só o valor-padrão do parâmetro opcional `contratante`).

- [ ] **Step 1: Trocar os 3 valores-padrão `"all"` por `"medico"`**

Em `sfFunnel` (linha 113), `sfDaily` (linha 225) e `sfCohort` (linha 286), a assinatura pública tem a linha:

```ts
  contratante: Contratante = "all",
```

Trocar as 3 ocorrências por:

```ts
  contratante: Contratante = "medico",
```

(`sfOpportunities` já não tem valor-padrão — não precisa mudar.)

- [ ] **Step 2: Rodar `tsc` e confirmar que este arquivo não tem mais erro**

Run: `npx tsc --noEmit 2>&1 | grep salesforce.ts`
Expected: nenhuma saída (arquivo limpo). Os erros em `meta.ts`/`google.ts`/componentes continuam — resolvidos nas próximas tasks.

- [ ] **Step 3: Commit**

```bash
git add lib/integrations/salesforce.ts
git commit -m "fix(dashboard): salesforce.ts — valor-padrão de contratante vira medico"
```

---

### Task 3: `lib/integrations/meta.ts` — remove filtro de segmento, adiciona toggle `apenasLeads`

**Files:**
- Modify: `lib/integrations/meta.ts:5,70-100`

**Interfaces:**
- Consumes de Task 1: nada diretamente (este arquivo para de usar `Contratante`).
- Produces: `metaInsights(dateFrom, dateTo, apenasLeads = true, fresh = false)`; `metaInsightsDaily(dateFrom, dateTo, apenasLeads = true, fresh = false)`.

- [ ] **Step 1: Atualizar o import**

Trocar (linha 5):

```ts
import type { Contratante, DaySource } from "@/lib/types";
```

por:

```ts
import type { DaySource } from "@/lib/types";
```

- [ ] **Step 2: Reescrever `leadsFilter` e as duas funções que a usam**

Trocar o bloco inteiro (linhas 70-122):

```ts
// Filtro de nome de campanha por contratante. As condições do array são
// combinadas com AND pela API → "[LEADS]" sempre, + "[MM]"/"[RF]" por segmento.
function leadsFilter(contratante: Contratante): string {
  const conds: Array<{ field: string; operator: string; value: string }> = [
    { field: "campaign.name", operator: "CONTAIN", value: "[LEADS]" },
  ];
  if (contratante === "mm") conds.push({ field: "campaign.name", operator: "CONTAIN", value: "[MM]" });
  if (contratante === "rf") conds.push({ field: "campaign.name", operator: "CONTAIN", value: "[RF]" });
  return JSON.stringify(conds);
}

/** Insights por campanha filtrando nome [LEADS] (+ segmento). limit alto cobre KPIs e tabela. */
export function metaInsights(
  dateFrom: string,
  dateTo: string,
  contratante: Contratante = "all",
  fresh = false,
): Promise<MetaInsightRow[]> {
  return cached(
    `metaInsights:${contratante}:${dateFrom}:${dateTo}`,
    () =>
      metaPaginate(`/${META.account}/insights`, {
        level: "campaign",
        fields: "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions",
        time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
        filtering: leadsFilter(contratante),
        limit: "200",
      }),
    { fresh },
  );
}

/** Insights diários (account-level) para a timeline. */
export function metaInsightsDaily(
  dateFrom: string,
  dateTo: string,
  contratante: Contratante = "all",
  fresh = false,
): Promise<MetaInsightRow[]> {
  return cached(
    `metaInsightsDaily:${contratante}:${dateFrom}:${dateTo}`,
    () =>
      metaPaginate(`/${META.account}/insights`, {
        level: "account",
        fields: "spend,impressions,clicks,actions",
        time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
        time_increment: "1",
        filtering: leadsFilter(contratante),
        limit: "100",
      }),
    { fresh },
  );
}
```

por:

```ts
// Filtro de OBJETIVO de campanha (geração de lead), não de segmento de
// público — mídia paga não filtra mais por tag de segmento (fundação:
// mira 100% Médico, sem marcador por campanha).
function leadsFilter(apenasLeads: boolean): string {
  const conds: Array<{ field: string; operator: string; value: string }> = [];
  if (apenasLeads) conds.push({ field: "campaign.name", operator: "CONTAIN", value: "[LEADS]" });
  return JSON.stringify(conds);
}

/** Insights por campanha, opcionalmente só as de geração de lead ([LEADS]). limit alto cobre KPIs e tabela. */
export function metaInsights(
  dateFrom: string,
  dateTo: string,
  apenasLeads = true,
  fresh = false,
): Promise<MetaInsightRow[]> {
  return cached(
    `metaInsights:${apenasLeads}:${dateFrom}:${dateTo}`,
    () =>
      metaPaginate(`/${META.account}/insights`, {
        level: "campaign",
        fields: "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions",
        time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
        filtering: leadsFilter(apenasLeads),
        limit: "200",
      }),
    { fresh },
  );
}

/** Insights diários (account-level) para a timeline. */
export function metaInsightsDaily(
  dateFrom: string,
  dateTo: string,
  apenasLeads = true,
  fresh = false,
): Promise<MetaInsightRow[]> {
  return cached(
    `metaInsightsDaily:${apenasLeads}:${dateFrom}:${dateTo}`,
    () =>
      metaPaginate(`/${META.account}/insights`, {
        level: "account",
        fields: "spend,impressions,clicks,actions",
        time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
        time_increment: "1",
        filtering: leadsFilter(apenasLeads),
        limit: "100",
      }),
    { fresh },
  );
}
```

- [ ] **Step 3: Rodar `tsc` e confirmar que este arquivo não tem mais erro**

Run: `npx tsc --noEmit 2>&1 | grep "integrations/meta.ts"`
Expected: nenhuma saída.

- [ ] **Step 4: Commit**

```bash
git add lib/integrations/meta.ts
git commit -m "feat(dashboard): meta.ts para de filtrar por segmento, novo toggle apenasLeads"
```

---

### Task 4: `lib/integrations/google.ts` — remove filtro de segmento

**Files:**
- Modify: `lib/integrations/google.ts:7-17,134-178,181-223`

**Interfaces:**
- Produces: `googleCampaigns(dateFrom, dateTo, fresh = false)`; `googleDaily(dateFrom, dateTo, fresh = false)` — sem parâmetro de segmento.

- [ ] **Step 1: Atualizar o import e remover `matchesContratante`**

Trocar (linhas 7-17):

```ts
import type { Contratante, DaySource } from "@/lib/types";

// GAQL não suporta parênteses no WHERE nem OR agrupado — filtro de nome feito em JS após o fetch.
// Brackets são literais nos nomes das campanhas.
function matchesContratante(name: string, contratante: Contratante): boolean {
  if (contratante === "all") return true;
  const n = name.toLowerCase();
  if (contratante === "mm") return n.includes("[mm]") || n.includes("institucional");
  if (contratante === "rf") return n.includes("[rf]") || n.includes("institucional");
  return true;
}
```

por:

```ts
import type { DaySource } from "@/lib/types";
```

- [ ] **Step 2: Simplificar `googleCampaigns`/`googleCampaignsUncached`**

Trocar (linhas 134-178):

```ts
/** Campanhas com custo > 0 no período (filtradas por contratante). Retorna null se não há credenciais. */
export async function googleCampaigns(
  dateFrom: string,
  dateTo: string,
  contratante: Contratante = "all",
  fresh = false,
): Promise<GoogleCampaignsResult | null> {
  if (!GOOGLE.devToken || !GOOGLE.creds.refresh_token) return null;
  return cached(
    `googleCampaigns:${contratante}:${dateFrom}:${dateTo}`,
    () => googleCampaignsUncached(dateFrom, dateTo, contratante),
    { fresh },
  );
}

async function googleCampaignsUncached(
  dateFrom: string,
  dateTo: string,
  contratante: Contratante,
): Promise<GoogleCampaignsResult | null> {
  const gaql = `
    SELECT
      campaign.id, campaign.name,
      metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr,
      metrics.average_cpc, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND metrics.cost_micros > 0
  `.trim();
  const rows = await gaqlSearch(gaql);
  return {
    results: rows
      .filter((r) => matchesContratante(r.campaign?.name ?? "", contratante))
      .map((r) => ({
        campaign: { id: r.campaign?.id ?? "?", name: r.campaign?.name ?? "" },
        metrics: {
          costMicros: n(r.metrics?.costMicros),
          impressions: n(r.metrics?.impressions),
          clicks: n(r.metrics?.clicks),
          ctr: n(r.metrics?.ctr),
          averageCpc: n(r.metrics?.averageCpc),
          conversions: n(r.metrics?.conversions),
        },
      })),
  };
}
```

por:

```ts
/** Todas as campanhas com custo > 0 no período — sem filtro por nome/segmento. Retorna null se não há credenciais. */
export async function googleCampaigns(
  dateFrom: string,
  dateTo: string,
  fresh = false,
): Promise<GoogleCampaignsResult | null> {
  if (!GOOGLE.devToken || !GOOGLE.creds.refresh_token) return null;
  return cached(
    `googleCampaigns:${dateFrom}:${dateTo}`,
    () => googleCampaignsUncached(dateFrom, dateTo),
    { fresh },
  );
}

async function googleCampaignsUncached(
  dateFrom: string,
  dateTo: string,
): Promise<GoogleCampaignsResult | null> {
  const gaql = `
    SELECT
      campaign.id, campaign.name,
      metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr,
      metrics.average_cpc, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND metrics.cost_micros > 0
  `.trim();
  const rows = await gaqlSearch(gaql);
  return {
    results: rows.map((r) => ({
      campaign: { id: r.campaign?.id ?? "?", name: r.campaign?.name ?? "" },
      metrics: {
        costMicros: n(r.metrics?.costMicros),
        impressions: n(r.metrics?.impressions),
        clicks: n(r.metrics?.clicks),
        ctr: n(r.metrics?.ctr),
        averageCpc: n(r.metrics?.averageCpc),
        conversions: n(r.metrics?.conversions),
      },
    })),
  };
}
```

- [ ] **Step 3: Simplificar `googleDaily`/`googleDailyUncached`**

Trocar (linhas 181-223):

```ts
/** Agregado diário por data: { "2026-06-01": DaySource, ... } */
export async function googleDaily(
  dateFrom: string,
  dateTo: string,
  contratante: Contratante = "all",
  fresh = false,
): Promise<Record<string, DaySource>> {
  if (!GOOGLE.devToken || !GOOGLE.creds.refresh_token) return {};
  return cached(
    `googleDaily:${contratante}:${dateFrom}:${dateTo}`,
    () => googleDailyUncached(dateFrom, dateTo, contratante),
    { fresh },
  );
}

async function googleDailyUncached(
  dateFrom: string,
  dateTo: string,
  contratante: Contratante,
): Promise<Record<string, DaySource>> {
  const gaql = `
    SELECT campaign.name, segments.date,
           metrics.cost_micros, metrics.impressions,
           metrics.clicks, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND metrics.cost_micros > 0
  `.trim();
  const allRows = await gaqlSearch(gaql);
  const rows = allRows.filter((r) => matchesContratante(r.campaign?.name ?? "", contratante));
  const byDate: Record<string, DaySource> = {};
  for (const r of rows) {
    const d = r.segments?.date;
    if (!d) continue;
    if (!byDate[d]) {
      byDate[d] = { invest: 0, leads: 0, oport: 0, ganho: 0, impressions: 0, clicks: 0 };
    }
    byDate[d].invest += n(r.metrics?.costMicros) / 1_000_000;
    byDate[d].leads += Math.trunc(n(r.metrics?.conversions));
    byDate[d].impressions += n(r.metrics?.impressions);
    byDate[d].clicks += n(r.metrics?.clicks);
  }
  return byDate;
}
```

por:

```ts
/** Agregado diário por data: { "2026-06-01": DaySource, ... } */
export async function googleDaily(
  dateFrom: string,
  dateTo: string,
  fresh = false,
): Promise<Record<string, DaySource>> {
  if (!GOOGLE.devToken || !GOOGLE.creds.refresh_token) return {};
  return cached(
    `googleDaily:${dateFrom}:${dateTo}`,
    () => googleDailyUncached(dateFrom, dateTo),
    { fresh },
  );
}

async function googleDailyUncached(
  dateFrom: string,
  dateTo: string,
): Promise<Record<string, DaySource>> {
  const gaql = `
    SELECT campaign.name, segments.date,
           metrics.cost_micros, metrics.impressions,
           metrics.clicks, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND metrics.cost_micros > 0
  `.trim();
  const rows = await gaqlSearch(gaql);
  const byDate: Record<string, DaySource> = {};
  for (const r of rows) {
    const d = r.segments?.date;
    if (!d) continue;
    if (!byDate[d]) {
      byDate[d] = { invest: 0, leads: 0, oport: 0, ganho: 0, impressions: 0, clicks: 0 };
    }
    byDate[d].invest += n(r.metrics?.costMicros) / 1_000_000;
    byDate[d].leads += Math.trunc(n(r.metrics?.conversions));
    byDate[d].impressions += n(r.metrics?.impressions);
    byDate[d].clicks += n(r.metrics?.clicks);
  }
  return byDate;
}
```

- [ ] **Step 4: Rodar `tsc` e confirmar que este arquivo não tem mais erro**

Run: `npx tsc --noEmit 2>&1 | grep "integrations/google.ts"`
Expected: nenhuma saída.

- [ ] **Step 5: Commit**

```bash
git add lib/integrations/google.ts
git commit -m "feat(dashboard): google.ts para de filtrar por segmento, soma todas as campanhas"
```

---

### Task 5: `app/api/dashboard/route.ts` — Médico fixo + indicador de Formando

**Files:**
- Modify: `app/api/dashboard/route.ts:61-176`

**Interfaces:**
- Consumes de Tasks 1-4: `Contratante = "formando"|"medico"`; `metaInsights(dateFrom, dateTo, apenasLeads, fresh)`; `metaInsightsDaily(dateFrom, dateTo, apenasLeads, fresh)`; `googleCampaigns(dateFrom, dateTo, fresh)`; `googleDaily(dateFrom, dateTo, fresh)`; `sfFunnel(dateFrom, dateTo, platform, contratante, fresh, includeCruzamento)` (assinatura inalterada).
- Produces: `DashboardPayload.formandoAside` preenchido.

- [ ] **Step 1: Trocar a leitura de query params**

Trocar (linhas 66-69):

```ts
  const platform = (sp.get("platform") ?? "all") as Platform;
  const contratante = (sp.get("contratante") ?? "all") as Contratante;
  const fresh = sp.get("fresh") === "1";
  const includeCruzamento = sp.get("cruzamento") !== "0";
```

por:

```ts
  const platform = (sp.get("platform") ?? "all") as Platform;
  const apenasLeads = sp.get("apenasLeads") !== "0";
  const fresh = sp.get("fresh") === "1";
  const includeCruzamento = sp.get("cruzamento") !== "0";
  const CONTRATANTE_PRINCIPAL: Contratante = "medico";
```

- [ ] **Step 2: Reescrever o `Promise.all` de fan-out**

Trocar (linhas 82-100):

```ts
  const [
    metaRows, metaDaily, metaPrev,
    gads, gadsByDate, gadsPrev,
    sf, sfPrevF, sfD, sfCoh,
    sfMeta, sfGoogle,
  ] = await Promise.all([
    wantMeta ? metaInsights(dateFrom, dateTo, contratante, fresh) : Promise.resolve([] as MetaInsightRow[]),
    wantMeta ? metaInsightsDaily(dateFrom, dateTo, contratante, fresh) : Promise.resolve([] as MetaInsightRow[]),
    wantMeta ? metaInsights(prev.from, prev.to, contratante, fresh) : Promise.resolve([] as MetaInsightRow[]),
    wantGoogle ? googleCampaigns(dateFrom, dateTo, contratante, fresh) : Promise.resolve(null),
    wantGoogle ? googleDaily(dateFrom, dateTo, contratante, fresh) : Promise.resolve({} as Record<string, DaySource>),
    wantGoogle ? googleCampaigns(prev.from, prev.to, contratante, fresh) : Promise.resolve(null),
    sfFunnel(dateFrom, dateTo, platform, contratante, fresh, includeCruzamento),
    sfFunnel(prev.from, prev.to, platform, contratante, fresh, includeCruzamento),
    sfDaily(dateFrom, dateTo, platform, contratante, fresh, includeCruzamento),
    sfCohort(dateFrom, dateTo, platform, contratante, fresh, includeCruzamento),
    isAll ? sfFunnel(dateFrom, dateTo, "meta", contratante, fresh, includeCruzamento) : Promise.resolve(null),
    isAll ? sfFunnel(dateFrom, dateTo, "google", contratante, fresh, includeCruzamento) : Promise.resolve(null),
  ]);
```

por:

```ts
  const [
    metaRows, metaDaily, metaPrev,
    gads, gadsByDate, gadsPrev,
    sf, sfPrevF, sfD, sfCoh,
    sfMeta, sfGoogle,
    sfFormando,
  ] = await Promise.all([
    wantMeta ? metaInsights(dateFrom, dateTo, apenasLeads, fresh) : Promise.resolve([] as MetaInsightRow[]),
    wantMeta ? metaInsightsDaily(dateFrom, dateTo, apenasLeads, fresh) : Promise.resolve([] as MetaInsightRow[]),
    wantMeta ? metaInsights(prev.from, prev.to, apenasLeads, fresh) : Promise.resolve([] as MetaInsightRow[]),
    wantGoogle ? googleCampaigns(dateFrom, dateTo, fresh) : Promise.resolve(null),
    wantGoogle ? googleDaily(dateFrom, dateTo, fresh) : Promise.resolve({} as Record<string, DaySource>),
    wantGoogle ? googleCampaigns(prev.from, prev.to, fresh) : Promise.resolve(null),
    sfFunnel(dateFrom, dateTo, platform, CONTRATANTE_PRINCIPAL, fresh, includeCruzamento),
    sfFunnel(prev.from, prev.to, platform, CONTRATANTE_PRINCIPAL, fresh, includeCruzamento),
    sfDaily(dateFrom, dateTo, platform, CONTRATANTE_PRINCIPAL, fresh, includeCruzamento),
    sfCohort(dateFrom, dateTo, platform, CONTRATANTE_PRINCIPAL, fresh, includeCruzamento),
    isAll ? sfFunnel(dateFrom, dateTo, "meta", CONTRATANTE_PRINCIPAL, fresh, includeCruzamento) : Promise.resolve(null),
    isAll ? sfFunnel(dateFrom, dateTo, "google", CONTRATANTE_PRINCIPAL, fresh, includeCruzamento) : Promise.resolve(null),
    sfFunnel(dateFrom, dateTo, platform, "formando", fresh, includeCruzamento),
  ]);
```

- [ ] **Step 3: Montar `formandoAside` e incluir no payload**

Trocar (linhas 162-175):

```ts
  const out: DashboardPayload = {
    metrics,
    metricsPrev,
    funnel,
    timeline,
    dailyFunnel,
    campaigns,
    cohort: sfCoh ?? undefined,
    platformCompare: isAll
      ? { meta: buildMetrics(metaInvest, metaLeads, sfMeta), google: buildMetrics(gInvest, gLeads, sfGoogle) }
      : undefined,
    _mock: false,
  };
  return NextResponse.json(out);
```

por:

```ts
  const formandoAside = sfFormando
    ? {
        oport: sfFormando.no_crm + sfFormando.em_tratamento + sfFormando.proposta,
        ganho: sfFormando.ganho,
      }
    : undefined;

  const out: DashboardPayload = {
    metrics,
    metricsPrev,
    funnel,
    timeline,
    dailyFunnel,
    campaigns,
    cohort: sfCoh ?? undefined,
    platformCompare: isAll
      ? { meta: buildMetrics(metaInvest, metaLeads, sfMeta), google: buildMetrics(gInvest, gLeads, sfGoogle) }
      : undefined,
    formandoAside,
    _mock: false,
  };
  return NextResponse.json(out);
```

- [ ] **Step 4: Rodar `tsc` e confirmar que este arquivo não tem mais erro**

Run: `npx tsc --noEmit 2>&1 | grep "api/dashboard/route.ts"`
Expected: nenhuma saída.

- [ ] **Step 5: Commit**

```bash
git add app/api/dashboard/route.ts
git commit -m "feat(dashboard): rota /api/dashboard fixa contratante=medico + busca formandoAside"
```

---

### Task 6: `app/api/opportunities/route.ts` — Médico fixo

**Files:**
- Modify: `app/api/opportunities/route.ts:21-22`

**Interfaces:**
- Consumes de Task 1: `Contratante = "formando"|"medico"`.

- [ ] **Step 1: Trocar a leitura do query param**

Trocar (linha 22):

```ts
  const contratante = (sp.get("contratante") ?? "all") as Contratante;
```

por:

```ts
  const contratante: Contratante = "medico";
```

- [ ] **Step 2: Rodar `tsc` e confirmar que este arquivo não tem mais erro**

Run: `npx tsc --noEmit 2>&1 | grep "api/opportunities/route.ts"`
Expected: nenhuma saída.

- [ ] **Step 3: Commit**

```bash
git add app/api/opportunities/route.ts
git commit -m "feat(dashboard): rota /api/opportunities fixa contratante=medico"
```

---

### Task 7: `lib/api-client.ts` — client-side fetch

**Files:**
- Modify: `lib/api-client.ts:28-56`

**Interfaces:**
- Consumes de Tasks 5-6: rotas `/api/dashboard` (novo param `apenasLeads`, sem `contratante`) e `/api/opportunities` (sem `contratante`).
- Produces: `fetchDashboardAll(platform, from, to, apenasLeads, cruzamento, fresh?, signal?)`; `fetchOpportunities(platform, from, to, stage, cruzamento, signal?)`.

- [ ] **Step 1: Reescrever `fetchDashboardAll` e `fetchOpportunities`**

Trocar (linhas 28-56):

```ts
/** Carga única e consolidada de todo o dashboard (substitui os múltiplos fetches). */
export function fetchDashboardAll(
  platform: Platform,
  from: string,
  to: string,
  contratante: Contratante,
  cruzamento: boolean,
  fresh = false,
  signal?: AbortSignal,
): Promise<DashboardPayload> {
  const qs = new URLSearchParams({ from, to, platform, contratante });
  if (!cruzamento) qs.set("cruzamento", "0");
  if (fresh) qs.set("fresh", "1");
  return getJSON<DashboardPayload>(`/api/dashboard?${qs}`, 30000, signal);
}

/** Drill-down: lista de oportunidades de um estágio do funil, com os filtros atuais. */
export function fetchOpportunities(
  platform: Platform,
  from: string,
  to: string,
  contratante: Contratante,
  stage: FunnelDrillKey,
  cruzamento: boolean,
  signal?: AbortSignal,
): Promise<OpportunityRow[]> {
  const qs = new URLSearchParams({ from, to, platform, contratante, stage });
  if (!cruzamento) qs.set("cruzamento", "0");
  return getJSON<OpportunityRow[]>(`/api/opportunities?${qs}`, 25000, signal);
}
```

por:

```ts
/** Carga única e consolidada de todo o dashboard (substitui os múltiplos fetches). */
export function fetchDashboardAll(
  platform: Platform,
  from: string,
  to: string,
  apenasLeads: boolean,
  cruzamento: boolean,
  fresh = false,
  signal?: AbortSignal,
): Promise<DashboardPayload> {
  const qs = new URLSearchParams({ from, to, platform });
  if (!apenasLeads) qs.set("apenasLeads", "0");
  if (!cruzamento) qs.set("cruzamento", "0");
  if (fresh) qs.set("fresh", "1");
  return getJSON<DashboardPayload>(`/api/dashboard?${qs}`, 30000, signal);
}

/** Drill-down: lista de oportunidades de um estágio do funil, com os filtros atuais. */
export function fetchOpportunities(
  platform: Platform,
  from: string,
  to: string,
  stage: FunnelDrillKey,
  cruzamento: boolean,
  signal?: AbortSignal,
): Promise<OpportunityRow[]> {
  const qs = new URLSearchParams({ from, to, platform, stage });
  if (!cruzamento) qs.set("cruzamento", "0");
  return getJSON<OpportunityRow[]>(`/api/opportunities?${qs}`, 25000, signal);
}
```

- [ ] **Step 2: Atualizar o import (remove `Contratante`, que não é mais usado neste arquivo)**

Trocar (linhas 3-6):

```ts
import type {
  Contratante, DashboardPayload, FunnelDrillKey, GA4Payload, Goals,
  HealthPayload, OpportunityRow, Platform,
} from "@/lib/types";
```

por:

```ts
import type {
  DashboardPayload, FunnelDrillKey, GA4Payload, Goals,
  HealthPayload, OpportunityRow, Platform,
} from "@/lib/types";
```

- [ ] **Step 3: Rodar `tsc` e confirmar que este arquivo não tem mais erro**

Run: `npx tsc --noEmit 2>&1 | grep "api-client.ts"`
Expected: nenhuma saída. (Os erros em `components/dashboard.tsx` — que chama essas funções com a assinatura antiga — continuam até a Task 10.)

- [ ] **Step 4: Commit**

```bash
git add lib/api-client.ts
git commit -m "feat(dashboard): api-client.ts — fetchDashboardAll/fetchOpportunities sem contratante"
```

---

### Task 8: `components/top-bar.tsx` — remove dropdown de segmento, adiciona toggle "Somente Leads"

**Files:**
- Modify: `components/top-bar.tsx:3,7,11-17,85-133,135-137,154-163`

**Interfaces:**
- Produces: `TopBarProps` sem `contratante`/`onContratante`, com `apenasLeads: boolean`/`onApenasLeads: (v: boolean) => void`.

- [ ] **Step 1: Atualizar imports (remove `Contratante`, remove ícone `Users` não mais usado)**

Trocar (linha 3):

```ts
import { Check, ChevronDown, Moon, MoreHorizontal, RefreshCw, Sun, Target, Users } from "lucide-react";
```

por:

```ts
import { Check, ChevronDown, Moon, MoreHorizontal, RefreshCw, Sun, Target } from "lucide-react";
```

Trocar (linha 7):

```ts
import type { Contratante, Platform } from "@/lib/types";
```

por:

```ts
import type { Platform } from "@/lib/types";
```

- [ ] **Step 2: Atualizar `TopBarProps`**

Trocar (linhas 11-27):

```ts
interface TopBarProps {
  platform: Platform;
  onPlatform: (p: Platform) => void;
  contratante: Contratante;
  onContratante: (c: Contratante) => void;
  cruzamento: boolean;
  onCruzamento: (v: boolean) => void;
  dateFrom: string;
  dateTo: string;
  onDates: (from: string, to: string) => void;
  onOpenGoals: () => void;
  onRefresh: () => void;
  currentMonthLabel: string;
  dataMode: DataMode;
  theme: Theme;
  onToggleTheme: () => void;
}
```

por:

```ts
interface TopBarProps {
  platform: Platform;
  onPlatform: (p: Platform) => void;
  apenasLeads: boolean;
  onApenasLeads: (v: boolean) => void;
  cruzamento: boolean;
  onCruzamento: (v: boolean) => void;
  dateFrom: string;
  dateTo: string;
  onDates: (from: string, to: string) => void;
  onOpenGoals: () => void;
  onRefresh: () => void;
  currentMonthLabel: string;
  dataMode: DataMode;
  theme: Theme;
  onToggleTheme: () => void;
}
```

- [ ] **Step 3: Remover `CONTRATANTE_OPTS`**

Remover (linhas 129-133):

```ts
const CONTRATANTE_OPTS: SegOption<Contratante>[] = [
  { val: "all", label: "Ambos", ariaLabel: "Ambos os públicos" },
  { val: "rf", label: "Recém-Formado" },
  { val: "mm", label: "Médicos Maduros" },
];
```

(a função genérica `FilterDropdown` definida acima continua no arquivo — não é usada por mais nada agora, mas é infraestrutura genérica reutilizável; manter.)

- [ ] **Step 4: Atualizar a assinatura de `TopBar` e o JSX de controles**

Trocar (linhas 135-137):

```ts
export function TopBar({
  platform, onPlatform, contratante, onContratante, cruzamento, onCruzamento,
  dateFrom, dateTo, onDates, onOpenGoals, onRefresh, currentMonthLabel, dataMode, theme, onToggleTheme,
}: TopBarProps) {
```

por:

```ts
export function TopBar({
  platform, onPlatform, apenasLeads, onApenasLeads, cruzamento, onCruzamento,
  dateFrom, dateTo, onDates, onOpenGoals, onRefresh, currentMonthLabel, dataMode, theme, onToggleTheme,
}: TopBarProps) {
```

Trocar (linhas 154-163):

```tsx
      <div className="topbar-controls">
        <Segmented<Platform> value={platform} options={PLATFORM_OPTS} onChange={onPlatform} ariaLabel="Filtro de plataforma" />
        <FilterDropdown<Contratante>
          value={contratante}
          options={CONTRATANTE_OPTS}
          onChange={onContratante}
          ariaLabel="Filtro de público / contratante"
          icon={Users}
        />

        <label
```

por:

```tsx
      <div className="topbar-controls">
        <Segmented<Platform> value={platform} options={PLATFORM_OPTS} onChange={onPlatform} ariaLabel="Filtro de plataforma" />

        <label
          className={`toggle toggle-apenas-leads${apenasLeads ? " on" : ""}`}
          title={apenasLeads ? "Mostrar todas as campanhas (desativar filtro [LEADS])" : "Mostrar só campanhas de geração de lead ([LEADS])"}
        >
          <input
            type="checkbox"
            checked={apenasLeads}
            onChange={(e) => onApenasLeads(e.target.checked)}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          />
          <span className="toggle-switch" />
          Somente Leads
        </label>

        <label
```

(a segunda `<label` acima é o início do toggle "Cruzamento" já existente — só precisa ficar logo em seguida, sem outra mudança nele.)

- [ ] **Step 5: Rodar `tsc` e confirmar que este arquivo não tem mais erro**

Run: `npx tsc --noEmit 2>&1 | grep "top-bar.tsx"`
Expected: nenhuma saída.

- [ ] **Step 6: Commit**

```bash
git add components/top-bar.tsx
git commit -m "feat(dashboard): TopBar remove dropdown de segmento, adiciona toggle Somente Leads"
```

---

### Task 9: `components/opportunities-chart.tsx` — remove rótulo de segmento

**Files:**
- Modify: `components/opportunities-chart.tsx:8,14-16,19-23,40`

**Interfaces:**
- Produces: `OpportunitiesChart` sem prop `contratante`.

- [ ] **Step 1: Atualizar import e remover `CONTRATANTE_LABEL`**

Trocar (linha 8):

```ts
import type { Contratante, DailyFunnelPoint, Platform } from "@/lib/types";
```

por:

```ts
import type { DailyFunnelPoint, Platform } from "@/lib/types";
```

Trocar (linhas 14-16):

```ts
const CONTRATANTE_LABEL: Record<Contratante, string> = {
  all: "Ambos", rf: "Recém-Formado", mm: "Médicos Maduros",
};
```

(remover essas 3 linhas por completo, sem substituição.)

- [ ] **Step 2: Remover a prop `contratante`**

Trocar (linhas 19-23, assinatura da função — ajustar aos nomes reais de props ao redor):

```ts
function OpportunitiesChartBase({
  days, platform, contratante,
}: {
```

por:

```ts
function OpportunitiesChartBase({
  days, platform,
}: {
```

(e remover a linha do tipo da prop `contratante: Contratante;` logo abaixo, dentro do mesmo bloco de tipo.)

- [ ] **Step 3: Remover o uso no subtítulo**

Trocar (linha 40):

```tsx
            Oportunidades criadas (barra) e fechamentos ganhos (linha) · {PLATFORM_LABEL[platform]} · {CONTRATANTE_LABEL[contratante]}
```

por:

```tsx
            Oportunidades criadas (barra) e fechamentos ganhos (linha) · {PLATFORM_LABEL[platform]}
```

- [ ] **Step 4: Rodar `tsc` e confirmar que este arquivo não tem mais erro**

Run: `npx tsc --noEmit 2>&1 | grep "opportunities-chart.tsx"`
Expected: nenhuma saída.

- [ ] **Step 5: Commit**

```bash
git add components/opportunities-chart.tsx
git commit -m "feat(dashboard): OpportunitiesChart remove rótulo de segmento (sempre Médico)"
```

---

### Task 10: `components/dashboard.tsx` — conecta tudo + badge de Formando

**Files:**
- Modify: `components/dashboard.tsx:27-30,44,88-112,157-175,246-264,285-295,345`

**Interfaces:**
- Consumes de Tasks 1,7,8,9: `Contratante` (não mais usado neste arquivo — remover import); `fetchDashboardAll(platform, from, to, apenasLeads, cruzamento, fresh?, signal?)`; `fetchOpportunities(platform, from, to, stage, cruzamento, signal?)`; `TopBarProps.apenasLeads`/`onApenasLeads`; `OpportunitiesChart` sem prop `contratante`.
- Produces: nenhuma (última task de código; Task 11 é só verificação).

- [ ] **Step 1: Atualizar o import de tipos (remove `Contratante`)**

Trocar (linhas 27-30):

```ts
import type {
  Campaign, CohortPoint, Contratante, DailyFunnelPoint, FunnelData, FunnelDrillKey, Goals, Metrics,
  OpportunityRow, Platform, PlatformCompareData, TimelineDay,
} from "@/lib/types";
```

por:

```ts
import type {
  Campaign, CohortPoint, DailyFunnelPoint, FunnelData, FunnelDrillKey, Goals, Metrics,
  OpportunityRow, Platform, PlatformCompareData, TimelineDay,
} from "@/lib/types";
```

- [ ] **Step 2: Trocar o state de `contratante` por `apenasLeads` + novo state de `formandoAside`**

Trocar (linha 44):

```ts
  const [contratante, setContratante] = useState<Contratante>("all");
```

por:

```ts
  const [apenasLeads, setApenasLeads] = useState(true);
  const [formandoAside, setFormandoAside] = useState<{ oport: number; ganho: number } | null>(null);
```

- [ ] **Step 3: Atualizar o fetch consolidado**

Trocar (linhas 88-112):

```ts
  useEffect(() => {
    const ctrl = new AbortController();
    setDataMode("loading");
    const fresh = freshRef.current;
    freshRef.current = false;

    fetchDashboardAll(platform, dateFrom, dateTo, contratante, cruzamento, fresh, ctrl.signal)
      .then((d) => {
        if (ctrl.signal.aborted) return;
        setK(d.metrics);
        setKPrev(d.metricsPrev);
        setFunnelRaw(d.funnel);
        setTimelineDays(d.timeline);
        setDailyFunnel(d.dailyFunnel);
        setCampaigns(d.campaigns);
        setCohort(d.cohort ?? []);
        setPlatformCompareData(d.platformCompare ?? null);
        setDataMode(d._mock ? "mock" : "live");
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setDataMode("mock");
      });

    return () => ctrl.abort();
  }, [platform, contratante, cruzamento, dateFrom, dateTo, refreshKey]);
```

por:

```ts
  useEffect(() => {
    const ctrl = new AbortController();
    setDataMode("loading");
    const fresh = freshRef.current;
    freshRef.current = false;

    fetchDashboardAll(platform, dateFrom, dateTo, apenasLeads, cruzamento, fresh, ctrl.signal)
      .then((d) => {
        if (ctrl.signal.aborted) return;
        setK(d.metrics);
        setKPrev(d.metricsPrev);
        setFunnelRaw(d.funnel);
        setTimelineDays(d.timeline);
        setDailyFunnel(d.dailyFunnel);
        setCampaigns(d.campaigns);
        setCohort(d.cohort ?? []);
        setPlatformCompareData(d.platformCompare ?? null);
        setFormandoAside(d.formandoAside ?? null);
        setDataMode(d._mock ? "mock" : "live");
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setDataMode("mock");
      });

    return () => ctrl.abort();
  }, [platform, apenasLeads, cruzamento, dateFrom, dateTo, refreshKey]);
```

- [ ] **Step 4: Atualizar o fetch de drill-down**

Trocar (linhas 157-175):

```ts
  useEffect(() => {
    // Tabela desmonta quando não há estágio; não é preciso limpar as linhas aqui.
    if (!selectedStage) return;
    const ctrl = new AbortController();
    setOppLoading(true);
    fetchOpportunities(platform, dateFrom, dateTo, contratante, selectedStage, cruzamento, ctrl.signal)
      .then((rows) => {
        if (ctrl.signal.aborted) return;
        setOppRows(rows);
        setOppLoading(false);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) {
          setOppRows([]);
          setOppLoading(false);
        }
      });
    return () => ctrl.abort();
  }, [selectedStage, platform, contratante, cruzamento, dateFrom, dateTo, refreshKey]);
```

por:

```ts
  useEffect(() => {
    // Tabela desmonta quando não há estágio; não é preciso limpar as linhas aqui.
    if (!selectedStage) return;
    const ctrl = new AbortController();
    setOppLoading(true);
    fetchOpportunities(platform, dateFrom, dateTo, selectedStage, cruzamento, ctrl.signal)
      .then((rows) => {
        if (ctrl.signal.aborted) return;
        setOppRows(rows);
        setOppLoading(false);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) {
          setOppRows([]);
          setOppLoading(false);
        }
      });
    return () => ctrl.abort();
  }, [selectedStage, platform, cruzamento, dateFrom, dateTo, refreshKey]);
```

- [ ] **Step 5: Atualizar as props passadas pro `TopBar`**

Trocar (linhas 248-264):

```tsx
      <TopBar
        platform={platform}
        onPlatform={setPlatform}
        contratante={contratante}
        onContratante={setContratante}
        cruzamento={cruzamento}
        onCruzamento={setCruzamento}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDates={(f, t) => { setDateFrom(f); setDateTo(t); }}
        onOpenGoals={() => setGoalsOpen(true)}
        onRefresh={handleRefresh}
        currentMonthLabel={fmtMonth(mKey).replace(" de ", "/")}
        dataMode={dataMode}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
```

por:

```tsx
      <TopBar
        platform={platform}
        onPlatform={setPlatform}
        apenasLeads={apenasLeads}
        onApenasLeads={setApenasLeads}
        cruzamento={cruzamento}
        onCruzamento={setCruzamento}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDates={(f, t) => { setDateFrom(f); setDateTo(t); }}
        onOpenGoals={() => setGoalsOpen(true)}
        onRefresh={handleRefresh}
        currentMonthLabel={fmtMonth(mKey).replace(" de ", "/")}
        dataMode={dataMode}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
```

- [ ] **Step 6: Adicionar o badge de Formando no cabeçalho da seção "Visão geral"**

Trocar (linhas 285-295):

```tsx
            <div className="section-head">
              <div className="section-head-left">
                <h2 className="section-title">
                  <Target size={14} /> Visão geral · {dayCount} dias do período
                </h2>
                <HealthIndicators refreshKey={refreshKey} />
              </div>
              <span className="section-sub">
                {dataMode === "live" ? "Dados em tempo real via API" : dataMode === "mock" ? "Dados mockados · configure credenciais" : "Carregando…"}
              </span>
            </div>
```

por:

```tsx
            <div className="section-head">
              <div className="section-head-left">
                <h2 className="section-title">
                  <Target size={14} /> Visão geral · {dayCount} dias do período
                </h2>
                <HealthIndicators refreshKey={refreshKey} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                <span className="section-sub">
                  {dataMode === "live" ? "Dados em tempo real via API" : dataMode === "mock" ? "Dados mockados · configure credenciais" : "Carregando…"}
                </span>
                {formandoAside && (formandoAside.oport > 0 || formandoAside.ganho > 0) && (
                  <span className="section-sub">
                    Formando: {formandoAside.oport} oportunidades · {formandoAside.ganho} fechamentos (fora do funil principal)
                  </span>
                )}
              </div>
            </div>
```

- [ ] **Step 7: Remover a prop `contratante` de `OpportunitiesChart`**

Trocar (linha 345):

```tsx
            <OpportunitiesChart days={dailyFunnel} platform={platform} contratante={contratante} />
```

por:

```tsx
            <OpportunitiesChart days={dailyFunnel} platform={platform} />
```

- [ ] **Step 8: Rodar `tsc` e confirmar que todo o projeto compila**

Run: `npx tsc --noEmit`
Expected: nenhuma saída (zero erros em todo o projeto).

- [ ] **Step 9: Commit**

```bash
git add components/dashboard.tsx
git commit -m "feat(dashboard): conecta apenasLeads/badge de Formando, remove estado de contratante"
```

---

### Task 11: Verificação final

**Files:**
- Nenhum (só verificação).

- [ ] **Step 1: `tsc` limpo em todo o projeto**

Run: `npx tsc --noEmit`
Expected: nenhuma saída.

- [ ] **Step 2: Build de produção**

Run: `npm run build`
Expected: build completo sem erros (pode haver warnings pré-existentes não relacionados, ex. o warning de NFT do `next.config.ts` já conhecido — não é regressão desta mudança).

- [ ] **Step 3: Grep de resíduo — nenhum "rf"/"mm" como valor de Contratante**

Run: `grep -rn '"rf"\|"mm"\|'"'"'rf'"'"'\|'"'"'mm'"'"'' lib/ components/ app/ --include="*.ts" --include="*.tsx"`
Expected: nenhum resultado (fora de `mm:ss`/`DD/MM` que não são sobre Contratante — confirmar visualmente que qualquer match remanescente é formato de data/hora, não segmento).

- [ ] **Step 4: Smoke test manual no navegador**

Rodar `npm run dev`, abrir o dashboard, e conferir visualmente:
- TopBar não tem mais dropdown de segmento (Ambos/Formando/Médico sumiu).
- Toggle "Somente Leads" aparece, ligado por padrão, ao lado do "Cruzamento".
- KPIs/funil carregam normalmente (dados reais ou mock, conforme credenciais).
- Se houver dado de Formando no período, o badge "Formando: N oportunidades · M fechamentos (fora do funil principal)" aparece perto do cabeçalho "Visão geral".
- Desligar "Somente Leads" muda os números de investimento/campanhas do Meta (mais campanhas somadas).
