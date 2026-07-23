# Reporte Mensal Segmentado RF/MM (reforma da `/reporte-resultados-ka`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reformular a skill `/reporte-resultados-ka` para preencher, segmentado por RF e MM, a coluna do mês corrente das abas "Mês-a-Mês RF" e "Mês-a-Mês MM", a partir de Meta Ads + Google Ads + Salesforce.

**Architecture:** Um pacote Python testável `scripts/reporte_ka/` (blocks/alloc/sheet) que reusa `segments` e `qualification` do `scripts/acompanhamento_diario/`. A skill (markdown) orquestra: coleta via MCP → cálculo via helper → resolução dinâmica da coluna do mês com confirmação anti-sobreposição → preview → gravação via gspread.

**Tech Stack:** Python 3 (`python3` do sistema), `gspread` + `google-oauth2`, MCPs Meta Ads / Google Ads / Salesforce, pytest.

## Global Constraints

- **Fonte única de regras:** todo SOQL de canal pago, segmento, MQL/SQL e ganho vem de `docs/fundacao-dados.md` (gerado de `config/business-rules.ts`). NÃO reescrever listas próprias. Não editar `config/business-rules.ts` (só consumo).
- **Planilha:** `169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw`; abas `Mês-a-Mês RF` e `Mês-a-Mês MM`; auth `.claude/sheets_credentials.json` (service account).
- **Contas:** Meta `act_438086148409254`; Google `3921127876`; Salesforce `caveo.my.salesforce.com`.
- **Fuso:** todo `WHERE` de data usa `-03:00`. `LastStageChangeDate` volta em UTC — irrelevante aqui porque só contamos/​somamos por mês inteiro (não por dia), mas o `WHERE` é sempre `-03:00`.
- **Só inputs secos:** a skill grava apenas as 22 células de input por aba; NUNCA escreve em células de fórmula.
- **Coluna do mês é dinâmica:** resolvida do cabeçalho a cada rodada e confirmada; se o mês não existir na planilha, PARA sem gravar.
- **Padrão de reuso e testes:** espelhar `scripts/acompanhamento_diario/` (sem `__init__.py`; `conftest.py` ajusta `sys.path`; testes `test_*.py` ao lado do módulo).
- **Convenção de módulos Python:** `python3` do sistema; imports sem pacote (via `sys.path`).

**Fragmentos SOQL (verbatim da fundação) — usar nas queries deste plano:**

- `PAID` (mídia paga = cpc OU cruzamento, canal-agnóstico):
  `((UtmMed__c LIKE '%cpc%') OR ((UtmMed__c = null OR (NOT UtmMed__c LIKE '%cpc%')) AND (fbc__c != null OR fbclid__c != null OR gclid__c != null OR gbraid__c != null)))`
- `WON_CLAUSE`: `(IsWon = true OR StageName = 'Ganho não Identificado')`
- `TIPCTE_RF`: `(TipCte__c IN ('Formando') OR (TipCte__c = 'Médico' AND Tempo_de_Formado__c IN ('Menos de 3 anos','Vai se formar')))`
- `TIPCTE_MM`: `(TipCte__c IN ('Revalida') OR (TipCte__c = 'Médico' AND (NOT Tempo_de_Formado__c IN ('Menos de 3 anos','Vai se formar'))))`

---

## File Structure

- `scripts/reporte_ka/conftest.py` — ajusta `sys.path` (próprio dir + `acompanhamento_diario` para reusar `segments`/`qualification`).
- `scripts/reporte_ka/blocks.py` — `is_boo(name)`, `block_of(name, platform, channel_type=None)`.
- `scripts/reporte_ka/alloc.py` — `allocate_row(name, metrics, opp_mm, opp_rf)` (reusa `segments.classify_segment`).
- `scripts/reporte_ka/sheet.py` — `col_letter`, `_serial_to_date`, `resolve_realizado_column`, `ROWS`, `cell_updates`, `write_updates`.
- `scripts/reporte_ka/test_blocks.py`, `test_alloc.py`, `test_sheet.py`, `test_integration.py`.
- `.claude/skills/reporte-resultados-ka.md` — reforma completa (fases + script Python embutido).
- `.claude/commands/reporte-resultados-ka.md` — atualizar `description`.
- `docs/projeto-mapa.md` — atualizar linha da skill.
- Memória `project_reporte_resultados_ka.md` + `MEMORY.md` — atualizar.

---

### Task 1: `blocks.py` — universo BOO e bloco da campanha

**Files:**
- Create: `scripts/reporte_ka/conftest.py`
- Create: `scripts/reporte_ka/blocks.py`
- Test: `scripts/reporte_ka/test_blocks.py`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `is_boo(name: str|None) -> bool`
  - `block_of(name: str|None, platform: str, channel_type: str|None=None) -> str` — retorna um de `"google_search"`, `"google_yt_pmax"`, `"meta_captacao"`, `"meta_awareness"`, `"google_awareness"`, `"excluded"`. `platform` ∈ `{"meta","google"}`.

- [ ] **Step 1: Criar `conftest.py`**

```python
# Permite importar os módulos deste diretório e reusar os helpers testados do
# acompanhamento_diario (segments, qualification).
import os
import sys

_HERE = os.path.dirname(__file__)
sys.path.insert(0, _HERE)
sys.path.insert(0, os.path.join(_HERE, "..", "acompanhamento_diario"))
```

