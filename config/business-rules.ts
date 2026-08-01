// ============================================================================
// FONTE ÚNICA de regras de negócio de atribuição da Caveo.
//
// Consumida por DOIS lados, sem que um dependa do outro:
//   - Dashboard  → importa direto (`@/config/business-rules`) em lib/integrations.
//   - Camada agêntica → lê docs/fundacao-dados.md, que é GERADO deste arquivo
//                       por `config/generate-docs.ts` (npm run docs:rules).
//
// NÃO edite o Markdown gerado à mão. Edite ESTE arquivo e rode `npm run docs:rules`.
// A checagem `npm run docs:check` falha se o Markdown ficar desatualizado.
// ============================================================================

export type Channel = "all" | "meta" | "google";
export type ContratanteKey = "all" | "formando" | "medico" | "revalida";

// ── 1. Canal — UTM source → plataforma ──────────────────────────────────────
// Padrões usados em `UtmSou__c LIKE '<padrão>'`.
export const CHANNEL_RULES = {
  meta: {
    utmSourcePatterns: ["facebook%", "Instagram%", "messenger%", "audience_network%", "{{placement}}"],
  },
  google: {
    utmSourcePatterns: ["google%", "Youtube%"],
  },
  naoDigital: { description: "Todo UtmSou__c preenchido que não bate em meta/google (indicações, faculdade, WhatsApp, etc.)" },
  semUtm: { description: "UtmSou__c = null — pipeline não atribuído" },
} as const;

// ── 2. Cruzamento — click ID quando UtmMed__c != cpc ────────────────────────
// Oportunidades cujo medium NÃO é cpc mas tiveram interferência de mídia paga
// via click ID. Meta tem prioridade sobre Google em caso de conflito.
export const CRUZAMENTO_RULES = {
  meta: { clickIdFields: ["fbc__c", "fbclid__c"] },
  google: { clickIdFields: ["gclid__c", "gbraid__c"], excludeIfMetaClickId: true },
} as const;

// ── 3. Estágios do funil (Salesforce) ───────────────────────────────────────
export const STAGE_GROUPS = {
  emTratamento: [
    "Nova", "Contato Realizado", "Aguardando Resposta",
    "Reunião Agendada", "Standy-By", "Stand By", "Transferido para humano",
  ],
  proposta: ["Proposta Enviada"],
  // Ganho = IsWon real (estágio "Fechado") + "Ganho não Identificado"
  // (IsWon=false no SF, mas contabilizado como ganho pela operação).
  ganho: {
    ganhoNaoIdentificado: "Ganho não Identificado",
    wonClause: "IsWon = true OR StageName = 'Ganho não Identificado'",
  },
  perdido: ["Perdido"],
} as const;

// ── 4. Contratante — segmento (TipCte__c) ───────────────────────────────────
// Mudança de ICP (2026-07-31): classificação direta por TipCte__c, sem regra
// composta com recência. Tempo_de_Formado__c é um atributo informativo dentro
// de "medico" (útil para análises pontuais) — não participa da classificação.
// Mídia paga mira 100% em "medico"; "formando" é segmento secundário válido no
// funil, não ruído. "revalida" é categoria à parte (não funde com "medico").
export const CONTRATANTE_RULES = {
  recencyField: "Tempo_de_Formado__c",
  segments: ["Formando", "Médico", "Revalida"] as const,
} as const;

/** Classifica uma opp em "formando" | "medico" | "revalida" | null a partir de TipCte__c. */
export function classifyContratante(
  tipCte: string | null,
): "formando" | "medico" | "revalida" | null {
  if (tipCte === "Formando") return "formando";
  if (tipCte === "Médico") return "medico";
  if (tipCte === "Revalida") return "revalida";
  return null; // TipCte null/desconhecido → fora de segmentação
}

// ── 5. Modelo de duas datas ─────────────────────────────────────────────────
export const DATE_MODEL = {
  entryDateField: "CreatedDate",         // no_crm, em_tratamento, proposta
  closeDateField: "LastStageChangeDate", // ganho, perdido
  description:
    "Entrada do funil conta pela data de criação; fechamento/perda pela data " +
    "da última mudança de estágio, mesmo que a oportunidade tenha sido criada " +
    "em período anterior.",
} as const;

