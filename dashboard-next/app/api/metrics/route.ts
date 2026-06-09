import { NextRequest, NextResponse } from "next/server";
import { defaultRange } from "@/lib/dates";
import { META, GOOGLE } from "@/lib/env";
import { metaInsights, leadsFromActions } from "@/lib/integrations/meta";
import { googleCampaigns } from "@/lib/integrations/google";
import { sfFunnel } from "@/lib/integrations/salesforce";
import { mockDays, aggMock } from "@/lib/mock";
import type { Metrics, Platform } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { from: defFrom, to: defTo } = defaultRange();
  const sp = req.nextUrl.searchParams;
  const dateFrom = sp.get("from") ?? defFrom;
  const dateTo = sp.get("to") ?? defTo;
  const platform = (sp.get("platform") ?? "all") as Platform;

  const metaRows =
    META.token && (platform === "all" || platform === "meta")
      ? await metaInsights(dateFrom, dateTo)
      : [];
  const gadsResp =
    GOOGLE.devToken && (platform === "all" || platform === "google")
      ? await googleCampaigns(dateFrom, dateTo)
      : null;

  const metaInvest = metaRows.reduce((s, r) => s + Number(r.spend ?? 0), 0);
  const metaLeads = metaRows.reduce((s, r) => s + leadsFromActions(r.actions), 0);
  const gadsInvest = (gadsResp?.results ?? []).reduce((s, r) => s + r.metrics.costMicros / 1_000_000, 0);
  const gadsLeads = (gadsResp?.results ?? []).reduce((s, r) => s + Math.trunc(r.metrics.conversions), 0);

  let invest: number, leads: number;
  if (platform === "all") {
    invest = metaInvest + gadsInvest;
    leads = metaLeads + gadsLeads;
  } else if (platform === "meta") {
    invest = metaInvest;
    leads = metaLeads;
  } else {
    invest = gadsInvest;
    leads = gadsLeads;
  }

  const sf = await sfFunnel(dateFrom, dateTo, platform);
  const oport = sf?.no_crm ?? 0;
  const ganho = sf?.ganho ?? 0;
  const lost = sf?.perdido ?? 0;

  const usingMock = metaRows.length === 0 && !gadsResp && !sf;
  if (usingMock) {
    const s = aggMock(mockDays(dateFrom, dateTo), platform);
    const m: Metrics = {
      invest: s.invest, leads: s.leads, oport: s.oport, ganho: s.ganho,
      cpl: s.invest / Math.max(1, s.leads),
      cpo: s.invest / Math.max(1, s.oport),
      cpf: s.invest / Math.max(1, s.ganho),
      tx_conv: s.ganho / Math.max(1, s.oport),
      oport_perdidas: Math.max(0, Math.round(s.oport * 0.62)),
      _mock: true,
    };
    return NextResponse.json(m);
  }

  const out: Metrics = {
    invest: Math.round(invest * 100) / 100,
    leads,
    oport,
    ganho,
    cpl: invest / Math.max(1, leads),
    cpo: invest / Math.max(1, oport),
    cpf: invest / Math.max(1, ganho),
    tx_conv: ganho / Math.max(1, oport),
    oport_perdidas: lost,
    _mock: false,
  };
  return NextResponse.json(out);
}