- [ ] **Step 2: Escrever o teste que falha (`test_blocks.py`)**

```python
from blocks import is_boo, block_of


def test_is_boo_casa_meta_e_google():
    assert is_boo("[BOO] [MM] [FUNDO] [LEADS]")
    assert is_boo("BOO - [RF] [Search] - Cnpj médico")
    assert is_boo("boo minúsculo")


def test_is_boo_exclui_sem_marcador():
    assert not is_boo("comunidade_campanha_conversao_webinar")
    assert not is_boo("🏎️ Turbo - [CP14] - [Leads]")
    assert not is_boo("")
    assert not is_boo(None)


def test_block_meta_captacao_e_awareness():
    assert block_of("[BOO] [MM] [FUNDO] [LEADS] Captação", "meta") == "meta_captacao"
    assert block_of("[BOO] [RF] - [FUNDO] - [LEADS]", "meta") == "meta_captacao"
    assert block_of("[BOO] [MM] - [TOPO] - [DISTRIBUICAO]", "meta") == "meta_awareness"


def test_block_google_por_channel_type():
    assert block_of("BOO - [RF] [Search] - Cnpj médico", "google", "SEARCH") == "google_search"
    assert block_of("BOO - [Search] - Institucional", "google", "SEARCH") == "google_search"
    assert block_of("BOO - [MM] [Pmax] [Fundo] Plataforma", "google", "PERFORMANCE_MAX") == "google_yt_pmax"
    assert block_of("BOO - [DemandGen] Leads", "google", "DEMAND_GEN") == "google_yt_pmax"


def test_block_google_awareness_topo():
    assert block_of("BOO - [DemandGen] [Topo] Encontrar Público", "google", "DEMAND_GEN") == "google_awareness"


def test_block_exclui_sem_boo_ou_channel_desconhecido():
    assert block_of("comunidade_webinar", "meta") == "excluded"
    assert block_of("BOO - algo", "google", "HOTEL") == "excluded"
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `cd /Users/matheus/Documents/Claude/Projects/caveo_analist_ai && python3 -m pytest scripts/reporte_ka/test_blocks.py -q`
Expected: FAIL com `ModuleNotFoundError: No module named 'blocks'`.

- [ ] **Step 4: Implementar `blocks.py`**

```python
"""Universo (marcador BOO) e bloco de cada campanha nas abas Mês-a-Mês RF/MM.

O split RF/MM por tag fica em alloc.py (reusa segments.classify_segment).
Espelha o design 2026-07-23-reporte-resultados-ka-segmentado.
"""

GOOGLE_LEADGEN_CHANNELS = ("PERFORMANCE_MAX", "DISPLAY", "VIDEO", "DEMAND_GEN")


def is_boo(name):
    """True se a campanha tem o marcador da agência ('[BOO]' no Meta, 'BOO -' no
    Google). Teste único: contém 'boo' (case-insensitive)."""
    return "boo" in (name or "").lower()


def _is_topo(name):
    return "[topo]" in (name or "").lower()


def block_of(name, platform, channel_type=None):
    """Bloco da campanha ou 'excluded'.

    platform: 'meta' | 'google'. channel_type (Google) ex.: 'SEARCH',
    'PERFORMANCE_MAX', 'DISPLAY', 'VIDEO', 'DEMAND_GEN'.
    """
    if not is_boo(name):
        return "excluded"
    if platform == "meta":
        return "meta_awareness" if _is_topo(name) else "meta_captacao"
    if platform == "google":
        if _is_topo(name):
            return "google_awareness"
        ct = (channel_type or "").upper()
        if ct == "SEARCH":
            return "google_search"
        if ct in GOOGLE_LEADGEN_CHANNELS:
            return "google_yt_pmax"
    return "excluded"
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `cd /Users/matheus/Documents/Claude/Projects/caveo_analist_ai && python3 -m pytest scripts/reporte_ka/test_blocks.py -q`
Expected: PASS (7 passed).

- [ ] **Step 6: Commit**

```bash
git add scripts/reporte_ka/conftest.py scripts/reporte_ka/blocks.py scripts/reporte_ka/test_blocks.py
git commit -m "feat(reporte-ka): blocks.py — universo BOO e classificação de bloco por campanha"
```

---

### Task 2: `alloc.py` — split RF/MM de todas as métricas (reusa fundação)

**Files:**
- Create: `scripts/reporte_ka/alloc.py`
- Test: `scripts/reporte_ka/test_alloc.py`

**Interfaces:**
- Consumes: `segments.classify_segment(name) -> "mm"|"rf"|"institucional"` (de `scripts/acompanhamento_diario/segments.py`, via `conftest`).
- Produces: `allocate_row(name: str, metrics: dict[str,float], opp_mm: int=0, opp_rf: int=0) -> {"mm": dict, "rf": dict}` — mesmas chaves de `metrics` nos dois segmentos. Taggeada → 100% no segmento; institucional → rateio por opp-share (fallback 50/50).

- [ ] **Step 1: Escrever o teste que falha (`test_alloc.py`)**

