# Segmentação RF/MM por recência — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir a visualização "recém-formado × médico maduro" no novo modelo do cliente, em que `TipCte__c` carrega só o segmento e a recência do médico vive em `Tempo_de_Formado__c`.

**Architecture:** Regra composta (segmento + recência) encapsulada na Fundação (`config/business-rules.ts`): `tipcteFilter()` emite a cláusula SOQL composta e `classifyContratante()` classifica opps fora do SOQL. Dashboard herda o builder sem mudança de código; a skill diária passa a coletar `Tempo_de_Formado__c` nos SOQL 1C/1D/1E e classifica via `classifyContratante`.

**Tech Stack:** TypeScript (rodado nativamente por Node ≥22, type-stripping), Node built-in test runner (`node --test`), Markdown gerado por `config/generate-docs.ts`, skill em Markdown com helper Python (pytest, intocado).

## Global Constraints

- **Node ≥22** — `.ts` roda nativo (type-stripping); imports usam extensão `.ts` explícita (padrão já usado em `config/generate-docs.ts`).
- **Fonte única de regra** — a regra de contratante vive só em `config/business-rules.ts`; skills/agentes/dashboard **não** hardcodam listas.
- **`docs/fundacao-dados.md` é GERADO** — nunca editar à mão; regenerar com `npm run docs:rules`; `npm run docs:check` deve ficar verde.
- **Regra RF/MM (fechada):** Formando→RF; Médico+(`Menos de 3 anos`|`Vai se formar`)→RF; Médico+(demais, incl. `null`)→MM; Revalida→MM; `TipCte__c` null→fora de RF/MM.
- **Append-only** na planilha diária — a regra vale dos próximos dias em diante; dias já gravados não são reescritos.
- **Dependência de FLS:** `Tempo_de_Formado__c` exige Read liberado ao usuário de integração do MCP Salesforce; sem isso o SOQL retorna `INVALID_FIELD`.
- **Reconciliação-alvo (últimos 120 dias):** RF-médico = 1.001; MM-médico = 1.253 (1.238 `Mais de 3 anos` + 15 `null`).

---

## File Structure

- `config/business-rules.ts` — **modificar**: `CONTRATANTE_RULES` (composto), `tipcteFilter()` (cláusula composta), novo `classifyContratante()`.
- `config/business-rules.test.ts` — **criar**: testes de `classifyContratante` e `tipcteFilter` (`node --test`).
- `config/generate-docs.ts` — **modificar**: renderização da seção 4 no formato composto.
- `docs/fundacao-dados.md` — **regenerar** (saída de `npm run docs:rules`).
- `package.json` — **modificar**: script `test`.
- `lib/types.ts` — **modificar**: comentário de doc do tipo `Contratante`.
- `.claude/skills/acompanhamento-diario-caveo.md` — **modificar**: SOQL 1C/1D/1E + instrução de classificação.
- `docs/data-catalog.md` — **modificar**: registrar `Tempo_de_Formado__c` + nota `MesFor__c` + FLS.
- `docs/projeto-mapa.md` — **modificar** (Task 5): nota da mudança de regra.

---

## Task 1: Fundação — regra composta + classificador + doc regenerada

**Files:**
- Modify: `config/business-rules.ts:53-59` (bloco `CONTRATANTE_RULES`) e `config/business-rules.ts:137-144` (`tipcteFilter`)
- Modify: `config/generate-docs.ts:60-68` (seção 4)
- Create: `config/business-rules.test.ts`
- Modify: `package.json:5-12` (adicionar script `test`)
- Regenerate: `docs/fundacao-dados.md`

**Interfaces:**
- Produces: `classifyContratante(tipCte: string | null, recencia: string | null): "rf" | "mm" | null`
- Produces: `tipcteFilter(c: "all" | "rf" | "mm"): string` (assinatura inalterada; saída agora composta)
- Produces: `CONTRATANTE_RULES` com `{ recencyField, rfSegments, mmSegments, splitSegment, rfRecencyValues, allSegments }`

- [ ] **Step 1: Escrever o teste que falha**

