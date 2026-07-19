// === GA4 Data API (runReport) — camada direta do dashboard (server-only) ===
// Independente do MCP GA4 (que serve a camada agêntica). Usa service account
// via google-auth-library para o token e REST para o runReport.
import "server-only";
import { JWT } from "google-auth-library";
import { GA4, HAS_GA4 } from "@/lib/env";
import { cached } from "@/lib/cache";
import type {
  GA4ChannelRow, GA4LandingRow, GA4Overview, GA4PageRow,
} from "@/lib/types";

const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];
const BASE = "https://analyticsdata.googleapis.com/v1beta";
const LP_HOSTS = ["lp.caveo.com.br", "lp2.caveo.com.br"];

let _jwt: JWT | null = null;

function jwtClient(): JWT | null {
  if (_jwt) return _jwt;
  const { client_email, private_key } = GA4.creds;
  if (!client_email || !private_key) return null;
  _jwt = new JWT({ email: client_email, key: private_key, scopes: SCOPES });
  return _jwt;
}

interface GA4Row {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
}
interface GA4Report {
  rows?: GA4Row[];
}

/** POST runReport na propriedade da Caveo. Retorna null se sem credencial/erro. */
async function runReport(body: Record<string, unknown>): Promise<GA4Report | null> {
  const client = jwtClient();
  if (!client || !GA4.propertyId) return null;
  try {
    const { token } = await client.getAccessToken();
    if (!token) return null;
    const res = await fetch(`${BASE}/properties/${GA4.propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[GA4] API error:", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    return (await res.json()) as GA4Report;
  } catch (e) {
    console.error("[GA4] request falhou:", e);
    return null;
  }
}

const dateRanges = (from: string, to: string) => [{ startDate: from, endDate: to }];
const num = (r: GA4Row, i: number) => Number(r.metricValues?.[i]?.value ?? 0);
const dim = (r: GA4Row, i: number) => r.dimensionValues?.[i]?.value ?? "";

/** Totais do período (uma linha agregada). */
export function ga4Overview(from: string, to: string, fresh = false): Promise<GA4Overview> {
  return cached(
    `ga4Overview:${from}:${to}`,
    async () => {
      const rep = await runReport({
        dateRanges: dateRanges(from, to),
        metrics: [
          { name: "activeUsers" }, { name: "sessions" }, { name: "newUsers" },
          { name: "engagementRate" }, { name: "averageSessionDuration" },
          { name: "conversions" }, { name: "screenPageViews" },
        ],
      });
      const r = rep?.rows?.[0];
      return {
        users: r ? num(r, 0) : 0,
        sessions: r ? num(r, 1) : 0,
        newUsers: r ? num(r, 2) : 0,
        engagementRate: r ? num(r, 3) : 0,
        avgSessionDuration: r ? num(r, 4) : 0,
        conversions: r ? num(r, 5) : 0,
        pageViews: r ? num(r, 6) : 0,
      };
    },
    { fresh },
  );
}

/** Sessões/usuários por canal de aquisição (default channel grouping). */
export function ga4Channels(from: string, to: string, fresh = false): Promise<GA4ChannelRow[]> {
  return cached(
    `ga4Channels:${from}:${to}`,
    async () => {
      const rep = await runReport({
        dateRanges: dateRanges(from, to),
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }, { name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      });
      return (rep?.rows ?? []).map((r) => ({
        channel: dim(r, 0), sessions: num(r, 0), users: num(r, 1),
      }));
    },
    { fresh },
  );
}

/** Páginas mais acessadas por pageviews. */
export function ga4TopPages(from: string, to: string, fresh = false): Promise<GA4PageRow[]> {
  return cached(
    `ga4TopPages:${from}:${to}`,
    async () => {
      const rep = await runReport({
        dateRanges: dateRanges(from, to),
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      });
      return (rep?.rows ?? []).map((r) => ({
        path: dim(r, 0), views: num(r, 0), avgDuration: num(r, 1),
      }));
    },
    { fresh },
  );
}

/** Landing pages (filtradas aos hosts das LPs da Caveo). */
export function ga4LandingPages(from: string, to: string, fresh = false): Promise<GA4LandingRow[]> {
  return cached(
    `ga4LandingPages:${from}:${to}`,
    async () => {
      const rep = await runReport({
        dateRanges: dateRanges(from, to),
        dimensions: [{ name: "landingPage" }, { name: "hostName" }],
        metrics: [
          { name: "sessions" }, { name: "conversions" },
          { name: "engagementRate" }, { name: "averageSessionDuration" },
        ],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 25,
      });
      const rows = (rep?.rows ?? [])
        .filter((r) => LP_HOSTS.some((h) => dim(r, 1).includes(h)))
        .map((r) => ({
          landingPage: `${dim(r, 1)}${dim(r, 0)}`,
          sessions: num(r, 0),
          conversions: num(r, 1),
          engagementRate: num(r, 2),
          avgDuration: num(r, 3),
        }));
      return rows;
    },
    { fresh },
  );
}

export { HAS_GA4 };

export async function ga4Ping(): Promise<boolean> {
  if (!HAS_GA4()) return false;
  const rep = await runReport({
    dateRanges: dateRanges("yesterday", "yesterday"),
    metrics: [{ name: "sessions" }],
  });
  return rep !== null;
}
