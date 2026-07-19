// === Endpoint da aba Sítio/GA4 ===
// Independente do /api/dashboard (mídia+funil). Busca tudo do GA4 em paralelo.
import { NextRequest, NextResponse } from "next/server";
import { daysBetween, defaultRange } from "@/lib/dates";
import {
  ga4Channels, ga4LandingPages, ga4Overview, ga4TopPages, HAS_GA4,
} from "@/lib/integrations/ga4";
import type { GA4ChannelRow, GA4Overview, GA4Payload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function prevRange(from: string, to: string): { from: string; to: string } {
  const len = daysBetween(from, to);
  const prevTo = new Date(from + "T00:00:00");
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (len - 1));
  return { from: isoOf(prevFrom), to: isoOf(prevTo) };
}

const EMPTY_OV: GA4Overview = {
  users: 0, sessions: 0, newUsers: 0, engagementRate: 0,
  avgSessionDuration: 0, conversions: 0, pageViews: 0,
};

/** Classifica os canais GA4 em orgânico / pago / outro. */
function splitOrganicPaid(channels: GA4ChannelRow[]) {
  let organic = 0, paid = 0, other = 0;
  for (const c of channels) {
    const ch = c.channel.toLowerCase();
    if (ch.includes("paid") || ch.includes("display") || ch.includes("cross-network")) paid += c.sessions;
    else if (ch.includes("organic")) organic += c.sessions;
    else other += c.sessions;
  }
  return { organic, paid, other };
}

export async function GET(req: NextRequest) {
  const { from: defFrom, to: defTo } = defaultRange();
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") ?? defFrom;
  const to = sp.get("to") ?? defTo;
  const fresh = sp.get("fresh") === "1";
  const prev = prevRange(from, to);

  if (!HAS_GA4()) {
    const empty: GA4Payload = {
      overview: EMPTY_OV, overviewPrev: EMPTY_OV, channels: [],
      organicVsPaid: { organic: 0, paid: 0, other: 0 },
      topPages: [], landingPages: [], _mock: true,
    };
    return NextResponse.json(empty);
  }

  const [overview, overviewPrev, channels, topPages, landingPages] = await Promise.all([
    ga4Overview(from, to, fresh),
    ga4Overview(prev.from, prev.to, fresh),
    ga4Channels(from, to, fresh),
    ga4TopPages(from, to, fresh),
    ga4LandingPages(from, to, fresh),
  ]);

  const out: GA4Payload = {
    overview, overviewPrev, channels,
    organicVsPaid: splitOrganicPaid(channels),
    topPages, landingPages, _mock: false,
  };
  return NextResponse.json(out);
}