Create `config/business-rules.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyContratante, tipcteFilter } from "./business-rules.ts";

test("classifyContratante: Formando → rf (qualquer recência)", () => {
  assert.equal(classifyContratante("Formando", null), "rf");
  assert.equal(classifyContratante("Formando", "Vai se formar"), "rf");
});

test("classifyContratante: Médico dividido pela recência", () => {
  assert.equal(classifyContratante("Médico", "Menos de 3 anos"), "rf");
  assert.equal(classifyContratante("Médico", "Vai se formar"), "rf");
  assert.equal(classifyContratante("Médico", "Mais de 3 anos"), "mm");
  assert.equal(classifyContratante("Médico", null), "mm"); // fallback
});

test("classifyContratante: Revalida → mm", () => {
  assert.equal(classifyContratante("Revalida", null), "mm");
});

test("classifyContratante: TipCte nulo/desconhecido → null", () => {
  assert.equal(classifyContratante(null, null), null);
  assert.equal(classifyContratante("Outro", "Menos de 3 anos"), null);
});

test("tipcteFilter: cláusulas SOQL compostas", () => {
  assert.equal(
    tipcteFilter("rf"),
    "AND (TipCte__c IN ('Formando') OR (TipCte__c = 'Médico' AND Tempo_de_Formado__c IN ('Menos de 3 anos','Vai se formar')))",
  );
  assert.equal(
    tipcteFilter("mm"),
    "AND (TipCte__c IN ('Revalida') OR (TipCte__c = 'Médico' AND (NOT Tempo_de_Formado__c IN ('Menos de 3 anos','Vai se formar'))))",
  );
  assert.equal(
    tipcteFilter("all"),
    "AND TipCte__c IN ('Formando','Médico','Revalida')",
  );
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test config/business-rules.test.ts`
Expected: FAIL — `classifyContratante` não existe (SyntaxError/import error) ou asserções de `tipcteFilter` falham (saída antiga `AND TipCte__c IN ('Formando','Médico Faculdades')`).

- [ ] **Step 3: Reescrever `CONTRATANTE_RULES` + adicionar `classifyContratante`**

Em `config/business-rules.ts`, substituir o bloco atual (linhas 53-59):

```ts
// ── 4. Contratante — segmento (TipCte__c) + recência (Tempo_de_Formado__c) ──
// Modelo do cliente (2026-07): TipCte__c carrega só o segmento
// (Formando/Médico/Revalida); a recência do médico vive em Tempo_de_Formado__c.
// RF (Recém-Formado) = Formando + Médico recém (recência em rfRecencyValues).
// MM (Médico Maduro) = Revalida + Médico maduro (demais recências, incl. null).
export const CONTRATANTE_RULES = {
  recencyField: "Tempo_de_Formado__c",
  rfSegments: ["Formando"],                          // segmento já define RF
  mmSegments: ["Revalida"],                          // segmento já define MM
  splitSegment: "Médico",                            // dividido pela recência
  rfRecencyValues: ["Menos de 3 anos", "Vai se formar"],
  allSegments: ["Formando", "Médico", "Revalida"],
} as const;

/** Classifica uma opp em "rf" | "mm" | null a partir de segmento + recência. */
export function classifyContratante(
  tipCte: string | null,
  recencia: string | null,
): "rf" | "mm" | null {
  const R = CONTRATANTE_RULES;
  if ((R.rfSegments as readonly string[]).includes(tipCte ?? "")) return "rf";
  if ((R.mmSegments as readonly string[]).includes(tipCte ?? "")) return "mm";
  if (tipCte === R.splitSegment) {
    return recencia && (R.rfRecencyValues as readonly string[]).includes(recencia)
      ? "rf"
      : "mm"; // Mais de 3 anos, null, ou valor inesperado → MM
  }
  return null; // TipCte null/desconhecido → fora de RF/MM
}
```

- [ ] **Step 4: Reescrever `tipcteFilter`**

Em `config/business-rules.ts`, substituir a função atual (linhas 137-144):

