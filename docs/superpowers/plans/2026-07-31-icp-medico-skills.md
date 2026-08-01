# Camada agêntica: Formando/Médico nas skills operacionais — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar `segments.py` e as 4 skills operacionais de mídia paga (mais 2 arquivos de baixo acoplamento) de chaves `"mm"`/`"rf"` para `"medico"`/`"formando"`, alinhadas à fundação do sub-projeto 1, incluindo a renomeação das planilhas reais.

**Architecture:** Bottom-up por dependência — `segments.py` primeiro (módulo-fonte compartilhado), depois cada skill dependente em ordem de acoplamento, depois os arquivos de baixo acoplamento, e por último a renomeação das planilhas reais.

**Tech Stack:** Python 3 (`pytest`), gspread + service account (`.claude/sheets_credentials.json`), Markdown (skills/agentes Claude Code).

## Global Constraints

- `classify_contratante(tip_cte)` — **1 argumento só** (recência não participa da classificação). Retorna `"formando"` | `"medico"` | `"revalida"` | `None`.
- **Revalida não aparece nos relatórios de mídia paga** — cada skill descarta `"revalida"`/`None` antes de tabular nos blocos Médico/Formando (mesma regra que já vale para `None` hoje).
- **Campanha sem tag de segmento no nome = 100% Médico**, sem rateio proporcional e sem fallback 50/50 — mídia paga mira só Médico. Isso torna **desnecessário** o cálculo de participação de opps por campanha (a query "1E"/`INST_OPPS`/`SF_CAMP_OPPS`/`camp_seg_opps` que existia só para isso é removida onde só servia a esse propósito).
- Tags legadas `[rf]`/`[mm]` no nome da campanha continuam reconhecidas (mapeadas para `"formando"`/`"medico"` respectivamente) — shim de compatibilidade com campanhas antigas, não uma regra da fundação.
- Linhas/colunas físicas das 3 planilhas reais **não mudam de posição** — só texto de rótulo/nome de aba.
- Dados já gravados antes de 2026-07-31 (virada de ICP) **não são recalculados** — princípio append-only já estabelecido no projeto.
- `.claude/agents/criativos.md` fica **fora deste plano** (depende dos docs de persona do sub-projeto 4).
- **Dependência de branch:** este plano pressupõe que o worktree de implementação ramifica da branch `worktree-icp-medico-fundacao` (sub-projeto 1, PR #5 ainda não mergeado em `main`) — não de `main` diretamente — porque `docs/fundacao-dados.md` só reflete `formando`/`medico`/`revalida` naquela branch. Confirmar isso ao criar o worktree (Task 0).
- Spec de referência: `docs/superpowers/specs/2026-07-31-icp-medico-skills-design.md`.

---

### Task 0: Preparar workspace isolado a partir do sub-projeto 1

Antes da Task 1: usar `superpowers:using-git-worktrees` para criar o worktree, mas informando explicitamente que a base deve ser a branch `worktree-icp-medico-fundacao` (não `main`) — ex.: `git worktree add <path> -b worktree-icp-medico-skills worktree-icp-medico-fundacao` (ou o equivalente via ferramenta nativa, apontando o branch base). Depois de entrar no worktree, rodar `npm run docs:check` como smoke test de que a fundação já está na versão nova (deve imprimir `✓ docs/fundacao-dados.md está sincronizado`), e conferir que `grep -c "formando" docs/fundacao-dados.md` retorna > 0.

---

### Task 1: `scripts/acompanhamento_diario/segments.py` — classificação direta

**Files:**
- Modify: `scripts/acompanhamento_diario/segments.py`
- Test: `scripts/acompanhamento_diario/test_segments.py`

**Interfaces:**
- Produces: `classify_segment(campaign_name: str) -> "formando"|"medico"|"institucional"`; `allocate(campaign_name: str, spend: float, leads: float) -> {"formando": {"spend","leads"}, "medico": {"spend","leads"}}`; `classify_contratante(tip_cte: str|None) -> "formando"|"medico"|"revalida"|None`.
- Consumes: nada (módulo-fonte, primeira task).

- [ ] **Step 1: Reescrever `test_segments.py` (vai falhar contra o código atual)**

```python
from segments import classify_segment, allocate, classify_contratante


def test_classify_por_tag():
    assert classify_segment("[MM] Search Médico") == "medico"
    assert classify_segment("[RF] Meta [LEADS]") == "formando"
    assert classify_segment("[mm] minúsculo") == "medico"


def test_classify_sem_tag_e_institucional():
    assert classify_segment("Search Institucional") == "institucional"
    assert classify_segment("[LEADS] Genérica sem segmento") == "institucional"


def test_allocate_campanha_taggeada_formando_vai_100_por_cento():
    r = allocate("[RF] Campanha", spend=1000.0, leads=10)
    assert r["formando"] == {"spend": 1000.0, "leads": 10}
    assert r["medico"] == {"spend": 0.0, "leads": 0.0}


def test_allocate_campanha_taggeada_medico_vai_100_por_cento():
    r = allocate("[MM] Campanha", spend=1000.0, leads=10)
    assert r["medico"] == {"spend": 1000.0, "leads": 10}
    assert r["formando"] == {"spend": 0.0, "leads": 0.0}


def test_allocate_institucional_vai_100_por_cento_medico():
    # Sem tag => 100% Médico, sem rateio (mídia paga mira só Médico).
    r = allocate("Search Institucional", spend=1000.0, leads=10)
    assert r["medico"] == {"spend": 1000.0, "leads": 10}
    assert r["formando"] == {"spend": 0.0, "leads": 0.0}


def test_classify_contratante_formando():
    assert classify_contratante("Formando") == "formando"


def test_classify_contratante_medico():
    assert classify_contratante("Médico") == "medico"


def test_classify_contratante_revalida():
    assert classify_contratante("Revalida") == "revalida"


def test_classify_contratante_tipcte_nulo_ou_desconhecido_e_none():
    assert classify_contratante(None) is None
    assert classify_contratante("Outro") is None
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd scripts/acompanhamento_diario && python3 -m pytest test_segments.py -v`
Expected: FAIL — `classify_segment`/`allocate`/`classify_contratante` ainda retornam `"mm"`/`"rf"` e `classify_contratante` ainda exige 2 argumentos.

- [ ] **Step 3: Reescrever `segments.py`**

```python
"""Classificação de campanha por segmento e classificação de oportunidade.

Oportunidade: espelha config/business-rules.ts (classifyContratante).
Campanha: mecanismo próprio desta camada Python — não existe mais na
fundação TS (SEGMENT_ALLOCATION foi removido no sub-projeto 1). Tags
[rf]/[mm] são um shim de compatibilidade com campanhas legadas; campanha
sem tag = 100% Médico (mídia paga mira só Médico daqui pra frente, sem
rateio institucional).
"""

TAG_FORMANDO = "[rf]"   # tag legada — campanhas antigas podem ainda ter esse nome
TAG_MEDICO = "[mm]"     # tag legada — idem


def classify_segment(campaign_name):
    """'formando', 'medico' ou 'institucional' (case-insensitive).
    Sem tag => institucional (100% Médico na alocação, ver allocate)."""
    n = campaign_name.lower()
    if TAG_FORMANDO in n:
        return "formando"
    if TAG_MEDICO in n:
        return "medico"
    return "institucional"


def allocate(campaign_name, spend, leads):
    """spend/leads de UMA campanha num dia -> {'formando': {...}, 'medico': {...}}.

    Campanha taggeada [rf] => 100% formando. Taggeada [mm] ou institucional
    (sem tag) => 100% medico — mídia paga mira só Médico, sem rateio.
    """
    seg = classify_segment(campaign_name)
    if seg == "formando":
        return {"formando": {"spend": spend, "leads": leads},
                "medico": {"spend": 0.0, "leads": 0.0}}
    return {"formando": {"spend": 0.0, "leads": 0.0},
            "medico": {"spend": spend, "leads": leads}}


def classify_contratante(tip_cte):
    """'formando', 'medico', 'revalida' ou None a partir de TipCte__c."""
    if tip_cte == "Formando":
        return "formando"
    if tip_cte == "Médico":
        return "medico"
    if tip_cte == "Revalida":
        return "revalida"
    return None
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd scripts/acompanhamento_diario && python3 -m pytest test_segments.py -v`
Expected: PASS (9 testes).

- [ ] **Step 5: Commit**

```bash
git add scripts/acompanhamento_diario/segments.py scripts/acompanhamento_diario/test_segments.py
git commit -m "feat(acomp-diario): segments.py migra pra formando/medico, institucional=100% medico"
```

---

### Task 2: `scripts/acompanhamento_diario/sheet.py` — chaves da planilha "Resultados Mês Atual"

**Files:**
- Modify: `scripts/acompanhamento_diario/sheet.py`
- Test: `scripts/acompanhamento_diario/test_sheet.py`

**Interfaces:**
- Consumes: nada de Task 1 diretamente (módulo independente, mesma pasta).
- Produces: `BLOCK_BASE = {"medico": 45, "formando": 87}`; `day_to_row(segment, day)`; `cell_updates(segment, day, metrics)`; `write_updates(worksheet, updates)`; `read_fechamentos(worksheet) -> {"medico": {...}, "formando": {...}}`.

- [ ] **Step 1: Reescrever `test_sheet.py`**

```python
import pytest

from sheet import day_to_row, cell_updates, write_updates, read_fechamentos


def test_day_to_row_medico_e_formando():
    assert day_to_row("medico", 1) == 46
    assert day_to_row("medico", 31) == 76
    assert day_to_row("formando", 1) == 88
    assert day_to_row("formando", 31) == 118


def test_day_to_row_rejeita_segmento_e_dia_invalidos():
    with pytest.raises(ValueError):
        day_to_row("total", 1)
    with pytest.raises(ValueError):
        day_to_row("medico", 0)
    with pytest.raises(ValueError):
        day_to_row("medico", 32)


def test_cell_updates_monta_celulas_do_dia():
    ups = cell_updates("medico", 3, {"invest_meta": 1000.0, "mql_meta": 5, "fechamento": 2})
    assert ups == [("C48", 1000.0), ("F48", 5), ("O48", 2)]


def test_cell_updates_ignora_none_e_ausentes():
    ups = cell_updates("formando", 1, {"invest_meta": None, "leads_google": 7})
    assert ups == [("K88", 7)]


def test_cell_updates_mantem_zero_explicito():
    ups = cell_updates("medico", 1, {"mql_meta": 0, "sql_meta": 0, "fechamento": 0})
    assert ups == [("F46", 0), ("G46", 0), ("O46", 0)]


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


class _FakeReadWS:
    """Simula gspread: .get(range) devolve linhas; trailing vazio é omitido
    (mesmo comportamento real do gspread .get())."""

    def __init__(self, medico_col=None, formando_col=None):
        self.medico_col = medico_col or []
        self.formando_col = formando_col or []

    def get(self, rng):
        if rng.startswith("O46"):
            return [[v] if v != "" else [] for v in self.medico_col]
        if rng.startswith("O88"):
            return [[v] if v != "" else [] for v in self.formando_col]
        raise ValueError(f"range inesperado: {rng}")


def test_read_fechamentos_valores_presentes():
    ws = _FakeReadWS(medico_col=["2", "1", "0"], formando_col=["1", "3"])
    out = read_fechamentos(ws)
    assert out["medico"][1] == 2
    assert out["medico"][2] == 1
    assert out["medico"][3] == 0  # zero explícito é um valor, não ausência
    assert out["formando"][1] == 1
    assert out["formando"][2] == 3


def test_read_fechamentos_dia_vazio_no_meio_e_none():
    ws = _FakeReadWS(medico_col=["2", "1", "", "0", "3"])
    out = read_fechamentos(ws)
    assert out["medico"][3] is None
    assert out["medico"][4] == 0
    assert out["medico"][5] == 3


def test_read_fechamentos_dias_finais_omitidos_pelo_gspread_sao_none():
    ws = _FakeReadWS(medico_col=["2", "1"])  # dias 3..31 nem aparecem na resposta
    out = read_fechamentos(ws)
    assert out["medico"][3] is None
    assert out["medico"][31] is None


def test_read_fechamentos_cobre_dias_1_a_31_nos_dois_segmentos():
    ws = _FakeReadWS()  # planilha totalmente vazia (mês novo)
    out = read_fechamentos(ws)
    assert set(out.keys()) == {"medico", "formando"}
    assert set(out["medico"].keys()) == set(range(1, 32))
    assert all(v is None for v in out["medico"].values())
    assert all(v is None for v in out["formando"].values())
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd scripts/acompanhamento_diario && python3 -m pytest test_sheet.py -v`
Expected: FAIL — `day_to_row("medico", ...)` levanta `ValueError` (segmento ainda é `"mm"`/`"rf"`).

- [ ] **Step 3: Reescrever `sheet.py`**

```python
"""Mapeamento dia→linha e gravação na aba 'Resultados Mês Atual'.

Blocos: Médico (dia d → linha 45+d), Formando (dia d → linha 87+d). TOTAL é
fórmula =MÉDICO+FORMANDO e nunca é tocado. Ver Global Constraints do plano.
"""

BLOCK_BASE = {"medico": 45, "formando": 87}

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
        raise ValueError(f"segmento inválido: {segment!r} (use 'medico' ou 'formando')")
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


def _parse_fechamento_cell(cell):
    """'' (ausente/vazio) -> None; string numérica -> int (0 é valor real)."""
    if not cell:
        return None
    return int(cell)


def read_fechamentos(worksheet):
    """{'medico': {dia: valor_ou_None}, 'formando': {...}} a partir da coluna O
    (fechamento) dos blocos Médico/Formando. Espelha cell_updates/write_updates
    (escrita) com uma leitura simétrica."""
    out = {}
    for seg, base in BLOCK_BASE.items():
        first_row, last_row = base + 1, base + 31
        rows = worksheet.get(f"O{first_row}:O{last_row}")
        days = {}
        for day in range(1, 32):
            idx = day - 1
            row = rows[idx] if idx < len(rows) else []
            cell = row[0] if row else ""
            days[day] = _parse_fechamento_cell(cell)
        out[seg] = days
    return out
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd scripts/acompanhamento_diario && python3 -m pytest test_sheet.py -v`
Expected: PASS (11 testes).

- [ ] **Step 5: Commit**

```bash
git add scripts/acompanhamento_diario/sheet.py scripts/acompanhamento_diario/test_sheet.py
git commit -m "feat(acomp-diario): sheet.py — BLOCK_BASE medico/formando"
```

---

### Task 3: `.claude/skills/acompanhamento-diario-caveo.md` — skill diária

**Files:**
- Modify: `.claude/skills/acompanhamento-diario-caveo.md`

**Interfaces:**
- Consumes de Task 1: `classify_contratante(tip_cte)` (1 arg), `allocate(campaign_name, spend, leads)` (sem `opp_mm`/`opp_rf`).
- Consumes de Task 2: `BLOCK_BASE = {"medico": 45, "formando": 87}`, `cell_updates(segment, day, metrics)`, `write_updates`.

- [ ] **Step 1: Frontmatter e título**

Trocar (linhas 3, 6, 8-9):

```yaml
description: Coleta métricas diárias da Caveo (investimento, leads, MQL, SQL, fechamentos) de Meta Ads + Google Ads + Salesforce, por segmento (Médico Maduro / Recém-Formado), e grava na planilha "Resultados Mês Atual". Cadência diária append-only (sem retroativo). Use para atualizar o acompanhamento diário de captação e funil.
```
```
# Skill: Acompanhamento Diário — Caveo

Coleta diária por **dia × segmento (Médico/Formando) × canal (Meta/Google)** e
grava na planilha de acompanhamento. **Append-only: nunca reescreve dias
anteriores.**
```

por:

```yaml
description: Coleta métricas diárias da Caveo (investimento, leads, MQL, SQL, fechamentos) de Meta Ads + Google Ads + Salesforce, por segmento (Médico / Formando), e grava na planilha "Resultados Mês Atual". Cadência diária append-only (sem retroativo). Use para atualizar o acompanhamento diário de captação e funil.
```
```
# Skill: Acompanhamento Diário — Caveo

Coleta diária por **dia × segmento (Médico/Formando) × canal (Meta/Google)** e
grava na planilha de acompanhamento. **Append-only: nunca reescreve dias
anteriores.**
```

- [ ] **Step 2: Seção "Fundação"**

Trocar (linhas 21-29):

```
Canal pago (Meta/Google) usa o modelo **cpc + cruzamento** de
`docs/fundacao-dados.md` (seção "Fragmentos SOQL prontos"), fuso `-03:00`. MQL/SQL
usam `QUALIFICATION_RULES` (seção 7); alocação de segmento usa `SEGMENT_ALLOCATION`
(seção 8). Segmento por `TipCte__c` + `Tempo_de_Formado__c` via
`classify_contratante` (seção 4) — **sempre** `from segments import
classify_contratante` (`scripts/acompanhamento_diario/segments.py`); nunca
aplicar a regra de cabeça. NÃO reescrever essas listas aqui.
```

por:

```
Canal pago (Meta/Google) usa o modelo **cpc + cruzamento** de
`docs/fundacao-dados.md` (seção "Fragmentos SOQL prontos"), fuso `-03:00`. MQL/SQL
usam `QUALIFICATION_RULES` (seção 7). Segmento por `TipCte__c` via
`classify_contratante` (seção 4) — **sempre** `from segments import
classify_contratante` (`scripts/acompanhamento_diario/segments.py`); nunca
aplicar a regra de cabeça. Campanha sem tag de segmento no nome (institucional)
conta 100% como Médico — mídia paga mira só Médico, sem rateio institucional
(fundação seção 8 é nota histórica agora; ver `classify_segment`/`allocate` no
mesmo módulo). NÃO reescrever essas listas aqui.
```

- [ ] **Step 3: Fase 0.5 — bases dos blocos**

Trocar (linhas 67-71):

```
1. **Confirmar as bases dos blocos** — ler de volta as células de rótulo e checar
   que a planilha traz "MÉDICO MADURO" por volta da linha 43 e "RECÉM FORMADOS"
   por volta da linha 85. `sheet.day_to_row` assume `BLOCK_BASE = {mm: 45, rf: 87}`
   (dia _d_ → 45+_d_ / 87+_d_); se os rótulos estiverem em outras linhas, ajustar
   `BLOCK_BASE` antes de gravar — caso contrário os números caem no bloco errado.
```

por:

```
1. **Confirmar as bases dos blocos** — ler de volta as células de rótulo e checar
   que a planilha traz "MÉDICO" por volta da linha 43 e "FORMANDO"
   por volta da linha 85 (ver Task 11 do plano — renomeação das planilhas reais).
   `sheet.day_to_row` assume `BLOCK_BASE = {medico: 45, formando: 87}`
   (dia _d_ → 45+_d_ / 87+_d_); se os rótulos estiverem em outras linhas, ajustar
   `BLOCK_BASE` antes de gravar — caso contrário os números caem no bloco errado.
```

- [ ] **Step 4: Fase 1C — SOQL + classificação**

Trocar (linhas 92-112):

```
### 1C. Salesforce — histórico p/ MQL/SQL (por canal)
Para `[FILTRO_META]` e `[FILTRO_GOOGLE]` (fragmentos cpc+cruzamento da fundação),
com lookback de 12 meses antes de START (ciclos médicos longos podem passar de 3
meses — a janela larga garante capturar opps criadas antes mas que cruzam um gate
DENTRO do período; o `in_period` continua restringindo o que é gravado):
```sql
SELECT OpportunityId, StageName, CreatedDate,
       Opportunity.TipCte__c, Opportunity.Tempo_de_Formado__c, Opportunity.IsWon
FROM OpportunityHistory
WHERE Opportunity.CreatedDate >= [START-12meses]T00:00:00-03:00
  AND Opportunity.CreatedDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META | FILTRO_GOOGLE])
