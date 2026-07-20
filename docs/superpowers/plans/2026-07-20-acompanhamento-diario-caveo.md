# Acompanhamento Diário Caveo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a skill `acompanhamento-diario-caveo` que coleta métricas diárias (investimento, leads, MQL, SQL, fechamentos) de Meta + Google + Salesforce, por segmento (MM/RF), e grava na planilha "Resultados Mês Atual".

**Architecture:** A lógica pura e propensa a erro (gate MQL/SQL + dia da transição, classificação/rateio de segmento, mapeamento dia→linha) vive num pacote Python testado (`scripts/acompanhamento_diario/`). A skill markdown é o orquestrador: coleta via MCP (Meta/Google/Salesforce), chama o helper para computar, faz preview e grava via `gspread`. As regras de negócio novas (MQL/SQL, alocação de segmento) entram na Fundação (`config/business-rules.ts`) e são geradas em `docs/fundacao-dados.md`.

**Tech Stack:** Python 3 (sistema; tem `gspread` 6.x e `pytest` 8.x), TypeScript/Node (fundação + geração de docs), MCPs Meta/Google/Salesforce, Google Sheets via service account.

## Global Constraints

- **Planilha:** `19gElL0pmUO3yPZZG0-5E1ym61wHbQM5-JohK5_wPjj4`, aba `Resultados Mês Atual`.
- **Auth:** `.claude/sheets_credentials.json` (service account `reporte-ka-sheets@caveo-496716.iam.gserviceaccount.com`), via `gspread`, com o **`python3` do sistema** (tem gspread e pytest; o `mcps/.venv` NÃO tem).
- **Contas:** Meta `act_438086148409254` · Google `3921127876` · Salesforce `caveo.my.salesforce.com`.
- **Blocos da aba (dia _d_ → linha):** MM = 45+_d_ (dias 1–31 → 46–76) · RF = 87+_d_ (88–118) · TOTAL é fórmula `=MM+RF` — **nunca tocar**.
- **Células gravadas (blocos MM e RF):** C=invest Meta, E=leads Meta, F=MQL Meta, G=SQL Meta, I=invest Google, K=leads Google, L=MQL Google, M=SQL Google, O=fechamento. **Preservar** B/H (planejado), N (meta diária), D/J/P/Q (fórmulas).
- **Cadência:** append-only, **sem retroativo** — grava só o(s) dia(s) novo(s) (D-1 padrão) e nunca reescreve dias anteriores.
- **Bucket temporal:** invest/leads pelo dia do gasto; **MQL/SQL pelo dia da transição** (`OpportunityHistory`, primeira transição que cruza o gate); fechamento por `LastStageChangeDate`. Fuso `-03:00`.
- **Fontes:** Leads Meta = `complete_registration`; Leads Google = `conversions` total; MQL/SQL/fechamento = Salesforce. Canal (Meta/Google) via filtros `cpc`+cruzamento da Fundação; segmento via `TipCte__c`.
- **Rateio institucional:** campanha sem tag `[MM]`/`[RF]` → invest e leads rateados por participação de opps do segmento (SF `UtmCam__c`/`TipCte__c`); fallback (0 opps) = **50/50**.
- **Testes:** `python3 -m pytest scripts/acompanhamento_diario/ -v` · **Docs:** `npm run docs:rules` (gera) / `npm run docs:check` (verifica).
- **Nome da skill:** `acompanhamento-diario-caveo`.

---

### Task 1: Fundação — regras MQL/SQL e alocação de segmento

**Files:**
- Modify: `config/business-rules.ts` (append após a seção 6, antes dos builders na linha ~81)
- Modify: `config/generate-docs.ts` (import na linha 12–15; novas seções antes de "Fragmentos SOQL")
- Generated: `docs/fundacao-dados.md`

**Interfaces:**
- Produces: `QUALIFICATION_RULES` (`.mql.reachedStages: readonly string[]`, `.mql.alsoWon: boolean`, idem `.sql`) e `SEGMENT_ALLOCATION` (`.tags.mm`, `.tags.rf`, `.emptyRatioFallback.mm`, `.emptyRatioFallback.rf`). Os valores são **espelhados** (copiados) no helper Python das Tasks 2–3 — esta é a fonte de verdade documentada.

- [ ] **Step 1: Adicionar as regras em `config/business-rules.ts`**

Inserir após o bloco `COHORT_RULES` (que termina na linha ~79), antes do comentário `// ===...BUILDERS`:

```typescript
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

// ── 8. Alocação de segmento em campanhas de mídia paga ──────────────────────
// Classificação por marcador no nome da campanha. Campanha institucional (sem
// marcador de segmento) tem investimento e leads RATEADOS entre MM/RF pela
// participação de opps do segmento naquela campanha (SF UtmCam__c/TipCte__c).
// Fallback (gasto no dia, 0 opps no SF) = 50/50.
export const SEGMENT_ALLOCATION = {
  tags: { mm: "[MM]", rf: "[RF]" },
  emptyRatioFallback: { mm: 0.5, rf: 0.5 },
} as const;
```

- [ ] **Step 2: Renderizar as seções em `config/generate-docs.ts`**

Adicionar ao import (linhas 12–15) os dois novos nomes:

```typescript
import {
  CHANNEL_RULES, CRUZAMENTO_RULES, STAGE_GROUPS, CONTRATANTE_RULES,
  DATE_MODEL, COHORT_RULES, QUALIFICATION_RULES, SEGMENT_ALLOCATION,
  cpcExpr, cruzExpr, tipcteFilter, WON_CLAUSE,
} from "./business-rules.ts";
```

Inserir, no template de `build()`, logo antes da linha `## Fragmentos SOQL prontos (gerados dos builders)`:

```typescript
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

```

- [ ] **Step 3: Rodar o check e confirmar que FALHA (red)**

Run: `npm run docs:check`
Expected: FAIL, exit 1, mensagem "✗ docs/fundacao-dados.md está desatualizado" (o .ts mudou mas o .md ainda não foi regenerado).

- [ ] **Step 4: Regenerar o doc (green)**

Run: `npm run docs:rules`
Expected: "✓ docs/fundacao-dados.md gerado (N bytes)".

- [ ] **Step 5: Confirmar sincronia e conteúdo**

Run: `npm run docs:check && grep -c "Aguardando Resposta" docs/fundacao-dados.md && grep -q "## 7. Qualificação" docs/fundacao-dados.md && echo OK`
Expected: "✓ ... sincronizado", contagem ≥ 1, e `OK` no fim.

- [ ] **Step 6: Commit**

```bash
git add config/business-rules.ts config/generate-docs.ts docs/fundacao-dados.md
git commit -m "feat(fundacao): QUALIFICATION_RULES (MQL/SQL) e SEGMENT_ALLOCATION"
```

---

### Task 2: Helper — qualificação MQL/SQL por dia da transição

**Files:**
- Create: `scripts/acompanhamento_diario/conftest.py`
- Create: `scripts/acompanhamento_diario/qualification.py`
- Test: `scripts/acompanhamento_diario/test_qualification.py`

**Interfaces:**
- Produces: `mql_day(history, is_won) -> str | None` e `sql_day(history, is_won) -> str | None`, onde `history` é `list[dict]` com chaves `"stage"` (str) e `"date"` (str `YYYY-MM-DD`). Retorna a data (str) da primeira transição que cruza o gate, ou `None`.

- [ ] **Step 1: Criar o `conftest.py` (shim de import p/ os testes)**

```python
# Permite `from qualification import ...` nos testes deste diretório.
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
```

- [ ] **Step 2: Escrever os testes que falham**

`scripts/acompanhamento_diario/test_qualification.py`:

```python
from qualification import mql_day, sql_day


def test_mql_no_dia_que_atinge_aguardando():
    h = [{"stage": "Nova", "date": "2026-07-01"},
         {"stage": "Contato Realizado", "date": "2026-07-02"},
         {"stage": "Aguardando Resposta", "date": "2026-07-03"}]
    assert mql_day(h, is_won=False) == "2026-07-03"
    assert sql_day(h, is_won=False) is None


def test_sql_no_dia_da_proposta_mql_permanece_na_captacao():
    h = [{"stage": "Aguardando Resposta", "date": "2026-07-03"},
         {"stage": "Proposta Enviada", "date": "2026-07-10"}]
    assert mql_day(h, is_won=False) == "2026-07-03"
    assert sql_day(h, is_won=False) == "2026-07-10"


def test_pula_aguardando_direto_para_proposta_conta_como_mql_e_sql():
    h = [{"stage": "Nova", "date": "2026-07-01"},
         {"stage": "Proposta Enviada", "date": "2026-07-05"}]
    assert mql_day(h, is_won=False) == "2026-07-05"
    assert sql_day(h, is_won=False) == "2026-07-05"


def test_won_sem_transicao_de_estagio_usa_data_do_ganho():
    h = [{"stage": "Fechado", "date": "2026-07-10"}]
    assert mql_day(h, is_won=True) == "2026-07-10"
    assert sql_day(h, is_won=True) == "2026-07-10"


def test_nunca_qualifica_quando_nao_atinge_e_nao_ganho():
    h = [{"stage": "Nova", "date": "2026-07-01"},
         {"stage": "Contato Realizado", "date": "2026-07-02"}]
    assert mql_day(h, is_won=False) is None
    assert sql_day(h, is_won=False) is None


def test_retrocede_e_reavanca_conta_a_primeira_transicao():
    h = [{"stage": "Aguardando Resposta", "date": "2026-07-03"},
         {"stage": "Contato Realizado", "date": "2026-07-04"},
         {"stage": "Aguardando Resposta", "date": "2026-07-06"}]
    assert mql_day(h, is_won=False) == "2026-07-03"


def test_ordem_de_entrada_nao_importa():
    h = [{"stage": "Proposta Enviada", "date": "2026-07-10"},
         {"stage": "Aguardando Resposta", "date": "2026-07-03"}]
    assert mql_day(h, is_won=False) == "2026-07-03"
    assert sql_day(h, is_won=False) == "2026-07-10"
```