```python
from alloc import allocate_row


def test_taggeada_vai_100_no_segmento():
    r = allocate_row("[MM] Captação", {"invest": 1000.0, "impr": 500, "clicks": 40, "leads": 10})
    assert r["mm"] == {"invest": 1000.0, "impr": 500, "clicks": 40, "leads": 10}
    assert r["rf"] == {"invest": 0, "impr": 0, "clicks": 0, "leads": 0}


def test_rf_tag():
    r = allocate_row("BOO - [RF] Search", {"invest": 200.0, "leads": 3})
    assert r["rf"] == {"invest": 200.0, "leads": 3}
    assert r["mm"] == {"invest": 0, "leads": 0}


def test_institucional_rateia_todas_as_metricas():
    r = allocate_row("BOO - [Search] - Institucional",
                     {"invest": 1000.0, "impr": 800, "clicks": 40, "leads": 8},
                     opp_mm=3, opp_rf=1)
    assert r["mm"] == {"invest": 750.0, "impr": 600.0, "clicks": 30.0, "leads": 6.0}
    assert r["rf"] == {"invest": 250.0, "impr": 200.0, "clicks": 10.0, "leads": 2.0}


def test_institucional_zero_opps_fallback_50_50():
    r = allocate_row("Institucional", {"invest": 1000.0, "leads": 10}, 0, 0)
    assert r["mm"] == {"invest": 500.0, "leads": 5.0}
    assert r["rf"] == {"invest": 500.0, "leads": 5.0}
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd /Users/matheus/Documents/Claude/Projects/caveo_analist_ai && python3 -m pytest scripts/reporte_ka/test_alloc.py -q`
Expected: FAIL com `ModuleNotFoundError: No module named 'alloc'`.

- [ ] **Step 3: Implementar `alloc.py`**

```python
"""Split RF/MM de uma campanha para TODAS as métricas (invest/impr/clicks/leads).

Reusa segments.classify_segment (fundação SEGMENT_ALLOCATION). Campanha taggeada
[RF]/[MM] -> 100% no segmento; institucional -> rateio por participação de opps
(fallback 50/50).
"""
from segments import classify_segment  # scripts/acompanhamento_diario/segments.py (via conftest)


def _ratio(opp_mm, opp_rf):
    total = opp_mm + opp_rf
    if total == 0:
        return {"mm": 0.5, "rf": 0.5}
    return {"mm": opp_mm / total, "rf": opp_rf / total}


def allocate_row(name, metrics, opp_mm=0, opp_rf=0):
    """metrics: {chave: número}. Retorna {'mm': {...}, 'rf': {...}} com as MESMAS
    chaves. Campanha taggeada -> tudo no segmento; institucional -> rateio."""
    seg = classify_segment(name)
    if seg in ("mm", "rf"):
        other = "rf" if seg == "mm" else "mm"
        return {seg: dict(metrics), other: {k: 0 for k in metrics}}
    r = _ratio(opp_mm, opp_rf)
    return {
        "mm": {k: v * r["mm"] for k, v in metrics.items()},
        "rf": {k: v * r["rf"] for k, v in metrics.items()},
    }
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd /Users/matheus/Documents/Claude/Projects/caveo_analist_ai && python3 -m pytest scripts/reporte_ka/test_alloc.py -q`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add scripts/reporte_ka/alloc.py scripts/reporte_ka/test_alloc.py
git commit -m "feat(reporte-ka): alloc.py — rateio RF/MM de todas as métricas (reusa segments)"
```

---

### Task 3: `sheet.py` — resolvedor de coluna + mapa de células + gravação

**Files:**
- Create: `scripts/reporte_ka/sheet.py`
- Test: `scripts/reporte_ka/test_sheet.py`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `col_letter(n: int) -> str`
  - `_serial_to_date(serial: int|float) -> datetime.date`
  - `resolve_realizado_column(row1: list, row2: list, ano: int, mes: int) -> int|None` (índice 1-based)
  - `ROWS: dict[str, dict[str,int]]` (bloco → métrica → linha)
  - `cell_updates(col: str, data: dict) -> list[tuple[str, float]]` (`data` = `{bloco: {métrica: valor}}`)
  - `write_updates(worksheet, updates) -> int`

- [ ] **Step 1: Escrever o teste que falha (`test_sheet.py`)**

```python
from sheet import (col_letter, resolve_realizado_column, cell_updates,
                   write_updates, _serial_to_date)

# Cabeçalho real (linhas 1 e 2) das abas Mês-a-Mês, colunas A..P (0-based),
# lido como valor NÃO formatado (seriais numéricos em row1).
ROW1 = ["GERAL MÊS > ", 45986, 46016, 46048, 46079, 46107, 46138,
        46168, "", "", 46199, "", "", 46229, "", ""]
ROW2 = ["", "Meta", "Meta", "Meta", "Meta", "Meta", "Meta",
        "Realizado", "Meta", "Δ  %", "Realizado", "Meta", "Δ  %", "Realizado", "Meta", "Δ  %"]


def test_col_letter():
    assert col_letter(1) == "A"
    assert col_letter(14) == "N"
    assert col_letter(27) == "AA"


def test_serial_to_date_usa_epoca_sheets():
    d = _serial_to_date(46229)
    assert (d.year, d.month) == (2026, 7)  # dia é irrelevante (formato mmmm/yy)


def test_resolve_acha_coluna_realizado_do_mes():
    assert resolve_realizado_column(ROW1, ROW2, 2026, 7) == 14  # N (jul)
    assert resolve_realizado_column(ROW1, ROW2, 2026, 6) == 11  # K (jun)
    assert resolve_realizado_column(ROW1, ROW2, 2026, 5) == 8   # H (mai)


