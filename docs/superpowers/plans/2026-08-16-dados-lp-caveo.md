# Skill `dados-lp-caveo` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatizar a coleta diária de Meta Ads, Google Ads e GA4 para a aba `Dados Landingpage` da planilha de resultados, preenchendo todo dia pendente até D-1 e estendendo a coluna A quando a data ainda não tiver linha.

**Architecture:** Skill em markdown orquestra os MCPs (`meta-ads-mcp`, `google-ads-mcp`, `ga4`) e delega toda a lógica de planilha para `scripts/dados_lp/sheet.py`, um módulo com funções puras testáveis mais uma casca fina de I/O sobre gspread. Segue o padrão de `scripts/acompanhamento_diario/` e `scripts/planilha_resultados/`.

**Tech Stack:** Python 3.9 (o `python3` do sistema), gspread 6.2.1, google-auth, pytest 8.4.2. MCPs já configurados em `.mcp.json`.

**Spec:** `docs/superpowers/specs/2026-08-16-dados-lp-caveo-design.md`

## Global Constraints

- Planilha: `169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw`, aba `Dados Landingpage` (sem espaço entre "Landing" e "page").
- Auth: `.claude/sheets_credentials.json`, scope `https://www.googleapis.com/auth/spreadsheets`.
- Contas: Meta `act_438086148409254`, Google Ads `3921127876`, GA4 host `lp2.caveo.com.br`.
- Colunas graváveis, e **apenas** elas: C, D, E, F (Meta), H, I, J, K (Google), M, N (GA4).
- **Nunca** escrever em B, G, L, O (rótulos) nem P, Q, R, S, T, U, V, W (fórmulas) numa linha já existente.
- Fórmulas do bloco Total Geral, para a linha `r`: `P=H{r}+C{r}`, `Q=I{r}+D{r}`, `R=Q{r}/P{r}`, `S=M{r}`, `T=(K{r}+F{r})/S{r}`, `U=S{r}/Q{r}`, `V=J{r}+E{r}`, `W=V{r}/S{r}`.
- Rótulos fixos: `B="Meta Ads"`, `G="Google Ads"`, `L="GA4"`, `O="Total Geral"`.
- Meta: cliques = `link_click` das `actions` (**não** `clicks`); leads = `lead` das `actions` (**não** `complete_registration`); todas as campanhas da conta.
- Google: cliques = `metrics.clicks`; leads = `metrics.conversions` arredondado; todas as campanhas.
- GA4: só o host `lp2.caveo.com.br`; bounce gravado em **fração decimal** (`0,0088`), não em pontos percentuais.
- Zero explícito: dia processado grava `0` onde não houve ocorrência, nunca branco.
- Primeira linha de dados: linha 2. Datas em `dd/mm/yyyy`, locale `pt_BR`.
- Limite de segurança: no máximo 31 linhas novas por execução.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `scripts/dados_lp/conftest.py` | põe o diretório no `sys.path` para os testes importarem `sheet` direto |
| `scripts/dados_lp/sheet.py` | constantes de layout, leitura da tabela, escolha de datas-alvo, clone de linha, gravação |
| `scripts/dados_lp/test_sheet.py` | testes das funções puras e do fake de worksheet |
| `.claude/skills/dados-lp-caveo.md` | a skill: fases de coleta, preview, confirmação e gravação |
| `docs/projeto-mapa.md` | entrada nova no índice do projeto |

Tudo de planilha mora em `sheet.py`. Não há segundo módulo: a coleta vive na skill (chamadas de MCP), e a lógica de planilha é pequena o bastante para um arquivo só, como nos vizinhos.

---

### Task 1: Leitura da coluna de datas

**Files:**
- Create: `scripts/dados_lp/conftest.py`
- Create: `scripts/dados_lp/sheet.py`
- Test: `scripts/dados_lp/test_sheet.py`

**Interfaces:**
- Consumes: nada.
- Produces: `FIRST_DATA_ROW: int`, `build_date_row_map(col_a: list[str]) -> dict[str, int]` (ISO → nº da linha), `check_consecutive(date_row_map: dict[str, int]) -> list[str]` (datas ISO faltantes).

- [ ] **Step 1: Criar o `conftest.py`**

```python
# Permite `from sheet import ...` nos testes deste diretório.
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
```

- [ ] **Step 2: Escrever os testes que falham**

Criar `scripts/dados_lp/test_sheet.py`:

```python
import pytest

from sheet import build_date_row_map, check_consecutive


def test_build_date_row_map_ignora_cabecalho_e_mapeia_linhas():
    col_a = ["Data", "13/08/2026", "14/08/2026", "15/08/2026"]
    assert build_date_row_map(col_a) == {
        "2026-08-13": 2,
        "2026-08-14": 3,
        "2026-08-15": 4,
    }


def test_build_date_row_map_ignora_celulas_que_nao_sao_data():
    col_a = ["Data", "13/08/2026", "", "TOTAL", "15/08/2026"]
    assert build_date_row_map(col_a) == {"2026-08-13": 2, "2026-08-15": 5}


def test_build_date_row_map_ignora_data_invalida():
    assert build_date_row_map(["Data", "31/02/2026"]) == {}


def test_check_consecutive_aprova_sequencia_integra():
    dmap = {"2026-08-13": 2, "2026-08-14": 3, "2026-08-15": 4}
    assert check_consecutive(dmap) == []


def test_check_consecutive_acha_buraco_no_meio():
    dmap = {"2026-08-13": 2, "2026-08-15": 3}
    assert check_consecutive(dmap) == ["2026-08-14"]


def test_check_consecutive_tabela_vazia_nao_quebra():
    assert check_consecutive({}) == []
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `python3 -m pytest scripts/dados_lp/test_sheet.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'sheet'`

- [ ] **Step 4: Implementar**

Criar `scripts/dados_lp/sheet.py`:

```python
"""Layout da aba 'Dados Landingpage' + leitura/escrita no Google Sheets.

Lógica pura (mapa de datas, escolha de linhas, montagem de células) separada de
uma casca fina de I/O sobre gspread, no padrão de scripts/acompanhamento_diario/.

O contrato central é COLS: ele não contém as colunas de rótulo (B, G, L, O) nem
as de fórmula (P..W), então é estruturalmente impossível esta skill sobrescrever
o bloco Total Geral de uma linha existente.
"""
from datetime import date, timedelta

FIRST_DATA_ROW = 2


def _parse_br_date(text):
    """'13/08/2026' -> '2026-08-13'. Devolve None se não for uma data válida."""
    parts = str(text).strip().split("/")
    if len(parts) != 3:
        return None
    day, month, year = parts
    if not (day.isdigit() and month.isdigit() and year.isdigit()):
        return None
    try:
        return date(int(year), int(month), int(day)).isoformat()
    except ValueError:
        return None


def build_date_row_map(col_a):
    """Coluna A inteira (com cabeçalho) -> {'2026-08-13': 2, ...}.

    Lê a coluna de verdade em vez de assumir um offset fixo: a aba pode ser
    estendida por fora da skill. Células que não são data (cabeçalho, branco,
    rodapé) são ignoradas."""
    out = {}
    for index, raw in enumerate(col_a):
        row = index + 1
        if row < FIRST_DATA_ROW:
            continue
        iso = _parse_br_date(raw)
        if iso is not None:
            out[iso] = row
    return out


def check_consecutive(date_row_map):
    """Datas ISO que faltam para a coluna A ser uma sequência diária íntegra.

    Lista vazia = tabela íntegra. NÃO conserta nada: buraco no meio da tabela é
    anomalia que interrompe a execução, porque inserir linha no meio deslocaria
    as linhas seguintes e quebraria as âncoras das fórmulas P..W."""
    if not date_row_map:
        return []
    present = set(date_row_map)
    cursor = date.fromisoformat(min(present))
    last = date.fromisoformat(max(present))
    expected = set()
    while cursor <= last:
        expected.add(cursor.isoformat())
        cursor += timedelta(days=1)
    return sorted(expected - present)
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `python3 -m pytest scripts/dados_lp/test_sheet.py -v`
Expected: PASS, 6 testes

- [ ] **Step 6: Commit**

```bash
git add scripts/dados_lp/conftest.py scripts/dados_lp/sheet.py scripts/dados_lp/test_sheet.py
git commit -m "feat(dados-lp): mapeia coluna A da aba e detecta buraco na sequência de datas"
```

---

### Task 2: Escolha das datas-alvo

**Files:**
- Modify: `scripts/dados_lp/sheet.py`
- Test: `scripts/dados_lp/test_sheet.py`

**Interfaces:**
- Consumes: `FIRST_DATA_ROW`, `build_date_row_map` da Task 1.
- Produces: `COLS: dict[str, str]`, `row_is_empty(grid_row: list) -> bool`, `pending_dates(date_row_map, grid: dict[int, list], until: str) -> list[str]`, `partial_dates(date_row_map, grid, until) -> list[str]`, `missing_dates(date_row_map, until: str) -> list[str]`.

`grid` é `{nº da linha: valores das colunas C..N}` — exatamente o que `ws.get("C2:N<n>")` devolve, indexado pela linha.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao topo do import em `scripts/dados_lp/test_sheet.py`:

```python
from sheet import (COLS, build_date_row_map, check_consecutive, missing_dates,
                   partial_dates, pending_dates, row_is_empty)
```

E acrescentar ao fim do arquivo:

```python
# Fatias de C..N (índice 0 = C, 11 = N). Atenção: G e L são colunas de RÓTULO e
# vêm sempre preenchidas, mesmo numa linha sem nenhum dado — e o gspread corta
# os vazios do fim, por isso a linha vazia tem só 10 itens.
LINHA_VAZIA = ["", "", "", "", "Google Ads", "", "", "", "", "GA4"]
LINHA_CHEIA = ["36708", "344", "12", "2339,59", "Google Ads", "56623", "3340",
               "140", "3651,51", "GA4", "3365", "2,00%"]
LINHA_PARCIAL = ["36708", "344", "12", "2339,59", "Google Ads", "", "", "", "",
                 "GA4"]


def test_row_is_empty_ignora_rotulos_das_colunas_G_e_L():
    assert row_is_empty(LINHA_VAZIA) is True


def test_row_is_empty_falso_quando_ha_metrica():
    assert row_is_empty(LINHA_CHEIA) is False


def test_row_is_empty_falso_na_linha_parcial():
    assert row_is_empty(LINHA_PARCIAL) is False


def test_pending_dates_pega_so_linhas_vazias_ate_until():
    dmap = {"2026-08-13": 2, "2026-08-14": 3, "2026-08-15": 4, "2026-08-16": 5}
    grid = {2: LINHA_CHEIA, 3: LINHA_VAZIA, 4: LINHA_VAZIA, 5: LINHA_VAZIA}
    assert pending_dates(dmap, grid, "2026-08-15") == ["2026-08-14", "2026-08-15"]


def test_pending_dates_nao_reescreve_linha_parcial():
    dmap = {"2026-08-13": 2}
    assert pending_dates(dmap, {2: LINHA_PARCIAL}, "2026-08-15") == []


def test_partial_dates_avisa_linha_pela_metade():
    dmap = {"2026-08-13": 2}
    assert partial_dates(dmap, {2: LINHA_PARCIAL}, "2026-08-15") == ["2026-08-13"]


def test_partial_dates_ignora_linha_vazia_e_linha_cheia():
    dmap = {"2026-08-13": 2, "2026-08-14": 3}
    grid = {2: LINHA_CHEIA, 3: LINHA_VAZIA}
    assert partial_dates(dmap, grid, "2026-08-15") == []


def test_missing_dates_continua_a_sequencia_diaria():
    dmap = {"2026-10-09": 59, "2026-10-10": 60}
    assert missing_dates(dmap, "2026-10-13") == [
        "2026-10-11", "2026-10-12", "2026-10-13"]


def test_missing_dates_vazio_quando_until_ja_tem_linha():
    assert missing_dates({"2026-10-10": 60}, "2026-08-15") == []


def test_missing_dates_rejeita_coluna_A_vazia():
    with pytest.raises(ValueError):
        missing_dates({}, "2026-08-15")
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `python3 -m pytest scripts/dados_lp/test_sheet.py -v`
Expected: FAIL com `ImportError: cannot import name 'COLS' from 'sheet'`

- [ ] **Step 3: Implementar**

Acrescentar em `scripts/dados_lp/sheet.py`, logo abaixo de `FIRST_DATA_ROW`:

```python
# Métrica -> coluna. A ordem define a ordem dos updates.
# NÃO inclui B, G, L, O (rótulos) nem P..W (fórmulas) — de propósito.
COLS = {
    "meta_impressoes": "C",
    "meta_cliques": "D",
    "meta_leads": "E",
    "meta_invest": "F",
    "google_impressoes": "H",
    "google_cliques": "I",
    "google_leads": "J",
    "google_invest": "K",
    "ga4_sessoes": "M",
    "ga4_bounce": "N",
}

# grid_row é a fatia C..N devolvida pelo gspread: índice 0 = C.
_GRID_FIRST_COL = "C"
```

E acrescentar ao fim do arquivo:

```python
def _filled_count(grid_row):
    """Quantas das dez células graváveis estão preenchidas nessa fatia C..N.

    Olha só as colunas de COLS: G e L carregam rótulo fixo em toda linha e não
    podem contar como 'dado'. O gspread também corta os vazios do fim, então a
    fatia pode vir mais curta que 12 — daí o teste de comprimento."""
    count = 0
    for col in COLS.values():
        index = ord(col) - ord(_GRID_FIRST_COL)
        value = grid_row[index] if index < len(grid_row) else ""
        if str(value).strip() != "":
            count += 1
    return count


def row_is_empty(grid_row):
    """True se nenhuma das dez células graváveis estiver preenchida."""
    return _filled_count(grid_row) == 0


def pending_dates(date_row_map, grid, until):
    """Datas <= until cuja linha existe e está totalmente vazia.

    Linha parcialmente preenchida fica de fora: sobrescrever dado que já está lá
    é decisão do usuário, via o override de $ARGUMENTS."""
    out = []
    for iso in sorted(date_row_map):
        if iso <= until and row_is_empty(grid.get(date_row_map[iso], [])):
            out.append(iso)
    return out


def partial_dates(date_row_map, grid, until):
    """Datas <= until com a linha pela metade. Não são gravadas, mas o preview
    precisa avisar que elas existem."""
    out = []
    for iso in sorted(date_row_map):
        if iso > until:
            continue
        count = _filled_count(grid.get(date_row_map[iso], []))
        if 0 < count < len(COLS):
            out.append(iso)
    return out