- [ ] **Step 3: Rodar e confirmar que falham**

Run: `python3 -m pytest scripts/acompanhamento_diario/test_qualification.py -v`
Expected: FAIL — "ModuleNotFoundError: No module named 'qualification'".

- [ ] **Step 4: Implementar `qualification.py`**

```python
"""MQL/SQL a partir de OpportunityHistory.

Espelha config/business-rules.ts (QUALIFICATION_RULES). Cumulativo: a opp conta
se JÁ atingiu o estágio. O dia é o da PRIMEIRA transição que cruza o gate.
"""

# Espelho de QUALIFICATION_RULES (fonte de verdade: config/business-rules.ts).
MQL_REACHED = ("Aguardando Resposta", "Reunião Agendada", "Proposta Enviada")
SQL_REACHED = ("Proposta Enviada",)
# Ganho (WON_CLAUSE da fundação): estágio "Fechado" (IsWon) ou "Ganho não Identificado".
WON_STAGES = ("Fechado", "Ganho não Identificado")


def _first_gate_day(history, reached_stages, is_won):
    gate = set(reached_stages)
    rows = sorted(history, key=lambda h: h["date"])
    for h in rows:
        if h["stage"] in gate:
            return h["date"]
    if is_won:
        for h in rows:
            if h["stage"] in WON_STAGES:
                return h["date"]
    return None


def mql_day(history, is_won):
    """Dia (YYYY-MM-DD) em que a opp virou MQL, ou None."""
    return _first_gate_day(history, MQL_REACHED, is_won)


def sql_day(history, is_won):
    """Dia (YYYY-MM-DD) em que a opp virou SQL, ou None."""
    return _first_gate_day(history, SQL_REACHED, is_won)
```

- [ ] **Step 5: Rodar e confirmar que passam**

Run: `python3 -m pytest scripts/acompanhamento_diario/test_qualification.py -v`
Expected: PASS (7 passed).

- [ ] **Step 6: Commit**

```bash
git add scripts/acompanhamento_diario/conftest.py scripts/acompanhamento_diario/qualification.py scripts/acompanhamento_diario/test_qualification.py
git commit -m "feat(acomp-diario): helper de qualificacao MQL/SQL por dia da transicao"
```

---

### Task 3: Helper — classificação e rateio de segmento

**Files:**
- Create: `scripts/acompanhamento_diario/segments.py`
- Test: `scripts/acompanhamento_diario/test_segments.py`

**Interfaces:**
- Produces:
  - `classify_segment(campaign_name: str) -> "mm" | "rf" | "institucional"`
  - `allocate(campaign_name: str, spend: float, leads: float, opp_mm: int = 0, opp_rf: int = 0) -> dict` retornando `{"mm": {"spend": float, "leads": float}, "rf": {"spend": float, "leads": float}}`.

- [ ] **Step 1: Escrever os testes que falham**

`scripts/acompanhamento_diario/test_segments.py`:

```python
from segments import classify_segment, allocate


def test_classify_por_tag():
    assert classify_segment("[MM] Search Médico") == "mm"
    assert classify_segment("[RF] Meta [LEADS]") == "rf"
    assert classify_segment("[mm] minúsculo") == "mm"


def test_classify_sem_tag_e_institucional():
    assert classify_segment("Search Institucional") == "institucional"
    assert classify_segment("[LEADS] Genérica sem segmento") == "institucional"


def test_allocate_campanha_taggeada_vai_100_por_cento():
    r = allocate("[MM] Campanha", spend=1000.0, leads=10)
    assert r["mm"] == {"spend": 1000.0, "leads": 10}
    assert r["rf"] == {"spend": 0.0, "leads": 0.0}


def test_allocate_institucional_rateia_pelo_opp_share():
    # Exemplo do usuário: R$1000, 10 leads, 5 opps MM de 10 -> R$500 p/ MM.
    r = allocate("Search Institucional", spend=1000.0, leads=10, opp_mm=5, opp_rf=5)
    assert r["mm"]["spend"] == 500.0
    assert r["rf"]["spend"] == 500.0
    assert r["mm"]["leads"] == 5.0
    assert r["rf"]["leads"] == 5.0


def test_allocate_institucional_ratio_desigual():
    r = allocate("Institucional", spend=1000.0, leads=8, opp_mm=3, opp_rf=1)
    assert r["mm"]["spend"] == 750.0
    assert r["rf"]["spend"] == 250.0


def test_allocate_institucional_zero_opps_cai_no_fallback_50_50():
    r = allocate("Institucional", spend=1000.0, leads=10, opp_mm=0, opp_rf=0)
    assert r["mm"]["spend"] == 500.0
    assert r["rf"]["spend"] == 500.0
    assert r["mm"]["leads"] == 5.0
    assert r["rf"]["leads"] == 5.0
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `python3 -m pytest scripts/acompanhamento_diario/test_segments.py -v`
Expected: FAIL — "ModuleNotFoundError: No module named 'segments'".

- [ ] **Step 3: Implementar `segments.py`**

```python
"""Classificação de campanha por segmento e rateio de institucionais.

Espelha config/business-rules.ts (SEGMENT_ALLOCATION).
"""

TAG_MM = "[mm]"
TAG_RF = "[rf]"
FALLBACK = {"mm": 0.5, "rf": 0.5}


def classify_segment(campaign_name):
    """'mm', 'rf' ou 'institucional' (case-insensitive). Sem tag => institucional."""
    n = campaign_name.lower()
    if TAG_MM in n:
        return "mm"
    if TAG_RF in n:
        return "rf"
    return "institucional"


def _ratio(opp_mm, opp_rf):
    total = opp_mm + opp_rf
    if total == 0:
        return dict(FALLBACK)
    return {"mm": opp_mm / total, "rf": opp_rf / total}


def allocate(campaign_name, spend, leads, opp_mm=0, opp_rf=0):
    """spend/leads de UMA campanha num dia -> divididos entre mm/rf.

    Campanha taggeada => 100% no segmento. Institucional => rateio por opp-share
    (fallback 50/50 quando não há opps).
    """
    seg = classify_segment(campaign_name)
    if seg in ("mm", "rf"):
        other = "rf" if seg == "mm" else "mm"
        return {seg: {"spend": spend, "leads": leads},
                other: {"spend": 0.0, "leads": 0.0}}
    r = _ratio(opp_mm, opp_rf)
    return {
        "mm": {"spend": spend * r["mm"], "leads": leads * r["mm"]},
        "rf": {"spend": spend * r["rf"], "leads": leads * r["rf"]},
    }
```

- [ ] **Step 4: Rodar e confirmar que passam**

Run: `python3 -m pytest scripts/acompanhamento_diario/test_segments.py -v`
Expected: PASS (6 passed).

- [ ] **Step 5: Commit**

```bash
git add scripts/acompanhamento_diario/segments.py scripts/acompanhamento_diario/test_segments.py
git commit -m "feat(acomp-diario): classificacao e rateio de segmento (institucional 50/50)"
```

---

### Task 4: Helper — mapeamento dia→linha, células e gravação

**Files:**
- Create: `scripts/acompanhamento_diario/sheet.py`
- Test: `scripts/acompanhamento_diario/test_sheet.py`

**Interfaces:**
- Produces:
  - `day_to_row(segment: "mm"|"rf", day: int) -> int`
  - `cell_updates(segment, day, metrics: dict) -> list[tuple[str, float|int]]` (só chaves presentes e não-None; ordem fixa de `COLS`)
  - `write_updates(worksheet, updates: list[tuple[str, value]]) -> int` (batch_update; retorna nº de células)
  - `COLS: dict[str, str]` — chaves de métrica → coluna.

- [ ] **Step 1: Escrever os testes que falham**

`scripts/acompanhamento_diario/test_sheet.py`:

```python
import pytest

from sheet import day_to_row, cell_updates, write_updates


def test_day_to_row_mm_e_rf():
    assert day_to_row("mm", 1) == 46
    assert day_to_row("mm", 31) == 76
    assert day_to_row("rf", 1) == 88
    assert day_to_row("rf", 31) == 118


