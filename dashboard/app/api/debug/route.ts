import { NextResponse } from "next/server";
import fs from "node:fs";
import { META, SF, GOOGLE } from "@/lib/env";
import { metaPing } from "@/lib/integrations/meta";
import { googlePing } from "@/lib/integrations/google";
import { sfPing } from "@/lib/integrations/salesforce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = {
    meta: { token_present: !!META.token, account: META.account },
    google: {
      devtoken_present: !!GOOGLE.devToken,
      creds_path: GOOGLE.credsPath,
      creds_file_exists: !!(GOOGLE.credsPath && fs.existsSync(
        GOOGLE.credsPath.startsWith("/") ? GOOGLE.credsPath : `../${GOOGLE.credsPath}`,
      )),
      target_customer: GOOGLE.targetCustomerId,
      login_customer: GOOGLE.loginCustomerId,
      api_version: GOOGLE.apiVersion,
      creds_type: GOOGLE.creds.type ?? "unknown",
      has_refresh_token: !!GOOGLE.creds.refresh_token,
    },
    salesforce: {
      instance: SF.instance,
      token_present: !!SF.accessToken,
      refresh_present: !!SF.refreshToken,
    },
  };

  const meta = result.meta as Record<string, unknown>;
  const google = result.google as Record<string, unknown>;
  const salesforce = result.salesforce as Record<string, unknown>;

  if (META.token) {
    try {
      meta.ping = (await metaPing()) ? "ok" : "error — check logs";
    } catch {
      meta.ping = "exception";
    }
  }
  if (GOOGLE.devToken && GOOGLE.creds.refresh_token) {
    try {
      google.oauth = (await googlePing()) ? "ok" : "failed — check logs";
    } catch {
      google.oauth = "exception";
    }
  }
  if (SF.accessToken || SF.refreshToken) {
    try {
      salesforce.ping = (await sfPing()) ? "ok" : "error";
    } catch {
      salesforce.ping = "exception";
    }
  }

  return NextResponse.json(result);
}