def missing_dates(date_row_map, until):
    """Datas <= until posteriores à última data da coluna A, em sequência diária.

    São as linhas que ainda não existem e precisam ser criadas."""
    if not date_row_map:
        raise ValueError("coluna A sem nenhuma data: não há sequência para continuar")
    cursor = date.fromisoformat(max(date_row_map)) + timedelta(days=1)
    end = date.fromisoformat(until)
    out = []
    while cursor <= end:
        out.append(cursor.isoformat())
        cursor += timedelta(days=1)
    return out
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `python3 -m pytest scripts/dados_lp/test_sheet.py -v`
Expected: PASS, 16 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/dados_lp/sheet.py scripts/dados_lp/test_sheet.py
git commit -m "feat(dados-lp): escolhe datas pendentes, parciais e faltantes"
```

---

### Task 3: Clone de linha nova

**Files:**
- Modify: `scripts/dados_lp/sheet.py`
- Test: `scripts/dados_lp/test_sheet.py`

**Interfaces:**
- Consumes: `COLS` da Task 2.
- Produces: `ROW_LABELS: dict[str, str]`, `ROW_FORMULAS: dict[str, str]`, `MAX_NEW_ROWS: int`, `append_rows_payload(first_new_row: int, dates: list[str]) -> list[tuple[str, str]]`.

O payload devolvido é gravado com `USER_ENTERED`, porque tanto a data quanto a fórmula precisam ser interpretadas pelo Sheets.

- [ ] **Step 1: Escrever os testes que falham**

Atualizar o import em `scripts/dados_lp/test_sheet.py`:

```python
from sheet import (COLS, append_rows_payload, build_date_row_map,
                   check_consecutive, missing_dates, partial_dates,
                   pending_dates, row_is_empty)
```

E acrescentar ao fim do arquivo:

```python
def test_append_rows_payload_clona_data_rotulos_e_formulas():
    ups = dict(append_rows_payload(61, ["2026-10-11"]))
    assert ups["A61"] == "11/10/2026"
    assert ups["B61"] == "Meta Ads"
    assert ups["G61"] == "Google Ads"
    assert ups["L61"] == "GA4"
    assert ups["O61"] == "Total Geral"
    assert ups["P61"] == "=H61+C61"
    assert ups["Q61"] == "=I61+D61"
    assert ups["R61"] == "=Q61/P61"
    assert ups["S61"] == "=M61"
    assert ups["T61"] == "=(K61+F61)/S61"
    assert ups["U61"] == "=S61/Q61"
    assert ups["V61"] == "=J61+E61"
    assert ups["W61"] == "=V61/S61"


def test_append_rows_payload_incrementa_a_linha_por_data():
    ups = dict(append_rows_payload(61, ["2026-10-11", "2026-10-12"]))
    assert ups["A62"] == "12/10/2026"
    assert ups["S62"] == "=M62"
    assert ups["T62"] == "=(K62+F62)/S62"


def test_append_rows_payload_nao_grava_nas_colunas_de_metrica():
    ups = dict(append_rows_payload(61, ["2026-10-11"]))
    for col in COLS.values():
        assert f"{col}61" not in ups


def test_append_rows_payload_vazio_quando_nao_ha_data_nova():
    assert append_rows_payload(61, []) == []


def test_append_rows_payload_barra_excesso_de_linhas():
    datas = [f"2026-{m:02d}-01" for m in range(1, 13)] * 3  # 36 datas
    with pytest.raises(ValueError):
        append_rows_payload(61, datas)
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `python3 -m pytest scripts/dados_lp/test_sheet.py -v`
Expected: FAIL com `ImportError: cannot import name 'append_rows_payload' from 'sheet'`

- [ ] **Step 3: Implementar**

Acrescentar em `scripts/dados_lp/sheet.py`, logo abaixo de `COLS`:

```python
# Rótulos fixos que toda linha carrega. Só são escritos ao CRIAR uma linha nova.
ROW_LABELS = {"B": "Meta Ads", "G": "Google Ads", "L": "GA4", "O": "Total Geral"}

# Bloco Total Geral. Só é escrito ao CRIAR uma linha nova, com {r} reancorado.
ROW_FORMULAS = {
    "P": "=H{r}+C{r}",
    "Q": "=I{r}+D{r}",
    "R": "=Q{r}/P{r}",
    "S": "=M{r}",
    "T": "=(K{r}+F{r})/S{r}",
    "U": "=S{r}/Q{r}",
    "V": "=J{r}+E{r}",
    "W": "=V{r}/S{r}",
}

# Guarda contra um `until` errado gerar centenas de linhas.
MAX_NEW_ROWS = 31
```

E acrescentar ao fim do arquivo:

```python
def append_rows_payload(first_new_row, dates):
    """Clone completo de linha para cada data nova, em sequência a partir de
    first_new_row: data na coluna A, rótulos em B/G/L/O e as oito fórmulas do
    bloco Total Geral reancoradas na linha.

    A linha tem que nascer inteira. Uma linha só com a data deixaria CTR, CPS,
    Connect Rate e Tx de conversão em branco para sempre naquele dia.

    Devolve [(A1, valor)] para gravar com USER_ENTERED."""
    if len(dates) > MAX_NEW_ROWS:
        raise ValueError(
            f"{len(dates)} linhas novas excede o limite de {MAX_NEW_ROWS}; "
            "confira o período antes de continuar")
    out = []
    for offset, iso in enumerate(dates):
        row = first_new_row + offset
        year, month, day = iso.split("-")
        out.append((f"A{row}", f"{day}/{month}/{year}"))
        for col, label in ROW_LABELS.items():
            out.append((f"{col}{row}", label))
        for col, template in ROW_FORMULAS.items():
            out.append((f"{col}{row}", template.format(r=row)))
    return out
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `python3 -m pytest scripts/dados_lp/test_sheet.py -v`
Expected: PASS, 21 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/dados_lp/sheet.py scripts/dados_lp/test_sheet.py
git commit -m "feat(dados-lp): clona linha nova com rótulos e fórmulas reancoradas"
```