ORDER BY OpportunityId, CreatedDate
```
Agrupar as linhas por `OpportunityId` → `history=[{stage, date}]` (date = dia de
`CreatedDate` da linha de histórico, em `-03:00`), `is_won = IsWon OR StageName
contém "Ganho não Identificado"`, `segment = classify_contratante(TipCte__c,
Tempo_de_Formado__c)` (`from segments import classify_contratante` — nunca
classificar de memória).
Opps que classificam como `None` (`TipCte__c` vazio) são **descartadas** — não
entram em `mm`/`rf` (o acumulador só tem essas duas chaves).
```

por:

```
### 1C. Salesforce — histórico p/ MQL/SQL (por canal)
Para `[FILTRO_META]` e `[FILTRO_GOOGLE]` (fragmentos cpc+cruzamento da fundação),
com lookback de 12 meses antes de START (ciclos médicos longos podem passar de 3
meses — a janela larga garante capturar opps criadas antes mas que cruzam um gate
DENTRO do período; o `in_period` continua restringindo o que é gravado):
```sql
SELECT OpportunityId, StageName, CreatedDate,
       Opportunity.TipCte__c, Opportunity.IsWon
FROM OpportunityHistory
WHERE Opportunity.CreatedDate >= [START-12meses]T00:00:00-03:00
  AND Opportunity.CreatedDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META | FILTRO_GOOGLE])
ORDER BY OpportunityId, CreatedDate
```
Agrupar as linhas por `OpportunityId` → `history=[{stage, date}]` (date = dia de
`CreatedDate` da linha de histórico, em `-03:00`), `is_won = IsWon OR StageName
contém "Ganho não Identificado"`, `segment = classify_contratante(TipCte__c)`
(`from segments import classify_contratante` — nunca classificar de memória).
Opps que classificam como `None` ou `"revalida"` (`TipCte__c` vazio,
desconhecido, ou Revalida) são **descartadas** — não entram em
`medico`/`formando` (o acumulador só tem essas duas chaves; Revalida não
aparece nestes relatórios de mídia paga).
```

- [ ] **Step 5: Fase 1D — fechamentos**

Trocar (linhas 114-126):

```
### 1D. Salesforce — fechamentos por dia/segmento (mídia paga)
```sql
SELECT TipCte__c, Tempo_de_Formado__c, LastStageChangeDate
FROM Opportunity
WHERE LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
  AND [WON_CLAUSE]
```
Esta query **não filtra por `TipCte__c`** — classificar cada linha em
`segment = classify_contratante(TipCte__c, Tempo_de_Formado__c)` (`from
segments import classify_contratante`; nunca de memória). Opps que classificam
como `None` são **descartadas** do `SF_CLOSINGS` — mesma regra de 1C/1E.
```

por:

```
### 1D. Salesforce — fechamentos por dia/segmento (mídia paga)
```sql
SELECT TipCte__c, LastStageChangeDate
FROM Opportunity
WHERE LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
  AND [WON_CLAUSE]
```
Esta query **não filtra por `TipCte__c`** — classificar cada linha em
`segment = classify_contratante(TipCte__c)` (`from segments import
classify_contratante`; nunca de memória). Opps que classificam como `None` ou
`"revalida"` são **descartadas** do `SF_CLOSINGS` — mesma regra de 1C.
```

