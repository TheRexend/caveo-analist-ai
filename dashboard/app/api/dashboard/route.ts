// === Endpoint consolidado: todo o dashboard numa resposta ===
// Substitui as chamadas separadas a /metrics, /timeline, /funnel, /campaigns,
// /metrics(anterior) e os 2 /metrics do PlatformCompare. Cada fonte externa é
// buscada UMA vez (com cache TTL) e tudo roda em paralelo (Promise.all).
import { NextRequest, NextResponse } from "next/server";
import { daysBetween, defaultRange, eachDay } from "@/lib/dates";
import { META, GOOGLE, HAS_ANY_CREDS } from "@/lib/env";
import {
  leadsFromActions, metaDailyToSource, metaInsights, metaInsightsDaily, type MetaInsightRow,
} from "@/lib/integrations/meta";
import { googleCampaigns, googleDaily, type GoogleCampaignsResult } from "@/lib/integrations/google";
import { sfDaily, sfFunnel, type SfFunnel } from "@/lib/integrations/salesforce";
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
  const contratante = (sp.get("contratante") ?? "all") as Contratante;
  const fresh = sp.get("fresh") === "1";
  const prev = prevRange(dateFrom, dateTo);

  // Mock só quando NÃO há nenhuma credencial.
  if (!HAS_ANY_CREDS()) {
    return NextResponse.json(mockDashboard(platform, dateFrom, dateTo, prev.from, prev.to));
  }

  const wantMeta = !!META.token && (platform === "all" || platform === "meta");
  const wantGoogle = !!GOOGLE.devToken && (platform === "all" || platform === "google");
  const isAll = platform === "all";

  // Fan-out paralelo de TODAS as fontes (atual + anterior + diário + compare).
  const [
    metaRows, metaDaily, metaPrev,
    gads, gadsByDate, gadsPrev,
    sf, sfPrevF, sfD,
    sfMeta, sfGoogle,
  ] = await Promise.all([
    wantMeta ? metaInsights(dateFrom, dateTo, contratante, fresh) : Promise.resolve([] as MetaInsightRow[]),
    wantMeta ? metaInsightsDaily(dateFrom, dateTo, contratante, fresh) : Promise.resolve([] as MetaInsightRow[]),
    wantMeta ? metaInsights(prev.from, prev.to, contratante, fresh) : Promise.resolve([] as MetaInsightRow[]),
    wantGoogle ? googleCampaigns(dateFrom, dateTo, contratante, fresh) : Promise.resolve(null),
    wantGoogle ? googleDaily(dateFrom, dateTo, contratante, fresh) : Promise.resolve({} as Record<string, DaySource>),
    wantGoogle ? googleCampaigns(prev.from, prev.to, contratante, fresh) : Promise.resolve(null),
    sfFunnel(dateFrom, dateTo, platform, contratante, fresh),
    sfFunnel(prev.from, prev.to, platform, contratante, fresh),
    sfDaily(dateFrom, dateTo, platform, contratante, fresh),
    isAll ? sfFunnel(dateFrom, dateTo, "meta", contratante, fresh) : Promise.resolve(null),
    isAll ? sfFunnel(dateFrom, dateTo, "google", contratante, fresh) : Promise.resolve(null),
  ]);

  const metaInvest = metaInvestOf(metaRows);
  const metaLeads = metaLeadsOf(metaRows);
  const gInvest = gadsInvestOf(gads);
  const gLeads = gadsLeadsOf(gads);

  const combine = (mI: number, mL: number, gI: number, gL: number) => {
    if (platform === "all") return { invest: mI + gI, leads: mL + gL };
    if (platform === "meta") return { invest: mI, leads: mL };
    return { invest: gI, leads: gL };
  };

  const cur = combine(metaInvest, metaLeads, gInvest, gLeads);
  const metrics = buildMetrics(cur.invest, cur.leads, sf);

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

  const out: DashboardPayload = {
    metrics,
    metricsPrev,
    funnel,
    timeline,
    dailyFunnel,
    campaigns,
    platformCompare: isAll
      ? { meta: buildMetrics(metaInvest, metaLeads, sfMeta), google: buildMetrics(gInvest, gLeads, sfGoogle) }
      : undefined,
    _mock: false,
  };
  return NextResponse.json(out);
}