---

### Task 4: Gravação das métricas

**Files:**
- Modify: `scripts/dados_lp/sheet.py`
- Test: `scripts/dados_lp/test_sheet.py`

**Interfaces:**
- Consumes: `COLS` da Task 2.
- Produces: `cell_updates(row: int, metrics: dict) -> list[tuple[str, object]]`, `write_updates(worksheet, updates, value_input_option="RAW") -> int`.

- [ ] **Step 1: Escrever os testes que falham**

Atualizar o import em `scripts/dados_lp/test_sheet.py`:

```python
from sheet import (COLS, append_rows_payload, build_date_row_map, cell_updates,
                   check_consecutive, missing_dates, partial_dates,
                   pending_dates, row_is_empty, write_updates)
```

E acrescentar ao fim do arquivo:

```python
class FakeWorksheet:
    def __init__(self):
        self.calls = []

    def batch_update(self, body, value_input_option=None):
        self.calls.append((body, value_input_option))


def test_cell_updates_mapeia_as_dez_colunas():
    ups = dict(cell_updates(3, {
        "meta_impressoes": 36710, "meta_cliques": 344, "meta_leads": 12,
        "meta_invest": 2339.59, "google_impressoes": 56642,
        "google_cliques": 3322, "google_leads": 136, "google_invest": 3635.67,
        "ga4_sessoes": 3196, "ga4_bounce": 0.0087609}))
    assert ups == {
        "C3": 36710, "D3": 344, "E3": 12, "F3": 2339.59,
        "H3": 56642, "I3": 3322, "J3": 136, "K3": 3635.67,
        "M3": 3196, "N3": 0.0087609,
    }


def test_cell_updates_nunca_toca_rotulo_nem_formula():
    ups = dict(cell_updates(3, {key: 0 for key in COLS}))
    proibidas = {f"{col}3" for col in
                 ["B", "G", "L", "O", "P", "Q", "R", "S", "T", "U", "V", "W"]}
    assert set(ups) & proibidas == set()


def test_cell_updates_rejeita_chave_desconhecida():
    with pytest.raises(ValueError):
        cell_updates(3, {"meta_impressoes": 1, "total_geral": 99})


def test_cell_updates_mantem_zero_explicito_e_ignora_none():
    ups = dict(cell_updates(3, {"meta_leads": 0, "meta_invest": None}))
    assert ups["E3"] == 0
    assert "F3" not in ups


def test_write_updates_monta_o_body_e_conta_celulas():
    ws = FakeWorksheet()
    total = write_updates(ws, [("C3", 1), ("D3", 2)], value_input_option="RAW")
    assert total == 2
    body, option = ws.calls[0]
    assert body == [{"range": "C3", "values": [[1]]},
                    {"range": "D3", "values": [[2]]}]
    assert option == "RAW"


def test_write_updates_repassa_user_entered():
    ws = FakeWorksheet()
    write_updates(ws, [("A61", "11/10/2026")],
                  value_input_option="USER_ENTERED")
    assert ws.calls[0][1] == "USER_ENTERED"


def test_write_updates_nao_chama_a_api_sem_updates():
    ws = FakeWorksheet()
    assert write_updates(ws, []) == 0
    assert ws.calls == []
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `python3 -m pytest scripts/dados_lp/test_sheet.py -v`
Expected: FAIL com `ImportError: cannot import name 'cell_updates' from 'sheet'`

- [ ] **Step 3: Implementar**

Acrescentar ao fim de `scripts/dados_lp/sheet.py`:

```python
def cell_updates(row, metrics):
    """{chave de COLS: valor} -> [(A1, valor)], só as chaves presentes e
    não-None, na ordem de COLS.

    Chave fora de COLS é erro, não silêncio: é a última barreira contra alguém
    tentar gravar 'total_geral' e acertar uma coluna de fórmula."""
    unknown = set(metrics) - set(COLS)
    if unknown:
        raise ValueError(f"métricas desconhecidas: {sorted(unknown)}")
    out = []
    for key, col in COLS.items():
        value = metrics.get(key)
        if value is not None:
            out.append((f"{col}{row}", value))
    return out