(o parágrafo de atenção ao fuso UTC logo abaixo, linhas 128-135, não muda.)

- [ ] **Step 6: Remover a Fase 1E inteira**

Remover (linhas 137-154):

```
### 1E. Salesforce — opps por campanha/dia/segmento (para o rateio institucional)
```sql
SELECT UtmCam__c, TipCte__c, Tempo_de_Formado__c, CreatedDate
FROM Opportunity
WHERE CreatedDate >= [START]T00:00:00-03:00
  AND CreatedDate <= [END]T23:59:59-03:00
  AND UtmCam__c != null
```
Bucketizar em `{ (utmcam, dia): {mm: n, rf: n} }` (segmento via
`classify_contratante(TipCte__c, Tempo_de_Formado__c)` — `from segments import
classify_contratante`; dia em `-03:00`). Opps que classificam como `None`
(`TipCte__c` vazio) são **descartadas** do rateio.

> **Matching campanha↔UtmCam:** o rateio casa o nome da campanha da plataforma
> com `UtmCam__c`. No Meta costuma ser idêntico; no Google, campanhas
> institucionais podem ter nome divergente — normalizar (mesmo mapa de
> `planilha-resultados` Fase 2 / `lib/integrations/google.ts`). Sem match, a
> campanha cai no fallback 50/50 e **deve aparecer sinalizada no preview**.
```

Motivo: sem rateio proporcional (campanha sem tag = 100% Médico direto), essa
query e o matching campanha↔UtmCam deixam de ter propósito nesta skill.

- [ ] **Step 7: Fase 2 — reescrever o script Python embutido**

Trocar o bloco de código inteiro (linhas 162-269, do `import sys` até o fim do
script Python embutido) por:

```python
import sys
sys.path.insert(0, 'scripts/acompanhamento_diario')
from segments import allocate, classify_contratante
from qualification import mql_day, sql_day
from sheet import cell_updates, write_updates
import gspread
from google.oauth2.service_account import Credentials
from collections import defaultdict

# START/END já conhecidos; days = [1..N] dentro do período.
# META_ROWS / GOOGLE_ROWS: [{"campaign": str, "day": int, "spend": float, "leads": float}]
# SF_HISTORY:  [{"channel": "meta"|"google", "segment": "medico"|"formando",
#               "history": [{"stage","date"}], "is_won": bool}]
# SF_CLOSINGS: [{"segment": "medico"|"formando", "day": int}]

# acc[segment][day] = dict de métricas (chaves de sheet.COLS), PRÉ-ZERADO abaixo.
acc = {"medico": defaultdict(dict), "formando": defaultdict(dict)}

# Zero explícito: todo dia dentro de [START,END] recebe as 9 métricas com 0
# antes de qualquer acumulação. Sem isso, um dia sem MQL/SQL/fechamento/lead
# simplesmente não teria a chave no dict e cell_updates() pularia a célula —
# ficando indistinguível de "esse dia não foi processado". Com o zero
# explícito, toda célula do período é sempre escrita (0 quando não há
# ocorrência), então "vazio" na planilha só significa "fora do período".
_ALL_METRIC_KEYS = ("invest_meta", "leads_meta", "mql_meta", "sql_meta",
                    "invest_google", "leads_google", "mql_google", "sql_google",
                    "fechamento")
_day_start, _day_end = int(START[8:10]), int(END[8:10])
for _seg in ("medico", "formando"):
    for _day in range(_day_start, _day_end + 1):
        for _k in _ALL_METRIC_KEYS:
            acc[_seg][_day][_k] = 0

def add(seg, day, key, val):
    acc[seg][day][key] = acc[seg][day].get(key, 0) + val

# --- Investimento + Leads (campanha taggeada -> 100% no segmento da tag;
#     sem tag/institucional -> 100% Médico, sem rateio) ---
for rows, ik, lk in ((META_ROWS, "invest_meta", "leads_meta"),
                     (GOOGLE_ROWS, "invest_google", "leads_google")):
    for r in rows:
        a = allocate(r["campaign"], r["spend"], r["leads"])
        for seg in ("medico", "formando"):
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

# --- Arredondar leads (Google conversions pode vir fracionado) ---
for seg in ("medico", "formando"):
    for day, m in acc[seg].items():
        for k in ("leads_meta", "leads_google"):
            if k in m: m[k] = round(m[k])

# --- PREVIEW (imprimir antes de gravar) ---
# Além do agregado por dia, imprime as células A1 exatas que serão gravadas
# (as mesmas que cell_updates devolve) para conferência humana do mapeamento:
# ex.: Médico dia 3 escreve em C48/F48/… (linha = base do bloco + dia).
for seg in ("medico", "formando"):
    print(f"\n=== {seg.upper()} ===")
    for day in sorted(acc[seg]):
        m = dict(acc[seg][day])
        print(day, m)
        cells = cell_updates(seg, day, m)
        print("    A1:", ", ".join(f"{a1}={val}" for a1, val in cells))

# --- GRAVAÇÃO (só após confirmação do usuário na Fase 3) ---
def gravar():
    creds = Credentials.from_service_account_file(
        '.claude/sheets_credentials.json',
        scopes=['https://www.googleapis.com/auth/spreadsheets'])
    ws = gspread.authorize(creds).open_by_key(
        '19gElL0pmUO3yPZZG0-5E1ym61wHbQM5-JohK5_wPjj4').worksheet('Resultados Mês Atual')
    total = 0
    for seg in ("medico", "formando"):
        for day, m in acc[seg].items():
            total += write_updates(ws, cell_updates(seg, day, m))
    print(f"Gravadas {total} células.")
```

- [ ] **Step 8: Fase 3 — preview e confirmação**

Trocar (linhas 271-279):

```
## Fase 3 — Preview e confirmação

Apresentar as tabelas MM e RF (dias × colunas). **Sinalizar** campanhas
institucionais que caíram no fallback 50/50 (0 opps no dia). Perguntar:
```
Gravar estes dias na planilha "Resultados Mês Atual"? (sim para confirmar)
```
Só chamar `gravar()` após "sim". Nunca tocar TOTAL, B/H/N, nem D/J/P/Q.
```

por:

```
## Fase 3 — Preview e confirmação

Apresentar as tabelas Médico e Formando (dias × colunas). Perguntar:
```
Gravar estes dias na planilha "Resultados Mês Atual"? (sim para confirmar)
```
Só chamar `gravar()` após "sim". Nunca tocar TOTAL, B/H/N, nem D/J/P/Q.
```

- [ ] **Step 9: Commit**

```bash
git add .claude/skills/acompanhamento-diario-caveo.md
git commit -m "feat(acomp-diario): skill migra pra Médico/Formando, remove rateio por opp-share (1E)"
```

---

### Task 4: `scripts/planilha_resultados/sheet.py` — chaves da planilha "Relação de Leads"

**Files:**
- Modify: `scripts/planilha_resultados/sheet.py`
- Test: `scripts/planilha_resultados/test_sheet.py`

**Interfaces:**
- Produces: `BLOCK_BASE = {"medico": 0, "formando": 28}`; `cell_updates(segment, metrics, stages)`; `write_updates(worksheet, updates)`.

- [ ] **Step 1: Reescrever `test_sheet.py`**

```python
import pytest

from sheet import cell_updates, write_updates


def test_cell_updates_medico_usa_linhas_base_sem_offset():
    ups = dict(cell_updates("medico", {"invest_meta": 1000.0, "leads_google": 37}, {}))
    assert ups["B30"] == 1000.0
    assert ups["F36"] == 37


def test_cell_updates_formando_soma_offset_28():
    ups = dict(cell_updates("formando", {"invest_meta": 500.0, "leads_google": 10}, {}))
    assert ups["B58"] == 500.0
    assert ups["F64"] == 10


def test_cell_updates_rejeita_segmento_invalido():
    with pytest.raises(ValueError):
        cell_updates("geral", {}, {})


def test_cell_updates_ignora_none_mas_mantem_zero_explicito():
    ups = dict(cell_updates("medico", {"invest_meta": None, "mql_meta": 0}, {}))
    assert "B30" not in ups
    assert ups["B38"] == 0


def test_cell_updates_grava_todos_os_estagios_com_zero_explicito():
    ups = dict(cell_updates("medico", {}, {"meta": {"Fechado Ganho": 4}}))
    # Fechado Ganho tem valor; os outros 7 estágios (meta) e os 8 (google,
    # sem entrada nenhuma) devem vir como 0 explícito, nunca ausentes.
    assert ups["B49"] == 4
    assert ups["B46"] == 0  # Aguardando Resposta (meta) sem dado
    assert ups["F53"] == 0  # Ganho não Identificado (google) sem dado nenhum


def test_cell_updates_estagios_formando_usa_offset():
    ups = dict(cell_updates("formando", {}, {"google": {"Nova": 5}}))
    assert ups["F79"] == 5  # 51 (Nova, base Médico) + 28


class _FakeWS:
    def __init__(self):
        self.calls = []

    def batch_update(self, body):
        self.calls.append(body)


def test_write_updates_faz_batch():
    ws = _FakeWS()
    n = write_updates(ws, [("B30", 1000.0), ("F36", 37)])
    assert n == 2
    assert ws.calls == [[
        {"range": "B30", "values": [[1000.0]]},
        {"range": "F36", "values": [[37]]},
    ]]


def test_write_updates_vazio_nao_chama_api():
    ws = _FakeWS()
    assert write_updates(ws, []) == 0
    assert ws.calls == []
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd scripts/planilha_resultados && python3 -m pytest test_sheet.py -v`
Expected: FAIL — `cell_updates("medico", ...)` levanta `ValueError` (só `"mm"`/`"rf"` são aceitos hoje).

- [ ] **Step 3: Editar `sheet.py`**

Trocar a linha `BLOCK_BASE = {"mm": 0, "rf": 28}` por `BLOCK_BASE = {"medico": 0, "formando": 28}`, e a docstring/mensagem de erro de `cell_updates`:

```python
    if segment not in BLOCK_BASE:
        raise ValueError(f"segmento inválido: {segment!r} (use 'medico' ou 'formando')")
```