def test_day_to_row_rejeita_segmento_e_dia_invalidos():
    with pytest.raises(ValueError):
        day_to_row("total", 1)
    with pytest.raises(ValueError):
        day_to_row("mm", 0)
    with pytest.raises(ValueError):
        day_to_row("mm", 32)


def test_cell_updates_monta_celulas_do_dia():
    ups = cell_updates("mm", 3, {"invest_meta": 1000.0, "mql_meta": 5, "fechamento": 2})
    assert ups == [("C48", 1000.0), ("F48", 5), ("O48", 2)]


def test_cell_updates_ignora_none_e_ausentes():
    ups = cell_updates("rf", 1, {"invest_meta": None, "leads_google": 7})
    assert ups == [("K88", 7)]


class _FakeWS:
    def __init__(self):
        self.calls = []

    def batch_update(self, body):
        self.calls.append(body)


def test_write_updates_faz_batch():
    ws = _FakeWS()
    n = write_updates(ws, [("C48", 1000.0), ("F48", 5)])
    assert n == 2
    assert ws.calls == [[
        {"range": "C48", "values": [[1000.0]]},
        {"range": "F48", "values": [[5]]},
    ]]


def test_write_updates_vazio_nao_chama_api():
    ws = _FakeWS()
    assert write_updates(ws, []) == 0
    assert ws.calls == []
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `python3 -m pytest scripts/acompanhamento_diario/test_sheet.py -v`
Expected: FAIL — "ModuleNotFoundError: No module named 'sheet'".

- [ ] **Step 3: Implementar `sheet.py`**

```python
"""Mapeamento dia→linha e gravação na aba 'Resultados Mês Atual'.

Blocos: MM (dia d → linha 45+d), RF (dia d → linha 87+d). TOTAL é fórmula =MM+RF
e nunca é tocado. Ver Global Constraints do plano.
"""

BLOCK_BASE = {"mm": 45, "rf": 87}

# Métrica -> coluna (idêntico nos dois blocos). Ordem define a ordem dos updates.
COLS = {
    "invest_meta": "C",
    "leads_meta": "E",
    "mql_meta": "F",
    "sql_meta": "G",
    "invest_google": "I",
    "leads_google": "K",
    "mql_google": "L",
    "sql_google": "M",
    "fechamento": "O",
}


def day_to_row(segment, day):
    if segment not in BLOCK_BASE:
        raise ValueError(f"segmento inválido: {segment!r} (use 'mm' ou 'rf')")
    if not (1 <= day <= 31):
        raise ValueError(f"dia fora de 1..31: {day}")
    return BLOCK_BASE[segment] + day


def cell_updates(segment, day, metrics):
    """[(A1, valor)] só para as chaves presentes e não-None, na ordem de COLS."""
    row = day_to_row(segment, day)
    out = []
    for key, col in COLS.items():
        value = metrics.get(key)
        if value is not None:
            out.append((f"{col}{row}", value))
    return out


def write_updates(worksheet, updates):
    """batch_update numa worksheet gspread. Retorna nº de células gravadas."""
    body = [{"range": a1, "values": [[value]]} for a1, value in updates]
    if body:
        worksheet.batch_update(body)
    return len(body)
```

- [ ] **Step 4: Rodar e confirmar que passam**

Run: `python3 -m pytest scripts/acompanhamento_diario/test_sheet.py -v`
Expected: PASS (6 passed).

- [ ] **Step 5: Rodar a suíte inteira do pacote**

Run: `python3 -m pytest scripts/acompanhamento_diario/ -v`
Expected: PASS (19 passed no total).

- [ ] **Step 6: Commit**

```bash
git add scripts/acompanhamento_diario/sheet.py scripts/acompanhamento_diario/test_sheet.py
git commit -m "feat(acomp-diario): mapeamento dia->linha, celulas e gravacao gspread"
```

---

### Task 5: Skill markdown — orquestração da coleta e gravação

**Files:**
- Create: `.claude/skills/acompanhamento-diario-caveo.md`
- Test (dry-run manual): script de verificação temporário em scratchpad

**Interfaces:**
- Consumes: helpers das Tasks 2–4 (`mql_day`/`sql_day`, `allocate`, `cell_updates`/`write_updates`) e a Fundação da Task 1 (filtros `cpc`+cruzamento em `docs/fundacao-dados.md`).
- Produces: a skill invocável `acompanhamento-diario-caveo`.

- [ ] **Step 1: Criar o arquivo da skill**

`.claude/skills/acompanhamento-diario-caveo.md`:

````markdown
---
name: acompanhamento-diario-caveo
description: Coleta métricas diárias da Caveo (investimento, leads, MQL, SQL, fechamentos) de Meta Ads + Google Ads + Salesforce, por segmento (Médico Maduro / Recém-Formado), e grava na planilha "Resultados Mês Atual". Cadência diária append-only (sem retroativo). Use para atualizar o acompanhamento diário de captação e funil.
---

# Skill: Acompanhamento Diário — Caveo

Coleta diária por **dia × segmento (MM/RF) × canal (Meta/Google)** e grava na
planilha de acompanhamento. **Append-only: nunca reescreve dias anteriores.**

## Contas e planilha

| Recurso | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` |
| Google Ads | `3921127876` |
| Salesforce | `caveo.my.salesforce.com` |
| Planilha | `19gElL0pmUO3yPZZG0-5E1ym61wHbQM5-JohK5_wPjj4`, aba `Resultados Mês Atual` |
| Auth Sheets | `.claude/sheets_credentials.json` (service account) |

## Fundação (LER ANTES DE QUALQUER SOQL)

Canal pago (Meta/Google) usa o modelo **cpc + cruzamento** de
`docs/fundacao-dados.md` (seção "Fragmentos SOQL prontos"), fuso `-03:00`. MQL/SQL
usam `QUALIFICATION_RULES` (seção 7); alocação de segmento usa `SEGMENT_ALLOCATION`
(seção 8). Segmento por `TipCte__c` (seção 4). NÃO reescrever essas listas aqui.

## Bucket temporal (regra de ouro — sem retroativo)

- Investimento / Leads → **dia do gasto** (plataforma).
- MQL / SQL → **dia da primeira transição** que cruza o gate (`OpportunityHistory`).
- Fechamento → **`LastStageChangeDate`** (dia do fechamento).

## Fase 0 — Período

- START = `YYYY-MM-01` (mês corrente). END = D-1 (ontem). Aceita override:
  `$ARGUMENTS` pode conter uma data (`YYYY-MM-DD`) ou intervalo (`YYYY-MM-DD a YYYY-MM-DD`).
- Informar: `Coletando de [START] a [END]…`

## Fase 1 — Coleta (paralela)

### 1A. Meta — spend + registro concluído por campanha/dia
`mcp__meta-ads-mcp__get_insights` com `object_id="act_438086148409254"`,
`level="campaign"`, `time_range={"since": START, "until": END}`, `time_increment=1`.
Filtrar campanhas com `[LEADS]`. Por campanha/dia extrair: `spend`; e o `value` do
objeto de `actions` com `action_type = "complete_registration"` (ou
`offsite_conversion.fb_pixel_complete_registration`) → **leads Meta**.

### 1B. Google — cost + conversões por campanha/dia
`mcp__google-ads-mcp__search_search` com `customer_id="3921127876"`,
`resource="campaign"`, fields `["campaign.name","segments.date","metrics.cost_micros","metrics.conversions"]`,
conditions `["segments.date BETWEEN '[START]' AND '[END]'"]`. Por campanha/dia:
invest = `cost_micros`/1e6; **leads Google** = `conversions` (total, arredondar no fim).

### 1C. Salesforce — histórico p/ MQL/SQL (por canal)
Para `[FILTRO_META]` e `[FILTRO_GOOGLE]` (fragmentos cpc+cruzamento da fundação),
com lookback de 3 meses antes de START (para pegar opps que progridem tarde):
```sql
SELECT OpportunityId, StageName, CreatedDate,
       Opportunity.TipCte__c, Opportunity.IsWon
FROM OpportunityHistory
WHERE Opportunity.CreatedDate >= [START-3meses]T00:00:00-03:00
  AND Opportunity.CreatedDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META | FILTRO_GOOGLE])
ORDER BY OpportunityId, CreatedDate
```
Agrupar as linhas por `OpportunityId` → `history=[{stage, date}]` (date = dia de
`CreatedDate` da linha de histórico, em `-03:00`), `is_won = IsWon OR StageName
contém "Ganho não Identificado"`, `segment` por `TipCte__c`.

### 1D. Salesforce — fechamentos por dia/segmento (mídia paga)
```sql
SELECT TipCte__c, LastStageChangeDate
FROM Opportunity
WHERE LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
  AND [WON_CLAUSE]
```

### 1E. Salesforce — opps por campanha/dia/segmento (para o rateio institucional)
```sql
SELECT UtmCam__c, TipCte__c, CreatedDate
FROM Opportunity
WHERE CreatedDate >= [START]T00:00:00-03:00
  AND CreatedDate <= [END]T23:59:59-03:00
  AND UtmCam__c != null
