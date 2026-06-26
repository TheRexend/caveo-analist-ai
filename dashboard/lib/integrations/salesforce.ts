// === Salesforce via REST/SOQL (port de _sf_* do server.py) ===
import "server-only";
import { SF } from "@/lib/env";
import { TZ_OFFSET } from "@/lib/dates";
import { cached } from "@/lib/cache";
import type { Contratante, FunnelDrillKey, OpportunityRow, Platform } from "@/lib/types";

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

// ── Filtros de plataforma por UTM medium (cpc) ──────────────────────────
// meta   = cpc e source não-google (Instagram_*/Facebook_*/facebook/{{placement}})
// google = cpc e source google
// all    = cpc (= união exata de meta + google)
const UTM_FILTER: Record<Platform, string> = {
  all: "AND UtmMed__c LIKE '%cpc%'",
  meta: "AND UtmMed__c LIKE '%cpc%' AND (NOT UtmSou__c LIKE '%google%')",
  google: "AND UtmMed__c LIKE '%cpc%' AND UtmSou__c LIKE '%google%'",
};

// ── Filtro de contratante por TipCte__c ─────────────────────────────────
// all = Ambos (RF + MM; exclui Revalida e sem classificação)
const TIPCTE_FILTER: Record<Contratante, string> = {
  all: "AND TipCte__c IN ('Formando','Médico','Médicos Maduros')",
  rf: "AND TipCte__c IN ('Formando','Médico')",
  mm: "AND TipCte__c = 'Médicos Maduros'",
};

// Estágios reais do Salesforce da Caveo
const LOST_STAGE = "Perdido";
// "Fechado Ganho" = ganho real (IsWon=true → estágio "Fechado") + "Ganho não
// Identificado" (IsWon=false no SF, mas contabilizado como ganho pela operação).
// Fragmento único reusado em sfFunnel, sfDaily e sfOpportunities p/ consistência.
const GANHO_UNID_STAGE = "Ganho não Identificado";
const WON_CLAUSE = `(IsWon = true OR StageName = '${GANHO_UNID_STAGE}')`;
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

const byStage = (res: SfQueryResult | null): Record<string, number> => {
  const m: Record<string, number> = {};
  for (const r of res?.records ?? []) {
    if (r.StageName) m[r.StageName] = Number(r.cnt ?? 0);
  }
  return m;
};

/**
 * Funil do Salesforce com MODELO DE DUAS DATAS:
 *  - Entrada do funil (no_crm/em_tratamento/proposta) → oportunidades CRIADAS
 *    no período (CreatedDate).
 *  - Fechamentos e perdas (ganho/perdido) → oportunidades cuja MUDANÇA DE FASE
 *    ocorreu no período (LastStageChangeDate), mesmo que criadas antes.
 * Datas alinhadas ao fuso da operação (TZ_OFFSET) para casar com Meta/Google.
 * Filtra por plataforma (UTM medium) e contratante (TipCte__c).
 */
export async function sfFunnel(
  dateFrom: string,
  dateTo: string,
  platform: Platform,
  contratante: Contratante = "all",
  fresh = false,
): Promise<SfFunnel | null> {
  return cached(
    `sfFunnel:${platform}:${contratante}:${dateFrom}:${dateTo}`,
    () => sfFunnelUncached(dateFrom, dateTo, platform, contratante),
    { fresh },
  );
}