(nenhuma outra linha do arquivo muda — `COLS`, `STAGE_ROWS`, `STAGE_COL` e a lógica de `cell_updates`/`write_updates` são agnósticas ao nome da chave.)

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd scripts/planilha_resultados && python3 -m pytest test_sheet.py -v`
Expected: PASS (9 testes).

- [ ] **Step 5: Commit**

```bash
git add scripts/planilha_resultados/sheet.py scripts/planilha_resultados/test_sheet.py
git commit -m "feat(planilha-resultados): sheet.py — BLOCK_BASE medico/formando"
```

---

### Task 5: `.claude/skills/planilha-resultados.md` — skill mensal "Relação de Leads"

**Files:**
- Modify: `.claude/skills/planilha-resultados.md`

**Interfaces:**
- Consumes de Task 1: `classify_contratante(tip_cte)` (1 arg), `allocate(campaign_name, spend, leads)` (sem opp counts). `classify_segment` deixa de ser importado diretamente por esta skill (só usado internamente por `allocate`).
- Consumes de Task 4: `BLOCK_BASE = {"medico": 0, "formando": 28}`, `cell_updates(segment, metrics, stages)`.

- [ ] **Step 1: Frontmatter, título e intro**

Trocar (linhas 3, 6, 9):

```yaml
description: Coleta e apresenta dados consolidados de Mídia Paga da Caveo (Meta Ads [LEADS] + Google Ads + Salesforce CRM) para o período do mês atual de 01 até D-1, segmentado por Médico Maduro (MM) e Recém-Formado (RF). Entrega funil Investimento→Leads (Registro Concluído)→MQL Opp→SQL Proposta Enviada→Fechamento por segmento×plataforma, visão por estágio e breakdown por campanha. Use quando precisar do relatório de performance de mídia paga.
```
```
Coleta e consolida dados de Meta Ads, Google Ads e Salesforce para o período do mês corrente
(dia 01 até D-1), segmenta por **Médico Maduro (MM)** e **Recém-Formado (RF)**, e grava na
planilha "Relação de Leads".
```

por:

```yaml
description: Coleta e apresenta dados consolidados de Mídia Paga da Caveo (Meta Ads [LEADS] + Google Ads + Salesforce CRM) para o período do mês atual de 01 até D-1, segmentado por Médico e Formando. Entrega funil Investimento→Leads (Registro Concluído)→MQL Opp→SQL Proposta Enviada→Fechamento por segmento×plataforma, visão por estágio e breakdown por campanha. Use quando precisar do relatório de performance de mídia paga.
```
```
Coleta e consolida dados de Meta Ads, Google Ads e Salesforce para o período do mês corrente
(dia 01 até D-1), segmenta por **Médico** e **Formando**, e grava na
planilha "Relação de Leads".
```

- [ ] **Step 2: Seção "Fundação"**

Trocar (linhas 26-35):

```
`docs/fundacao-dados.md` (seção "Fragmentos SOQL prontos"), com fuso `-03:00`.
NÃO reescrever listas de `UtmSou__c` aqui. Segmento (MM/RF) usa
`classify_contratante` (fundação §4, `TipCte__c` + `Tempo_de_Formado__c`) —
**sempre** `from segments import classify_contratante`
(`scripts/acompanhamento_diario/segments.py`); nunca aplicar a regra de
cabeça. MQL/SQL cumulativo usa `QUALIFICATION_RULES` (fundação §7) via
`from qualification import mql_day, sql_day`
(`scripts/acompanhamento_diario/qualification.py`). Alocação de campanhas sem
tag de segmento usa `SEGMENT_ALLOCATION` (fundação §8) via
`from segments import allocate, classify_segment`. NÃO reescrever essas
regras aqui — importar sempre dos módulos.
```

por:

```
`docs/fundacao-dados.md` (seção "Fragmentos SOQL prontos"), com fuso `-03:00`.
NÃO reescrever listas de `UtmSou__c` aqui. Segmento (Médico/Formando) usa
`classify_contratante` (fundação §4, `TipCte__c`) — **sempre** `from segments
import classify_contratante` (`scripts/acompanhamento_diario/segments.py`);
nunca aplicar a regra de cabeça. Opps que classificam como `"revalida"` ou
`None` são descartadas — não aparecem nesta skill. MQL/SQL cumulativo usa
`QUALIFICATION_RULES` (fundação §7) via `from qualification import mql_day,
sql_day` (`scripts/acompanhamento_diario/qualification.py`). Campanha sem tag
de segmento no nome conta 100% como Médico via `from segments import
allocate` (fundação §8 é nota histórica agora — mídia paga mira só Médico,
sem rateio institucional). NÃO reescrever essas regras aqui — importar
sempre dos módulos.
```

- [ ] **Step 3: Seção "Estrutura da planilha"**

Trocar (linhas 39-44):

```
A aba tem 3 blocos verticais. O bloco **Geral** (linhas 1-26) é **100% fórmula**
(`=MM+RF` célula a célula) — esta skill **nunca escreve nele**. Só os blocos
**MÉDICO MADURO** (linhas 28-54) e **RECÉM-FORMADOS** (linhas 56-82) recebem
dados desta skill. Cada bloco tem colunas Meta Ads (B) e Google Ads (F) com o
funil Investimento → Leads → MQL Opp → SQL Proposta Enviada → Fechamento,
seguido da tabela "Estágio | Oportunidades | %".
```

por:

```
A aba tem 3 blocos verticais. O bloco **Geral** (linhas 1-26) é **100% fórmula**
(`=Médico+Formando` célula a célula) — esta skill **nunca escreve nele**. Só os
blocos **MÉDICO** (linhas 28-54) e **FORMANDO** (linhas 56-82) recebem dados
desta skill. Cada bloco tem colunas Meta Ads (B) e Google Ads (F) com o funil
Investimento → Leads → MQL Opp → SQL Proposta Enviada → Fechamento, seguido
da tabela "Estágio | Oportunidades | %".
```

- [ ] **Step 4: Fase 1C — remover `Tempo_de_Formado__c` do SELECT (campo morto)**

`Tempo_de_Formado__c` não participa mais da classificação — deixá-lo na query seria buscar um campo que nada mais consome. Trocar (linhas 125-131):

```sql
SELECT Id, UtmCam__c, StageName, TipCte__c, Tempo_de_Formado__c
FROM Opportunity
WHERE CreatedDate >= [START]T00:00:00-03:00
  AND CreatedDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] | [FILTRO_GOOGLE])
```

por:

```sql
SELECT Id, UtmCam__c, StageName, TipCte__c
FROM Opportunity
WHERE CreatedDate >= [START]T00:00:00-03:00
  AND CreatedDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] | [FILTRO_GOOGLE])
```

- [ ] **Step 5: Fase 1D — SOQL de histórico**

Trocar (linha 166-167):

```sql
SELECT OpportunityId, StageName, CreatedDate,
       Opportunity.TipCte__c, Opportunity.Tempo_de_Formado__c, Opportunity.IsWon
FROM OpportunityHistory
```

por:

```sql
SELECT OpportunityId, StageName, CreatedDate,
       Opportunity.TipCte__c, Opportunity.IsWon
FROM OpportunityHistory
```

- [ ] **Step 6: Comentários dos dados crus na Fase 2 (docstring dos placeholders)**

Trocar (linhas 216-226):

```python
# SF_OPPS: uma linha por Opportunity (1C). No Google, "utmcam" já deve vir
# remapeado pelo GOOGLE_UTMCAM_ALIAS (ver 1C) — nunca o código interno bruto.
SF_OPPS = [
    # {"platform": "meta"|"google", "utmcam": str|None, "stage": str,
    #  "tipcte": str|None, "recencia": str|None}
]
# SF_HISTORY_RAW: uma linha por transição de OpportunityHistory (1D)
SF_HISTORY_RAW = [
    # {"platform": "meta"|"google", "opp_id": str, "stage": str, "date": str,
    #  "is_won": bool, "tipcte": str|None, "recencia": str|None}
]
```

por:

```python
# SF_OPPS: uma linha por Opportunity (1C). No Google, "utmcam" já deve vir
# remapeado pelo GOOGLE_UTMCAM_ALIAS (ver 1C) — nunca o código interno bruto.
SF_OPPS = [
    # {"platform": "meta"|"google", "utmcam": str|None, "stage": str,
    #  "tipcte": str|None}
]
# SF_HISTORY_RAW: uma linha por transição de OpportunityHistory (1D)
SF_HISTORY_RAW = [
    # {"platform": "meta"|"google", "opp_id": str, "stage": str, "date": str,
    #  "is_won": bool, "tipcte": str|None}
]
```

- [ ] **Step 7: Bloco "1. Classificar oportunidades" — remove `camp_seg_opps`**

Trocar (linhas 241-256):

```python
# --- 1. Classificar oportunidades (1C) por segmento; descartar None (TipCte__c vazio) ---
stage_tally = {p: {"mm": defaultdict(int), "rf": defaultdict(int)} for p in ("meta", "google")}
camp_tally = {p: defaultdict(lambda: {"opps": 0, "fechado": 0}) for p in ("meta", "google")}
camp_seg_opps = {p: defaultdict(lambda: {"mm": 0, "rf": 0}) for p in ("meta", "google")}

for o in SF_OPPS:
    seg = classify_contratante(o["tipcte"], o["recencia"])
    if seg is None:
        continue
    stage_tally[o["platform"]][seg][o["stage"]] += 1
    if o["utmcam"]:
        c = camp_tally[o["platform"]][o["utmcam"]]
        c["opps"] += 1
        if o["stage"] in WON_STAGES:
            c["fechado"] += 1
        camp_seg_opps[o["platform"]][o["utmcam"]][seg] += 1
```

por:

```python
# --- 1. Classificar oportunidades (1C) por segmento; descartar None (TipCte__c
#     vazio) e "revalida" (não aparece nesta skill) do funil segmentado. O
#     camp_tally (total por campanha) continua contando tudo que classificou. ---
stage_tally = {p: {"medico": defaultdict(int), "formando": defaultdict(int)} for p in ("meta", "google")}
camp_tally = {p: defaultdict(lambda: {"opps": 0, "fechado": 0}) for p in ("meta", "google")}

for o in SF_OPPS:
    seg = classify_contratante(o["tipcte"])
    if seg is None:
        continue
    if o["utmcam"]:
        c = camp_tally[o["platform"]][o["utmcam"]]
        c["opps"] += 1
        if o["stage"] in WON_STAGES:
            c["fechado"] += 1
    if seg == "revalida":
        continue
    stage_tally[o["platform"]][seg][o["stage"]] += 1
```

- [ ] **Step 8: Bloco "2. MQL/SQL cumulativo"**

Trocar (linhas 258-275):

```python
# --- 2. MQL/SQL cumulativo (1D) por segmento ---
by_opp = defaultdict(list)
for h in SF_HISTORY_RAW:
    by_opp[(h["platform"], h["opp_id"])].append(h)

mql_count = {p: {"mm": 0, "rf": 0} for p in ("meta", "google")}
sql_count = {p: {"mm": 0, "rf": 0} for p in ("meta", "google")}

for (platform, opp_id), rows in by_opp.items():
    seg = classify_contratante(rows[0]["tipcte"], rows[0]["recencia"])
    if seg is None:
        continue
    history = [{"stage": r["stage"], "date": r["date"]} for r in rows]
    is_won = any(r["is_won"] or r["stage"] == "Ganho não Identificado" for r in rows)
    if mql_day(history, is_won) is not None:
        mql_count[platform][seg] += 1
    if sql_day(history, is_won) is not None:
        sql_count[platform][seg] += 1
```

por:

```python
# --- 2. MQL/SQL cumulativo (1D) por segmento ---
by_opp = defaultdict(list)
for h in SF_HISTORY_RAW:
    by_opp[(h["platform"], h["opp_id"])].append(h)

mql_count = {p: {"medico": 0, "formando": 0} for p in ("meta", "google")}
sql_count = {p: {"medico": 0, "formando": 0} for p in ("meta", "google")}

for (platform, opp_id), rows in by_opp.items():
    seg = classify_contratante(rows[0]["tipcte"])
    if seg not in ("medico", "formando"):
        continue
    history = [{"stage": r["stage"], "date": r["date"]} for r in rows]
    is_won = any(r["is_won"] or r["stage"] == "Ganho não Identificado" for r in rows)
    if mql_day(history, is_won) is not None:
        mql_count[platform][seg] += 1
    if sql_day(history, is_won) is not None:
        sql_count[platform][seg] += 1
```

- [ ] **Step 9: Bloco "3. Rateio institucional" — vira split direto sem opp-share**

Trocar (linhas 277-296):

```python
# --- 3. Rateio institucional (§8) para Investimento/Impressões/Cliques/Leads ---
def split_campaigns(campaigns, platform, lead_key):
    out = {"mm": {"spend": 0.0, "impressions": 0.0, "clicks": 0.0, "leads": 0.0},
           "rf": {"spend": 0.0, "impressions": 0.0, "clicks": 0.0, "leads": 0.0}}
    fallback_5050 = []
    for c in campaigns:
        so = camp_seg_opps[platform].get(c["name"], {"mm": 0, "rf": 0})
        if classify_segment(c["name"]) == "institucional" and so["mm"] + so["rf"] == 0 and c["spend"]:
            fallback_5050.append(c["name"])
        a_money = allocate(c["name"], c["spend"], c[lead_key], so["mm"], so["rf"])
        a_vol = allocate(c["name"], c["impressions"], c["clicks"], so["mm"], so["rf"])
        for seg in ("mm", "rf"):
            out[seg]["spend"] += a_money[seg]["spend"]
            out[seg]["leads"] += a_money[seg]["leads"]
            out[seg]["impressions"] += a_vol[seg]["spend"]
            out[seg]["clicks"] += a_vol[seg]["leads"]
    return out, fallback_5050

