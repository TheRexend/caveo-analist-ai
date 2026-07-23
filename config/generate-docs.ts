// ============================================================================
// Gera docs/fundacao-dados.md a partir de config/business-rules.ts.
//
//   node config/generate-docs.ts          → escreve o Markdown
//   node config/generate-docs.ts --check  → falha (exit 1) se estiver desatualizado
//
// (Node >= 22 roda .ts nativamente por type-stripping — sem tsx/ts-node.)
// ============================================================================
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  CHANNEL_RULES, CRUZAMENTO_RULES, STAGE_GROUPS, CONTRATANTE_RULES,
  DATE_MODEL, COHORT_RULES, QUALIFICATION_RULES, SEGMENT_ALLOCATION,
  cpcExpr, cruzExpr, tipcteFilter, WON_CLAUSE,
} from "./business-rules.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "..", "docs", "fundacao-dados.md");

const codeList = (arr: readonly string[]) => arr.map((s) => `\`${s}\``).join(", ");

function build(): string {
  return `<!-- GERADO AUTOMATICAMENTE — não editar. Fonte: config/business-rules.ts. Rode \`npm run docs:rules\`. -->

# Fundação de Dados — Regras de Atribuição (Caveo)

Fonte única de verdade para a camada agêntica (skills/agentes). Antes de montar
qualquer query SOQL, use os mapeamentos abaixo — **não** embutir listas fixas
próprias nos arquivos de skill/agente.

## 1. Canal — UTM source → plataforma

| Plataforma | Regra |
|---|---|
| Meta Ads | \`UtmSou__c LIKE\` ${codeList(CHANNEL_RULES.meta.utmSourcePatterns)} |
| Google/YouTube | \`UtmSou__c LIKE\` ${codeList(CHANNEL_RULES.google.utmSourcePatterns)} |
| Não Digital | ${CHANNEL_RULES.naoDigital.description} |
| Sem UTM | ${CHANNEL_RULES.semUtm.description} |

## 2. Cruzamento — click ID quando \`UtmMed__c\` != cpc

Oportunidades cujo medium NÃO é cpc mas tiveram interferência de mídia paga via
click ID. Meta tem prioridade sobre Google em caso de conflito.

| Plataforma | Campos de click ID |
|---|---|
| Meta | ${codeList(CRUZAMENTO_RULES.meta.clickIdFields)} |
| Google | ${codeList(CRUZAMENTO_RULES.google.clickIdFields)} (excluído se houver click ID Meta) |

## 3. Estágios do funil

| Grupo | Estágios |
|---|---|
| Em tratamento | ${codeList(STAGE_GROUPS.emTratamento)} |
| Proposta | ${codeList(STAGE_GROUPS.proposta)} |
| Ganho | \`${STAGE_GROUPS.ganho.wonClause}\` |
| Perdido | ${codeList(STAGE_GROUPS.perdido)} |

## 4. Contratante — segmento (\`TipCte__c\`) + recência (\`${CONTRATANTE_RULES.recencyField}\`)

O segmento vem de \`TipCte__c\`; a recência do médico, de \`${CONTRATANTE_RULES.recencyField}\`.

| Bucket | Regra |
|---|---|
| RF — Recém-Formado | \`TipCte__c\` ∈ ${codeList(CONTRATANTE_RULES.rfSegments)} **ou** (\`TipCte__c\` = \`${CONTRATANTE_RULES.splitSegment}\` **e** \`${CONTRATANTE_RULES.recencyField}\` ∈ ${codeList(CONTRATANTE_RULES.rfRecencyValues)}) |
| MM — Médico Maduro | \`TipCte__c\` ∈ ${codeList(CONTRATANTE_RULES.mmSegments)} **ou** (\`TipCte__c\` = \`${CONTRATANTE_RULES.splitSegment}\` **e** recência fora do conjunto RF, incluindo \`null\`) |

> \`${CONTRATANTE_RULES.splitSegment}\` sem recência (\`null\`) cai em MM (fallback).
> Os valores antigos \`Médico Faculdades\`/\`Médicos Maduros\` foram descontinuados.

## 5. Modelo de duas datas

- Entrada do funil (no_crm/em tratamento/proposta) → \`${DATE_MODEL.entryDateField}\`
- Fechamento/perda (ganho/perdido) → \`${DATE_MODEL.closeDateField}\`

${DATE_MODEL.description}

## 6. Coorte de fechamento

Escopo: **${COHORT_RULES.scope}** (Fechado + Ganho não Identificado; não inclui Perdido).
Origem por \`${COHORT_RULES.originField}\`; referência por \`${COHORT_RULES.closeField}\`.
${COHORT_RULES.description}

## 7. Qualificação — MQL / SQL (nomenclatura interna)

Cumulativo via \`OpportunityHistory\` (a opp conta se **já atingiu** o estágio).
O dia do MQL/SQL é o da **primeira transição** que cruza o gate.

| Nível | Já atingiu (qualquer um) | Ganho também conta |
|---|---|---|
| MQL | ${codeList(QUALIFICATION_RULES.mql.reachedStages)} | ${QUALIFICATION_RULES.mql.alsoWon ? "sim" : "não"} |
| SQL | ${codeList(QUALIFICATION_RULES.sql.reachedStages)} | ${QUALIFICATION_RULES.sql.alsoWon ? "sim" : "não"} |

## 8. Alocação de segmento (campanhas de mídia paga)

Marcadores no nome da campanha: MM = \`${SEGMENT_ALLOCATION.tags.mm}\`, RF = \`${SEGMENT_ALLOCATION.tags.rf}\`.
Campanha **sem** marcador de segmento (institucional) → investimento e leads
rateados pela participação de opps do segmento naquela campanha (SF). Fallback
(gasto no dia, 0 opps) = ${SEGMENT_ALLOCATION.emptyRatioFallback.mm * 100}/${SEGMENT_ALLOCATION.emptyRatioFallback.rf * 100}.

## Fragmentos SOQL prontos (gerados dos builders)

| Filtro | all | meta | google |
|---|---|---|---|
| cpc (direto) | \`${cpcExpr("all")}\` | \`${cpcExpr("meta")}\` | \`${cpcExpr("google")}\` |
| cruzamento | \`${cruzExpr("all")}\` | \`${cruzExpr("meta")}\` | \`${cruzExpr("google")}\` |

Contratante: all → \`${tipcteFilter("all")}\` · rf → \`${tipcteFilter("rf")}\` · mm → \`${tipcteFilter("mm")}\`

Ganho: \`${WON_CLAUSE}\`
`;
}

const md = build();
const check = process.argv.includes("--check");

if (check) {
  let current = "";
  try { current = readFileSync(OUT_PATH, "utf8"); } catch { /* não existe */ }
  if (current !== md) {
    console.error("✗ docs/fundacao-dados.md está desatualizado. Rode `npm run docs:rules`.");
    process.exit(1);
  }
  console.log("✓ docs/fundacao-dados.md está sincronizado com business-rules.ts");
} else {
  writeFileSync(OUT_PATH, md);
  console.log(`✓ docs/fundacao-dados.md gerado (${md.length} bytes)`);
}