def test_resolve_ignora_colunas_meta():
    # jan/26 existe em row1 (col D) mas como 'Meta' (goal), não 'Realizado'.
    assert resolve_realizado_column(ROW1, ROW2, 2026, 1) is None


def test_resolve_mes_inexistente_retorna_none():
    assert resolve_realizado_column(ROW1, ROW2, 2026, 8) is None  # ago não criado


def test_cell_updates_monta_celulas_da_coluna():
    data = {
        "google_search": {"invest": 3272.37, "impr": 3163, "clicks": 873, "leads": 49},
        "sf": {"mql": 50, "sql": 21, "vendas": 20, "faturamento": 51000},
    }
    ups = dict(cell_updates("N", data))
    assert ups["N4"] == 3272.37
    assert ups["N9"] == 49
    assert ups["N43"] == 50
    assert ups["N52"] == 51000
    assert "N21" not in ups  # bloco meta_captacao ausente


def test_cell_updates_ignora_none_mantem_zero():
    ups = dict(cell_updates("N", {"meta_awareness": {"invest": 0, "impr": 0, "engaj": None}}))
    assert ups["N30"] == 0
    assert ups["N31"] == 0
    assert "N33" not in ups  # engaj None omitido


class _FakeWS:
    def __init__(self):
        self.calls = []

    def batch_update(self, body):
        self.calls.append(body)


def test_write_updates_faz_batch():
    ws = _FakeWS()
    n = write_updates(ws, [("N4", 3272.37), ("N9", 49)])
    assert n == 2
    assert ws.calls == [[
        {"range": "N4", "values": [[3272.37]]},
        {"range": "N9", "values": [[49]]},
    ]]


def test_write_updates_vazio_nao_chama_api():
    ws = _FakeWS()
    assert write_updates(ws, []) == 0
    assert ws.calls == []
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd /Users/matheus/Documents/Claude/Projects/caveo_analist_ai && python3 -m pytest scripts/reporte_ka/test_sheet.py -q`
Expected: FAIL com `ModuleNotFoundError: No module named 'sheet'`.

- [ ] **Step 3: Implementar `sheet.py`**

```python
"""Resolução da coluna do mês (Realizado) e mapeamento célula→métrica das abas
Mês-a-Mês RF/MM. A coluna NÃO é fixa: cada mês (de mai/26 em diante) ocupa um
trio Realizado|Meta|Δ%; as colunas Realizado andam de 3 em 3 (H, K, N, Q...).
A linha 1 guarda o 1º-dia-do-mês como número de série (NÃO é dia 1: o formato
mmmm/yy só exibe mês/ano); a linha 2 marca 'Realizado'. Comparar ano+mês.
"""
from datetime import date, timedelta

_SHEETS_EPOCH = date(1899, 12, 30)  # serial 0 do Google Sheets

# bloco -> {métrica: linha}. Ordem define a ordem dos updates.
ROWS = {
    "google_search":    {"invest": 4,  "impr": 5,  "clicks": 6,  "leads": 9},
    "google_yt_pmax":   {"invest": 12, "impr": 13, "clicks": 15, "leads": 18},
    "meta_captacao":    {"invest": 21, "impr": 22, "clicks": 24, "leads": 27},
    "meta_awareness":   {"invest": 30, "impr": 31, "engaj": 33},
    "google_awareness": {"invest": 35, "impr": 36, "engaj": 38},
    "sf":               {"mql": 43, "sql": 46, "vendas": 49, "faturamento": 52},
}


def col_letter(n):
    """1 -> 'A', 14 -> 'N', 27 -> 'AA'."""
    if n < 1:
        raise ValueError(f"coluna inválida: {n}")
    s = ""
    while n > 0:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def _serial_to_date(serial):
    return _SHEETS_EPOCH + timedelta(days=int(serial))


def resolve_realizado_column(row1, row2, ano, mes):
    """Índice 1-based da coluna 'Realizado' cujo serial (row1) cai em ano/mês.
    row2[i] deve ser 'Realizado'. Retorna None se não existir."""
    for i, v in enumerate(row1):
        r2 = row2[i] if i < len(row2) else ""
        if str(r2).strip().lower() != "realizado":
            continue
        if isinstance(v, bool):
            continue
        if isinstance(v, (int, float)):
            d = _serial_to_date(v)
            if d.year == ano and d.month == mes:
                return i + 1
    return None


def cell_updates(col, data):
    """col: letra da coluna. data: {bloco: {métrica: valor}}.
    Retorna [(A1, valor)] na ordem de ROWS, ignorando None (0 é gravado)."""
    out = []
    for block, metrics in ROWS.items():
        vals = data.get(block, {})
        for metric, row in metrics.items():
            value = vals.get(metric)
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

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd /Users/matheus/Documents/Claude/Projects/caveo_analist_ai && python3 -m pytest scripts/reporte_ka/test_sheet.py -q`
Expected: PASS (9 passed).

- [ ] **Step 5: Commit**

```bash
git add scripts/reporte_ka/sheet.py scripts/reporte_ka/test_sheet.py
git commit -m "feat(reporte-ka): sheet.py — resolvedor dinâmico de coluna + mapa de células RF/MM"
```

---

### Task 4: Teste de integração do pipeline (mídia + reuso de qualification)

**Files:**
- Test: `scripts/reporte_ka/test_integration.py`

**Interfaces:**
- Consumes: `blocks.block_of`, `alloc.allocate_row`, `sheet.cell_updates`, `qualification.mql_day`, `qualification.sql_day`.
- Produces: nada (trava o contrato ponta-a-ponta, puro/sem rede).

- [ ] **Step 1: Escrever o teste (`test_integration.py`)**

```python
from blocks import block_of
from alloc import allocate_row
from sheet import cell_updates
from qualification import mql_day, sql_day


