// === Tipos compartilhados do dashboard ===

export type Platform = "all" | "meta" | "google";

/**
 * Segmento de público. O segmento vem de TipCte__c; a recência do médico, de
 * Tempo_de_Formado__c. Ver docs/fundacao-dados.md (seção 4).
 *  - "all" → Ambos (RF + MM)
 *  - "rf"  → Recém-Formado (Formando, ou Médico com recência recente)
 *  - "mm"  → Médico Maduro (Revalida, ou Médico maduro / sem recência)
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

/** Coorte de fechamento: fechados Ganho no período × mês de origem (CreatedDate). */
export interface CohortPoint {
  mes: string; // "YYYY-MM" do mês de origem da captação
  qtd: number;
}

/** Payload consolidado do endpoint /api/dashboard (uma resposta = todo o dashboard). */
export interface DashboardPayload {
  metrics: Metrics;
  metricsPrev: Metrics;
  funnel: FunnelData;
  timeline: TimelineDay[];
  dailyFunnel: DailyFunnelPoint[];
  campaigns: Campaign[];
  /** Coorte de fechamento (fechados no período por mês de origem). */
  cohort?: CohortPoint[];
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

// ── GA4 (aba Sítio) ─────────────────────────────────────────────────────
export interface GA4Overview {
  users: number;
  sessions: number;
  newUsers: number;
  engagementRate: number;      // 0..1
  avgSessionDuration: number;  // segundos
  conversions: number;
  pageViews: number;
}

/** Linha por canal de aquisição (sessionDefaultChannelGroup). */
export interface GA4ChannelRow {
  channel: string;
  sessions: number;
  users: number;
}

export interface GA4PageRow {
  path: string;
  views: number;
  avgDuration: number;
}

/** Linha por landing page (lp.caveo / lp2.caveo). */
export interface GA4LandingRow {
  landingPage: string;
  sessions: number;
  conversions: number;
  engagementRate: number;
  avgDuration: number;
}

/** Payload do endpoint /api/ga4 (aba Sítio/GA4). */
export interface GA4Payload {
  overview: GA4Overview;
  overviewPrev: GA4Overview;
  channels: GA4ChannelRow[];
  /** Derivado dos canais: sessões orgânicas vs. pagas. */
  organicVsPaid: { organic: number; paid: number; other: number };
  topPages: GA4PageRow[];
  landingPages: GA4LandingRow[];
  _mock: boolean;
}