def write_updates(worksheet, updates, value_input_option="RAW"):
    """batch_update numa worksheet gspread. Retorna nº de células gravadas.

    RAW para métricas (número é número). USER_ENTERED para o payload de linha
    nova, onde a data precisa virar serial e a fórmula precisa ser interpretada."""
    body = [{"range": a1, "values": [[value]]} for a1, value in updates]
    if body:
        worksheet.batch_update(body, value_input_option=value_input_option)
    return len(body)
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `python3 -m pytest scripts/dados_lp/test_sheet.py -v`
Expected: PASS, 28 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/dados_lp/sheet.py scripts/dados_lp/test_sheet.py
git commit -m "feat(dados-lp): monta e grava as células de métrica"
```

---

### Task 5: A skill

**Files:**
- Create: `.claude/skills/dados-lp-caveo.md`

**Interfaces:**
- Consumes: todo o módulo `scripts/dados_lp/sheet.py` (Tasks 1–4).
- Produces: o comando `/dados-lp-caveo`.

Esta task não tem teste automatizado — a skill é um documento de instruções. A verificação real dela é a Task 6.

- [ ] **Step 1: Escrever a skill**

Criar `.claude/skills/dados-lp-caveo.md`:

````markdown
---
name: dados-lp-caveo
description: Coleta as métricas diárias de topo de funil da landing page (impressões, cliques, leads e investimento de Meta Ads e Google Ads; sessões e bounce rate do GA4) e grava na aba "Dados Landingpage" da planilha de resultados. Preenche todos os dias pendentes até D-1 e estende a coluna A quando a data ainda não tem linha. Use para atualizar o monitoramento diário da LP.
---

# Skill: Dados Landing Page — Caveo

Coleta diária de topo de funil por **dia × canal** e gravação na aba
`Dados Landingpage`. Preenche **todo dia pendente até D-1**, não só ontem.

## Contas e planilha

| Recurso | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` |
| Google Ads | `3921127876` |
| GA4 | host `lp2.caveo.com.br` |
| Planilha | `169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw`, aba `Dados Landingpage` |
| Auth Sheets | `.claude/sheets_credentials.json` (service account) |
| Helper | `scripts/dados_lp/sheet.py` |

## Réguas de métrica (NÃO alterar de cabeça)

| Coluna | Métrica | Régua |
|---|---|---|
| C | Impressões Meta | soma de `impressions`, todas as campanhas |
| D | Cliques Meta | soma de **`link_click`** em `actions` |
| E | Leads Meta | soma de **`lead`** em `actions` |
| F | Investimento Meta | soma de `spend` |
| H | Impressões Google | soma de `metrics.impressions` |
| I | Cliques Google | soma de `metrics.clicks` |
| J | Leads Google | soma de `metrics.conversions`, arredondado |
| K | Investimento Google | soma de `metrics.cost_micros` / 1e6 |
| M | Sessões GA4 | `sessions` do host `lp2.caveo.com.br` |
| N | Bounce Rate GA4 | `bounceRate` do host `lp2.caveo.com.br`, em fração |

**Duas armadilhas, provadas por reconciliação contra 13/08/2026:**

- Cliques Meta é **`link_click`**, não `clicks`. O campo `clicks` daria 573
  naquele dia; a régua certa dá 344.
- Leads Meta é **`lead`**, não `complete_registration`.
  `complete_registration` daria 9; a régua certa dá 12.

**Esta aba diverge da `/acompanhamento-diario-caveo` de propósito.** Lá, leads
Meta é `complete_registration` e só campanhas `[LEADS]` entram. As duas
planilhas nunca vão bater. Isso é escolha do cliente para esta aba — não
"consertar".

## Colunas proibidas

**B, G, L, O** são rótulos fixos. **P–W** são as fórmulas do bloco Total Geral.
A skill nunca escreve nessas colunas numa linha existente. `COLS` do helper não
as contém, então `cell_updates` é incapaz de acertá-las.

## Zero explícito (regra de ouro)

Todo dia processado grava as **dez métricas com `0`** quando não houve
ocorrência. Célula nunca fica em branco por falta de dado.

Aqui isso é estrutural: "célula vazia" é o sinal de "dia pendente" na Fase 1. Um
dia gravado em branco voltaria como pendente em toda execução seguinte.

## Fase 0 — Alvo

- **Padrão:** `UNTIL = D-1`. A skill descobre sozinha o que está faltando.
- **Override:** `$ARGUMENTS` aceita uma data (`YYYY-MM-DD`) ou um intervalo
  (`YYYY-MM-DD a YYYY-MM-DD`) e, nesse caso, **força a regravação** daquelas
  datas mesmo já preenchidas. Use quando o dado da plataforma tiver assentado
  depois da primeira coleta — o Google Ads reescreve número por até ~3 dias.

## Fase 1 — Reconhecimento da tabela

```python
import sys
sys.path.insert(0, 'scripts/dados_lp')
from sheet import (build_date_row_map, check_consecutive, pending_dates,
                   partial_dates, missing_dates)
import gspread
from google.oauth2.service_account import Credentials

SHEET_ID = '169ePf6svWR0LLT9gwMfl7NJK2FetDvdynccAXhvtgEw'
TAB = 'Dados Landingpage'

creds = Credentials.from_service_account_file(
    '.claude/sheets_credentials.json',
    scopes=['https://www.googleapis.com/auth/spreadsheets'])
ws = gspread.authorize(creds).open_by_key(SHEET_ID).worksheet(TAB)

col_a = ws.col_values(1)
dmap = build_date_row_map(col_a)
grid_rows = ws.get(f'C2:N{len(col_a)}')
grid = {i + 2: row for i, row in enumerate(grid_rows)}

buracos = check_consecutive(dmap)
pendentes = pending_dates(dmap, grid, UNTIL)
parciais = partial_dates(dmap, grid, UNTIL)
faltantes = missing_dates(dmap, UNTIL)
print('buracos:', buracos)
print('pendentes:', pendentes)
print('parciais (serão puladas):', parciais)
print('linhas a criar:', faltantes)
```

