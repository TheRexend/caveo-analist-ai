// === Salesforce via REST/SOQL (port de _sf_* do server.py) ===
import "server-only";
import { SF } from "@/lib/env";
import { TZ_OFFSET } from "@/lib/dates";
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
const LOST_STAGE = "Perdido";
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
  /** Composição do ganho por estágio (ex.: { "Fechado": n, "Ganho não Identificado": m }). */
  ganho_breakdown: Record<string, number>;
}

/**
 * Funil do Salesforce com MODELO DE DUAS DATAS:
 *  - Entrada do funil (no_crm/em_tratamento/proposta) → oportunidades CRIADAS
 *    no período (CreatedDate).
 *  - Fechamentos e perdas (ganho/perdido) → oportunidades cuja MUDANÇA DE FASE
 *    ocorreu no período (LastStageChangeDate), mesmo que criadas antes.
 * Datas alinhadas ao fuso da operação (TZ_OFFSET) para casar com Meta/Google.
 */
export async function sfFunnel(
  dateFrom: string,
  dateTo: string,
  platform: Platform,
): Promise<SfFunnel | null> {
  const utmf = UTM_FILTER[platform] ?? UTM_FILTER.all;
  const fromTs = `${dateFrom}T00:00:00${TZ_OFFSET}`;
  const toTs = `${dateTo}T23:59:59${TZ_OFFSET}`;

  // (1) Oportunidades CRIADAS no período → topo/meio do funil.
  const soqlCreated =
    `SELECT StageName, COUNT(Id) cnt FROM Opportunity ` +
    `WHERE CreatedDate >= ${fromTs} AND CreatedDate <= ${toTs} ${utmf} ` +
    `GROUP BY StageName`;

  // (2) Fechamentos (IsWon) e perdas (Perdido) cuja FASE mudou no período.
  const soqlClosed =
    `SELECT StageName, COUNT(Id) cnt FROM Opportunity ` +
    `WHERE (IsWon = true OR StageName = '${LOST_STAGE}') ` +
    `AND LastStageChangeDate >= ${fromTs} AND LastStageChangeDate <= ${toTs} ${utmf} ` +
    `GROUP BY StageName`;

  const [resCreated, resClosed] = await Promise.all([
    sfQuery(soqlCreated),
    sfQuery(soqlClosed),
  ]);

  // Só consideramos "falha de fonte" quando AMBAS as queries falham (null).
  // Resultado vazio com credenciais OK = zeros reais (não fallback p/ mock).
  if (resCreated === null && resClosed === null) return null;

  const byStage = (res: SfQueryResult | null): Record<string, number> => {
    const m: Record<string, number> = {};
    for (const r of res?.records ?? []) {
      if (r.StageName) m[r.StageName] = Number(r.cnt ?? 0);
    }
    return m;
  };

  const created = byStage(resCreated);
  const closed = byStage(resClosed);

  const sumIn = (src: Record<string, number>, set: Set<string>) =>
    Object.entries(src).reduce((acc, [k, v]) => (set.has(k) ? acc + v : acc), 0);

  // Ganho = tudo da query (2) que não é Perdido (já restrita a IsWon OR Perdido).
  const ganho_breakdown: Record<string, number> = {};
  let ganho = 0;
  let perdido = 0;
  for (const [stage, n] of Object.entries(closed)) {
    if (stage === LOST_STAGE) {
      perdido += n;
    } else {
      ganho_breakdown[stage] = n;
      ganho += n;
    }
  }

  return {
    no_crm: Object.values(created).reduce((a, b) => a + b, 0),
    em_tratamento: sumIn(created, EM_TRATAMENTO_STAGES),
    proposta: sumIn(created, PROPOSTA_STAGES),
    ganho,
    perdido,
    ganho_breakdown,
  };
}

export async function sfPing(): Promise<boolean> {
  const r = await sfQuery("SELECT Id FROM Lead LIMIT 1");
  return r !== null;
}
