import { NextRequest, NextResponse } from "next/server";
import { defaultRange } from "@/lib/dates";
import { META, GOOGLE } from "@/lib/env";
import { metaInsights, leadsFromActions } from "@/lib/integrations/meta";
import { googleCampaigns } from "@/lib/integrations/google";
import { sfFunnel } from "@/lib/integrations/salesforce";
import { mockDays, aggMock } from "@/lib/mock";
import type { FunnelData, Platform } from "@/lib/types";

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

  const metaLeads = metaRows.reduce((s, r) => s + leadsFromActions(r.actions), 0);
  const gadsLeads = (gadsResp?.results ?? []).reduce((s, r) => s + Math.trunc(r.metrics.conversions), 0);

  let leadNovo: number;
  if (platform === "all") leadNovo = metaLeads + gadsLeads;
  else if (platform === "meta") leadNovo = metaLeads;
  else leadNovo = gadsLeads;

  const sf = await sfFunnel(dateFrom, dateTo, platform);

  if (!sf && metaRows.length === 0 && !gadsResp) {
    const s = aggMock(mockDays(dateFrom, dateTo), platform);
    const lv = s.leads;
    const out: FunnelData = {
      lead_novo: lv,
      no_crm: Math.round(lv * 0.85),
      em_tratamento: s.oport,
      proposta: Math.max(0, Math.round(s.oport * 0.2)),
      ganho: s.ganho,
      perdido: Math.max(0, Math.round(s.oport * 0.3)),
      _mock: true,
    };
    return NextResponse.json(out);
  }

  const out: FunnelData = {
    lead_novo: leadNovo,
    no_crm: sf?.no_crm ?? 0,
    em_tratamento: sf?.em_tratamento ?? 0,
    proposta: sf?.proposta ?? 0,
    ganho: sf?.ganho ?? 0,
    perdido: sf?.perdido ?? 0,
    _mock: false,
  };
  return NextResponse.json(out);
}
