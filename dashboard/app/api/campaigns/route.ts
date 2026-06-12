import { NextRequest, NextResponse } from "next/server";
import { defaultRange } from "@/lib/dates";
import { META, GOOGLE, HAS_ANY_CREDS } from "@/lib/env";
import { metaAllCampaigns } from "@/lib/integrations/meta";
import { googleCampaigns } from "@/lib/integrations/google";
import { buildMetaCampaigns, buildGoogleCampaigns } from "@/lib/build";
import { mockCampaigns } from "@/lib/mock";
import type { Platform } from "@/lib/types";

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
      ? await metaAllCampaigns(dateFrom, dateTo)
      : [];
  const gadsResp =
    GOOGLE.devToken && (platform === "all" || platform === "google")
      ? await googleCampaigns(dateFrom, dateTo)
      : null;

  // Mock só sem credenciais. Com credenciais, lista real (mesmo vazia).
  if (!HAS_ANY_CREDS()) {
    return NextResponse.json(mockCampaigns(platform));
  }

  const all = [];
  if (platform === "all" || platform === "meta") all.push(...buildMetaCampaigns(metaRows));
  if (platform === "all" || platform === "google") all.push(...buildGoogleCampaigns(gadsResp));

  return NextResponse.json(all);
}