meta_split, meta_fallback = split_campaigns(META_CAMPAIGNS, "meta", "leads")
google_split, google_fallback = split_campaigns(GOOGLE_CAMPAIGNS, "google", "conversions")
```

por:

```python
# --- 3. Campanha taggeada -> 100% no segmento da tag; institucional (sem
#     tag) -> 100% Médico, sem rateio (mídia paga mira só Médico) ---
def split_campaigns(campaigns, lead_key):
    out = {"medico": {"spend": 0.0, "impressions": 0.0, "clicks": 0.0, "leads": 0.0},
           "formando": {"spend": 0.0, "impressions": 0.0, "clicks": 0.0, "leads": 0.0}}
    for c in campaigns:
        a_money = allocate(c["name"], c["spend"], c[lead_key])
        a_vol = allocate(c["name"], c["impressions"], c["clicks"])
        for seg in ("medico", "formando"):
            out[seg]["spend"] += a_money[seg]["spend"]
            out[seg]["leads"] += a_money[seg]["leads"]
            out[seg]["impressions"] += a_vol[seg]["spend"]
            out[seg]["clicks"] += a_vol[seg]["leads"]
    return out

meta_split = split_campaigns(META_CAMPAIGNS, "leads")
google_split = split_campaigns(GOOGLE_CAMPAIGNS, "conversions")
```

- [ ] **Step 10: Import da Fase 2 — remove `classify_segment`**

Trocar (linha 200):

```python
from segments import allocate, classify_segment, classify_contratante
```

por:

```python
from segments import allocate, classify_contratante
```

- [ ] **Step 11: Bloco "4. Montar métricas finais" e preview de fallback**

Trocar (linhas 298-347):

```python
# --- 4. Montar métricas finais por segmento ---
all_updates = {}
preview = {}
for seg in ("mm", "rf"):
    stages = {}
    for platform in ("meta", "google"):
        by_label = defaultdict(int)
        for stage_name, qtd in stage_tally[platform][seg].items():
            label = STAGE_LABELS.get(stage_name)
            if label:
                by_label[label] += qtd
        stages[platform] = dict(by_label)
    fechamento_meta = stages["meta"].get("Fechado Ganho", 0) + stages["meta"].get("Ganho não Identificado", 0)
    fechamento_google = stages["google"].get("Fechado Ganho", 0) + stages["google"].get("Ganho não Identificado", 0)

    m_spend = round(meta_split[seg]["spend"], 2)
    m_impr = round(meta_split[seg]["impressions"])
    m_clicks = round(meta_split[seg]["clicks"])
    m_leads = round(meta_split[seg]["leads"])
    g_spend = round(google_split[seg]["spend"], 2)
    g_impr = round(google_split[seg]["impressions"])
    g_clicks = round(google_split[seg]["clicks"])
    g_leads = round(google_split[seg]["leads"])

    metrics = {
        "invest_meta": m_spend, "impressoes_meta": m_impr,
        "cpm_meta": round((m_spend / m_impr) * 1000, 2) if m_impr else 0,
        "clicks_meta": m_clicks, "ctr_meta": round(m_clicks / m_impr, 4) if m_impr else 0,
        "leads_meta": m_leads, "mql_meta": mql_count["meta"][seg],
        "sql_meta": sql_count["meta"][seg], "fechamento_meta": fechamento_meta,
        "invest_google": g_spend, "impressoes_google": g_impr,
        "cpm_google": round((g_spend / g_impr) * 1000, 2) if g_impr else 0,
        "clicks_google": g_clicks, "ctr_google": round(g_clicks / g_impr, 4) if g_impr else 0,
        "leads_google": g_leads, "mql_google": mql_count["google"][seg],
        "sql_google": sql_count["google"][seg], "fechamento_google": fechamento_google,
    }
    preview[seg] = {"metrics": metrics, "stages": stages}
    for a1, val in cell_updates(seg, metrics, stages):
        all_updates[a1] = val

# --- PREVIEW (imprimir antes de gravar) ---
for seg, data in preview.items():
    print(f"\n=== {seg.upper()} ===")
    print(data["metrics"])
    print(data["stages"])

if meta_fallback:
    print("\n[!] Meta institucional em fallback 50/50 (0 opps no SF):", meta_fallback)
if google_fallback:
    print("\n[!] Google institucional em fallback 50/50 (0 opps no SF):", google_fallback)
```

por:

```python
# --- 4. Montar métricas finais por segmento ---
all_updates = {}
preview = {}
for seg in ("medico", "formando"):
    stages = {}
    for platform in ("meta", "google"):
        by_label = defaultdict(int)
        for stage_name, qtd in stage_tally[platform][seg].items():
            label = STAGE_LABELS.get(stage_name)
            if label:
                by_label[label] += qtd
        stages[platform] = dict(by_label)
    fechamento_meta = stages["meta"].get("Fechado Ganho", 0) + stages["meta"].get("Ganho não Identificado", 0)
    fechamento_google = stages["google"].get("Fechado Ganho", 0) + stages["google"].get("Ganho não Identificado", 0)

    m_spend = round(meta_split[seg]["spend"], 2)
    m_impr = round(meta_split[seg]["impressions"])
    m_clicks = round(meta_split[seg]["clicks"])
    m_leads = round(meta_split[seg]["leads"])
    g_spend = round(google_split[seg]["spend"], 2)
    g_impr = round(google_split[seg]["impressions"])
    g_clicks = round(google_split[seg]["clicks"])
    g_leads = round(google_split[seg]["leads"])

    metrics = {
        "invest_meta": m_spend, "impressoes_meta": m_impr,
        "cpm_meta": round((m_spend / m_impr) * 1000, 2) if m_impr else 0,
        "clicks_meta": m_clicks, "ctr_meta": round(m_clicks / m_impr, 4) if m_impr else 0,
        "leads_meta": m_leads, "mql_meta": mql_count["meta"][seg],
        "sql_meta": sql_count["meta"][seg], "fechamento_meta": fechamento_meta,
        "invest_google": g_spend, "impressoes_google": g_impr,
        "cpm_google": round((g_spend / g_impr) * 1000, 2) if g_impr else 0,
        "clicks_google": g_clicks, "ctr_google": round(g_clicks / g_impr, 4) if g_impr else 0,
        "leads_google": g_leads, "mql_google": mql_count["google"][seg],
        "sql_google": sql_count["google"][seg], "fechamento_google": fechamento_google,
    }
    preview[seg] = {"metrics": metrics, "stages": stages}
    for a1, val in cell_updates(seg, metrics, stages):
        all_updates[a1] = val

# --- PREVIEW (imprimir antes de gravar) ---
for seg, data in preview.items():
    print(f"\n=== {seg.upper()} ===")
    print(data["metrics"])
    print(data["stages"])
```

- [ ] **Step 12: Fase 3 — apresentação**

Trocar (linhas 402, 427-428):

```
MÉDICO MADURO (MM)
```
e
```
RECÉM-FORMADOS (RF)
[mesma estrutura acima]
```

por:

```
MÉDICO
```
e
```
FORMANDO
[mesma estrutura acima]
```

Remover a linha (445-446):

```
Sinalizar explicitamente qualquer campanha institucional caída em fallback
50/50 (0 opps no SF no período).
```

- [ ] **Step 13: Fase 4 — mapeamento de células (tabela de referência)**

Trocar (linhas 468-471):

```
| Bloco | Linhas do funil (Invest./Impr./CPM/Clicks/CTR/Leads/MQL/SQL/Fechamento) | Linhas de estágio |
|---|---|---|
| MÉDICO MADURO | 30/32/33/34/35/36/38/40/42 | 46-53 |
| RECÉM-FORMADOS | 58/60/61/62/63/64/66/68/70 | 74-81 |
```

por:

```
| Bloco | Linhas do funil (Invest./Impr./CPM/Clicks/CTR/Leads/MQL/SQL/Fechamento) | Linhas de estágio |
|---|---|---|
| MÉDICO | 30/32/33/34/35/36/38/40/42 | 46-53 |
| FORMANDO | 58/60/61/62/63/64/66/68/70 | 74-81 |
```

- [ ] **Step 14: "Pontos de Atenção" — rateio institucional**

Trocar (linhas 512-518):

```
- **Rateio institucional (§8):** campanha sem tag `[RF]`/`[MM]` — spend,
  impressões, cliques e leads são rateados pela participação de opps do
  segmento naquela campanha (SF); fallback 50/50 se a campanha não tiver
  nenhuma opp no período. Sinalizar no preview.
- **Tabela de campanhas (linha 85+) não é segmentada** por MM/RF — mostra o
  total da campanha (Opps/Fechado somam os dois segmentos), já que o nome da
  campanha normalmente já carrega a tag de segmento.
```

por:

```
- **Campanha institucional (sem tag `[RF]`/`[MM]` legada):** spend,
  impressões, cliques e leads contam 100% como Médico — mídia paga mira só
  Médico, sem rateio entre segmentos (fundação §8 é nota histórica; ver
  `segments.classify_segment`/`allocate`).
- **Tabela de campanhas (linha 85+) não é segmentada** por Médico/Formando —
  mostra o total da campanha (Opps/Fechado somam os dois segmentos), já que
  o nome da campanha normalmente já carrega a tag de segmento.
```

- [ ] **Step 15: Commit**

```bash
git add .claude/skills/planilha-resultados.md
git commit -m "feat(planilha-resultados): skill migra pra Médico/Formando, remove rateio por opp-share"
```

---

### Task 6: `scripts/reporte_ka/alloc.py` — split Médico/Formando

**Files:**
- Modify: `scripts/reporte_ka/alloc.py`
- Test: `scripts/reporte_ka/test_alloc.py`
- Test: `scripts/reporte_ka/test_integration.py`

**Interfaces:**
- Consumes de Task 1: `classify_segment(campaign_name) -> "formando"|"medico"|"institucional"`.
- Produces: `allocate_row(name: str, metrics: dict) -> {"medico": {...}, "formando": {...}}` (sem `opp_mm`/`opp_rf`).

- [ ] **Step 1: Reescrever `test_alloc.py`**

```python
from alloc import allocate_row


def test_taggeada_medico_vai_100_no_segmento():
    r = allocate_row("[MM] Captação", {"invest": 1000.0, "impr": 500, "clicks": 40, "leads": 10})
    assert r["medico"] == {"invest": 1000.0, "impr": 500, "clicks": 40, "leads": 10}
    assert r["formando"] == {"invest": 0, "impr": 0, "clicks": 0, "leads": 0}


def test_formando_tag():
    r = allocate_row("BOO - [RF] Search", {"invest": 200.0, "leads": 3})
    assert r["formando"] == {"invest": 200.0, "leads": 3}
    assert r["medico"] == {"invest": 0, "leads": 0}


