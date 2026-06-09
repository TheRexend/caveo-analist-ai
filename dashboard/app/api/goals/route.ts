import { NextRequest, NextResponse } from "next/server";
import { getGoals, saveGoals } from "@/lib/integrations/goals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULTS = {
  invest: 60000, leads: 400, cpl: 160, oport: 110,
  cpo: 560, tx_conv: 0.25, ganho: 28, cpf: 2200, oport_perdidas: 50,
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") ?? currentMonth();
  try {
    return NextResponse.json(await getGoals(month));
  } catch (e) {
    console.error("[goals] GET falhou, usando defaults:", e);
    return NextResponse.json(DEFAULTS);
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  const month = (body.month as string) ?? currentMonth();
  delete body.month;
  try {
    await saveGoals(month, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[goals] POST falhou:", e);
    return NextResponse.json({ ok: false, error: "storage indisponível" }, { status: 200 });
  }
}
