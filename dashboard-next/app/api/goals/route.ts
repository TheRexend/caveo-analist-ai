import { NextRequest, NextResponse } from "next/server";
import { getGoals, saveGoals } from "@/lib/integrations/goals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") ?? currentMonth();
  return NextResponse.json(await getGoals(month));
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  const month = (body.month as string) ?? currentMonth();
  delete body.month;
  await saveGoals(month, body);
  return NextResponse.json({ ok: true });
}
