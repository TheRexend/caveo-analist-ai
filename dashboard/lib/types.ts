// === Tipos compartilhados do dashboard ===

export type Platform = "all" | "meta" | "google";

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

export type Goals = Record<string, number>;
