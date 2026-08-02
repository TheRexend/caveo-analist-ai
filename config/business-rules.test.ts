import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyContratante, tipcteFilter } from "./business-rules.ts";

test("classifyContratante: Formando → formando", () => {
  assert.equal(classifyContratante("Formando"), "formando");
});

test("classifyContratante: Médico → medico", () => {
  assert.equal(classifyContratante("Médico"), "medico");
});

test("classifyContratante: Revalida → revalida", () => {
  assert.equal(classifyContratante("Revalida"), "revalida");
});

test("classifyContratante: TipCte nulo/desconhecido → null", () => {
  assert.equal(classifyContratante(null), null);
  assert.equal(classifyContratante("Outro"), null);
});

test("tipcteFilter: cláusulas SOQL diretas por segmento", () => {
  assert.equal(tipcteFilter("formando"), "AND TipCte__c IN ('Formando')");
  assert.equal(tipcteFilter("medico"), "AND TipCte__c IN ('Médico')");
  assert.equal(tipcteFilter("revalida"), "AND TipCte__c IN ('Revalida')");
  assert.equal(
    tipcteFilter("all"),
    "AND TipCte__c IN ('Formando','Médico','Revalida')",
  );
});
