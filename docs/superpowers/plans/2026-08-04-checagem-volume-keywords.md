# Checagem de Volume de Busca (Keyword Planner) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable local script that checks Google Ads Keyword Planner search volume for a list of seed keywords and writes the results to a dedicated Google Sheet.

**Architecture:** A new `scripts/keyword_volume/` directory, following the same shape already used by `scripts/acompanhamento_diario/` and `scripts/reporte_ka/` — small pure-logic modules covered by pytest, plus a thin CLI (`run.py`) that does the actual network/Sheets I/O. The one live external call (Google Ads `KeywordPlanIdeaService.GenerateKeywordHistoricalMetrics`) and the one Sheets write are isolated in `client.py` and `sheet.py` respectively; everything else is pure and unit-tested.

**Tech Stack:** Python 3 (system interpreter, no dedicated venv — matches existing `scripts/` convention), `google-ads` (official client library, to be installed), `gspread` + `google-auth` (already installed, same as other skills), `pytest`.

## Global Constraints

- Geo target: Brazil only — `geoTargetConstants/2076` (verified live against the account via `search_search` on `geo_target_constant`, not guessed).
- Language: Portuguese only — `languageConstants/1014` (verified live the same way, via `language_constant`).
- Network: Google Search only — `KeywordPlanNetworkEnum.GOOGLE_SEARCH` (not Search & Partners) — matches the scope already decided in `docs/superpowers/specs/2026-08-04-temas-keywords-search-medico-design.md`.
- Do not touch the `google-ads-mcp` package (`~/.local/pipx/venvs/google-ads-mcp/`) or anything outside this repository.
- Credentials: read directly from `.mcp.json` (`mcpServers["google-ads-mcp"]["env"]`), which already holds working values for `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID`, `GOOGLE_ADS_TARGET_CUSTOMER_ID`, `GOOGLE_APPLICATION_CREDENTIALS`. **Deviation from the approved spec:** the spec called for duplicating these into `.env.local`/`.env.example`; that was dropped because `.env*` files are blocked from the Read/Edit/Write/Bash tools in this project (verified during planning — every attempt to touch `.env.example` was denied). Reading `.mcp.json` directly needs zero new setup, zero duplication, and the file is already gitignored (`.gitignore:56`), so the security posture is unchanged.
- Sheets auth reuses the exact pattern already proven in `.claude/skills/acompanhamento-diario-caveo.md`: `google.oauth2.service_account.Credentials.from_service_account_file('.claude/sheets_credentials.json', scopes=['https://www.googleapis.com/auth/spreadsheets'])` + `gspread.authorize(creds)`.
- New spreadsheet is dedicated (not a new tab on an existing operational sheet — user's decision), created once, shared with `matheus.moreira@boomer.com.br` (edit access) — confirmed by the user, corrected from an earlier wrong email in the spec.
- No competitor keywords, no Revalida — out of scope per the earlier spec.

---

### Task 1: Seeds file

**Files:**
- Create: `scripts/keyword_volume/seeds_2026-08-04.csv`

**Interfaces:**
- Produces: a CSV with header `tema,balde,keyword` — consumed by `run.py` (Task 6) via `csv.DictReader`.

This is the literal seed list from `docs/superpowers/specs/2026-08-04-temas-keywords-search-medico-design.md` Section 3 (all 9 ad-group candidates, 29 keywords total), reformatted as one keyword per row with its theme and funnel bucket. No code, no test — this is pure data.

- [ ] **Step 1: Write the file**

```csv
tema,balde,keyword
Abertura de CNPJ Médico,transacional,abrir cnpj médico
Abertura de CNPJ Médico,transacional,abrir pj médico
Abertura de CNPJ Médico,transacional,cnpj médico online
Abertura de CNPJ Médico,transacional,abertura de empresa médica
Abertura de CNPJ Médico,transacional,quanto custa abrir cnpj médico
Migração de Contabilidade Médica,transacional,trocar de contador médico
Migração de Contabilidade Médica,transacional,migrar contabilidade médica
Migração de Contabilidade Médica,transacional,sair do contador atual médico pj
Emissão de Nota Fiscal - Sistema para Médico PJ,transacional,sistema de emissão de nota fiscal médico
Emissão de Nota Fiscal - Sistema para Médico PJ,transacional,emitir nota fiscal automática plantão
Emissão de Nota Fiscal - Sistema para Médico PJ,transacional,app para emitir nota fiscal médico
Reforma Tributária para Médico PJ,comparativo,reforma tributária médico pj
Reforma Tributária para Médico PJ,comparativo,como fica o imposto de médico com a reforma tributária
Reforma Tributária para Médico PJ,comparativo,simples nacional médico reforma tributária
Contabilidade Especializada em Plantão/Cooperativa,comparativo,contabilidade para médico plantonista
Contabilidade Especializada em Plantão/Cooperativa,comparativo,contador que entende cooperativa médica
Contabilidade Especializada em Plantão/Cooperativa,comparativo,contabilidade médico pj cooperativa e rpa
Melhor Contador/Contabilidade para Médico,comparativo,melhor contabilidade para médico
Melhor Contador/Contabilidade para Médico,comparativo,melhor contador para médico pj
Melhor Contador/Contabilidade para Médico,comparativo,contabilidade especializada em médico
Contabilidade ou Contador para Médico (genérico),informacional,contabilidade para médico
Contabilidade ou Contador para Médico (genérico),informacional,contador para médico
Contabilidade ou Contador para Médico (genérico),informacional,contador médico
Dúvidas Básicas sobre CNPJ Médico,informacional,como funciona cnpj para médico
Dúvidas Básicas sobre CNPJ Médico,informacional,vale a pena abrir cnpj médico
Dúvidas Básicas sobre CNPJ Médico,informacional,cnpj médico simples nacional como funciona
Nota Fiscal Médica - dúvidas gerais,informacional,como emitir nota fiscal médica
Nota Fiscal Médica - dúvidas gerais,informacional,emitir nota fiscal plantão
Nota Fiscal Médica - dúvidas gerais,informacional,nota fiscal médico pessoa física
```

- [ ] **Step 2: Verify row count**

Run: `python3 -c "import csv; print(len(list(csv.DictReader(open('scripts/keyword_volume/seeds_2026-08-04.csv')))))"`
Expected: `29`

- [ ] **Step 3: Commit**

```bash
git add scripts/keyword_volume/seeds_2026-08-04.csv
git commit -m "feat(keyword-volume): adiciona seeds de keyword do spec de 2026-08-04"
```

---

### Task 2: `parser.py` — pure formatting/sorting

**Files:**
- Create: `scripts/keyword_volume/parser.py`
- Test: `scripts/keyword_volume/test_parser.py`

**Interfaces:**
- Consumes: nothing from other tasks (fully standalone, pure Python).
- Produces: `sorted_rows(raw_metrics: list[dict]) -> list[dict]` — each output dict has keys `keyword`, `avg_monthly_searches` (`int | None`), `competition` (`str`, one of `"Baixa"/"Média"/"Alta"/"Não informado"`), `low_bid_brl` (`float | None`), `high_bid_brl` (`float | None`). Consumed by `sheet.py` (Task 5) and `run.py` (Task 6). Input dicts have keys `keyword`, `avg_monthly_searches`, `competition` (raw enum name string like `"LOW"`), `low_top_of_page_bid_micros`, `high_top_of_page_bid_micros` — this is the exact shape `client.fetch_historical_metrics` (Task 4) produces.

- [ ] **Step 1: Write the failing tests**

```python
# scripts/keyword_volume/test_parser.py
from parser import sorted_rows


def test_sorts_by_volume_descending():
    raw = [
        {"keyword": "b", "avg_monthly_searches": 100, "competition": "LOW",
         "low_top_of_page_bid_micros": 1_000_000, "high_top_of_page_bid_micros": 2_000_000},
        {"keyword": "a", "avg_monthly_searches": 500, "competition": "HIGH",
         "low_top_of_page_bid_micros": 3_000_000, "high_top_of_page_bid_micros": 4_000_000},
    ]
    result = sorted_rows(raw)
    assert [r["keyword"] for r in result] == ["a", "b"]


def test_none_volume_sorts_last():
    raw = [
        {"keyword": "sem_dado", "avg_monthly_searches": None, "competition": "UNSPECIFIED",
         "low_top_of_page_bid_micros": None, "high_top_of_page_bid_micros": None},
        {"keyword": "com_dado", "avg_monthly_searches": 10, "competition": "LOW",
         "low_top_of_page_bid_micros": 500_000, "high_top_of_page_bid_micros": 900_000},
    ]
    result = sorted_rows(raw)
    assert [r["keyword"] for r in result] == ["com_dado", "sem_dado"]


def test_converts_micros_to_brl():
    raw = [{"keyword": "x", "avg_monthly_searches": 10, "competition": "MEDIUM",
            "low_top_of_page_bid_micros": 1_500_000, "high_top_of_page_bid_micros": 2_750_000}]
    result = sorted_rows(raw)
    assert result[0]["low_bid_brl"] == 1.5
    assert result[0]["high_bid_brl"] == 2.75


def test_missing_bids_stay_none():
    raw = [{"keyword": "x", "avg_monthly_searches": 10, "competition": "LOW",
            "low_top_of_page_bid_micros": None, "high_top_of_page_bid_micros": None}]
    result = sorted_rows(raw)
    assert result[0]["low_bid_brl"] is None
    assert result[0]["high_bid_brl"] is None


def test_competition_labels_in_portuguese():
    raw = [
        {"keyword": "a", "avg_monthly_searches": 1, "competition": "LOW",
         "low_top_of_page_bid_micros": None, "high_top_of_page_bid_micros": None},
        {"keyword": "b", "avg_monthly_searches": 1, "competition": "MEDIUM",
         "low_top_of_page_bid_micros": None, "high_top_of_page_bid_micros": None},
        {"keyword": "c", "avg_monthly_searches": 1, "competition": "HIGH",
         "low_top_of_page_bid_micros": None, "high_top_of_page_bid_micros": None},
        {"keyword": "d", "avg_monthly_searches": 1, "competition": "UNSPECIFIED",
         "low_top_of_page_bid_micros": None, "high_top_of_page_bid_micros": None},
    ]
    result = {r["keyword"]: r["competition"] for r in sorted_rows(raw)}
    assert result == {"a": "Baixa", "b": "Média", "c": "Alta", "d": "Não informado"}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scripts/keyword_volume && python3 -m pytest test_parser.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'parser'` (or import error) — `parser.py` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```python
# scripts/keyword_volume/parser.py
"""Formatação pura das métricas do Keyword Planner: sem I/O, sem chamada de rede."""

COMPETITION_LABELS = {
    "LOW": "Baixa",
    "MEDIUM": "Média",
    "HIGH": "Alta",
    "UNSPECIFIED": "Não informado",
    "UNKNOWN": "Não informado",
}


def _micros_to_brl(micros):
    return round(micros / 1_000_000, 2) if micros is not None else None


def _sort_key(item):
    volume = item.get("avg_monthly_searches")
    return (volume is None, -(volume or 0))


def sorted_rows(raw_metrics):
    """Ordena por volume médio mensal (desc, None por último); converte lances micros -> R$."""
    rows = []
    for item in sorted(raw_metrics, key=_sort_key):
        rows.append({
            "keyword": item["keyword"],
            "avg_monthly_searches": item.get("avg_monthly_searches"),
            "competition": COMPETITION_LABELS.get(item.get("competition"), "Não informado"),
            "low_bid_brl": _micros_to_brl(item.get("low_top_of_page_bid_micros")),
            "high_bid_brl": _micros_to_brl(item.get("high_top_of_page_bid_micros")),
        })
    return rows
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scripts/keyword_volume && python3 -m pytest test_parser.py -v`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add scripts/keyword_volume/parser.py scripts/keyword_volume/test_parser.py
git commit -m "feat(keyword-volume): adiciona parser puro de métricas (ordenação + formatação)"
```

---

### Task 3: `config.py` — lê credenciais de `.mcp.json`

**Files:**
- Create: `scripts/keyword_volume/config.py`
- Test: `scripts/keyword_volume/test_config.py`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `load_google_ads_config(mcp_json_path=".mcp.json") -> dict` with keys `developer_token`, `login_customer_id`, `target_customer_id`, `credentials_path`. Consumed by `client.py` (Task 4).

- [ ] **Step 1: Write the failing test**

```python
# scripts/keyword_volume/test_config.py
import json
from config import load_google_ads_config


def test_loads_expected_fields_from_mcp_json(tmp_path):
    mcp_json = tmp_path / ".mcp.json"
    mcp_json.write_text(json.dumps({
        "mcpServers": {
            "google-ads-mcp": {
                "command": "/whatever/google-ads-mcp",
                "env": {
                    "GOOGLE_ADS_DEVELOPER_TOKEN": "tok123",
                    "GOOGLE_ADS_LOGIN_CUSTOMER_ID": "111",
                    "GOOGLE_ADS_TARGET_CUSTOMER_ID": "222",
                    "GOOGLE_APPLICATION_CREDENTIALS": "/path/creds.json",
                },
            },
            "other-server": {"command": "whatever"},
        }
    }))

    config = load_google_ads_config(str(mcp_json))

    assert config == {
        "developer_token": "tok123",
        "login_customer_id": "111",
        "target_customer_id": "222",
        "credentials_path": "/path/creds.json",
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd scripts/keyword_volume && python3 -m pytest test_config.py -v`
Expected: FAIL — `config.py` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```python
# scripts/keyword_volume/config.py
"""Lê as credenciais do Google Ads já usadas pelo MCP, direto do .mcp.json.

Fonte única de verdade: em vez de duplicar developer token / customer id /
caminho da service account num .env separado, reaproveita o que já existe em
.mcp.json (gitignorado) para o servidor google-ads-mcp.
"""
import json


def load_google_ads_config(mcp_json_path=".mcp.json"):
    with open(mcp_json_path) as f:
        data = json.load(f)
    env = data["mcpServers"]["google-ads-mcp"]["env"]
    return {
        "developer_token": env["GOOGLE_ADS_DEVELOPER_TOKEN"],
        "login_customer_id": env["GOOGLE_ADS_LOGIN_CUSTOMER_ID"],
        "target_customer_id": env["GOOGLE_ADS_TARGET_CUSTOMER_ID"],
        "credentials_path": env["GOOGLE_APPLICATION_CREDENTIALS"],
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd scripts/keyword_volume && python3 -m pytest test_config.py -v`
Expected: 1 passed

- [ ] **Step 5: Commit**

```bash
git add scripts/keyword_volume/config.py scripts/keyword_volume/test_config.py
git commit -m "feat(keyword-volume): le credenciais do Google Ads direto do .mcp.json"
```

---

### Task 4: `client.py` — chamada ao Keyword Planner

**Files:**
- Create: `scripts/keyword_volume/client.py`
- Test: `scripts/keyword_volume/test_client.py`

**Interfaces:**
- Consumes: `config.load_google_ads_config() -> dict` (Task 3).
- Produces: `fetch_historical_metrics(config: dict, keywords: list[str]) -> list[dict]`, each dict with keys `keyword`, `avg_monthly_searches`, `competition` (raw enum name), `low_top_of_page_bid_micros`, `high_top_of_page_bid_micros` — this is the exact input shape `parser.sorted_rows` (Task 2) expects. Also exposes `build_request(client, customer_id, keywords)`, `GEO_TARGET_BRAZIL`, `LANGUAGE_PORTUGUESE` for testing.

Constants `geoTargetConstants/2076` (Brazil) and `languageConstants/1014` (Portuguese) were verified live against the real account via `search_search` on `geo_target_constant`/`language_constant` during planning — not guessed.

- [ ] **Step 1: Install the dependency**

Run: `pip3 install --user google-ads`
Expected: install succeeds (system already has `google-auth` installed, which `google-ads` depends on).

Verify: `python3 -c "import google.ads.googleads; print('ok')"`
Expected: `ok`

- [ ] **Step 2: Write the failing test (request construction, no network)**

```python
# scripts/keyword_volume/test_client.py
from client import build_request, GEO_TARGET_BRAZIL, LANGUAGE_PORTUGUESE


class _FakeRepeatedField(list):
    pass


class _FakeRequest:
    def __init__(self):
        self.customer_id = None
        self.keywords = _FakeRepeatedField()
        self.language = None
        self.geo_target_constants = _FakeRepeatedField()
        self.keyword_plan_network = None


class _FakeKeywordPlanNetworkEnum:
    GOOGLE_SEARCH = "GOOGLE_SEARCH"


class _FakeEnums:
    KeywordPlanNetworkEnum = _FakeKeywordPlanNetworkEnum


class _FakeClient:
    enums = _FakeEnums

    def get_type(self, name):
        assert name == "GenerateKeywordHistoricalMetricsRequest"
        return _FakeRequest()


def test_build_request_sets_expected_fields():
    request = build_request(_FakeClient(), "3921127876", ["abrir cnpj médico", "contador médico"])

    assert request.customer_id == "3921127876"
    assert list(request.keywords) == ["abrir cnpj médico", "contador médico"]
    assert request.language == LANGUAGE_PORTUGUESE
    assert list(request.geo_target_constants) == [GEO_TARGET_BRAZIL]
    assert request.keyword_plan_network == "GOOGLE_SEARCH"


def test_constants_match_verified_resource_names():
    assert GEO_TARGET_BRAZIL == "geoTargetConstants/2076"
    assert LANGUAGE_PORTUGUESE == "languageConstants/1014"
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd scripts/keyword_volume && python3 -m pytest test_client.py -v`
Expected: FAIL — `client.py` doesn't exist yet.

- [ ] **Step 4: Write the implementation**

```python
# scripts/keyword_volume/client.py
"""Chamada ao Keyword Planner (KeywordPlanIdeaService.GenerateKeywordHistoricalMetrics).

Único módulo que fala com a rede. build_request() é puro (testável sem
credenciais reais); build_client()/fetch_historical_metrics() exigem
credenciais válidas e não têm teste automatizado de chamada real.
"""
from google.ads.googleads.client import GoogleAdsClient
from google.oauth2 import service_account

_ADS_SCOPE = "https://www.googleapis.com/auth/adwords"

# Verificados ao vivo contra a conta real (search_search em geo_target_constant
# / language_constant) durante o planejamento — não são valores adivinhados.
GEO_TARGET_BRAZIL = "geoTargetConstants/2076"
LANGUAGE_PORTUGUESE = "languageConstants/1014"


def build_client(config):
    creds = service_account.Credentials.from_service_account_file(
        config["credentials_path"], scopes=[_ADS_SCOPE]
    )
    return GoogleAdsClient(
        credentials=creds,
        developer_token=config["developer_token"],
        login_customer_id=config["login_customer_id"],
        use_proto_plus=True,
    )


def build_request(client, customer_id, keywords):
    request = client.get_type("GenerateKeywordHistoricalMetricsRequest")
    request.customer_id = customer_id
    request.keywords.extend(keywords)
    request.language = LANGUAGE_PORTUGUESE
    request.geo_target_constants.append(GEO_TARGET_BRAZIL)
    request.keyword_plan_network = client.enums.KeywordPlanNetworkEnum.GOOGLE_SEARCH
    return request


def fetch_historical_metrics(config, keywords):
    client = build_client(config)
    service = client.get_service("KeywordPlanIdeaService")
    request = build_request(client, config["target_customer_id"], keywords)
    response = service.generate_keyword_historical_metrics(request=request)

    results = []
    for result in response.results:
        metrics = result.keyword_metrics
        results.append({
            "keyword": result.text,
            "avg_monthly_searches": metrics.avg_monthly_searches,
            "competition": metrics.competition.name,
            "low_top_of_page_bid_micros": metrics.low_top_of_page_bid_micros,
            "high_top_of_page_bid_micros": metrics.high_top_of_page_bid_micros,
        })
    return results
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd scripts/keyword_volume && python3 -m pytest test_client.py -v`
Expected: 2 passed

- [ ] **Step 6: Commit**

```bash
git add scripts/keyword_volume/client.py scripts/keyword_volume/test_client.py
git commit -m "feat(keyword-volume): chamada ao Keyword Planner (GenerateKeywordHistoricalMetrics)"
```

---

### Task 5: `sheet.py` — linhas da planilha + escrita no Google Sheets

**Files:**
- Create: `scripts/keyword_volume/sheet.py`
- Test: `scripts/keyword_volume/test_sheet.py`
- Modify: `.gitignore` (adiciona `scripts/keyword_volume/.sheet_id`)

**Interfaces:**
- Consumes: `parser.sorted_rows(...)` output (Task 2) as `rows` param; a `theme_lookup: dict[str, tuple[str, str]]` (keyword -> (tema, balde)) built by `run.py` (Task 6) from the seeds CSV (Task 1).
- Produces: `HEADER: list[str]`, `build_sheet_rows(rows, theme_lookup) -> list[list]` (pure), `authorize() -> gspread.Client`, `get_or_create_spreadsheet(gc, sheet_id_path, title, share_email) -> gspread.Spreadsheet`, `get_or_create_worksheet(spreadsheet, tab_name) -> gspread.Worksheet`, `write_rows(worksheet, rows) -> int`. Consumed by `run.py` (Task 6).

- [ ] **Step 1: Write the failing test (pure part only)**

```python
# scripts/keyword_volume/test_sheet.py
from sheet import build_sheet_rows, HEADER


def test_build_sheet_rows_joins_theme_lookup():
    rows = [
        {"keyword": "abrir cnpj médico", "avg_monthly_searches": 500,
         "competition": "Baixa", "low_bid_brl": 1.5, "high_bid_brl": 3.0},
    ]
    theme_lookup = {"abrir cnpj médico": ("Abertura de CNPJ Médico", "transacional")}

    result = build_sheet_rows(rows, theme_lookup)

    assert result == [[
        "abrir cnpj médico", "Abertura de CNPJ Médico", "transacional",
        500, "Baixa", 1.5, 3.0,
    ]]


def test_build_sheet_rows_handles_missing_theme():
    rows = [{"keyword": "termo novo", "avg_monthly_searches": None,
             "competition": "Não informado", "low_bid_brl": None, "high_bid_brl": None}]

    result = build_sheet_rows(rows, theme_lookup={})

    assert result == [["termo novo", "(não mapeado)", "(não mapeado)", "", "Não informado", "", ""]]


def test_header_has_expected_columns():
    assert HEADER == [
        "Keyword", "Tema/Ad group candidato", "Balde de funil",
        "Volume médio mensal", "Concorrência", "Lance mín. (R$)", "Lance máx. (R$)",
    ]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd scripts/keyword_volume && python3 -m pytest test_sheet.py -v`
Expected: FAIL — `sheet.py` doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```python
# scripts/keyword_volume/sheet.py
"""Linhas da planilha (puro) + escrita no Google Sheets (I/O fino).

Mesma credencial/autenticação já usada pelas outras skills do projeto
(.claude/sheets_credentials.json via gspread).
"""
import os
import gspread
from google.oauth2.service_account import Credentials

_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
_CREDENTIALS_FILE = ".claude/sheets_credentials.json"

HEADER = [
    "Keyword", "Tema/Ad group candidato", "Balde de funil",
    "Volume médio mensal", "Concorrência", "Lance mín. (R$)", "Lance máx. (R$)",
]


def build_sheet_rows(rows, theme_lookup):
    """PURO: junta as métricas já ordenadas (parser.sorted_rows) com o mapeamento
    tema/balde de funil do seeds CSV, pronto pra gravar na planilha."""
    out = []
    for row in rows:
        tema, balde = theme_lookup.get(row["keyword"], ("(não mapeado)", "(não mapeado)"))
        out.append([
            row["keyword"],
            tema,
            balde,
            row["avg_monthly_searches"] if row["avg_monthly_searches"] is not None else "",
            row["competition"],
            row["low_bid_brl"] if row["low_bid_brl"] is not None else "",
            row["high_bid_brl"] if row["high_bid_brl"] is not None else "",
        ])
    return out


def authorize():
    creds = Credentials.from_service_account_file(_CREDENTIALS_FILE, scopes=[_SHEETS_SCOPE])
    return gspread.authorize(creds)


def get_or_create_spreadsheet(gc, sheet_id_path, title, share_email):
    if os.path.exists(sheet_id_path):
        with open(sheet_id_path) as f:
            sheet_id = f.read().strip()
        return gc.open_by_key(sheet_id)

    sh = gc.create(title)
    sh.share(share_email, perm_type="user", role="writer")
    with open(sheet_id_path, "w") as f:
        f.write(sh.id)
    return sh


def get_or_create_worksheet(spreadsheet, tab_name):
    try:
        return spreadsheet.worksheet(tab_name)
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title=tab_name, rows="1000", cols=str(len(HEADER)))
        ws.append_row(HEADER)
        return ws


def write_rows(worksheet, rows):
    if rows:
        worksheet.append_rows(rows)
    return len(rows)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd scripts/keyword_volume && python3 -m pytest test_sheet.py -v`
Expected: 3 passed

- [ ] **Step 5: Add `.sheet_id` to `.gitignore`**

Add this line under the "MCPs locais" section of `.gitignore` (after line 45, `mcps/*_credentials.json`):

```
scripts/keyword_volume/.sheet_id
```

- [ ] **Step 6: Commit**

```bash
git add scripts/keyword_volume/sheet.py scripts/keyword_volume/test_sheet.py .gitignore
git commit -m "feat(keyword-volume): linhas de planilha + escrita no Google Sheets"
```

---

### Task 6: `run.py` — CLI que junta tudo

**Files:**
- Create: `scripts/keyword_volume/run.py`

**Interfaces:**
- Consumes: `config.load_google_ads_config` (Task 3), `client.fetch_historical_metrics` (Task 4), `parser.sorted_rows` (Task 2), `sheet.{authorize, build_sheet_rows, get_or_create_spreadsheet, get_or_create_worksheet, write_rows}` (Task 5), the seeds CSV (Task 1).
- Produces: an executable CLI — no other task depends on its internals, so no unit test; validated by a manual run (Step 3).

- [ ] **Step 1: Write the implementation**

```python
#!/usr/bin/env python3
"""CLI: lê seeds (tema,balde,keyword), consulta volume de busca no Google Ads
Keyword Planner e grava numa planilha Google Sheets dedicada.

Uso: python3 scripts/keyword_volume/run.py --seeds scripts/keyword_volume/seeds_2026-08-04.csv
"""
import argparse
import csv
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from client import fetch_historical_metrics
from config import load_google_ads_config
from parser import sorted_rows
from sheet import (
    authorize,
    build_sheet_rows,
    get_or_create_spreadsheet,
    get_or_create_worksheet,
    write_rows,
)

SHEET_ID_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".sheet_id")
SPREADSHEET_TITLE = "Caveo — Volume de Busca (Keywords)"
SHARE_EMAIL = "matheus.moreira@boomer.com.br"


def read_seeds(path):
    theme_lookup = {}
    keywords = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            keyword = row["keyword"].strip()
            keywords.append(keyword)
            theme_lookup[keyword] = (row["tema"].strip(), row["balde"].strip())
    return keywords, theme_lookup


def main():
    arg_parser = argparse.ArgumentParser()
    arg_parser.add_argument("--seeds", required=True, help="Caminho do CSV tema,balde,keyword")
    arg_parser.add_argument("--tab-name", default=date.today().isoformat())
    args = arg_parser.parse_args()

    keywords, theme_lookup = read_seeds(args.seeds)
    print(f"Consultando volume de busca para {len(keywords)} keywords...")

    config = load_google_ads_config()
    raw_metrics = fetch_historical_metrics(config, keywords)
    rows = sorted_rows(raw_metrics)
    sheet_rows = build_sheet_rows(rows, theme_lookup)

    gc = authorize()
    spreadsheet = get_or_create_spreadsheet(gc, SHEET_ID_FILE, SPREADSHEET_TITLE, SHARE_EMAIL)
    worksheet = get_or_create_worksheet(spreadsheet, args.tab_name)
    written = write_rows(worksheet, sheet_rows)

    print("\nTop 10 por volume médio mensal:")
    for row in rows[:10]:
        print(f"  {row['keyword']:<50} vol={row['avg_monthly_searches']!s:<8} "
              f"conc={row['competition']}")

    print(f"\n{written} linhas gravadas na aba '{args.tab_name}'.")
    print(f"Planilha: https://docs.google.com/spreadsheets/d/{spreadsheet.id}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x scripts/keyword_volume/run.py`

- [ ] **Step 3: Manual smoke test (real network + real Sheets write — not automated)**

Run: `python3 scripts/keyword_volume/run.py --seeds scripts/keyword_volume/seeds_2026-08-04.csv`

Expected:
- No traceback.
- Terminal prints "Consultando volume de busca para 29 keywords...", then a top-10 table, then "N linhas gravadas..." (N should be ≤ 29 — the API may deduplicate close variants, per `GenerateKeywordHistoricalMetricsResult` docs), then a `https://docs.google.com/spreadsheets/...` URL.
- Opening that URL (logged in as `matheus.moreira@boomer.com.br`) shows a spreadsheet titled "Caveo — Volume de Busca (Keywords)" with a tab named after today's date, a header row, and one row per keyword with real `avg_monthly_searches` numbers (not all zero/empty — confirms the account's spend history is producing exact volume, not ranges, as expected from Section 3 of the design doc).
- A `scripts/keyword_volume/.sheet_id` file now exists locally, containing the spreadsheet ID.

If this fails with an authentication/permission error, the error message will name the missing scope/permission — report it back rather than retrying blindly.

- [ ] **Step 4: Commit**

```bash
git add scripts/keyword_volume/run.py
git commit -m "feat(keyword-volume): CLI que junta config/client/parser/sheet"
```

---

## Self-Review Notes

- **Spec coverage:** seeds file (Task 1) ✓, client/API call with verified geo/language/network constants (Task 4) ✓, pure parser with sorting/formatting (Task 2) ✓, dedicated new spreadsheet created+shared on first run (Task 5) ✓, credentials reused without duplication (Task 3, with the `.env` deviation called out explicitly in Global Constraints) ✓, CLI entrypoint (Task 6) ✓, error transparency (Task 6 Step 3 note on auth errors) ✓.
- **Placeholder scan:** no TBD/TODO; every code block is complete and runnable as written.
- **Type consistency:** `client.fetch_historical_metrics` output keys (`keyword`, `avg_monthly_searches`, `competition`, `low_top_of_page_bid_micros`, `high_top_of_page_bid_micros`) match exactly what `parser.sorted_rows` consumes; `parser.sorted_rows` output keys (`keyword`, `avg_monthly_searches`, `competition`, `low_bid_brl`, `high_bid_brl`) match exactly what `sheet.build_sheet_rows` consumes; `sheet.HEADER` column order matches `build_sheet_rows`' row order.