def test_institucional_vai_100_por_cento_medico():
    r = allocate_row("BOO - [Search] - Institucional",
                     {"invest": 1000.0, "impr": 800, "clicks": 40, "leads": 8})
    assert r["medico"] == {"invest": 1000.0, "impr": 800, "clicks": 40, "leads": 8}
    assert r["formando"] == {"invest": 0, "impr": 0, "clicks": 0, "leads": 0}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd scripts/reporte_ka && python3 -m pytest test_alloc.py -v`
Expected: FAIL — `allocate_row` ainda espera `opp_mm`/`opp_rf` e retorna chaves `"mm"`/`"rf"`.

- [ ] **Step 3: Reescrever `alloc.py`**

```python
"""Split Médico/Formando de uma campanha para TODAS as métricas (invest/impr/clicks/leads).

Reusa segments.classify_segment. Campanha taggeada [rf]/[mm] (legada) -> 100%
no segmento da tag; sem tag (institucional) -> 100% Médico (mídia paga mira só
Médico, sem rateio institucional).
"""
from segments import classify_segment  # scripts/acompanhamento_diario/segments.py (via conftest)


def allocate_row(name, metrics):
    """metrics: {chave: número}. Retorna {'medico': {...}, 'formando': {...}} com
    as MESMAS chaves. Campanha taggeada -> tudo no segmento da tag; institucional
    -> tudo em Médico."""
    seg = classify_segment(name)
    if seg == "formando":
        return {"formando": dict(metrics), "medico": {k: 0 for k in metrics}}
    return {"medico": dict(metrics), "formando": {k: 0 for k in metrics}}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd scripts/reporte_ka && python3 -m pytest test_alloc.py -v`
Expected: PASS (3 testes).

- [ ] **Step 5: Reescrever `test_integration.py`**

```python
from blocks import block_of
from alloc import allocate_row
from sheet import cell_updates
from qualification import mql_day, sql_day


def test_pipeline_midia_para_celulas():
    data = {"medico": {}, "formando": {}}

    def acc(seg, block, metrics):
        b = data[seg].setdefault(block, {})
        for k, v in metrics.items():
            b[k] = b.get(k, 0) + v

    rows = [
        {"name": "[BOO] [MM] [FUNDO] [LEADS]", "platform": "meta", "ct": None,
         "metrics": {"invest": 1000.0, "impr": 5000, "clicks": 100, "leads": 10}},
        {"name": "BOO - [Search] - Institucional", "platform": "google", "ct": "SEARCH",
         "metrics": {"invest": 800.0, "impr": 4000, "clicks": 80, "leads": 8}},
    ]
    for r in rows:
        blk = block_of(r["name"], r["platform"], r["ct"])
        assert blk != "excluded"
        al = allocate_row(r["name"], r["metrics"])
        for seg in ("medico", "formando"):
            acc(seg, blk, al[seg])

    ups_medico = dict(cell_updates("N", data["medico"]))
    ups_formando = dict(cell_updates("N", data["formando"]))
    assert ups_medico["N21"] == 1000.0   # meta captação 100% Médico (taggeada [MM])
    assert ups_medico["N4"] == 800.0     # google search institucional: 100% Médico (sem rateio)
    assert ups_formando["N4"] == 0       # Formando não recebe nada da campanha institucional (zero explícito, não ausente)


def test_qualification_reuse_conta_mql_sql():
    op_prop = [{"stage": "Nova", "date": "2026-07-02"},
               {"stage": "Proposta Enviada", "date": "2026-07-10"}]
    op_aguard = [{"stage": "Aguardando Resposta", "date": "2026-07-05"}]
    assert mql_day(op_prop, False) is not None
    assert sql_day(op_prop, False) is not None
    assert mql_day(op_aguard, False) is not None
    assert sql_day(op_aguard, False) is None
```

- [ ] **Step 6: Rodar toda a suíte de `reporte_ka` e confirmar que passa**

Run: `cd scripts/reporte_ka && python3 -m pytest -v`
Expected: PASS (todos os testes, incluindo `test_alloc.py`, `test_integration.py`, `test_blocks.py`, `test_sheet.py`).

- [ ] **Step 7: Commit**

```bash
git add scripts/reporte_ka/alloc.py scripts/reporte_ka/test_alloc.py scripts/reporte_ka/test_integration.py
git commit -m "feat(reporte-ka): alloc.py migra pra Médico/Formando, remove rateio por opp-share"
```

---

### Task 7: `.claude/skills/reporte-resultados-ka.md` — skill mensal "Mês-a-Mês"

**Files:**
- Modify: `.claude/skills/reporte-resultados-ka.md`

**Interfaces:**
- Consumes de Task 1: `classify_segment`, `classify_contratante(tip_cte)` (1 arg, indiretamente via `allocate_row`).
- Consumes de Task 6: `allocate_row(name, metrics)` (sem opp counts).

- [ ] **Step 1: Frontmatter, título e tabela de recursos**

Trocar (linhas 3, 6, 9, 22):

```yaml
description: Reporte mensal segmentado por RF e MM da Caveo. Coleta Meta Ads, Google Ads e Salesforce do mês corrente até D-1 e grava os inputs das abas "Mês-a-Mês RF" e "Mês-a-Mês MM" (mídia por bloco + funil MQL/SQL/Vendas/Faturamento). Use para atualizar as abas mensais segmentadas.
```
```
# Skill: Reporte Mensal Segmentado RF/MM

Coleta **Meta + Google + Salesforce** do mês corrente (dia 1 até D-1), separa por
segmento **RF / MM** e grava os **22 inputs secos** da coluna do mês (Realizado)
nas abas **"Mês-a-Mês RF"** e **"Mês-a-Mês MM"**. Sobrescreve a coluna do mês a
cada rodada (snapshot vivo). As fórmulas derivadas recalculam sozinhas — NUNCA
escrever em célula de fórmula.
```
```
| Abas | `Mês-a-Mês RF`, `Mês-a-Mês MM` |
```

por:

```yaml
description: Reporte mensal segmentado por Médico e Formando da Caveo. Coleta Meta Ads, Google Ads e Salesforce do mês corrente até D-1 e grava os inputs das abas "Mês-a-Mês Formando" e "Mês-a-Mês Médico" (mídia por bloco + funil MQL/SQL/Vendas/Faturamento). Use para atualizar as abas mensais segmentadas.
```
```
# Skill: Reporte Mensal Segmentado Médico/Formando

Coleta **Meta + Google + Salesforce** do mês corrente (dia 1 até D-1), separa por
segmento **Médico / Formando** e grava os **22 inputs secos** da coluna do mês
(Realizado) nas abas **"Mês-a-Mês Formando"** e **"Mês-a-Mês Médico"**.
Sobrescreve a coluna do mês a cada rodada (snapshot vivo). As fórmulas
derivadas recalculam sozinhas — NUNCA escrever em célula de fórmula.
```
```
| Abas | `Mês-a-Mês Formando`, `Mês-a-Mês Médico` |
```

- [ ] **Step 2: Seção "Fundação" — fragmentos TIPCTE**

Trocar (linhas 25-37):

```
Canal pago (cpc + cruzamento), segmento (`TipCte__c` + `Tempo_de_Formado__c`),
MQL/SQL (`QUALIFICATION_RULES`) e ganho (`WON_CLAUSE`) vêm de
`docs/fundacao-dados.md`. Modelo de **duas datas**: MQL/SQL por `CreatedDate`;
Vendas/Faturamento por `LastStageChangeDate`. Fuso `-03:00`. NÃO reescrever listas.

Fragmentos usados (verbatim):

- **PAID:** `((UtmMed__c LIKE '%cpc%') OR ((UtmMed__c = null OR (NOT UtmMed__c LIKE '%cpc%')) AND (fbc__c != null OR fbclid__c != null OR gclid__c != null OR gbraid__c != null)))`
- **WON_CLAUSE:** `(IsWon = true OR StageName = 'Ganho não Identificado')`
- **TIPCTE_RF:** `(TipCte__c IN ('Formando') OR (TipCte__c = 'Médico' AND Tempo_de_Formado__c IN ('Menos de 3 anos','Vai se formar')))`
- **TIPCTE_MM:** `(TipCte__c IN ('Revalida') OR (TipCte__c = 'Médico' AND (NOT Tempo_de_Formado__c IN ('Menos de 3 anos','Vai se formar'))))`
```

por:

```
Canal pago (cpc + cruzamento), segmento (`TipCte__c`), MQL/SQL
(`QUALIFICATION_RULES`) e ganho (`WON_CLAUSE`) vêm de `docs/fundacao-dados.md`.
Modelo de **duas datas**: MQL/SQL por `CreatedDate`; Vendas/Faturamento por
`LastStageChangeDate`. Fuso `-03:00`. NÃO reescrever listas.

Fragmentos usados (verbatim):

- **PAID:** `((UtmMed__c LIKE '%cpc%') OR ((UtmMed__c = null OR (NOT UtmMed__c LIKE '%cpc%')) AND (fbc__c != null OR fbclid__c != null OR gclid__c != null OR gbraid__c != null)))`
- **WON_CLAUSE:** `(IsWon = true OR StageName = 'Ganho não Identificado')`
- **TIPCTE_FORMANDO:** `TipCte__c IN ('Formando')`
- **TIPCTE_MEDICO:** `TipCte__c IN ('Médico')`

Revalida (`TipCte__c = 'Revalida'`) não aparece nesta skill — nem
Formando nem Médico o incluem.
```

- [ ] **Step 3: Seção "Universo e blocos"**

Trocar (linhas 39-46):

```
Só campanhas com o marcador **BOO** (`[BOO]` no Meta, `BOO -` no Google → teste
"contém boo"). Blocos (helper `blocks.block_of`): `google_search`,
`google_yt_pmax` (PMax/Display/Video/DemandGen não-topo), `meta_captacao`,
`meta_awareness` (`[TOPO]`), `google_awareness` (`[TOPO]`/DemandGen topo).
Campanha BOO sem tag `[RF]`/`[MM]` (institucional) → rateio por opps
(`alloc.allocate_row`, fallback 50/50).
```

por:

```
Só campanhas com o marcador **BOO** (`[BOO]` no Meta, `BOO -` no Google → teste
"contém boo"). Blocos (helper `blocks.block_of`): `google_search`,
`google_yt_pmax` (PMax/Display/Video/DemandGen não-topo), `meta_captacao`,
`meta_awareness` (`[TOPO]`), `google_awareness` (`[TOPO]`/DemandGen topo).
Campanha BOO sem tag `[RF]`/`[MM]` legada (institucional) → 100% Médico
(`alloc.allocate_row`, sem rateio — mídia paga mira só Médico).
```

- [ ] **Step 4: Fase 1C/1D — trocar `TIPCTE_RF | TIPCTE_MM` por `TIPCTE_FORMANDO | TIPCTE_MEDICO`**

Trocar (linha 94):

```sql
  AND Opportunity.[TIPCTE_RF | TIPCTE_MM]
```

por:

```sql
  AND Opportunity.[TIPCTE_FORMANDO | TIPCTE_MEDICO]
```

Trocar (linhas 97-99):

```
Agrupar por `OpportunityId` → `history=[{stage, date}]` (`date` = dia de
`CreatedDate` da linha), `is_won = IsWon OR StageName contém "Ganho não Identificado"`.
Montar `SF_HISTORY = {"rf":[...], "mm":[...]}`.
```

por:

```
Agrupar por `OpportunityId` → `history=[{stage, date}]` (`date` = dia de
`CreatedDate` da linha), `is_won = IsWon OR StageName contém "Ganho não Identificado"`.
Montar `SF_HISTORY = {"formando":[...], "medico":[...]}`.
```

Trocar (linha 109 e 111):

```sql
  AND [TIPCTE_RF | TIPCTE_MM]
```
```
`VENDAS = {"rf": qtd, "mm": qtd}`; `FATURAMENTO = {"rf": valor or 0, "mm": valor or 0}`.
```

por:

```sql
  AND [TIPCTE_FORMANDO | TIPCTE_MEDICO]