def test_pipeline_midia_para_celulas():
    data = {"mm": {}, "rf": {}}

    def acc(seg, block, metrics):
        b = data[seg].setdefault(block, {})
        for k, v in metrics.items():
            b[k] = b.get(k, 0) + v

    rows = [
        {"name": "[BOO] [MM] [FUNDO] [LEADS]", "platform": "meta", "ct": None,
         "metrics": {"invest": 1000.0, "impr": 5000, "clicks": 100, "leads": 10}, "omm": 0, "orf": 0},
        {"name": "BOO - [Search] - Institucional", "platform": "google", "ct": "SEARCH",
         "metrics": {"invest": 800.0, "impr": 4000, "clicks": 80, "leads": 8}, "omm": 3, "orf": 1},
    ]
    for r in rows:
        blk = block_of(r["name"], r["platform"], r["ct"])
        assert blk != "excluded"
        al = allocate_row(r["name"], r["metrics"], r["omm"], r["orf"])
        for seg in ("mm", "rf"):
            acc(seg, blk, al[seg])

    ups_mm = dict(cell_updates("N", data["mm"]))
    ups_rf = dict(cell_updates("N", data["rf"]))
    assert ups_mm["N21"] == 1000.0   # meta captação 100% MM (taggeada)
    assert ups_mm["N4"] == 600.0     # google search: 800 * 0.75 (3 de 4 opps MM)
    assert ups_rf["N4"] == 200.0     # 800 * 0.25


def test_qualification_reuse_conta_mql_sql():
    op_prop = [{"stage": "Nova", "date": "2026-07-02"},
               {"stage": "Proposta Enviada", "date": "2026-07-10"}]
    op_aguard = [{"stage": "Aguardando Resposta", "date": "2026-07-05"}]
    assert mql_day(op_prop, False) is not None
    assert sql_day(op_prop, False) is not None
    assert mql_day(op_aguard, False) is not None
    assert sql_day(op_aguard, False) is None
```

- [ ] **Step 2: Rodar e confirmar que passa (todo o pacote)**

Run: `cd /Users/matheus/Documents/Claude/Projects/caveo_analist_ai && python3 -m pytest scripts/reporte_ka/ -q`
Expected: PASS (22 passed no total do pacote).

- [ ] **Step 3: Commit**

```bash
git add scripts/reporte_ka/test_integration.py
git commit -m "test(reporte-ka): integração do pipeline (mídia→células + reuso qualification)"
```

---

### Task 5: Reforma da skill `.claude/skills/reporte-resultados-ka.md`

**Files:**
- Modify (reescrever por completo): `.claude/skills/reporte-resultados-ka.md`

**Interfaces:**
- Consumes: `scripts/reporte_ka/{blocks,alloc,sheet}.py` + `scripts/acompanhamento_diario/{segments,qualification}.py`.
- Produces: skill executável `/reporte-resultados-ka` que grava as 22 células nas duas abas.

- [ ] **Step 1: Substituir o conteúdo do arquivo pelo abaixo (íntegra)**

````markdown
---
name: reporte-resultados-ka
description: Reporte mensal segmentado por RF e MM da Caveo. Coleta Meta Ads, Google Ads e Salesforce do mês corrente até D-1 e grava os inputs das abas "Mês-a-Mês RF" e "Mês-a-Mês MM" (mídia por bloco + funil MQL/SQL/Vendas/Faturamento). Use para atualizar as abas mensais segmentadas.
---

# Skill: Reporte Mensal Segmentado RF/MM

Coleta **Meta + Google + Salesforce** do mês corrente (dia 1 até D-1), separa por
segmento **RF / MM** e grava os **22 inputs secos** da coluna do mês (Realizado)
nas abas **"Mês-a-Mês RF"** e **"Mês-a-Mês MM"**. Sobrescreve a coluna do mês a
cada rodada (snapshot vivo). As fórmulas derivadas recalculam sozinhas — NUNCA
escrever em célula de fórmula.

## Contas e planilha

| Recurso | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` |
| Google Ads | `3921127876` (MCC `5029399396`) |
| Salesforce | `caveo.my.salesforce.com` |
| Planilha | `169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw` |
| Abas | `Mês-a-Mês RF`, `Mês-a-Mês MM` |
| Auth Sheets | `.claude/sheets_credentials.json` (service account) |

## Fundação (LER ANTES DE QUALQUER SOQL)

Canal pago (cpc + cruzamento), segmento (`TipCte__c` + `Tempo_de_Formado__c`),
MQL/SQL (`QUALIFICATION_RULES`) e ganho (`WON_CLAUSE`) vêm de
`docs/fundacao-dados.md`. Modelo de **duas datas**: MQL/SQL por `CreatedDate`;
Vendas/Faturamento por `LastStageChangeDate`. Fuso `-03:00`. NÃO reescrever listas.

Fragmentos usados (verbatim):