```ts
/** Filtro de contratante (com o " AND " inicial p/ concatenar ao WHERE).
 *  Regra composta: segmento (TipCte__c) + recência (Tempo_de_Formado__c). */
export function tipcteFilter(c: ContratanteKey): string {
  const R = CONTRATANTE_RULES;
  const rfRecency = `${R.recencyField} IN (${quoteIn(R.rfRecencyValues)})`;
  const medicoRf = `(TipCte__c = '${R.splitSegment}' AND ${rfRecency})`;
  const medicoMm = `(TipCte__c = '${R.splitSegment}' AND (NOT ${rfRecency}))`;
  const inSeg = (vals: readonly string[]) => `TipCte__c IN (${quoteIn(vals)})`;
  switch (c) {
    case "rf": return `AND (${inSeg(R.rfSegments)} OR ${medicoRf})`;
    case "mm": return `AND (${inSeg(R.mmSegments)} OR ${medicoMm})`;
    default:   return `AND ${inSeg(R.allSegments)}`;
  }
}
```

- [ ] **Step 5: Atualizar a seção 4 do gerador**

Em `config/generate-docs.ts`, substituir o bloco da seção 4 (linhas 60-68) por:

```ts
## 4. Contratante — segmento (\`TipCte__c\`) + recência (\`${CONTRATANTE_RULES.recencyField}\`)

O segmento vem de \`TipCte__c\`; a recência do médico, de \`${CONTRATANTE_RULES.recencyField}\`.

| Bucket | Regra |
|---|---|
| RF — Recém-Formado | \`TipCte__c\` ∈ ${codeList(CONTRATANTE_RULES.rfSegments)} **ou** (\`TipCte__c\` = \`${CONTRATANTE_RULES.splitSegment}\` **e** \`${CONTRATANTE_RULES.recencyField}\` ∈ ${codeList(CONTRATANTE_RULES.rfRecencyValues)}) |
| MM — Médico Maduro | \`TipCte__c\` ∈ ${codeList(CONTRATANTE_RULES.mmSegments)} **ou** (\`TipCte__c\` = \`${CONTRATANTE_RULES.splitSegment}\` **e** recência fora do conjunto RF, incluindo \`null\`) |

> \`${CONTRATANTE_RULES.splitSegment}\` sem recência (\`null\`) cai em MM (fallback).
> Os valores antigos \`Médico Faculdades\`/\`Médicos Maduros\` foram descontinuados.
```

(O `import` na linha 12-16 já traz `CONTRATANTE_RULES`; nenhum import novo é necessário. `codeList` aceita arrays readonly.)

- [ ] **Step 6: Adicionar o script `test` ao package.json**

Em `package.json`, no bloco `scripts` (após `docs:check`, linha 11), adicionar:

```json
    "test": "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test config/business-rules.test.ts"
```

(Lembrar da vírgula na linha anterior.)

- [ ] **Step 7: Rodar o teste e confirmar que passa**

Run: `npm test`
Expected: PASS — `# pass 5`, `# fail 0` (5 blocos `test`).

- [ ] **Step 8: Regenerar a fundação e checar sincronia**

Run: `npm run docs:rules`
Expected: `✓ docs/fundacao-dados.md gerado (...)`

Run: `npm run docs:check`
Expected: `✓ docs/fundacao-dados.md está sincronizado com business-rules.ts`

- [ ] **Step 9: Conferir visualmente a doc gerada**

Run: `grep -n "Tempo_de_Formado__c" docs/fundacao-dados.md`
Expected: aparece na seção 4 (tabela de buckets) e na linha "Contratante" dos "Fragmentos SOQL prontos" (cláusulas compostas de `tipcteFilter`). Confirmar que **não** há mais `Médico Faculdades` na seção 4.

- [ ] **Step 10: Commit**

```bash
git add config/business-rules.ts config/business-rules.test.ts config/generate-docs.ts package.json docs/fundacao-dados.md
git commit -m "$(cat <<'EOF'
feat(fundacao): regra RF/MM composta por segmento + recência

CONTRATANTE_RULES vira composto (TipCte__c + Tempo_de_Formado__c);
tipcteFilter emite cláusula SOQL composta; classifyContratante testável.
Fundação regenerada; docs:check verde.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Dashboard herda o builder (comentário + type-check)

**Files:**
- Modify: `lib/types.ts:5-10` (comentário de doc do tipo `Contratante`)

**Interfaces:**
- Consumes: `tipcteFilter()` de `config/business-rules.ts` (via `lib/integrations/salesforce.ts`, sem mudança de código)

- [ ] **Step 1: Atualizar o comentário de doc**

Em `lib/types.ts`, substituir o comentário (linhas 5-10) por:

```ts
/**
 * Segmento de público. O segmento vem de TipCte__c; a recência do médico, de
 * Tempo_de_Formado__c. Ver docs/fundacao-dados.md (seção 4).
 *  - "all" → Ambos (RF + MM)
 *  - "rf"  → Recém-Formado (Formando, ou Médico com recência recente)
 *  - "mm"  → Médico Maduro (Revalida, ou Médico maduro / sem recência)
 */
