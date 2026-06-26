// === Drill-down de oportunidades por estágio do funil ===
// Lista (não contagem) das oportunidades de um estágio, respeitando os filtros
// atuais (plataforma/UTM, contratante/TipCte, intervalo + modelo de duas datas).
import { NextRequest, NextResponse } from "next/server";
import { defaultRange } from "@/lib/dates";
import { HAS_ANY_CREDS } from "@/lib/env";
import { sfOpportunities } from "@/lib/integrations/salesforce";
import { mockOpportunities } from "@/lib/mock";
import type { Contratante, FunnelDrillKey, Platform } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: FunnelDrillKey[] = ["no_crm", "trat", "prop", "ganho", "perdido"];

export async function GET(req: NextRequest) {
  const { from: defFrom, to: defTo } = defaultRange();
  const sp = req.nextUrl.searchParams;
  const dateFrom = sp.get("from") ?? defFrom;
  const dateTo = sp.get("to") ?? defTo;
  const platform = (sp.get("platform") ?? "all") as Platform;
  const contratante = (sp.get("contratante") ?? "all") as Contratante;
  const fresh = sp.get("fresh") === "1";
  const stageParam = sp.get("stage") ?? "no_crm";
  const stage = (VALID.includes(stageParam as FunnelDrillKey) ? stageParam : "no_crm") as FunnelDrillKey;

  if (!HAS_ANY_CREDS()) {
    return NextResponse.json(mockOpportunities(stage));
  }

  const rows = await sfOpportunities(dateFrom, dateTo, platform, contratante, stage, fresh);
  return NextResponse.json(rows ?? []);
}