async function sfFunnelUncached(
  dateFrom: string,
  dateTo: string,
  platform: Platform,
  contratante: Contratante,
): Promise<SfFunnel | null> {
  const utmf = UTM_FILTER[platform] ?? UTM_FILTER.all;
  const tipf = TIPCTE_FILTER[contratante] ?? TIPCTE_FILTER.all;
  const fromTs = `${dateFrom}T00:00:00${TZ_OFFSET}`;
  const toTs = `${dateTo}T23:59:59${TZ_OFFSET}`;

  // (1) Oportunidades CRIADAS no período → topo/meio do funil.
  const soqlCreated =
    `SELECT StageName, COUNT(Id) cnt FROM Opportunity ` +
    `WHERE CreatedDate >= ${fromTs} AND CreatedDate <= ${toTs} ${utmf} ${tipf} ` +
    `GROUP BY StageName`;

  // (2) Ganhos (IsWon + "Ganho não Identificado") e perdas (Perdido) cuja FASE mudou no período.
  const soqlClosed =
    `SELECT StageName, COUNT(Id) cnt FROM Opportunity ` +
    `WHERE (${WON_CLAUSE} OR StageName = '${LOST_STAGE}') ` +
    `AND LastStageChangeDate >= ${fromTs} AND LastStageChangeDate <= ${toTs} ${utmf} ${tipf} ` +
    `GROUP BY StageName`;

  const [resCreated, resClosed] = await Promise.all([
    sfQuery(soqlCreated),
    sfQuery(soqlClosed),
  ]);

  // Só consideramos "falha de fonte" quando AMBAS as queries falham (null).
  if (resCreated === null && resClosed === null) return null;

  const created = byStage(resCreated);
  const closed = byStage(resClosed);

  const sumIn = (src: Record<string, number>, set: Set<string>) =>
    Object.entries(src).reduce((acc, [k, v]) => (set.has(k) ? acc + v : acc), 0);

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

/**
 * Série diária do funil para o gráfico barra (oportunidades criadas/dia,
 * por CreatedDate) + linha (fechamentos/dia, por LastStageChangeDate).
 * Agrupa por dia civil local via DAY_ONLY(convertTimezone(...)).
 * Retorna mapa { "YYYY-MM-DD": { oport, ganho } } ou null se a fonte falhar.
 */
export async function sfDaily(
  dateFrom: string,
  dateTo: string,
  platform: Platform,
  contratante: Contratante = "all",
  fresh = false,
): Promise<Record<string, { oport: number; ganho: number }> | null> {
  return cached(
    `sfDaily:${platform}:${contratante}:${dateFrom}:${dateTo}`,
    () => sfDailyUncached(dateFrom, dateTo, platform, contratante),
    { fresh },
  );
}

async function sfDailyUncached(
  dateFrom: string,
  dateTo: string,
  platform: Platform,
  contratante: Contratante,
): Promise<Record<string, { oport: number; ganho: number }> | null> {
  const utmf = UTM_FILTER[platform] ?? UTM_FILTER.all;
  const tipf = TIPCTE_FILTER[contratante] ?? TIPCTE_FILTER.all;
  const fromTs = `${dateFrom}T00:00:00${TZ_OFFSET}`;
  const toTs = `${dateTo}T23:59:59${TZ_OFFSET}`;

  const soqlOport =
    `SELECT DAY_ONLY(convertTimezone(CreatedDate)) d, COUNT(Id) cnt FROM Opportunity ` +
    `WHERE CreatedDate >= ${fromTs} AND CreatedDate <= ${toTs} ${utmf} ${tipf} ` +
    `GROUP BY DAY_ONLY(convertTimezone(CreatedDate))`;

  const soqlGanho =
    `SELECT DAY_ONLY(convertTimezone(LastStageChangeDate)) d, COUNT(Id) cnt FROM Opportunity ` +
    `WHERE ${WON_CLAUSE} ` +
    `AND LastStageChangeDate >= ${fromTs} AND LastStageChangeDate <= ${toTs} ${utmf} ${tipf} ` +
    `GROUP BY DAY_ONLY(convertTimezone(LastStageChangeDate))`;

  const [resOport, resGanho] = await Promise.all([
    sfQuery(soqlOport),
    sfQuery(soqlGanho),
  ]);

  if (resOport === null && resGanho === null) return null;

  const out: Record<string, { oport: number; ganho: number }> = {};
  const bump = (iso: string | undefined, key: "oport" | "ganho", n: number) => {
    if (!iso) return;
    if (!out[iso]) out[iso] = { oport: 0, ganho: 0 };
    out[iso][key] += n;
  };
  for (const r of resOport?.records ?? []) bump(String(r.d ?? ""), "oport", Number(r.cnt ?? 0));
  for (const r of resGanho?.records ?? []) bump(String(r.d ?? ""), "ganho", Number(r.cnt ?? 0));
  return out;
}

/** Limite de linhas no drill-down (o sfQuery não pagina; cap defensivo). */
export const OPP_DRILL_LIMIT = 1000;

interface SfOppRecord {
  Id?: string;
  Name?: string;
  StageName?: string;
  Email_Lead__c?: string | null;
  UtmSou__c?: string | null;
  Account?: { Name?: string } | null;
}

/**
 * Lista de oportunidades de um estágio do funil (drill-down ao clicar no quadrante).
 * Mesma lógica de datas/UTM/TipCte do sfFunnel:
 *  - no_crm/trat/prop → criadas no período (CreatedDate)
 *  - ganho/perdido    → mudança de fase no período (LastStageChangeDate)
 * Retorna null se a fonte falhar.
 */
export async function sfOpportunities(
  dateFrom: string,
  dateTo: string,
  platform: Platform,
  contratante: Contratante,
  stage: FunnelDrillKey,
  fresh = false,
): Promise<OpportunityRow[] | null> {
  return cached(
    `sfOpps:${stage}:${platform}:${contratante}:${dateFrom}:${dateTo}`,
    () => sfOpportunitiesUncached(dateFrom, dateTo, platform, contratante, stage),
    { fresh },
  );
}

async function sfOpportunitiesUncached(
  dateFrom: string,
  dateTo: string,
  platform: Platform,
  contratante: Contratante,
  stage: FunnelDrillKey,
): Promise<OpportunityRow[] | null> {
  const utmf = UTM_FILTER[platform] ?? UTM_FILTER.all;
  const tipf = TIPCTE_FILTER[contratante] ?? TIPCTE_FILTER.all;
  const fromTs = `${dateFrom}T00:00:00${TZ_OFFSET}`;
  const toTs = `${dateTo}T23:59:59${TZ_OFFSET}`;
  const quote = (set: Set<string>) => [...set].map((s) => `'${s}'`).join(",");

  let where: string;
  let orderField: string;
  switch (stage) {
    case "trat":
      where = `CreatedDate >= ${fromTs} AND CreatedDate <= ${toTs} AND StageName IN (${quote(EM_TRATAMENTO_STAGES)})`;
      orderField = "CreatedDate";
      break;
    case "prop":
      where = `CreatedDate >= ${fromTs} AND CreatedDate <= ${toTs} AND StageName IN (${quote(PROPOSTA_STAGES)})`;
      orderField = "CreatedDate";
      break;
    case "ganho":
      where = `${WON_CLAUSE} AND LastStageChangeDate >= ${fromTs} AND LastStageChangeDate <= ${toTs}`;
      orderField = "LastStageChangeDate";
      break;
    case "perdido":
      where = `StageName = '${LOST_STAGE}' AND LastStageChangeDate >= ${fromTs} AND LastStageChangeDate <= ${toTs}`;
      orderField = "LastStageChangeDate";
      break;
    case "no_crm":
    default:
      where = `CreatedDate >= ${fromTs} AND CreatedDate <= ${toTs}`;
      orderField = "CreatedDate";
      break;
  }

  const soql =
    `SELECT Id, Account.Name, Name, StageName, Email_Lead__c, UtmSou__c FROM Opportunity ` +
    `WHERE ${where} ${utmf} ${tipf} ` +
    `ORDER BY ${orderField} DESC LIMIT ${OPP_DRILL_LIMIT}`;

  const res = await sfQuery(soql);
  if (res === null) return null;

  return ((res.records ?? []) as SfOppRecord[]).map((r, i) => ({
    id: r.Id ?? `opp_${i}`,
    account: r.Account?.Name ?? "—",
    email: r.Email_Lead__c ?? "",
    source: r.UtmSou__c ?? "",
    name: r.Name ?? "",
    stage: r.StageName ?? "",
  }));
}

export async function sfPing(): Promise<boolean> {
  const r = await sfQuery("SELECT Id FROM Lead LIMIT 1");
  return r !== null;
}
