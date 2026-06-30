// === Tipos compartilhados do dashboard ===

export type Platform = "all" | "meta" | "google";

/**
 * Segmento de público (campo Salesforce TipCte__c + nomenclatura de campanhas):
 *  - "all" → Ambos (Recém-Formado + Médicos Maduros; exclui Revalida/sem classificação)
 *  - "rf"  → Recém-Formado (TipCte__c em Formando/Médico)
 *  - "mm"  → Médicos Maduros (TipCte__c = "Médicos Maduros")
 */
export type Contratante = "all" | "rf" | "mm";

export interface Metrics {
  invest: number;
  leads: number;
  oport: number;
  ganho: number;
  cpl: number;
  cpo: number;
  cpf: number;
  tx_conv: number;
  oport_perdidas: number;
  /** Meta only: total de complete_registration (Registro concluído no site). */
  complete_reg?: number;
  /** Meta only: custo por registro concluído (invest / complete_reg). */
  cpr?: number;
  _mock?: boolean;
}

export interface Campaign {
  id: string;
  platform: "meta" | "google";
  name: string;
  invest: number;
  impr: number;
  clicks: number;
  leads: number;
  oport: number;
  ganho: number;
  ctr: number;
  cpc: number;
  cpl: number;
  cpo: number;
  cpf: number;
  txLeadOport: number;
  txOportGanho: number;
}

export interface FunnelData {
  lead_novo: number;
  no_crm: number;
  em_tratamento: number;
  proposta: number;
  ganho: number;
  perdido: number;
  /** Composição do "Ganho" por estágio (ex.: Fechado, Ganho não Identificado). */
  ganho_breakdown?: Record<string, number>;
  /** Subconjunto de cada estágio atribuído via CRUZAMENTO (click ID, UtmMed__c ≠ cpc). */
  cruzamento?: {
    no_crm: number;
    em_tratamento: number;
    proposta: number;
    ganho: number;
    perdido: number;
  };
  _mock?: boolean;
}

export interface DaySource {
  invest: number;
  leads: number;
  oport: number;
  ganho: number;
  impressions: number;
  clicks: number;
}

export interface TimelineDay {
  date: string;
  google: DaySource;
  meta: DaySource;
}

/** Ponto diário do funil Salesforce: oportunidades criadas e fechamentos no dia. */
export interface DailyFunnelPoint {
  date: string;
  oport: number;
  ganho: number;
}

/** Estágios do funil com drill-down de oportunidades (lista, não só contagem). */
export type FunnelDrillKey = "no_crm" | "trat" | "prop" | "ganho" | "perdido";

/** Linha da tabela de drill-down de oportunidades (clique num estágio do funil). */
export interface OpportunityRow {
  id: string;
  account: string;
  email: string;
  /** UtmSou__c — origem de UTM da oportunidade. */
  source: string;
  name: string;
  stage: string;
  /** Atribuição: "cpc" = UTM medium=cpc (direta); "cruzamento" = via click ID (medium ≠ cpc). */
  origem: "cpc" | "cruzamento";
}

/** Métricas de cada plataforma para o comparativo Meta × Google. */
export interface PlatformCompareData {
  meta: Metrics;
  google: Metrics;
}

/** Payload consolidado do endpoint /api/dashboard (uma resposta = todo o dashboard). */
export interface DashboardPayload {
  metrics: Metrics;
  metricsPrev: Metrics;
  funnel: FunnelData;
  timeline: TimelineDay[];
  dailyFunnel: DailyFunnelPoint[];
  campaigns: Campaign[];
  /** Presente apenas quando platform === "all". */
  platformCompare?: PlatformCompareData;
  _mock: boolean;
}

export type Goals = Record<string, number>;

/** Health-check de uma integração externa. */
export type HealthStatus = "ok" | "down" | "no_creds";
export interface ServiceHealth {
  status: HealthStatus;
  /** Latência do ping em ms; null quando não checado (sem credenciais). */
  latencyMs: number | null;
}

/** Payload do endpoint /api/health: status por integração. */
export interface HealthPayload {
  google: ServiceHealth;
  meta: ServiceHealth;
  salesforce: ServiceHealth;
  checkedAt: string;
}
