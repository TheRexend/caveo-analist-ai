// === Salesforce via REST/SOQL (port de _sf_* do server.py) ===
import "server-only";
import { SF } from "@/lib/env";
import type { Platform } from "@/lib/types";

let _token = "";

interface SfRecord {
  StageName?: string;
  cnt?: number;
  [k: string]: unknown;
}
interface SfQueryResult {
  records?: SfRecord[];
  done?: boolean;
  nextRecordsUrl?: string;
}

async function sfRefresh(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: SF.clientId,
    client_secret: SF.clientSecret,
    refresh_token: SF.refreshToken,
  });
  const res = await fetch(`${SF.instance}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as { access_token: string };
  _token = json.access_token;
  return _token;
}

async function sfQuery(soql: string, retry = true): Promise<SfQueryResult | null> {
  if (!_token && !SF.accessToken && !SF.refreshToken) return null;
  if (!_token) _token = SF.accessToken;

  const url = `${SF.instance}/services/data/${SF.apiVersion}/query?q=${encodeURIComponent(soql)}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${_token}`, Accept: "application/json" },
    });
    if (res.status === 401 && retry && SF.refreshToken) {
      await sfRefresh();
      return sfQuery(soql, false);
    }
    if (!res.ok) return null;
    return (await res.json()) as SfQueryResult;
  } catch {
    return null;
  }
}

// ── Filtros de UTM por plataforma (idênticos ao server.py) ──────────────
const UTM_FILTER: Record<Platform, string> = {
  all:
    "AND (UtmSou__c LIKE 'facebook%' OR UtmSou__c LIKE 'instagram%' " +
    "OR UtmSou__c LIKE 'google%' OR UtmSou__c = '{{placement}}' " +
    "OR UtmMed__c = 'paid_social')",
  meta:
    "AND (UtmSou__c LIKE 'facebook%' OR UtmSou__c LIKE 'instagram%' " +
    "OR UtmSou__c = '{{placement}}' OR UtmMed__c = 'paid_social')",
  google: "AND UtmSou__c LIKE 'google%'",
};

// Estágios reais do Salesforce da Caveo
const WON_STAGES = new Set(["Fechado", "Ganho não Identificado"]);
const LOST_STAGES = new Set(["Perdido"]);
const EM_TRATAMENTO_STAGES = new Set([
  "Nova", "Contato Realizado", "Aguardando Resposta",
  "Reunião Agendada", "Standy-By", "Stand By", "Transferido para humano",
]);
const PROPOSTA_STAGES = new Set(["Proposta Enviada"]);

export interface SfFunnel {
  no_crm: number;
  em_tratamento: number;
  proposta: number;
  ganho: number;
  perdido: number;
}

export async function sfFunnel(
  dateFrom: string,
  dateTo: string,
  platform: Platform,
): Promise<SfFunnel | null> {
  const utmf = UTM_FILTER[platform] ?? UTM_FILTER.all;
  const soql =
    `SELECT StageName, COUNT(Id) cnt FROM Opportunity ` +
    `WHERE CreatedDate >= ${dateFrom}T00:00:00Z ` +
    `AND CreatedDate <= ${dateTo}T23:59:59Z ${utmf} GROUP BY StageName`;

  const res = await sfQuery(soql);
  if (!res || !res.records || res.records.length === 0) return null;

  const byStage: Record<string, number> = {};
  for (const r of res.records) {
    if (r.StageName) byStage[r.StageName] = Number(r.cnt ?? 0);
  }

  const sumIn = (set: Set<string>) =>
    Object.entries(byStage).reduce((acc, [k, v]) => (set.has(k) ? acc + v : acc), 0);

  return {
    no_crm: Object.values(byStage).reduce((a, b) => a + b, 0),
    em_tratamento: sumIn(EM_TRATAMENTO_STAGES),
    proposta: sumIn(PROPOSTA_STAGES),
    ganho: sumIn(WON_STAGES),
    perdido: sumIn(LOST_STAGES),
  };
}

export async function sfPing(): Promise<boolean> {
  const r = await sfQuery("SELECT Id FROM Lead LIMIT 1");
  return r !== null;
}