**Se `buracos` não estiver vazio: reportar e PARAR.** Buraco no meio da tabela é
anomalia; inserir linha no meio deslocaria as seguintes e quebraria as âncoras
das fórmulas. O usuário decide o que fazer.

Datas-alvo = `pendentes + faltantes` (sem `$ARGUMENTS`), ou exatamente as datas
pedidas + `faltantes` (com `$ARGUMENTS`). Se não houver nada, dizer e parar.

## Fase 2 — Coleta

### 2A. Meta — uma chamada POR DIA

`mcp__meta-ads-mcp__get_insights` com `object_id="act_438086148409254"`,
`level="campaign"`, `time_range={"since": DIA, "until": DIA}`, `limit=100`.

O MCP **ignora `time_increment`** e agrega o range inteiro, por isso uma chamada
por dia. Por dia, somando **todas** as campanhas devolvidas:

- `impressions` → C
- o `value` da action `link_click` → D
- o `value` da action `lead` → E
- `spend` → F

Campanha sem a action na lista contribui com 0 para aquela métrica.

### 2B. Google — uma chamada cobre o intervalo

`mcp__google-ads-mcp__search_search` com `customer_id="3921127876"`,
`resource="campaign"`, fields
`["segments.date","metrics.impressions","metrics.clicks","metrics.cost_micros","metrics.conversions"]`,
conditions `["segments.date BETWEEN '[MENOR_DIA]' AND '[MAIOR_DIA]'"]`.

Agrupar por `segments.date` e somar todas as campanhas: impressões → H,
cliques → I, `conversions` (arredondar só no fim) → J, `cost_micros`/1e6 → K.

### 2C. GA4 — uma chamada cobre o intervalo

`mcp__ga4__ga4_run_report` com `metrics=["sessions","bounceRate"]`,
`dimensions=["date","hostName"]`, `date_start`/`date_end` no intervalo,
`limit=500`.

Filtrar **apenas** `hostName == "lp2.caveo.com.br"`. Descartar
`lp.caveo.com.br` e `welcome.caveo.com.br`.

> A dimensão `date` do GA4 volta como `YYYYMMDD` (ex.: `20260813`), sem hífen —
> converter para ISO antes de casar com as datas-alvo.

Sessões → M. `bounceRate` → N, **em fração** (`0.0088`), porque a célula já é
formatada como porcentagem. Dia sem linha para `lp2` grava `0` em M e N, e é
avisado no preview.

**Se qualquer uma das três fontes falhar, interromper antes de gravar.** Um dia
gravado pela metade confunde o sinal de "pendente" da Fase 1.

## Fase 3 — Preview

Imprimir a tabela data × dez métricas, **mais as células A1 exatas** que serão
gravadas, mais a lista de linhas que serão criadas e das datas parciais puladas.
Então perguntar:

```
Gravar estes dias na aba "Dados Landingpage"? (sim para confirmar)
```

## Fase 4 — Gravação (só após "sim")

**Ordem obrigatória: linhas novas primeiro, métricas depois.** Invertido, a
métrica cairia numa linha que ainda não existe.

```python
from sheet import append_rows_payload, cell_updates, write_updates

# 1) criar as linhas que faltam
if faltantes:
    primeira_nova = max(dmap.values()) + 1
    payload = append_rows_payload(primeira_nova, faltantes)
    write_updates(ws, payload, value_input_option='USER_ENTERED')
    for offset, iso in enumerate(faltantes):
        dmap[iso] = primeira_nova + offset
    print(f'Criadas {len(faltantes)} linhas novas: {", ".join(faltantes)}')

# 2) gravar as métricas
# METRICAS = {iso: {chave de COLS: valor}} — as dez chaves sempre presentes
total = 0
for iso, metrics in sorted(METRICAS.items()):
    total += write_updates(ws, cell_updates(dmap[iso], metrics),
                           value_input_option='RAW')
print(f'Gravadas {total} células.')

# 3) conferir o formato das datas novas
if faltantes:
    linhas = [dmap[iso] for iso in faltantes]
    lidas = ws.get(f'A{min(linhas)}:A{max(linhas)}',
                   value_render_option='UNFORMATTED_VALUE')
    print('coluna A das linhas novas (deve vir número serial):', lidas)
```

Se a releitura devolver **texto** em vez de número serial, a linha nova não
herdou o formato de data — aplicar o formato explicitamente antes de encerrar.

## Fase 5 — Relatório

Dizer quantas células foram gravadas, quantas linhas foram criadas (**com as
datas**, o usuário pediu esse aviso explicitamente), e listar as datas parciais
que foram puladas.
````

- [ ] **Step 2: Conferir que a skill carrega**