- **PAID:** `((UtmMed__c LIKE '%cpc%') OR ((UtmMed__c = null OR (NOT UtmMed__c LIKE '%cpc%')) AND (fbc__c != null OR fbclid__c != null OR gclid__c != null OR gbraid__c != null)))`
- **WON_CLAUSE:** `(IsWon = true OR StageName = 'Ganho não Identificado')`
- **TIPCTE_RF:** `(TipCte__c IN ('Formando') OR (TipCte__c = 'Médico' AND Tempo_de_Formado__c IN ('Menos de 3 anos','Vai se formar')))`
- **TIPCTE_MM:** `(TipCte__c IN ('Revalida') OR (TipCte__c = 'Médico' AND (NOT Tempo_de_Formado__c IN ('Menos de 3 anos','Vai se formar'))))`

## Universo e blocos

Só campanhas com o marcador **BOO** (`[BOO]` no Meta, `BOO -` no Google → teste
"contém boo"). Blocos (helper `blocks.block_of`): `google_search`,
`google_yt_pmax` (PMax/Display/Video/DemandGen não-topo), `meta_captacao`,
`meta_awareness` (`[TOPO]`), `google_awareness` (`[TOPO]`/DemandGen topo).
Campanha BOO sem tag `[RF]`/`[MM]` (institucional) → rateio por opps
(`alloc.allocate_row`, fallback 50/50).

## Mapa de células (idêntico nas duas abas; `<COL>` = coluna do mês)

| Bloco | invest | impr | clicks | leads/engaj |
|---|---|---|---|---|
| Google Search | 4 | 5 | 6 | 9 (conv.) |
| Google YT/PMax/Display | 12 | 13 | 15 | 18 (conv.) |
| Meta captação | 21 | 22 | 24 | 27 (leads) |
| Meta Awareness | 30 | 31 | — | 33 (engaj.) |
| Google Awareness | 35 | 36 | — | 38 (engaj.) |
| SF | mql=43 | sql=46 | vendas=49 | faturamento=52 |

## Fase 0 — Período

`START` = 1º dia do mês corrente (`YYYY-MM-01`); `END` = D-1 (`YYYY-MM-DD`).
Deriva `ANO`, `MES` de `END`. Informar: `Coletando de [START] a [END]…`.

## Fase 1 — Coleta (paralela)

### 1A. Meta — insights por campanha
`mcp__meta-ads-mcp__get_insights` com `account_id="act_438086148409254"`,
`level="campaign"`, `time_range={"since": START, "until": END}`,
`fields="campaign_name,spend,impressions,actions"`. Por campanha extrair:
`spend`; `impressions`; `link_clicks` = `actions[action_type=link_click].value`;
`leads` = `actions[action_type=lead].value`; `post_engagement` =
`actions[action_type=post_engagement].value` (0 se ausente). Montar `META_ROWS`.

### 1B. Google — por campanha
`mcp__google-ads-mcp__search_search`, `customer_id="3921127876"`,
`resource="campaign"`,
`fields=["campaign.name","campaign.advertising_channel_type","metrics.cost_micros","metrics.impressions","metrics.clicks","metrics.conversions","metrics.engagements"]`,
`conditions=["segments.date BETWEEN '[START]' AND '[END]'","campaign.status != 'REMOVED'"]`.
Por campanha: `cost` = `cost_micros`/1e6; `impressions`; `clicks`; `conversions`;
`engagements` (0 se ausente); `channel_type`. Montar `GOOGLE_ROWS`.

### 1C. SF — MQL/SQL (coorte por `CreatedDate`; rodar 2x: TIPCTE_RF / TIPCTE_MM)
```sql
SELECT OpportunityId, StageName, CreatedDate, Opportunity.IsWon
FROM OpportunityHistory
WHERE Opportunity.CreatedDate >= [START]T00:00:00-03:00
  AND Opportunity.CreatedDate <= [END]T23:59:59-03:00
  AND Opportunity.[PAID]
  AND Opportunity.[TIPCTE_RF | TIPCTE_MM]
ORDER BY OpportunityId, CreatedDate
```
Agrupar por `OpportunityId` → `history=[{stage, date}]` (`date` = dia de
`CreatedDate` da linha), `is_won = IsWon OR StageName contém "Ganho não Identificado"`.
Montar `SF_HISTORY = {"rf":[...], "mm":[...]}`.

### 1D. SF — Vendas/Faturamento (por `LastStageChangeDate`; rodar 2x: RF / MM)
```sql
SELECT COUNT(Id) qtd, SUM(Amount) valor
FROM Opportunity
WHERE [WON_CLAUSE]
  AND LastStageChangeDate >= [START]T00:00:00-03:00
  AND LastStageChangeDate <= [END]T23:59:59-03:00
  AND [PAID]
  AND [TIPCTE_RF | TIPCTE_MM]
```
`VENDAS = {"rf": qtd, "mm": qtd}`; `FATURAMENTO = {"rf": valor or 0, "mm": valor or 0}`.

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

## Fase 2 — Cálculo (script Python via Bash)

Preencher `ANO, MES, META_ROWS, GOOGLE_ROWS, SF_HISTORY, VENDAS, FATURAMENTO,
INST_OPPS` com os dados reais e rodar com o `python3` do sistema:

```python
import sys
sys.path.insert(0, 'scripts/reporte_ka')
sys.path.insert(0, 'scripts/acompanhamento_diario')
from blocks import block_of
from alloc import allocate_row
from qualification import mql_day, sql_day
from sheet import resolve_realizado_column, col_letter, cell_updates, write_updates
import gspread
from google.oauth2.service_account import Credentials

SHEET_ID = '169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw'
TABS = {"rf": "Mês-a-Mês RF", "mm": "Mês-a-Mês MM"}

# ===== dados da Fase 1 (PREENCHER) =====
# ANO, MES = 2026, 7
# META_ROWS = [{"name","spend","impressions","link_clicks","leads","post_engagement"}]
# GOOGLE_ROWS = [{"name","channel_type","cost","impressions","clicks","conversions","engagements"}]
# SF_HISTORY = {"rf":[{"history":[{"stage","date"}],"is_won":bool}], "mm":[...]}
# VENDAS = {"rf": int, "mm": int}
# FATURAMENTO = {"rf": float, "mm": float}
# INST_OPPS = {utmcam: {"mm": int, "rf": int}}

acc = {"rf": {}, "mm": {}}
def add(seg, block, metrics):
    b = acc[seg].setdefault(block, {})
    for k, v in metrics.items():
        b[k] = b.get(k, 0) + v

fallback_5050 = []
def opp_counts(name):
    c = INST_OPPS.get(name)
    if c is None:
        return 0, 0
    return c.get("mm", 0), c.get("rf", 0)

def is_tagged(name):
    n = name.lower()
    return "[mm]" in n or "[rf]" in n

# --- Meta ---
for r in META_ROWS:
    blk = block_of(r["name"], "meta")
    if blk == "excluded":
        continue
    if blk == "meta_awareness":
        metrics = {"invest": r["spend"], "impr": r["impressions"], "engaj": r.get("post_engagement", 0)}
    else:
        metrics = {"invest": r["spend"], "impr": r["impressions"], "clicks": r["link_clicks"], "leads": r["leads"]}
    omm, orf = opp_counts(r["name"])
    if not is_tagged(r["name"]) and (omm + orf) == 0 and r["spend"]:
        fallback_5050.append(r["name"])
    al = allocate_row(r["name"], metrics, omm, orf)
    for seg in ("mm", "rf"):
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
    omm, orf = opp_counts(r["name"])
    if not is_tagged(r["name"]) and (omm + orf) == 0 and r["cost"]:
        fallback_5050.append(r["name"])
    al = allocate_row(r["name"], metrics, omm, orf)
    for seg in ("mm", "rf"):
        add(seg, blk, al[seg])

# --- SF MQL/SQL (coorte por criação; reached-gate via qualification) ---
for seg in ("rf", "mm"):
    mql = sum(1 for o in SF_HISTORY[seg] if mql_day(o["history"], o["is_won"]) is not None)
    sql = sum(1 for o in SF_HISTORY[seg] if sql_day(o["history"], o["is_won"]) is not None)
    add(seg, "sf", {"mql": mql, "sql": sql})

# --- SF Vendas/Faturamento (por LastStageChangeDate) ---
for seg in ("rf", "mm"):
    add(seg, "sf", {"vendas": VENDAS[seg], "faturamento": FATURAMENTO[seg]})

# --- Arredondar métricas inteiras fracionadas pelo rateio ---
for seg in ("rf", "mm"):
    for blk, m in acc[seg].items():
        for k in ("impr", "clicks", "leads"):
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
for seg in ("rf", "mm"):
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

if cols["rf"] is None or cols["mm"] is None:
    print(f"[PARAR] Coluna do mês {MES:02d}/{ANO} não existe (RF={cols['rf']} MM={cols['mm']}).")
    print("Crie o trio Realizado|Meta|Δ% do mês nas abas ou informe a coluna. NADA foi gravado.")
    sys.exit(1)
if cols["rf"] != cols["mm"]:
    print(f"[PARAR] RF e MM resolveram colunas diferentes (RF={cols['rf']} MM={cols['mm']}). NADA foi gravado.")
    sys.exit(1)

COL = col_letter(cols["rf"])
print(f"Mês {MES:02d}/{ANO} -> coluna {COL} (Realizado) nas abas RF e MM.\n")

# --- PREVIEW ---
for seg in ("rf", "mm"):
    print(f"=== {seg.upper()} — coluna {COL} ===")
    for a1, val in cell_updates(COL, acc[seg]):
        print(f"  {a1} = {val}")
    print()
if fallback_5050:
    print("[!] Institucional em fallback 50/50 (sem opps p/ ratear):")
    for c in sorted(set(fallback_5050)):
        print(f"    {c}")

# --- GRAVAÇÃO: só após confirmação (Fase 4). Descomentar e rodar de novo. ---
def gravar():
    total = 0
    for seg, tab in TABS.items():
        total += write_updates(sh.worksheet(tab), cell_updates(COL, acc[seg]))
    print(f"Gravadas {total} células ({COL} nas abas RF e MM).")
# gravar()
```

## Fase 3 — Preview e confirmação

Apresentar as tabelas RF e MM (as 22 células de cada) + a coluna resolvida +
avisos: rateios em fallback 50/50; vendas/faturamento não segmentados por
`TipCte__c` nulo (diferença entre total pago e RF+MM); awareness zerado.
Perguntar:
```
Gravar na coluna [COL] ([MÊS]/[ANO]) das abas RF e MM? (sim para confirmar)
```

## Fase 4 — Gravação

Só após "sim": descomentar `gravar()` no script e rodar de novo (dados já
embutidos). Nunca tocar em células de fórmula.

