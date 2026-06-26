import { NextRequest, NextResponse } from "next/server";
import { defaultRange, eachDay } from "@/lib/dates";
import { META, GOOGLE, HAS_ANY_CREDS } from "@/lib/env";
import { metaInsightsDaily, metaDailyToSource } from "@/lib/integrations/meta";
import { googleDaily } from "@/lib/integrations/google";
import { mockDays } from "@/lib/mock";
import type { Contratante, DaySource, Platform, TimelineDay } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY: DaySource = { invest: 0, leads: 0, oport: 0, ganho: 0, impressions: 0, clicks: 0 };

export async function GET(req: NextRequest) {
  const { from: defFrom, to: defTo } = defaultRange();
  const sp = req.nextUrl.searchParams;
  const dateFrom = sp.get("from") ?? defFrom;
  const dateTo = sp.get("to") ?? defTo;
  const platform = (sp.get("platform") ?? "all") as Platform;
  const contratante = (sp.get("contratante") ?? "all") as Contratante;

  // Sem credenciais → mock (já cobre todos os dias do período).
  if (!HAS_ANY_CREDS()) {
    return NextResponse.json(mockDays(dateFrom, dateTo));
  }

  // Busca apenas a fonte necessária para a plataforma selecionada.
  const wantMeta = !!META.token && (platform === "all" || platform === "meta");
  const wantGoogle = !!GOOGLE.devToken && (platform === "all" || platform === "google");

  const [metaDaily, gadsByDate] = await Promise.all([
    wantMeta ? metaInsightsDaily(dateFrom, dateTo, contratante) : Promise.resolve([]),
    wantGoogle ? googleDaily(dateFrom, dateTo, contratante) : Promise.resolve({} as Record<string, DaySource>),
  ]);

  const metaByDate: Record<string, DaySource> = {};
  for (const r of metaDaily) {
    const d = r.date_start ?? r.date;
    if (!d) continue;
    metaByDate[d] = metaDailyToSource(r);
  }

  // Intervalo CONTÍNUO: todos os dias do período aparecem, mesmo zerados,
  // para o eixo X não comprimir e o "dias selecionados" ficar correto.
  const days: TimelineDay[] = eachDay(dateFrom, dateTo).map((d) => ({
    date: d,
    google: gadsByDate[d] ?? { ...EMPTY },
    meta: metaByDate[d] ?? { ...EMPTY },
  }));

  return NextResponse.json(days);
}