```

- [ ] **Step 2: Confirmar que o dashboard type-checka com o builder novo**

Run: `npx tsc --noEmit`
Expected: sem erros (exit 0). O `salesforce.ts` continua consumindo `tipcteFilter()` (string) sem mudança.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "$(cat <<'EOF'
docs(types): atualiza definição RF/MM (segmento + recência)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Skill diária — coletar recência nos SOQL 1C/1D/1E

**Files:**
- Modify: `.claude/skills/acompanhamento-diario-caveo.md` (seção "Fundação" linha 26; SOQL 1C ~94-105; 1D ~108-115; 1E ~126-133)

**Interfaces:**
- Consumes: `classifyContratante(TipCte__c, Tempo_de_Formado__c)` da Fundação (Task 1) — a resolução mm/rf de cada opp passa a usar os dois campos.

- [ ] **Step 1: Atualizar a nota da Fundação (linha 26)**

Trocar `Segmento por \`TipCte__c\` (seção 4).` por:

```
Segmento por `TipCte__c` + `Tempo_de_Formado__c` via `classifyContratante` (seção 4).
```

- [ ] **Step 2: 1C — incluir recência no SELECT do histórico e na instrução**

No bloco SQL de 1C, trocar a linha do SELECT para incluir a recência:

```sql
SELECT OpportunityId, StageName, CreatedDate,
       Opportunity.TipCte__c, Opportunity.Tempo_de_Formado__c, Opportunity.IsWon
FROM OpportunityHistory
```

E no parágrafo logo abaixo, trocar `\`segment\` por \`TipCte__c\`` por:

```
`segment` por `classifyContratante(TipCte__c, Tempo_de_Formado__c)`
```

- [ ] **Step 3: 1D — incluir recência no SELECT dos fechamentos**

No bloco SQL de 1D, trocar o SELECT para:

```sql
SELECT TipCte__c, Tempo_de_Formado__c, LastStageChangeDate
FROM Opportunity
```

- [ ] **Step 4: 1E — incluir recência no SELECT das opps por campanha**

No bloco SQL de 1E, trocar o SELECT para:

```sql
SELECT UtmCam__c, TipCte__c, Tempo_de_Formado__c, CreatedDate
FROM Opportunity
```

E na linha de bucketização logo abaixo, trocar `Bucketizar em \`{ (utmcam, dia): {mm: n, rf: n} }\`` por:

```
Bucketizar em `{ (utmcam, dia): {mm: n, rf: n} }` (segmento via `classifyContratante(TipCte__c, Tempo_de_Formado__c)`; dia em `-03:00`).
```

- [ ] **Step 5: Verificar que os três SOQL trazem a recência**

Run: `grep -c "Tempo_de_Formado__c" .claude/skills/acompanhamento-diario-caveo.md`
Expected: ≥ 4 (nota da Fundação + 1C + 1D + 1E).

- [ ] **Step 6: Reconciliação de dados contra o Salesforce (sanity)**

Rodar (via MCP `salesforce_query`) as duas contagens dos últimos 120 dias e conferir os alvos:

```sql
SELECT COUNT(Id) FROM Opportunity WHERE CreatedDate = LAST_N_DAYS:120 AND TipCte__c = 'Médico' AND Tempo_de_Formado__c IN ('Menos de 3 anos','Vai se formar')
-- Expected: 1001 (RF-médico)
SELECT COUNT(Id) FROM Opportunity WHERE CreatedDate = LAST_N_DAYS:120 AND TipCte__c = 'Médico' AND (NOT Tempo_de_Formado__c IN ('Menos de 3 anos','Vai se formar'))
-- Expected: 1253 (MM-médico)
```

(Valores podem variar levemente com o tempo; o ponto é que RF-médico deixou de ser 0 e MM-médico ≈ maduros + nulls.)

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/acompanhamento-diario-caveo.md
git commit -m "$(cat <<'EOF'
feat(acomp-diario): classifica MM/RF por segmento + recência (1C/1D/1E)

