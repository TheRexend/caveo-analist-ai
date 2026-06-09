import { NextRequest, NextResponse } from "next/server";
import { defaultRange } from "@/lib/dates";
import { META, GOOGLE } from "@/lib/env";
import { metaInsightsDaily, metaDailyToSource } from "@/lib/integrations/meta";
import { googleDaily } from "@/lib/integrations/google";
import { mockDays } from "@/lib/mock";
import type { DaySource, TimelineDay } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY: DaySource = { invest: 0, leads: 0, oport: 0, ganho: 0, impressions: 0, clicks: 0 };

export async function GET(req: NextRequest) {
  const { from: defFrom, to: defTo } = defaultRange();
  const sp = req.nextUrl.searchParams;
  const dateFrom = sp.get("from") ?? defFrom;
  const dateTo = sp.get("to") ?? defTo;

  const metaDaily = META.token ? await metaInsightsDaily(dateFrom, dateTo) : [];
  const gadsByDate = GOOGLE.devToken ? await googleDaily(dateFrom, dateTo) : {};

  const usingMock = metaDaily.length === 0 && Object.keys(gadsByDate).length === 0;
  if (usingMock) {
    return NextResponse.json(mockDays(dateFrom, dateTo));
  }

  const metaByDate: Record<string, DaySource> = {};
  for (const r of metaDaily) {
    const d = r.date_start ?? r.date;
    if (!d) continue;
    metaByDate[d] = metaDailyToSource(r);
  }

  const allDates = Array.from(
    new Set([...Object.keys(metaByDate), ...Object.keys(gadsByDate)]),
  ).sort();

  const days: TimelineDay[] = [];
  for (const d of allDates) {
    if (d < dateFrom || d > dateTo) continue;
    days.push({
      date: d,
      google: gadsByDate[d] ?? { ...EMPTY },
      meta: metaByDate[d] ?? { ...EMPTY },
    });
  }

  return NextResponse.json(days);
}