```
Bucketizar em `{ (utmcam, dia): {mm: n, rf: n} }` (dia em `-03:00`).

> **Matching campanha↔UtmCam:** o rateio casa o nome da campanha da plataforma
> com `UtmCam__c`. No Meta costuma ser idêntico; no Google, campanhas
> institucionais podem ter nome divergente — normalizar (mesmo mapa de
> `planilha-resultados` Fase 2 / `lib/integrations/google.ts`). Sem match, a
> campanha cai no fallback 50/50 e **deve aparecer sinalizada no preview**.

## Fase 2 — Cálculo (script Python via Bash, usando o helper)

Construir e rodar com o **`python3` do sistema** o script abaixo, preenchendo as
estruturas `META_ROWS`, `GOOGLE_ROWS`, `SF_HISTORY`, `SF_CLOSINGS`, `SF_CAMP_OPPS`
com os dados reais coletados:

```python
import sys
sys.path.insert(0, 'scripts/acompanhamento_diario')
from segments import allocate, classify_segment
from qualification import mql_day, sql_day
from sheet import cell_updates, write_updates
import gspread
from google.oauth2.service_account import Credentials
from collections import defaultdict

# START/END já conhecidos; days = [1..N] dentro do período.
# META_ROWS / GOOGLE_ROWS: [{"campaign": str, "day": int, "spend": float, "leads": float}]
# SF_CAMP_OPPS: {(utmcam, day): {"mm": int, "rf": int}}
# SF_HISTORY:  [{"channel": "meta"|"google", "segment": "mm"|"rf",
#               "history": [{"stage","date"}], "is_won": bool, "day_created": int}]
# SF_CLOSINGS: [{"segment": "mm"|"rf", "day": int}]

# acc[segment][day] = dict parcial de métricas (chaves de sheet.COLS)
acc = {"mm": defaultdict(dict), "rf": defaultdict(dict)}

def add(seg, day, key, val):
    acc[seg][day][key] = acc[seg][day].get(key, 0) + val

# --- Investimento + Leads (rateio institucional) ---
def opp_share(utmcam, day):
    c = SF_CAMP_OPPS.get((utmcam, day), {"mm": 0, "rf": 0})
    return c["mm"], c["rf"]

for rows, ik, lk in ((META_ROWS, "invest_meta", "leads_meta"),
                     (GOOGLE_ROWS, "invest_google", "leads_google")):
    for r in rows:
        omm, orf = opp_share(r["campaign"], r["day"])
        a = allocate(r["campaign"], r["spend"], r["leads"], omm, orf)
        for seg in ("mm", "rf"):
            add(seg, r["day"], ik, a[seg]["spend"])
            add(seg, r["day"], lk, a[seg]["leads"])

# --- MQL/SQL pelo dia da transição (bucketiza só o que cai no período) ---
def in_period(d):  # d = "YYYY-MM-DD"
    return d is not None and START <= d <= END
def day_of(d):
    return int(d[8:10])
for o in SF_HISTORY:
    md, sd = mql_day(o["history"], o["is_won"]), sql_day(o["history"], o["is_won"])
    ck = "mql_meta" if o["channel"] == "meta" else "mql_google"
    sk = "sql_meta" if o["channel"] == "meta" else "sql_google"
    if in_period(md): add(o["segment"], day_of(md), ck, 1)
    if in_period(sd): add(o["segment"], day_of(sd), sk, 1)

# --- Fechamentos ---
for c in SF_CLOSINGS:
    add(c["segment"], c["day"], "fechamento", 1)

# --- Arredondar leads (rateio pode gerar fração) ---
for seg in ("mm", "rf"):
    for day, m in acc[seg].items():
        for k in ("leads_meta", "leads_google"):
            if k in m: m[k] = round(m[k])

# --- PREVIEW (imprimir antes de gravar) ---
for seg in ("mm", "rf"):
    print(f"\n=== {seg.upper()} ===")
    for day in sorted(acc[seg]):
        print(day, dict(acc[seg][day]))

# --- GRAVAÇÃO (só após confirmação do usuário na Fase 3) ---
def gravar():
    creds = Credentials.from_service_account_file(
        '.claude/sheets_credentials.json',
        scopes=['https://www.googleapis.com/auth/spreadsheets'])
    ws = gspread.authorize(creds).open_by_key(
        '19gElL0pmUO3yPZZG0-5E1ym61wHbQM5-JohK5_wPjj4').worksheet('Resultados Mês Atual')
    total = 0
    for seg in ("mm", "rf"):
        for day, m in acc[seg].items():
            total += write_updates(ws, cell_updates(seg, day, m))
    print(f"Gravadas {total} células.")
