// === Health-check das integrações externas ===
// Ping leve e paralelo a Meta, Google Ads e Salesforce. Reusa os *Ping() de
// cada integração e devolve status + latência por serviço, para os indicadores
// da topbar/visão-geral. "no_creds" distingue ausência de credenciais de falha.
import { NextResponse } from "next/server";
import { HAS_GOOGLE, HAS_META, HAS_SF } from "@/lib/env";
import { metaPing } from "@/lib/integrations/meta";
import { googlePing } from "@/lib/integrations/google";
import { sfPing } from "@/lib/integrations/salesforce";
import type { HealthStatus, ServiceHealth } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function check(hasCreds: boolean, ping: () => Promise<boolean>): Promise<ServiceHealth> {
  if (!hasCreds) return { status: "no_creds", latencyMs: null };
  const t0 = Date.now();
  let status: HealthStatus;
  try {
    status = (await ping()) ? "ok" : "down";
  } catch {
    status = "down";
  }
  return { status, latencyMs: Date.now() - t0 };
}

export async function GET() {
  const [google, meta, salesforce] = await Promise.all([
    check(HAS_GOOGLE(), googlePing),
    check(HAS_META(), metaPing),
    check(HAS_SF(), sfPing),
  ]);
  return NextResponse.json({ google, meta, salesforce, checkedAt: new Date().toISOString() });
}