## Pontos de atenção

- **Header não formatado:** ler o cabeçalho com `value_render_option='UNFORMATTED_VALUE'` — senão os seriais viram strings ("julho / 26") e o resolvedor não acha a coluna.
- **Coluna inexistente = parar:** mês novo sem trio de colunas → PARA sem gravar (evita sobrescrever o mês anterior).
- **Duas datas:** MQL/SQL por `CreatedDate`; Vendas/Faturamento por `LastStageChangeDate`.
- **Universo BOO:** exclui webinar/comunidade e as campanhas "Turbo" (pausadas). Se "Turbo" voltar como captação médico, revisar.
- **Métricas a validar na 1ª rodada:** Meta Cliques=`link_click`, Leads=`actions[lead]`; Google Leads=`conversions`. Ajustar se o cliente definir diferente.
````

- [ ] **Step 2: Verificação estrutural (imports do script batem com o helper)**

Run:
```bash
cd /Users/matheus/Documents/Claude/Projects/caveo_analist_ai && python3 -c "
import sys
sys.path.insert(0, 'scripts/reporte_ka'); sys.path.insert(0, 'scripts/acompanhamento_diario')
from blocks import block_of
from alloc import allocate_row
from qualification import mql_day, sql_day
from sheet import resolve_realizado_column, col_letter, cell_updates, write_updates
print('imports OK')
"
```
Expected: `imports OK`.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/reporte-resultados-ka.md
git commit -m "feat(reporte-ka): reforma da skill p/ reporte mensal segmentado RF/MM"
```

---

### Task 6: Atualizar comando, mapa do projeto e memória

**Files:**
- Modify: `.claude/commands/reporte-resultados-ka.md`
- Modify: `docs/projeto-mapa.md`
- Modify: `/Users/matheus/.claude/projects/-Users-matheus-Documents-Claude-Projects-caveo-analist-ai/memory/project_reporte_resultados_ka.md` e `.../MEMORY.md`

- [ ] **Step 1: Atualizar a `description` do comando**

Em `.claude/commands/reporte-resultados-ka.md`, trocar a linha de frontmatter:
```
description: Relatório mensal do cliente KA → planilha Banco de Dados
```
por:
```
description: Reporte mensal segmentado RF/MM → abas Mês-a-Mês RF e MM
```

- [ ] **Step 2: Atualizar `docs/projeto-mapa.md`**

Na tabela/linha da skill `reporte-resultados-ka.md`, trocar a anotação
`(procedimento)` antiga por `(procedimento; mensal segmentado RF/MM → abas Mês-a-Mês)`.

- [ ] **Step 3: Atualizar a memória**

Reescrever `project_reporte_resultados_ka.md` para refletir: abas-alvo
`Mês-a-Mês RF`/`Mês-a-Mês MM`, coluna do mês resolvida dinamicamente, 22 inputs
(mídia por bloco + MQL/SQL/Vendas/Faturamento), universo BOO, helper
`scripts/reporte_ka/`. Ajustar o hook em `MEMORY.md`.

- [ ] **Step 4: Rodar a suíte completa do pacote (regressão)**

Run: `cd /Users/matheus/Documents/Claude/Projects/caveo_analist_ai && python3 -m pytest scripts/reporte_ka/ scripts/acompanhamento_diario/ -q`
Expected: PASS (pacote reporte_ka + acompanhamento_diario, sem regressão).

- [ ] **Step 5: Confirmar sincronia da fundação (guardião)**

Run: `cd /Users/matheus/Documents/Claude/Projects/caveo_analist_ai && npm run docs:check`
Expected: verde (não houve mudança em `config/business-rules.ts`).

- [ ] **Step 6: Commit**

```bash
git add .claude/commands/reporte-resultados-ka.md docs/projeto-mapa.md
git commit -m "docs(reporte-ka): atualiza comando e mapa do projeto p/ reporte segmentado"
```

---

## Primeira rodada conjunta (pós-implementação, fora dos commits)

Rodar `/reporte-resultados-ka` para julho/2026 e validar **célula a célula** no
preview antes de gravar: conferir Meta `link_click`/`lead`, Google `conversions`,
os 6 blocos, e MQL/SQL/Vendas/Faturamento contra o Salesforce. Ajustar os campos
de métrica (§ "Pontos de atenção") se o cliente definir diferente. Só então gravar.

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec:** §4 mapa de células → Task 3 (`ROWS`); §5 resolvedor →
  Task 3 + Fase 2; §6 universo/blocos → Task 1; §7 rateio → Task 2 + Fase 2;
  §8 métricas → Fase 1/2 da skill (Task 5); §9 arquitetura/reuso → Tasks 1–4;
  §10 pipeline → Task 5; §12 higiene → Task 6. ✔
- **Placeholders:** nenhum "TBD/TODO"; todo código presente. Marcadores `[START]`,
  `[TIPCTE_RF | TIPCTE_MM]` etc. são gabaritos de SOQL preenchidos em runtime pela
  skill (intencionais), com os fragmentos verbatim nas Global Constraints. ✔
- **Consistência de tipos:** `block_of(name, platform, channel_type)`,
  `allocate_row(name, metrics, opp_mm, opp_rf)`, `cell_updates(col, data)`,
  `resolve_realizado_column(row1, row2, ano, mes)` usados com as mesmas
  assinaturas na skill (Task 5) e nos testes. ✔
