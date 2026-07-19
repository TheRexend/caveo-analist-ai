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
export type ContratanteKey = "all" | "rf" | "mm";

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

// ── 4. Contratante — TipCte__c (CORRIGIDO 2026-07) ──────────────────────────
// Correção da empresa: "Médico" passou de RF para MM. Valor antigo
// "Médicos Maduros" foi substituído e não é mais considerado.
export const CONTRATANTE_RULES = {
  rf: ["Formando", "Médico Faculdades"],       // Recém Formados
  mm: ["Médico", "Revalida"],                  // Médico Maduro
} as const;

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

/** Filtro de contratante (com o " AND " inicial p/ concatenar ao WHERE). */
export function tipcteFilter(c: ContratanteKey): string {
  switch (c) {
    case "rf": return `AND TipCte__c IN (${quoteIn(CONTRATANTE_RULES.rf)})`;
    case "mm": return `AND TipCte__c IN (${quoteIn(CONTRATANTE_RULES.mm)})`;
    default: return `AND TipCte__c IN (${quoteIn([...CONTRATANTE_RULES.rf, ...CONTRATANTE_RULES.mm])})`;
  }
}

/** Cláusula de ganho (IsWon real + Ganho não Identificado). */
export const WON_CLAUSE = `(${STAGE_GROUPS.ganho.wonClause})`;
export const LOST_STAGE = STAGE_GROUPS.perdido[0];
export const EM_TRATAMENTO_STAGES = STAGE_GROUPS.emTratamento;
export const PROPOSTA_STAGES = STAGE_GROUPS.proposta;