```
```
`VENDAS = {"formando": qtd, "medico": qtd}`; `FATURAMENTO = {"formando": valor or 0, "medico": valor or 0}`.
```

- [ ] **Step 5: Remover a Fase 1E inteira**

Remover (linhas 113-126):

```
### 1E. SF — opps por campanha p/ rateio institucional (rodar 2x: RF / MM)
```sql
SELECT UtmCam__c, COUNT(Id) qtd
FROM Opportunity
WHERE CreatedDate >= [START]T00:00:00-03:00
  AND CreatedDate <= [END]T23:59:59-03:00
  AND UtmCam__c != null
  AND [PAID]
  AND [TIPCTE_RF | TIPCTE_MM]
GROUP BY UtmCam__c
```
Montar `INST_OPPS = {utmcam: {"mm": n, "rf": n}}`. Matching campanha↔UtmCam: no
Meta costuma ser idêntico; no Google institucional pode divergir — sem match, a
campanha cai no fallback 50/50 e é sinalizada no preview.
```

- [ ] **Step 6: Reescrever o script embutido da Fase 2**

Trocar o bloco inteiro (linhas 133-277) por:

```python
import sys
sys.path.insert(0, 'scripts/acompanhamento_diario')
sys.path.insert(0, 'scripts/reporte_ka')
from blocks import block_of
from alloc import allocate_row
from qualification import mql_day, sql_day
from sheet import resolve_realizado_column, col_letter, cell_updates, write_updates
import gspread
from google.oauth2.service_account import Credentials

SHEET_ID = '169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw'
TABS = {"formando": "Mês-a-Mês Formando", "medico": "Mês-a-Mês Médico"}

# ===== dados da Fase 1 (PREENCHER) =====
# ANO, MES = 2026, 7
# META_ROWS = [{"name","spend","impressions","link_clicks","leads","post_engagement"}]
# GOOGLE_ROWS = [{"name","channel_type","cost","impressions","clicks","conversions","engagements"}]
# SF_HISTORY = {"formando":[{"history":[{"stage","date"}],"is_won":bool}], "medico":[...]}
# VENDAS = {"formando": int, "medico": int}
# FATURAMENTO = {"formando": float, "medico": float}

acc = {"formando": {}, "medico": {}}
def add(seg, block, metrics):
    b = acc[seg].setdefault(block, {})
    for k, v in metrics.items():
        b[k] = b.get(k, 0) + v

# --- Meta ---
for r in META_ROWS:
    blk = block_of(r["name"], "meta")
    if blk == "excluded":
        continue
    if blk == "meta_awareness":
        metrics = {"invest": r["spend"], "impr": r["impressions"], "engaj": r.get("post_engagement", 0)}
    else:
        metrics = {"invest": r["spend"], "impr": r["impressions"], "clicks": r["link_clicks"], "leads": r["leads"]}
    al = allocate_row(r["name"], metrics)
    for seg in ("medico", "formando"):
        add(seg, blk, al[seg])

# --- Google ---
for r in GOOGLE_ROWS:
    blk = block_of(r["name"], "google", r["channel_type"])
    if blk == "excluded":
        continue
    if blk == "google_awareness":
        metrics = {"invest": r["cost"], "impr": r["impressions"], "engaj": r.get("engagements", 0)}
    else:
        metrics = {"invest": r["cost"], "impr": r["impressions"], "clicks": r["clicks"], "leads": r["conversions"]}
    al = allocate_row(r["name"], metrics)
    for seg in ("medico", "formando"):
        add(seg, blk, al[seg])

# --- SF MQL/SQL (coorte por criação; reached-gate via qualification) ---
for seg in ("formando", "medico"):
    mql = sum(1 for o in SF_HISTORY[seg] if mql_day(o["history"], o["is_won"]) is not None)
    sql = sum(1 for o in SF_HISTORY[seg] if sql_day(o["history"], o["is_won"]) is not None)
    add(seg, "sf", {"mql": mql, "sql": sql})

# --- SF Vendas/Faturamento (por LastStageChangeDate) ---
for seg in ("formando", "medico"):
    add(seg, "sf", {"vendas": VENDAS[seg], "faturamento": FATURAMENTO[seg]})

# --- Arredondar métricas inteiras fracionadas ---
for seg in ("formando", "medico"):
    for blk, m in acc[seg].items():
        for k in ("impr", "clicks", "leads", "engaj"):
            if k in m:
                m[k] = round(m[k])

# --- Zero explícito: garante overwrite das 22 células mesmo sem dado ---
BLOCK_KEYS = {
    "google_search": ("invest", "impr", "clicks", "leads"),
    "google_yt_pmax": ("invest", "impr", "clicks", "leads"),
    "meta_captacao": ("invest", "impr", "clicks", "leads"),
    "meta_awareness": ("invest", "impr", "engaj"),
    "google_awareness": ("invest", "impr", "engaj"),
    "sf": ("mql", "sql", "vendas", "faturamento"),
}
for seg in ("formando", "medico"):
    for blk, keys in BLOCK_KEYS.items():
        b = acc[seg].setdefault(blk, {})
        for k in keys:
            b.setdefault(k, 0)

# --- Resolver a coluna do mês nas DUAS abas (header NÃO formatado) ---
gc = gspread.authorize(Credentials.from_service_account_file(
    '.claude/sheets_credentials.json', scopes=['https://www.googleapis.com/auth/spreadsheets']))
sh = gc.open_by_key(SHEET_ID)
cols = {}
for seg, tab in TABS.items():
    ws = sh.worksheet(tab)
    header = ws.get('A1:AZ2', value_render_option='UNFORMATTED_VALUE')
    header = header + [[], []]
    cols[seg] = resolve_realizado_column(header[0], header[1], ANO, MES)

if cols["formando"] is None or cols["medico"] is None:
    print(f"[PARAR] Coluna do mês {MES:02d}/{ANO} não existe (Formando={cols['formando']} Médico={cols['medico']}).")
    print("Crie o trio Realizado|Meta|Δ% do mês nas abas ou informe a coluna. NADA foi gravado.")
    sys.exit(1)
if cols["formando"] != cols["medico"]:
    print(f"[PARAR] Formando e Médico resolveram colunas diferentes (Formando={cols['formando']} Médico={cols['medico']}). NADA foi gravado.")
    sys.exit(1)

COL = col_letter(cols["formando"])
print(f"Mês {MES:02d}/{ANO} -> coluna {COL} (Realizado) nas abas Formando e Médico.\n")

# --- PREVIEW ---
for seg in ("formando", "medico"):
    print(f"=== {seg.upper()} — coluna {COL} ===")
    for a1, val in cell_updates(COL, acc[seg]):
        print(f"  {a1} = {val}")
    print()

# --- GRAVAÇÃO: só após confirmação (Fase 4). Descomentar e rodar de novo. ---
def gravar():
    total = 0
    for seg, tab in TABS.items():
        total += write_updates(sh.worksheet(tab), cell_updates(COL, acc[seg]))
    print(f"Gravadas {total} células ({COL} nas abas Formando e Médico).")
# gravar()
```

- [ ] **Step 7: Fase 3 — preview e confirmação**

Trocar (linhas 279-287):

```
## Fase 3 — Preview e confirmação

Apresentar as tabelas RF e MM (as 22 células de cada) + a coluna resolvida +
avisos: rateios em fallback 50/50; vendas/faturamento não segmentados por
`TipCte__c` nulo (diferença entre total pago e RF+MM); awareness zerado.
Perguntar:
```
Gravar na coluna [COL] ([MÊS]/[ANO]) das abas RF e MM? (sim para confirmar)
```
```

por:

```
## Fase 3 — Preview e confirmação

Apresentar as tabelas Formando e Médico (as 22 células de cada) + a coluna
resolvida + avisos: vendas/faturamento não segmentados por `TipCte__c`
nulo/Revalida (diferença entre total pago e Formando+Médico); awareness
zerado. Perguntar:
```
Gravar na coluna [COL] ([MÊS]/[ANO]) das abas Formando e Médico? (sim para confirmar)
```
```

- [ ] **Step 8: Fase 4 e "Pontos de atenção"**

Trocar (linha 291):

```
Só após "sim": descomentar `gravar()` no script e rodar de novo (dados já
embutidos). Nunca tocar em células de fórmula.
```

(sem mudança de conteúdo — só confirmar que nenhuma referência a RF/MM resta.)
Trocar (linha 300):

```
- **Métricas a validar na 1ª rodada:** Meta Cliques=`link_click`, Leads=`actions[complete_registration]` (Registro Concluído, não `lead`); Google Leads=`conversions`. Ajustar se o cliente definir diferente.
```

(sem mudança — não referencia RF/MM.)

- [ ] **Step 9: Commit**

```bash
git add .claude/skills/reporte-resultados-ka.md
git commit -m "feat(reporte-ka): skill migra pra abas Mês-a-Mês Formando/Médico, remove rateio por opp-share (1E)"
```

---

### Task 8: `.claude/skills/reconciliacao-fechamentos-caveo.md`

**Files:**
- Modify: `.claude/skills/reconciliacao-fechamentos-caveo.md`

**Interfaces:**
- Consumes de Task 1: `classify_contratante(tip_cte)` (1 arg).
- Consumes de Task 2: `read_fechamentos(worksheet) -> {"medico": {...}, "formando": {...}}`.

- [ ] **Step 1: Frontmatter, título e intro**

Trocar (linhas 3, 8-9):

```yaml
description: Reconciliação sob demanda entre a planilha "Resultados Mês Atual" (fechamentos MM/RF) e o Salesforce atual — compara dia a dia, aponta divergência e lista oportunidades para conferência manual. Só leitura, nunca grava.
```
```
Compara os fechamentos (coluna O) gravados na planilha "Resultados Mês Atual"
contra o estado **atual** do Salesforce, dia a dia e segmento a segmento
(MM/RF). Aponta onde a divergência nasceu e lista as oportunidades do dia
sinalizado para conferência manual. **Só leitura — nunca grava na planilha nem
no Salesforce.**
```

por:

```yaml
description: Reconciliação sob demanda entre a planilha "Resultados Mês Atual" (fechamentos Médico/Formando) e o Salesforce atual — compara dia a dia, aponta divergência e lista oportunidades para conferência manual. Só leitura, nunca grava.
```
```
Compara os fechamentos (coluna O) gravados na planilha "Resultados Mês Atual"
contra o estado **atual** do Salesforce, dia a dia e segmento a segmento
(Médico/Formando). Aponta onde a divergência nasceu e lista as oportunidades
do dia sinalizado para conferência manual. **Só leitura — nunca grava na
planilha nem no Salesforce.**
```

- [ ] **Step 2: Seção "Fundação"**

Trocar (linhas 24-27):

```
Mesmo modelo cpc+cruzamento de `docs/fundacao-dados.md` (fuso `-03:00`), mesma
`WON_CLAUSE` (seção 3), mesmo `classify_contratante` (seção 4) — `from segments
import classify_contratante` (`scripts/acompanhamento_diario/segments.py`).
NÃO reescrever essas regras aqui.
```

por:

```
Mesmo modelo cpc+cruzamento de `docs/fundacao-dados.md` (fuso `-03:00`), mesma
`WON_CLAUSE` (seção 3), mesmo `classify_contratante` (seção 4, 1 argumento —
`TipCte__c`) — `from segments import classify_contratante`
(`scripts/acompanhamento_diario/segments.py`). Opps que classificam como
`"revalida"` ou `None` são descartadas, mesma regra das outras skills. NÃO
reescrever essas regras aqui.
```

- [ ] **Step 3: Fase 1 — leitura da planilha**

Trocar (linhas 55-64):

```python
ledger = read_fechamentos(ws)  # {"mm": {dia: valor_ou_None}, "rf": {...}}

