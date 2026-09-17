import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyContratante, tipcteFilter, cruzExpr, cpcExpr } from "./business-rules.ts";

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

test("cruzExpr: meta usa só fbclid__c (fbc__c não conta como cruzamento)", () => {
  const expr = cruzExpr("meta");
  assert.match(expr, /fbclid__c != null/);
  assert.doesNotMatch(expr, /fbc__c/);
});

test("cruzExpr: google usa gclid__c, gbraid__c e wbraid__c, e exclui quando há click ID Meta", () => {
  const expr = cruzExpr("google");
  assert.match(expr, /gclid__c != null/);
  assert.match(expr, /gbraid__c != null/);
  assert.match(expr, /wbraid__c != null/);
  assert.match(expr, /fbclid__c = null/);
});

test("cruzExpr: all combina os click IDs de meta e google sem duplicar fbc__c", () => {
  const expr = cruzExpr("all");
  for (const field of ["fbclid__c", "gclid__c", "gbraid__c", "wbraid__c"]) {
    assert.match(expr, new RegExp(`${field} != null`));
  }
  assert.doesNotMatch(expr, /fbc__c/);
});

test("cpcExpr: meta exclui UtmSou__c de google, google exige UtmSou__c de google", () => {
  assert.match(cpcExpr("meta"), /NOT UtmSou__c LIKE '%google%'/);
  assert.match(cpcExpr("google"), /UtmSou__c LIKE '%google%'/);
  assert.equal(cpcExpr("all"), "UtmMed__c LIKE '%cpc%'");
});