Run: `python3 -c "
import re, pathlib
texto = pathlib.Path('.claude/skills/dados-lp-caveo.md').read_text()
assert texto.startswith('---'), 'sem frontmatter'
head = texto.split('---')[1]
assert 'name: dados-lp-caveo' in head, 'name errado'
assert 'description:' in head, 'sem description'
print('frontmatter ok')
"`
Expected: `frontmatter ok`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/dados-lp-caveo.md
git commit -m "feat(dados-lp): skill de coleta diária da aba Dados Landingpage"
```

---

### Task 6: Mapa do projeto e execução real assistida

**Files:**
- Modify: `docs/projeto-mapa.md`
- Test: execução real contra a planilha, com confirmação humana

**Interfaces:**
- Consumes: tudo das Tasks 1–5.
- Produces: nada de código.

> **Nota sobre cobertura:** hoje a coluna A vai até 10/10/2026 e `UNTIL` é
> 2026-08-15, então `missing_dates` devolve lista vazia e o **caminho de criação
> de linha não é exercitado por esta execução real** — ele só dispara depois de
> 10/10/2026. A cobertura dele vem dos testes da Task 3. Não interpretar
> "nenhuma linha criada" como bug.

- [ ] **Step 1: Rodar a suíte inteira**

Run: `python3 -m pytest scripts/dados_lp/ -v`
Expected: PASS, 28 testes

- [ ] **Step 2: Acrescentar a entrada no mapa do projeto**

Abrir `docs/projeto-mapa.md`, localizar a listagem de skills e acrescentar a
linha de `dados-lp-caveo` seguindo exatamente o formato das vizinhas (mesma
tabela ou mesma lista que `acompanhamento-diario-caveo` usa), descrevendo:
coleta diária de Meta/Google/GA4 → aba `Dados Landingpage` da planilha
`169ePf6…`, helper em `scripts/dados_lp/`.

- [ ] **Step 3: Rodar a skill em modo preview**

Invocar `/dados-lp-caveo` sem argumentos. Conferir no preview:

- `buracos` vazio
- `pendentes` = `['2026-08-14', '2026-08-15']`
- `faltantes` = `[]`
- as células A1 do preview caem nas linhas 3 e 4
- nenhuma célula do preview está em B, G, L, O ou P–W

**Não confirmar ainda.**

- [ ] **Step 4: Conferir a régua contra o gabarito**

Rodar a skill com `$ARGUMENTS = 2026-08-13` em modo preview e comparar com a
linha 2, que foi preenchida à mão:

| Célula | Esperado |
|---|---|
| D2 cliques Meta | 344 |
| E2 leads Meta | 12 |
| F2 investimento Meta | 2339,59 |

Se esses três baterem, as réguas do Meta estão certas. **Não confirmar a
gravação** — a linha 2 já está preenchida e não deve ser tocada.

- [ ] **Step 5: Gravar 14/08 e 15/08**

Voltar ao preview sem argumentos e confirmar com "sim". Depois abrir a planilha e
verificar que as linhas 3 e 4 têm as dez métricas e que P3:W3 e P4:W4 calcularam
sozinhas (sem `#DIV/0!`, já que agora há sessões).

- [ ] **Step 6: Commit**

```bash
git add docs/projeto-mapa.md
git commit -m "docs(dados-lp): registra a skill no mapa do projeto"
```

---

## Self-Review

**Cobertura da spec:**

| Requisito da spec | Task |
|---|---|
| Layout da aba, colunas graváveis e proibidas | 2 (`COLS`), 3 (`ROW_LABELS`/`ROW_FORMULAS`) |
| Réguas de métrica Meta/Google/GA4 | 5 (tabela de réguas na skill) |
| Divergência deliberada com `/acompanhamento-diario-caveo` | 5 |
| `build_date_row_map`, `check_consecutive` | 1 |
| `row_is_empty`, `pending_dates`, `missing_dates` | 2 |
| `partial_dates` (aviso de linha pela metade) | 2 |
| `append_rows_payload` | 3 |
| `cell_updates`, `write_updates` | 4 |
| Fases 0–5 da skill, override de `$ARGUMENTS` | 5 |
| Extensão só no fim; buraco no meio interrompe | 1 (detecção), 5 (parada) |
| Clone completo de linha | 3 |
| Aviso obrigatório de linha criada | 5 (Fases 4 e 5) |
| Guarda de 31 linhas | 3 (`MAX_NEW_ROWS`) |
| Verificação de formato de data | 5 (Fase 4, passo 3) |
| Zero explícito | 5 |
| Formato dos valores (fração no bounce) | 5 |
| Falha de fonte interrompe antes de gravar | 5 (Fase 2) |
| Testes | 1–4 |
| Entrada em `docs/projeto-mapa.md` | 6 |

**Placeholders:** nenhum "TBD"/"TODO". Todo passo de código traz o código. O
único passo descritivo é a Task 6 Step 2, que edita um arquivo cujo formato
exato depende do estado atual do mapa — e diz para copiar o formato da vizinha.

**Consistência de tipos:** `date_row_map` é sempre `{ISO: int}`; `grid` é sempre
`{int: list}`; datas circulam sempre em ISO (`YYYY-MM-DD`) e só viram
`dd/mm/yyyy` dentro de `append_rows_payload`; `until` é sempre string ISO.
`write_updates` tem a mesma assinatura nas Tasks 4, 5 e nos testes.
