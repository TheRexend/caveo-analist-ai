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