```

## Fase 3 — Preview e confirmação

Apresentar as tabelas MM e RF (dias × colunas). **Sinalizar** campanhas
institucionais que caíram no fallback 50/50 (0 opps no dia). Perguntar:
```
Gravar estes dias na planilha "Resultados Mês Atual"? (sim para confirmar)
```
Só chamar `gravar()` após "sim". Nunca tocar TOTAL, B/H/N, nem D/J/P/Q.
````

- [ ] **Step 2: Validar a sintaxe/estrutura da skill**

Run: `head -4 .claude/skills/acompanhamento-diario-caveo.md && python3 -c "import re,sys; t=open('.claude/skills/acompanhamento-diario-caveo.md').read(); assert t.startswith('---') and 'name: acompanhamento-diario-caveo' in t; print('frontmatter OK')"`
Expected: frontmatter com `name`/`description` e "frontmatter OK".

- [ ] **Step 3: Dry-run de verificação — computar um dia conhecido e conferir**

Escrever em scratchpad um script que reproduz a Fase 2 com dados coletados via MCP para **um dia específico do mês corrente** (ex.: START..END = ontem). Rodar e conferir manualmente 2–3 valores contra consultas independentes:
- invest Meta MM do dia ≈ soma de `spend` das campanhas `[MM]`/institucional-rateado (checar via `get_insights` daquele dia).
- fechamentos MM do dia == COUNT de `Opportunity` won com `TipCte__c` MM e `LastStageChangeDate` naquele dia (SOQL direto).
- Confirmar que `cell_updates("mm", <dia>, …)` aponta para a linha `45+dia`.

Run: `python3 <scratchpad-da-sessão>/dryrun_acomp.py` (usar o diretório de scratchpad da sessão).
Expected: preview coerente; os 2–3 spot-checks batem com as queries independentes. **Não gravar** nesta etapa (é verificação manual e depende de dados MCP ao vivo).

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/acompanhamento-diario-caveo.md
git commit -m "feat(acomp-diario): skill de orquestracao (coleta + preview + gravacao)"
```

---

### Task 6: Wire-up — comando, mapa do projeto e verificação final

**Files:**
- Create: `.claude/commands/acompanhamento-diario-caveo.md`
- Modify: `docs/projeto-mapa.md` (seção de skills, ~linha 50–61)

**Interfaces:**
- Consumes: a skill da Task 5.

- [ ] **Step 1: Criar o invólucro de comando**

`.claude/commands/acompanhamento-diario-caveo.md`:

```markdown
---
description: Acompanhamento diário Caveo (invest/leads/MQL/SQL/fechamentos por segmento) → planilha Resultados Mês Atual
argument-hint: [data ou intervalo opcional YYYY-MM-DD]
---

Invoque a skill `acompanhamento-diario-caveo` para esta tarefa. Argumentos do usuário (se houver): $ARGUMENTS
```

- [ ] **Step 2: Registrar a skill no mapa do projeto**

Em `docs/projeto-mapa.md`, na lista de skills (bloco que começa em `│   ├── skills/`), adicionar a linha após `detector-defeitos.md`:

```
│   │   ├── acompanhamento-diario-caveo.md (procedimento; diário MM/RF; grava planilha)
```

- [ ] **Step 3: Verificação final — docs + testes verdes juntos**

Run: `npm run docs:check && python3 -m pytest scripts/acompanhamento_diario/ -q`
Expected: "✓ ... sincronizado" e "19 passed".

- [ ] **Step 4: Confirmar que os artefatos existem e casam**

Run: `ls .claude/skills/acompanhamento-diario-caveo.md .claude/commands/acompanhamento-diario-caveo.md && grep -q "acompanhamento-diario-caveo" docs/projeto-mapa.md && echo WIRED`
Expected: os dois caminhos listados e `WIRED`.

- [ ] **Step 5: Commit**

```bash
git add .claude/commands/acompanhamento-diario-caveo.md docs/projeto-mapa.md
git commit -m "feat(acomp-diario): comando + registro no mapa do projeto"
```

---

## Notas de execução

- Rodar **tudo com o `python3` do sistema** (tem `gspread` + `pytest`); o `mcps/.venv` não serve.
- A skill é o único ponto que fala com MCP/rede; os helpers são puros e testados.
- Divergência conhecida (registrada no spec): o dashboard conta institucional "cheio em ambos"; esta skill usa rateio proporcional. Alinhar o dashboard é decisão futura, fora deste plano.
