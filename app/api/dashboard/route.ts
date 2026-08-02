// === Endpoint consolidado: todo o dashboard numa resposta ===
// Substitui as chamadas separadas a /metrics, /timeline, /funnel, /campaigns,
// /metrics(anterior) e os 2 /metrics do PlatformCompare. Cada fonte externa é
// buscada UMA vez (com cache TTL) e tudo roda em paralelo (Promise.all).
import { NextRequest, NextResponse } from "next/server";
import { daysBetween, defaultRange, eachDay } from "@/lib/dates";
import { META, GOOGLE, HAS_ANY_CREDS } from "@/lib/env";
import {
  completeRegistrationsFromActions, leadsFromActions, metaDailyToSource, metaInsights, metaInsightsDaily, type MetaInsightRow,
} from "@/lib/integrations/meta";
import { googleCampaigns, googleDaily, type GoogleCampaignsResult } from "@/lib/integrations/google";
import { sfCohort, sfDaily, sfFunnel, type SfFunnel } from "@/lib/integrations/salesforce";
import { buildGoogleCampaigns, buildMetaCampaigns } from "@/lib/build";
import { mockDashboard } from "@/lib/mock";
import type {
  Contratante, DailyFunnelPoint, DashboardPayload, DaySource, FunnelData, Metrics, Platform, TimelineDay,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY: DaySource = { invest: 0, leads: 0, oport: 0, ganho: 0, impressions: 0, clicks: 0 };
const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Período anterior equivalente: mesmo nº de dias imediatamente antes de [from, to]. */
function prevRange(from: string, to: string): { from: string; to: string } {
  const len = daysBetween(from, to);
  const prevTo = new Date(from + "T00:00:00");
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (len - 1));
  return { from: isoOf(prevFrom), to: isoOf(prevTo) };
}

const metaInvestOf = (rows: MetaInsightRow[]) => rows.reduce((s, r) => s + Number(r.spend ?? 0), 0);
const metaLeadsOf = (rows: MetaInsightRow[]) => rows.reduce((s, r) => s + leadsFromActions(r.actions), 0);
const metaCompleteRegOf = (rows: MetaInsightRow[]) => rows.reduce((s, r) => s + completeRegistrationsFromActions(r.actions), 0);
const gadsInvestOf = (g: GoogleCampaignsResult | null) =>
  (g?.results ?? []).reduce((s, r) => s + r.metrics.costMicros / 1_000_000, 0);
const gadsLeadsOf = (g: GoogleCampaignsResult | null) =>
  (g?.results ?? []).reduce((s, r) => s + Math.trunc(r.metrics.conversions), 0);

function buildMetrics(invest: number, leads: number, sf: SfFunnel | null): Metrics {
  const oport = sf?.no_crm ?? 0;
  const ganho = sf?.ganho ?? 0;
  return {
    invest: Math.round(invest * 100) / 100,
    leads,
    oport,
    ganho,
    cpl: invest / Math.max(1, leads),
    cpo: invest / Math.max(1, oport),
    cpf: invest / Math.max(1, ganho),
    tx_conv: ganho / Math.max(1, oport),
    oport_perdidas: sf?.perdido ?? 0,
    _mock: false,
  };
}

export async function GET(req: NextRequest) {
  const { from: defFrom, to: defTo } = defaultRange();
  const sp = req.nextUrl.searchParams;
  const dateFrom = sp.get("from") ?? defFrom;
  const dateTo = sp.get("to") ?? defTo;
  const platform = (sp.get("platform") ?? "all") as Platform;
  const apenasLeads = sp.get("apenasLeads") !== "0";
  const fresh = sp.get("fresh") === "1";
  const includeCruzamento = sp.get("cruzamento") !== "0";
  const CONTRATANTE_PRINCIPAL: Contratante = "medico";
  const prev = prevRange(dateFrom, dateTo);

  // Mock só quando NÃO há nenhuma credencial.
  if (!HAS_ANY_CREDS()) {
    return NextResponse.json(mockDashboard(platform, dateFrom, dateTo, prev.from, prev.to, includeCruzamento));
  }

  const wantMeta = !!META.token && (platform === "all" || platform === "meta");
  const wantGoogle = !!GOOGLE.devToken && (platform === "all" || platform === "google");
  const isAll = platform === "all";

  // Fan-out paralelo de TODAS as fontes (atual + anterior + diário + compare).
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

  const metaInvest = metaInvestOf(metaRows);
  const metaLeads = metaLeadsOf(metaRows);
  const metaCompleteReg = wantMeta ? metaCompleteRegOf(metaRows) : 0;
  const gInvest = gadsInvestOf(gads);
  const gLeads = gadsLeadsOf(gads);

  const combine = (mI: number, mL: number, gI: number, gL: number) => {
    if (platform === "all") return { invest: mI + gI, leads: mL + gL };
    if (platform === "meta") return { invest: mI, leads: mL };
    return { invest: gI, leads: gL };
  };

  const cur = combine(metaInvest, metaLeads, gInvest, gLeads);
  const baseMetrics = buildMetrics(cur.invest, cur.leads, sf);
  const metrics = platform === "meta" && wantMeta ? {
    ...baseMetrics,
    complete_reg: metaCompleteReg,
    cpr: Math.round(metaInvest / Math.max(1, metaCompleteReg) * 100) / 100,
  } : baseMetrics;

  const pAds = combine(metaInvestOf(metaPrev), metaLeadsOf(metaPrev), gadsInvestOf(gadsPrev), gadsLeadsOf(gadsPrev));
  const metricsPrev = buildMetrics(pAds.invest, pAds.leads, sfPrevF);

  const funnel: FunnelData = {
    lead_novo: cur.leads,
    no_crm: sf?.no_crm ?? 0,
    em_tratamento: sf?.em_tratamento ?? 0,
    proposta: sf?.proposta ?? 0,
    ganho: sf?.ganho ?? 0,
    perdido: sf?.perdido ?? 0,
    ganho_breakdown: sf?.ganho_breakdown ?? {},
    cruzamento: sf?.cruzamento,
    _mock: false,
  };

  // Timeline (intervalo contínuo: todos os dias aparecem, mesmo zerados).
  const metaByDate: Record<string, DaySource> = {};
  for (const r of metaDaily) {
    const d = r.date_start ?? r.date;
    if (d) metaByDate[d] = metaDailyToSource(r);
  }
  const timeline: TimelineDay[] = eachDay(dateFrom, dateTo).map((d) => ({
    date: d,
    google: gadsByDate[d] ?? { ...EMPTY },
    meta: metaByDate[d] ?? { ...EMPTY },
  }));

  // Série diária do funil (oportunidades criadas + fechamentos).
  const sfDMap = sfD ?? {};
  const dailyFunnel: DailyFunnelPoint[] = eachDay(dateFrom, dateTo).map((d) => ({
    date: d,
    oport: sfDMap[d]?.oport ?? 0,
    ganho: sfDMap[d]?.ganho ?? 0,
  }));

  const campaigns = [
    ...(wantMeta ? buildMetaCampaigns(metaRows) : []),
    ...(wantGoogle ? buildGoogleCampaigns(gads) : []),
  ];

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
}