SOQL 1C/1D/1E passam a trazer Tempo_de_Formado__c; segmento resolvido por
classifyContratante. Médico recém-formado volta a contar como RF.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Catálogo de dados — registrar `Tempo_de_Formado__c`

**Files:**
- Modify: `docs/data-catalog.md:47-51` (seção "Segmentação")

- [ ] **Step 1: Atualizar a seção Segmentação**

Substituir o bloco (linhas 47-51) por:

```markdown
### Segmentação
| Campo | Tipo | Descrição | Usado hoje? |
|---|---|---|---|
| `TipCte__c` | picklist | Segmento: `Formando` / `Médico` / `Revalida` | ✅ |
| `Tempo_de_Formado__c` | picklist | Recência do médico: `Vai se formar` / `Menos de 3 anos` / `Mais de 3 anos`; compõe RF/MM com `TipCte__c` (seção 4 da fundação) | ✅ |
| `MesFor__c` | string | "Mês de formatura" — vale "Já é formado" p/ todo médico; **não** serve de recência | ⬜ |

> **FLS:** `Tempo_de_Formado__c` (criado 21/07/2026) exige Read liberado ao
> usuário de integração do MCP; sem isso o SOQL retorna `INVALID_FIELD`.
```

- [ ] **Step 2: Verificar**

Run: `grep -n "Tempo_de_Formado__c\|MesFor__c\|FLS" docs/data-catalog.md`
Expected: as três referências novas aparecem na seção Segmentação.

- [ ] **Step 3: Commit**

```bash
git add docs/data-catalog.md
git commit -m "$(cat <<'EOF'
docs(catalog): registra Tempo_de_Formado__c e ressalva MesFor__c/FLS

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Organização (orquestrador / sessão raiz)

**Files:**
- Modify: `docs/projeto-mapa.md` (nota da mudança de regra, se aplicável)

- [ ] **Step 1: Confirmar sincronia da fundação**

Run: `npm run docs:check`
Expected: `✓ docs/fundacao-dados.md está sincronizado com business-rules.ts`

- [ ] **Step 2: Sinalizar consumidores da regra**

Run: `grep -rln "tipcteFilter\|classifyContratante\|TipCte__c\|Tempo_de_Formado__c" .claude/ lib/ config/ docs/data-catalog.md`
Expected: revisar a lista e confirmar que todos os consumidores foram cobertos pelas Tasks 1-4 (dashboard via builder; skill diária; catálogo). Coorte/consolidado deferem à fundação — sem hardcode.

- [ ] **Step 3: Atualizar o mapa do projeto (se necessário)**

Se `docs/projeto-mapa.md` descrever a regra de contratante de forma agora desatualizada, adicionar uma linha curta apontando para a seção 4 da fundação e o campo de recência. Caso contrário, nenhuma mudança.

- [ ] **Step 4: Registrar na memória (feito pela raiz)**

A sessão raiz registra na memória: (a) a nova regra RF/MM composta (segmento + recência) e (b) a lição do FLS de `Tempo_de_Formado__c`. Atualizar o índice `MEMORY.md`.

- [ ] **Step 5: Commit (se houve mudança em projeto-mapa)**

```bash
git add docs/projeto-mapa.md
git commit -m "$(cat <<'EOF'
docs(mapa): aponta regra de contratante composta (segmento + recência)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review (feito na escrita do plano)

- **Cobertura da spec:** §2 regra→Task 1/3; §4 fundação→Task 1; §5 raio de impacto→Tasks 1-4 (dashboard via builder, skill, catálogo, tipos); §6 rollout→Steps de teste/reconciliação; §7 testes→Task 1 Step 1-7; §8 ressalvas→catálogo (Task 4) + doc; §9 organização→Task 5. Sem lacunas.
- **Placeholders:** nenhum — todo passo tem código/comando concreto.
- **Consistência de tipos:** `classifyContratante(string|null, string|null): "rf"|"mm"|null` e `tipcteFilter(c): string` idênticos entre Task 1 (definição) e Tasks 2/3 (consumo). Strings SOQL do teste batem com a saída de `tipcteFilter`.