// ── 6. Coorte de fechamento ─────────────────────────────────────────────────
export const COHORT_RULES = {
  scope: "ganho", // Fechado + Ganho não Identificado — NÃO inclui Perdido
  originField: "CreatedDate",        // mês de captação de origem
  closeField: "LastStageChangeDate", // período de referência (mês do fechamento)
  description:
    "Fechamentos Ganho de um período quebrados por mês de origem da captação " +
    "(CreatedDate), agregados em buckets YYYY-MM fora do SOQL.",
} as const;

// ── 7. Qualificação — MQL / SQL (nomenclatura interna da agência) ────────────
// Cumulativo via OpportunityHistory: a opp conta se JÁ ATINGIU o estágio-limiar
// em algum momento. O DIA do MQL/SQL é o da primeira transição que cruza o gate
// (não a data de criação). `alsoWon`: uma opp Ganho conta mesmo sem transição
// explícita ao estágio-limiar registrada.
export const QUALIFICATION_RULES = {
  mql: {
    reachedStages: ["Aguardando Resposta", "Reunião Agendada", "Proposta Enviada"],
    alsoWon: true,
  },
  sql: {
    reachedStages: ["Proposta Enviada"],
    alsoWon: true,
  },
} as const;

// ============================================================================
// BUILDERS DE SOQL — mantêm a lógica de atribuição num só lugar.
// O dashboard consome estes builders em vez de reescrever as cláusulas.
// ============================================================================

const NON_CPC = "(UtmMed__c = null OR (NOT UtmMed__c LIKE '%cpc%'))";
const orNotNull = (fields: readonly string[]) => fields.map((f) => `${f} != null`).join(" OR ");
const andIsNull = (fields: readonly string[]) => fields.map((f) => `${f} = null`).join(" AND ");
const quoteIn = (values: readonly string[]) => values.map((v) => `'${v}'`).join(",");

/** Atribuição DIRETA por UtmMed__c = cpc. */
export function cpcExpr(p: Channel): string {
  switch (p) {
    case "meta": return "(UtmMed__c LIKE '%cpc%' AND (NOT UtmSou__c LIKE '%google%'))";
    case "google": return "(UtmMed__c LIKE '%cpc%' AND UtmSou__c LIKE '%google%')";
    default: return "UtmMed__c LIKE '%cpc%'";
  }
}

/** CRUZAMENTO por click ID (medium != cpc). Meta tem prioridade sobre Google. */
export function cruzExpr(p: Channel): string {
  const meta = CRUZAMENTO_RULES.meta.clickIdFields;
  const google = CRUZAMENTO_RULES.google.clickIdFields;
  switch (p) {
    case "meta": return `(${NON_CPC} AND (${orNotNull(meta)}))`;
    case "google": return `(${NON_CPC} AND (${orNotNull(google)}) AND ${andIsNull(meta)})`;
    default: return `(${NON_CPC} AND (${orNotNull([...meta, ...google])}))`;
  }
}

/** Filtro de contratante (com o " AND " inicial p/ concatenar ao WHERE).
 *  Classificação direta por TipCte__c — sem regra composta com recência. */
export function tipcteFilter(c: ContratanteKey): string {
  switch (c) {
    case "formando": return `AND TipCte__c IN ('Formando')`;
    case "medico":   return `AND TipCte__c IN ('Médico')`;
    case "revalida": return `AND TipCte__c IN ('Revalida')`;
    default:         return `AND TipCte__c IN (${quoteIn(CONTRATANTE_RULES.segments)})`;
  }
}

/** Cláusula de ganho (IsWon real + Ganho não Identificado). */
export const WON_CLAUSE = `(${STAGE_GROUPS.ganho.wonClause})`;
export const LOST_STAGE = STAGE_GROUPS.perdido[0];
export const EM_TRATAMENTO_STAGES = STAGE_GROUPS.emTratamento;
export const PROPOSTA_STAGES = STAGE_GROUPS.proposta;