# Último dia gravado = maior dia com valor não-None em qualquer segmento.
last_day = max(
    (d for seg in ("mm", "rf") for d, v in ledger[seg].items() if v is not None),
    default=None,
)
```

por:

```python
ledger = read_fechamentos(ws)  # {"medico": {dia: valor_ou_None}, "formando": {...}}

# Último dia gravado = maior dia com valor não-None em qualquer segmento.
last_day = max(
    (d for seg in ("medico", "formando") for d, v in ledger[seg].items() if v is not None),
    default=None,
)
```

- [ ] **Step 4: Fase 2 — consulta ao Salesforce**

Trocar (linhas 76-91):

```sql
SELECT DAY_ONLY(convertTimezone(LastStageChangeDate)) d,
       TipCte__c, Tempo_de_Formado__c, COUNT(Id) cnt
FROM Opportunity
WHERE (IsWon = true OR StageName = 'Ganho não Identificado')
  AND LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
GROUP BY DAY_ONLY(convertTimezone(LastStageChangeDate)), TipCte__c, Tempo_de_Formado__c
```

por:

```sql
SELECT DAY_ONLY(convertTimezone(LastStageChangeDate)) d,
       TipCte__c, COUNT(Id) cnt
FROM Opportunity
WHERE (IsWon = true OR StageName = 'Ganho não Identificado')
  AND LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
GROUP BY DAY_ONLY(convertTimezone(LastStageChangeDate)), TipCte__c
```

Trocar (linhas 86-92):

```
Para cada linha do resultado, `segment = classify_contratante(TipCte__c,
Tempo_de_Formado__c)`; descartar linhas com `segment is None`. Acumular em
`live = {"mm": {dia: n}, "rf": {dia: n}}` (dia = `int(d[8:10])`, mesma
convenção de `day_of` da skill diária). Dias sem nenhuma linha ficam ausentes
de `live[seg]` — tratar como `0` na comparação (Fase 3), **não** como "não
processado" (essa distinção é só do ledger, que tem células vazias de
verdade).
```

por:

```
Para cada linha do resultado, `segment = classify_contratante(TipCte__c)`;
descartar linhas com `segment` em `(None, "revalida")`. Acumular em
`live = {"medico": {dia: n}, "formando": {dia: n}}` (dia = `int(d[8:10])`,
mesma convenção de `day_of` da skill diária). Dias sem nenhuma linha ficam
ausentes de `live[seg]` — tratar como `0` na comparação (Fase 3), **não**
como "não processado" (essa distinção é só do ledger, que tem células
vazias de verdade).
```

- [ ] **Step 5: Fase 3 — comparar**

Trocar (linhas 96-104):

```python
rows = []  # (dia, segmento, ledger, salesforce_agora, diff)
for day in range(1, last_day + 1):
    for seg in ("mm", "rf"):
        led = ledger[seg].get(day)
        if led is None:
            continue  # dia não processado pela skill diária — fora da comparação
        liv = live[seg].get(day, 0)
        rows.append((day, seg, led, liv, liv - led))
```

por:

```python
rows = []  # (dia, segmento, ledger, salesforce_agora, diff)
for day in range(1, last_day + 1):
    for seg in ("medico", "formando"):
        led = ledger[seg].get(day)
        if led is None:
            continue  # dia não processado pela skill diária — fora da comparação
        liv = live[seg].get(day, 0)
        rows.append((day, seg, led, liv, liv - led))
```

- [ ] **Step 6: Fase 4 — drill-down**

Trocar (linhas 114-125):

```sql
SELECT Id, Name, Account.Name, StageName, LastStageChangeDate,
       TipCte__c, Tempo_de_Formado__c
FROM Opportunity
WHERE (IsWon = true OR StageName = 'Ganho não Identificado')
  AND LastStageChangeDate >= [DIA]T00:00:00-03:00
  AND LastStageChangeDate <= [DIA]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
```

Classificar cada resultado com `classify_contratante` e manter só os que
classificam para o `segmento` sinalizado. Listar (Id, Name, Account, StageName,
LastStageChangeDate) para conferência manual.
```

por:

```sql
SELECT Id, Name, Account.Name, StageName, LastStageChangeDate, TipCte__c
FROM Opportunity
WHERE (IsWon = true OR StageName = 'Ganho não Identificado')
  AND LastStageChangeDate >= [DIA]T00:00:00-03:00
  AND LastStageChangeDate <= [DIA]T23:59:59-03:00
  AND ([FILTRO_META] OR [FILTRO_GOOGLE])
```

Classificar cada resultado com `classify_contratante` e manter só os que
classificam para o `segmento` sinalizado. Listar (Id, Name, Account, StageName,
LastStageChangeDate) para conferência manual.
```

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/reconciliacao-fechamentos-caveo.md
git commit -m "feat(reconciliacao): skill migra pra segmentos Médico/Formando"
```

---

### Task 9: `.claude/skills/criativos-campeoes.md` — ajuste leve de texto

**Files:**
- Modify: `.claude/skills/criativos-campeoes.md`

**Interfaces:**
- Nenhuma (mudança textual isolada, sem dependência de código).

- [ ] **Step 1: Fase 0 — pergunta de escopo**

Trocar (linha 21-22):

```
Perguntar (ou assumir mês corrente 01→D-1): período, plataforma (Meta/Google/ambas),
contratante (RF/MM/ambos).
```

por:

```
Perguntar (ou assumir mês corrente 01→D-1): período, plataforma (Meta/Google/ambas),
contratante (Formando/Médico/ambos).
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/criativos-campeoes.md
git commit -m "docs(criativos-campeoes): pergunta de escopo usa Formando/Médico"
```

---

### Task 10: `.claude/agents/analista-midia-paga-crm.md` — 1 linha

**Files:**
- Modify: `.claude/agents/analista-midia-paga-crm.md`

**Interfaces:**
- Nenhuma.

- [ ] **Step 1: Seção "Fonte única de regras"**

Trocar (linha 34):

```
**estágios** do funil, **contratante** (RF/MM) e o **modelo de duas datas** vêm
```

por:

```
**estágios** do funil, **contratante** (Formando/Médico/Revalida) e o **modelo de duas datas** vêm
```

- [ ] **Step 2: Commit**

```bash
git add .claude/agents/analista-midia-paga-crm.md
git commit -m "docs(analista-midia-paga-crm): referência de contratante atualizada"
```

---

### Task 11: Renomear as planilhas reais (Formando/Médico)

**Files:**
- Nenhum arquivo do repositório — ação em 3 planilhas reais via gspread.

**Interfaces:**
- Consumes: nenhuma (ação de infraestrutura de dados, depende só das credenciais existentes).

- [ ] **Step 1: Confirmar o texto atual dos cabeçalhos antes de renomear (leitura)**

Rodar (via Bash, `python3` do sistema) para cada uma das 3 planilhas, só leitura,
usando `.claude/sheets_credentials.json`:

```python
import gspread
from google.oauth2.service_account import Credentials

creds = Credentials.from_service_account_file(
    '.claude/sheets_credentials.json',
    scopes=['https://www.googleapis.com/auth/spreadsheets.readonly'])
gc = gspread.authorize(creds)

# "Relação de Leads"
sh1 = gc.open_by_key('169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw')
ws1 = sh1.worksheet('Relação de Leads')
print("Relação de Leads A28:A30:", ws1.get('A28:A30'))
print("Relação de Leads A56:A58:", ws1.get('A56:A58'))

# Abas "Mês-a-Mês RF"/"Mês-a-Mês MM" (mesma planilha)
print("Abas existentes:", [w.title for w in sh1.worksheets()])

# "Resultados Mês Atual"
sh2 = gc.open_by_key('19gElL0pmUO3yPZZG0-5E1ym61wHbQM5-JohK5_wPjj4')
ws2 = sh2.worksheet('Resultados Mês Atual')
print("Resultados Mês Atual A42:A46:", ws2.get('A42:A46'))
print("Resultados Mês Atual A84:A88:", ws2.get('A84:A88'))
```

Apresentar ao usuário o texto exato encontrado em cada intervalo e a linha
exata do rótulo (pode não ser exatamente a linha estimada no spec) antes de
prosseguir para a escrita.

- [ ] **Step 2: Renomear cabeçalhos de bloco em "Relação de Leads" (após confirmação)**

Com a linha exata confirmada no Step 1, usar `ws1.update(values=[["MÉDICO"]], range_name='A<linha>')`
para o rótulo que hoje diz "MÉDICO MADURO", e `ws1.update(values=[["FORMANDO"]], range_name='A<linha>')`
para o que hoje diz "RECÉM-FORMADOS". Perguntar ao usuário
`Renomear os cabeçalhos de bloco em "Relação de Leads"? (sim para confirmar)`
antes de rodar.

- [ ] **Step 3: Renomear as abas "Mês-a-Mês RF"/"Mês-a-Mês MM"**

```python
sh1.worksheet('Mês-a-Mês RF').update_title('Mês-a-Mês Formando')
sh1.worksheet('Mês-a-Mês MM').update_title('Mês-a-Mês Médico')
```

Perguntar `Renomear as abas "Mês-a-Mês RF"/"Mês-a-Mês MM"? (sim para confirmar)`
antes de rodar.

- [ ] **Step 4: Renomear cabeçalhos de bloco em "Resultados Mês Atual"**

Com a linha exata confirmada no Step 1 (`~linha 43` e `~linha 85`), aplicar o
mesmo padrão do Step 2 (`ws2.update(...)`) trocando o texto encontrado por
"MÉDICO"/"FORMANDO". Perguntar confirmação antes de rodar.

- [ ] **Step 5: Verificar que nada além do texto do rótulo mudou**

Reler os mesmos intervalos do Step 1 e confirmar visualmente que só o texto do
rótulo mudou — nenhuma fórmula, nenhuma coluna de dado adjacente foi tocada.

- [ ] **Step 6: Commit (não há arquivo de código nesta task — registrar no changelog do plano)**

Nenhum `git commit` aqui (a mudança vive nas planilhas, não no repositório).
Marcar esta task como concluída na execução do plano.

---

### Task 12: Verificação final

**Files:**
- Nenhum (só execução de testes).

- [ ] **Step 1: Rodar a suíte completa de cada módulo Python**

Run:
```bash
cd scripts/acompanhamento_diario && python3 -m pytest -v
cd ../planilha_resultados && python3 -m pytest -v
cd ../reporte_ka && python3 -m pytest -v
```
Expected: todos os testes passam (nenhum `mm`/`rf` remanescente quebrando algo).

- [ ] **Step 2: Grep de resíduo — nenhuma referência viva a `"mm"`/`"rf"` como chave de segmento**

Run: `grep -rn '"mm"\|"rf"' scripts/acompanhamento_diario scripts/planilha_resultados scripts/reporte_ka .claude/skills/acompanhamento-diario-caveo.md .claude/skills/planilha-resultados.md .claude/skills/reporte-resultados-ka.md .claude/skills/reconciliacao-fechamentos-caveo.md`
Expected: nenhum resultado (fora de comentários históricos/changelog, se houver).

- [ ] **Step 3: Smoke test em modo preview da skill diária**

Rodar a skill `acompanhamento-diario-caveo` (Fase 1 + Fase 2, sem chamar `gravar()`)
para o dia `D-1` real, e conferir visualmente que o preview mostra `=== MEDICO ===`
e `=== FORMANDO ===` com números plausíveis (nenhuma opp caindo silenciosamente
fora por erro de chave).
