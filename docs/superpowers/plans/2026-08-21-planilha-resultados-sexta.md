# Skill `planilha-resultados-sexta` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a skill `planilha-resultados` por uma nova skill que coleta Meta Ads, Google Ads, GA4 e Salesforce (MQL/SQL do dia) e grava na aba `Banco de dados - Inside Sales` da planilha `[CAVEO] | Nova Planilha de ROAS e Resultados - Inside Sales`, com backfill retroativo e limpeza automática (com confirmação) na virada de mês.

**Architecture:** Skill em markdown orquestra os MCPs (`meta-ads-mcp`, `google-ads-mcp`, `ga4`) e um script Python local (via `salesforce_mcp_server.py` importado, no padrão do `dados-lp-caveo`), delegando toda a lógica de planilha para `scripts/planilha_resultados_sexta/sheet.py` — funções puras testáveis mais uma casca fina de I/O sobre `gspread`. Diferente dos helpers vizinhos, a linha aqui é o **dia-do-mês (1-31) fixo**, não uma data absoluta que cresce sem fim — por isso não há lógica de "criar linha nova"; existe, em troca, lógica de **virada de mês** (detectar e limpar as linhas recicladas).

**Tech Stack:** Python 3.9 (o `python3` do sistema), gspread 6.2.1, google-auth, pytest 8.4.2. MCPs já configurados em `.mcp.json`.

**Spec:** `docs/superpowers/specs/2026-08-21-planilha-resultados-sexta-design.md`

## Global Constraints

- Planilha: `13Q3c4mGocuEI-yRbMUdiNsXhZhMJX17HOG8JRdcS-ok`. Escrita só na aba `Banco de dados - Inside Sales`. Leitura do mês ativo na aba `Inside Sales`, célula `B1`.
- Auth: `.claude/sheets_credentials.json`, scope `https://www.googleapis.com/auth/spreadsheets` (service account já com acesso de Editor confirmado).
- Contas: Meta `act_438086148409254`, Google Ads `3921127876`, GA4 property `488647966`, Salesforce `caveo.my.salesforce.com`.
- Bloco `meta` (Meta Awareness + Meta Demais Campanhas + GA4): linhas 3-33, uma por dia-do-mês (dia 1 = linha 3, dia 31 = linha 33).
- Bloco `google` (Search + PMax + DGen): linhas 38-68, mesma regra (dia 1 = linha 38, dia 31 = linha 68).
- **Sem segmentação Médico/Formando.** Toda oportunidade que bate com o filtro de canal (fundação, modelo cpc + cruzamento) conta, independente de `TipCte__c`.
- **Fora do escopo:** TikTok Ads, Pinterest Ads, "Vendas"/"Receita"/"Ticket Médio", metas (coluna "Meta" da aba `Inside Sales`) e "Qtd dias do mês atual" — nada disso é lido nem escrito por esta skill.
- Zero explícito: todo dia dentro do período processado grava as métricas com `0` quando não há ocorrência. Célula nunca fica em branco por falta de dado.
- Virada de mês é a única operação destrutiva da skill — **sempre** com confirmação explícita antes de limpar `A3:R33`/`A38:W68`.
- Split Meta Awareness × Demais: por `campaign.objective` (`OUTCOME_AWARENESS` → Awareness; qualquer outro → Demais).
- Split Google Search/PMax/DGen: por `campaign.advertising_channel_type` (`SEARCH`/`PERFORMANCE_MAX`/`DEMAND_GEN`).
- Bucket de MQL/SQL do Google por campanha (Salesforce): via `Opportunity.UtmCam__c`, mapa fixo das 5 campanhas ativas hoje, fallback `"search"` para qualquer slug não mapeado (decisão do cliente, 2026-08-21) — **nunca** inferir por prefixo do slug.
- Leads Meta = `actions[complete_registration]` (fallback `offsite_conversion.fb_pixel_complete_registration`). Leads/Conversões Google = `metrics.conversions`, arredondado no fim.
- MQL/SQL "do dia" = dia da 1ª transição de `OpportunityHistory` que cruza o gate (`scripts/acompanhamento_diario/qualification.py: mql_day/sql_day`, sem alteração).

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `scripts/planilha_resultados_sexta/conftest.py` | põe o diretório no `sys.path` para os testes importarem `sheet` direto |
| `scripts/planilha_resultados_sexta/sheet.py` | layout da aba (dia→linha, colunas), `cell_updates`, detecção de linha vazia/parcial, virada de mês, bucket de campanha Google |
| `scripts/planilha_resultados_sexta/test_sheet.py` | testes das funções puras |
| `.claude/skills/planilha-resultados-sexta.md` | a skill: fases de coleta, cálculo, preview, confirmação e gravação |
| `.claude/commands/planilha-resultados-sexta.md` | invólucro fino de comando de chat |
| `docs/projeto-mapa.md` | troca a entrada de `planilha-resultados` pela nova skill |

**Removidos (aposentadoria da `planilha-resultados`):** `.claude/skills/planilha-resultados.md`, `scripts/planilha_resultados/` (inteiro), `.claude/commands/planilha-resultados.md`.

Tudo de planilha mora em `sheet.py`, no padrão de `scripts/dados_lp/sheet.py` — um módulo só, pois a lógica é pequena o bastante.

---

### Task 1: Mapeamento de colunas e escrita de célula

**Files:**
- Create: `scripts/planilha_resultados_sexta/conftest.py`
- Create: `scripts/planilha_resultados_sexta/sheet.py`
- Test: `scripts/planilha_resultados_sexta/test_sheet.py`

**Interfaces:**
- Consumes: nada.
- Produces: `FIRST_ROW: dict[str, int]`, `LAST_ROW: dict[str, int]`, `DAY_COLS: dict[str, tuple]`, `COLS: dict[str, tuple[str, str]]`, `row_for_day(block: str, day: int) -> int`, `cell_updates(day: int, metrics: dict) -> list[tuple[str, object]]`, `day_label_updates(day: int) -> list[tuple[str, object]]`, `write_updates(worksheet, updates, value_input_option="RAW") -> int`.

- [ ] **Step 1: Criar o `conftest.py`**

```python
# Permite `from sheet import ...` nos testes deste diretório.
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
```

- [ ] **Step 2: Escrever os testes que falham**

Criar `scripts/planilha_resultados_sexta/test_sheet.py`:

```python
import pytest

from sheet import COLS, DAY_COLS, cell_updates, day_label_updates, row_for_day, write_updates


def test_row_for_day_bloco_meta_dia_1_e_dia_31():
    assert row_for_day("meta", 1) == 3
    assert row_for_day("meta", 31) == 33


def test_row_for_day_bloco_google_dia_1_e_dia_31():
    assert row_for_day("google", 1) == 38
    assert row_for_day("google", 31) == 68


def test_row_for_day_rejeita_bloco_invalido():
    with pytest.raises(ValueError):
        row_for_day("tiktok", 1)


def test_row_for_day_rejeita_dia_fora_do_intervalo():
    with pytest.raises(ValueError):
        row_for_day("meta", 0)
    with pytest.raises(ValueError):
        row_for_day("meta", 32)


def test_cell_updates_mapeia_todas_as_trinta_e_uma_colunas():
    metrics = {
        "meta_aw_invest": 1, "meta_aw_alcance": 2, "meta_aw_impressoes": 3,
        "meta_aw_seguidores": 4, "meta_invest": 5, "meta_alcance": 6,
        "meta_impressoes": 7, "meta_cliques": 8, "meta_lpv": 9,
        "meta_leads": 10, "meta_mql": 11, "meta_sql": 12, "ga4_sessoes": 13,
        "google_search_invest": 14, "google_search_impressoes": 15,
        "google_search_cliques": 16, "google_search_conv": 17,
        "google_search_mql": 18, "google_search_sql": 19,
        "google_pmax_invest": 20, "google_pmax_impressoes": 21,
        "google_pmax_cliques": 22, "google_pmax_conv": 23,
        "google_pmax_mql": 24, "google_pmax_sql": 25,
        "google_dgen_invest": 26, "google_dgen_impressoes": 27,
        "google_dgen_cliques": 28, "google_dgen_conv": 29, "google_dgen_mql": 30,
        "google_dgen_sql": 31,
    }
    ups = dict(cell_updates(1, metrics))
    assert ups == {
        "B3": 1, "C3": 2, "D3": 3, "E3": 4, "H3": 5, "I3": 6, "J3": 7,
        "K3": 8, "L3": 9, "M3": 10, "N3": 11, "O3": 12, "R3": 13,
        "B38": 14, "C38": 15, "D38": 16, "E38": 17, "F38": 18, "G38": 19,
        "J38": 20, "K38": 21, "L38": 22, "M38": 23, "N38": 24, "O38": 25,
        "R38": 26, "S38": 27, "T38": 28, "U38": 29, "V38": 30, "W38": 31,
    }


def test_cell_updates_rejeita_chave_desconhecida():
    with pytest.raises(ValueError):
        cell_updates(1, {"meta_invest": 1, "receita": 99})


def test_cell_updates_mantem_zero_explicito_e_ignora_none():
    ups = dict(cell_updates(1, {"meta_leads": 0, "meta_invest": None}))
    assert ups["M3"] == 0
    assert "H3" not in ups


def test_cell_updates_nunca_toca_colunas_de_day_nem_espacador():
    ups = dict(cell_updates(1, {key: 0 for key in COLS}))
    proibidas = {"A3", "F3", "G3", "P3", "Q3", "A38", "H38", "I38", "P38", "Q38"}
    assert set(ups) & proibidas == set()


def test_day_label_updates_grava_as_tres_colunas_de_cada_bloco():
    ups = dict(day_label_updates(5))
    assert ups == {"A7": 5, "G7": 5, "Q7": 5, "A42": 5, "I42": 5, "Q42": 5}


def test_day_cols_tem_exatamente_tres_colunas_por_bloco():
    assert DAY_COLS == {"meta": ("A", "G", "Q"), "google": ("A", "I", "Q")}


class FakeWorksheet:
    def __init__(self):
        self.calls = []

    def batch_update(self, body, value_input_option=None):
        self.calls.append((body, value_input_option))


def test_write_updates_monta_o_body_e_conta_celulas():
    ws = FakeWorksheet()
    total = write_updates(ws, [("B3", 1), ("C3", 2)], value_input_option="RAW")
    assert total == 2
    body, option = ws.calls[0]
    assert body == [{"range": "B3", "values": [[1]]},
                    {"range": "C3", "values": [[2]]}]
    assert option == "RAW"


def test_write_updates_nao_chama_a_api_sem_updates():
    ws = FakeWorksheet()
    assert write_updates(ws, []) == 0
    assert ws.calls == []
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `python3 -m pytest scripts/planilha_resultados_sexta/test_sheet.py -v`
Expected: FAIL com `ModuleNotFoundError: No module named 'sheet'`

- [ ] **Step 4: Implementar**

Criar `scripts/planilha_resultados_sexta/sheet.py`:

```python
"""Layout da aba "Banco de dados - Inside Sales" (skill planilha-resultados-sexta).

Diferente de scripts/dados_lp/sheet.py: aqui a linha é o DIA-DO-MÊS (1-31),
fixo por bloco — não uma data absoluta que cresce sem fim. O bloco "meta"
(Meta Ads Awareness + Demais Campanhas + GA4) ocupa as linhas 3-33; o bloco
"google" (Search + PMax + DGen) ocupa as linhas 38-68. As mesmas 31 linhas
são recicladas todo mês — não há lógica de "criar linha nova" aqui.
"""

FIRST_ROW = {"meta": 3, "google": 38}
LAST_ROW = {"meta": 33, "google": 68}

# "Day" (dia-do-mês) — uma coluna por sub-seção do bloco. Escritas junto com
# as métricas em toda gravação: são idempotentes (dia N é sempre dia N), não
# precisam de um caminho especial de "linha nova" como em scripts/dados_lp.
DAY_COLS = {"meta": ("A", "G", "Q"), "google": ("A", "I", "Q")}

# Métrica -> (bloco, coluna). NÃO inclui as colunas de "Day" (DAY_COLS) nem os
# espaçadores em branco (F/P no bloco meta, H/P no bloco google) — de
# propósito, pra cell_updates nunca poder acertá-los.
COLS = {
    "meta_aw_invest": ("meta", "B"),
    "meta_aw_alcance": ("meta", "C"),
    "meta_aw_impressoes": ("meta", "D"),
    "meta_aw_seguidores": ("meta", "E"),
    "meta_invest": ("meta", "H"),
    "meta_alcance": ("meta", "I"),
    "meta_impressoes": ("meta", "J"),
    "meta_cliques": ("meta", "K"),
    "meta_lpv": ("meta", "L"),
    "meta_leads": ("meta", "M"),
    "meta_mql": ("meta", "N"),
    "meta_sql": ("meta", "O"),
    "ga4_sessoes": ("meta", "R"),
    "google_search_invest": ("google", "B"),
    "google_search_impressoes": ("google", "C"),
    "google_search_cliques": ("google", "D"),
    "google_search_conv": ("google", "E"),
    "google_search_mql": ("google", "F"),
    "google_search_sql": ("google", "G"),
    "google_pmax_invest": ("google", "J"),
    "google_pmax_impressoes": ("google", "K"),
    "google_pmax_cliques": ("google", "L"),
    "google_pmax_conv": ("google", "M"),
    "google_pmax_mql": ("google", "N"),
    "google_pmax_sql": ("google", "O"),
    "google_dgen_invest": ("google", "R"),
    "google_dgen_impressoes": ("google", "S"),
    "google_dgen_cliques": ("google", "T"),
    "google_dgen_conv": ("google", "U"),
    "google_dgen_mql": ("google", "V"),
    "google_dgen_sql": ("google", "W"),
}


def row_for_day(block, day):
    """Dia-do-mês (1-31) -> nº da linha, dentro do bloco ("meta" ou "google")."""
    if block not in FIRST_ROW:
        raise ValueError(f"bloco inválido: {block!r} (use 'meta' ou 'google')")
    if not 1 <= day <= 31:
        raise ValueError(f"dia inválido: {day!r} (use 1-31)")
    return FIRST_ROW[block] + day - 1


def cell_updates(day, metrics):
    """{chave de COLS: valor} -> [(A1, valor)], só as chaves presentes e
    não-None, na ordem de COLS.

    Chave fora de COLS é erro, não silêncio — é a barreira contra alguém
    tentar gravar numa coluna de "Day" ou de espaçador."""
    unknown = set(metrics) - set(COLS)
    if unknown:
        raise ValueError(f"métricas desconhecidas: {sorted(unknown)}")
    out = []
    for key, (block, col) in COLS.items():
        value = metrics.get(key)
        if value is not None:
            out.append((f"{col}{row_for_day(block, day)}", value))
    return out


def day_label_updates(day):
    """Dia -> [(A1, dia)] pras três colunas "Day" de cada bloco.

    Idempotente: dia N é sempre dia N, então é seguro gravar junto com as
    métricas em toda execução, não só na primeira vez que a linha recebe dado."""
    out = []
    for block, cols in DAY_COLS.items():
        row = row_for_day(block, day)
        for col in cols:
            out.append((f"{col}{row}", day))
    return out


def write_updates(worksheet, updates, value_input_option="RAW"):
    """batch_update numa worksheet gspread. Retorna nº de células gravadas."""
    body = [{"range": a1, "values": [[value]]} for a1, value in updates]
    if body:
        worksheet.batch_update(body, value_input_option=value_input_option)
    return len(body)
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `python3 -m pytest scripts/planilha_resultados_sexta/test_sheet.py -v`
Expected: PASS, 12 testes

- [ ] **Step 6: Commit**

```bash
git add scripts/planilha_resultados_sexta/conftest.py scripts/planilha_resultados_sexta/sheet.py scripts/planilha_resultados_sexta/test_sheet.py
git commit -m "feat(planilha-resultados-sexta): mapeia colunas e grava células por dia-do-mês"
```

---

### Task 2: Detecção de linha vazia/parcial

**Files:**
- Modify: `scripts/planilha_resultados_sexta/sheet.py`
- Test: `scripts/planilha_resultados_sexta/test_sheet.py`

**Interfaces:**
- Consumes: `COLS`, `row_for_day` da Task 1.
- Produces: `BLOCK_METRIC_COLS: dict[str, set[str]]`, `row_is_empty(block: str, grid_row: list) -> bool`, `pending_days(block: str, grid: dict[int, list], until_day: int) -> list[int]`, `partial_days(block: str, grid: dict[int, list], until_day: int) -> list[int]`.

`grid` é `{nº da linha: valores da linha, começando na coluna A}` — o que
`ws.get(f'A{FIRST_ROW[block]}:{END_COL}{LAST_ROW[block]}')` devolve, indexado
pelo número real da linha.

- [ ] **Step 1: Escrever os testes que falham**

Atualizar o import em `scripts/planilha_resultados_sexta/test_sheet.py`:

```python
from sheet import (BLOCK_METRIC_COLS, COLS, DAY_COLS, cell_updates,
                   day_label_updates, partial_days, pending_days,
                   row_for_day, row_is_empty, write_updates)
```

E acrescentar ao fim do arquivo:

```python
def test_block_metric_cols_bate_com_as_colunas_de_cols():
    assert BLOCK_METRIC_COLS["meta"] == {
        "B", "C", "D", "E", "H", "I", "J", "K", "L", "M", "N", "O", "R"}
    assert BLOCK_METRIC_COLS["google"] == {
        "B", "C", "D", "E", "F", "G", "J", "K", "L", "M", "N", "O",
        "R", "S", "T", "U", "V", "W"}


# Linhas do bloco "meta" (A..R, índice 0 = A). Day cols (A/G/Q) preenchidas
# com "1" mesmo na linha "vazia" — só as 13 colunas de métrica importam.
META_LINHA_VAZIA = ["1", "", "", "", "", "", "1", "", "", "", "", "", "", "", "", "", "1", ""]
META_LINHA_CHEIA = ["1", "10", "10", "10", "10", "", "1", "10", "10", "10", "10", "10", "10", "10", "10", "", "1", "10"]
META_LINHA_PARCIAL = ["1", "10", "10", "10", "10", "", "1", "", "", "", "", "", "", "", "", "", "1", ""]

# Linhas do bloco "google" (A..W, índice 0 = A).
GOOGLE_LINHA_VAZIA = ["1", "", "", "", "", "", "", "", "1", "", "", "", "", "", "", "", "1", "", "", "", "", "", ""]
GOOGLE_LINHA_CHEIA = ["1", "5", "5", "5", "5", "5", "5", "", "1", "5", "5", "5", "5", "5", "5", "", "1", "5", "5", "5", "5", "5", "5"]
GOOGLE_LINHA_PARCIAL = ["1", "5", "5", "5", "5", "5", "5", "", "1", "", "", "", "", "", "", "", "1", "", "", "", "", "", ""]


def test_row_is_empty_ignora_colunas_de_day_e_espacador():
    assert row_is_empty("meta", META_LINHA_VAZIA) is True
    assert row_is_empty("google", GOOGLE_LINHA_VAZIA) is True


def test_row_is_empty_falso_quando_ha_metrica():
    assert row_is_empty("meta", META_LINHA_CHEIA) is False
    assert row_is_empty("google", GOOGLE_LINHA_CHEIA) is False


def test_row_is_empty_falso_na_linha_parcial():
    assert row_is_empty("meta", META_LINHA_PARCIAL) is False
    assert row_is_empty("google", GOOGLE_LINHA_PARCIAL) is False


def test_pending_days_pega_so_linhas_vazias_ate_until():
    grid = {3: META_LINHA_CHEIA, 4: META_LINHA_VAZIA, 5: META_LINHA_VAZIA}
    assert pending_days("meta", grid, 3) == [2, 3]


def test_pending_days_nao_reescreve_linha_parcial():
    grid = {3: META_LINHA_PARCIAL}
    assert pending_days("meta", grid, 1) == []


def test_partial_days_avisa_linha_pela_metade():
    grid = {3: META_LINHA_PARCIAL}
    assert partial_days("meta", grid, 1) == [1]


def test_partial_days_ignora_linha_vazia_e_linha_cheia():
    grid = {3: META_LINHA_CHEIA, 4: META_LINHA_VAZIA}
    assert partial_days("meta", grid, 2) == []


def test_pending_e_partial_days_bloco_google():
    grid = {38: GOOGLE_LINHA_PARCIAL, 39: GOOGLE_LINHA_VAZIA}
    assert pending_days("google", grid, 2) == [2]
    assert partial_days("google", grid, 2) == [1]


def test_pending_days_trata_dia_sem_linha_no_grid_como_vazio():
    assert pending_days("meta", {}, 2) == [1, 2]
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `python3 -m pytest scripts/planilha_resultados_sexta/test_sheet.py -v`
Expected: FAIL com `ImportError: cannot import name 'BLOCK_METRIC_COLS' from 'sheet'`

- [ ] **Step 3: Implementar**

Acrescentar em `scripts/planilha_resultados_sexta/sheet.py`, logo abaixo de `COLS`:

```python
# Colunas de métrica por bloco, derivadas de COLS — usadas pra saber quais
# células checar ao decidir se uma linha está vazia/parcial/cheia.
BLOCK_METRIC_COLS = {}
for _key, (_block, _col) in COLS.items():
    BLOCK_METRIC_COLS.setdefault(_block, set()).add(_col)
del _key, _block, _col
```

E acrescentar ao fim do arquivo:

```python
def _filled_count(block, grid_row):
    """Quantas das colunas de métrica do bloco estão preenchidas nessa linha
    (fatia A.., índice 0 = A). Ignora "Day" e espaçadores de propósito —
    essas colunas vêm sempre preenchidas (ou vazias) independente de haver
    dado real na linha."""
    count = 0
    for col in BLOCK_METRIC_COLS[block]:
        index = ord(col) - ord("A")
        value = grid_row[index] if index < len(grid_row) else ""
        if str(value).strip() != "":
            count += 1
    return count


def row_is_empty(block, grid_row):
    """True se nenhuma das colunas de métrica do bloco estiver preenchida."""
    return _filled_count(block, grid_row) == 0


def pending_days(block, grid, until_day):
    """Dias 1..until_day cuja linha está totalmente vazia (ou nem existe
    ainda no `grid` lido — mesma coisa, célula em branco é célula em branco).

    Linha parcialmente preenchida fica de fora: sobrescrever dado que já está
    lá é decisão do usuário, via override de $ARGUMENTS na skill."""
    return [day for day in range(1, until_day + 1)
            if row_is_empty(block, grid.get(row_for_day(block, day), []))]


def partial_days(block, grid, until_day):
    """Dias 1..until_day com a linha pela metade. Não são gravados, mas o
    preview precisa avisar que existem."""
    total = len(BLOCK_METRIC_COLS[block])
    out = []
    for day in range(1, until_day + 1):
        count = _filled_count(block, grid.get(row_for_day(block, day), []))
        if 0 < count < total:
            out.append(day)
    return out
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `python3 -m pytest scripts/planilha_resultados_sexta/test_sheet.py -v`
Expected: PASS, 22 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/planilha_resultados_sexta/sheet.py scripts/planilha_resultados_sexta/test_sheet.py
git commit -m "feat(planilha-resultados-sexta): detecta dias pendentes e parciais por bloco"
```

---

### Task 3: Virada de mês

**Files:**
- Modify: `scripts/planilha_resultados_sexta/sheet.py`
- Test: `scripts/planilha_resultados_sexta/test_sheet.py`

**Interfaces:**
- Consumes: nada das tasks anteriores (lógica independente).
- Produces: `MESES_PT: list[str]`, `month_name(month_number: int) -> str`, `month_changed(active_label: str, month_number: int) -> bool`, `CLEAR_RANGES: dict[str, str]`.

- [ ] **Step 1: Escrever os testes que falham**

Atualizar o import em `scripts/planilha_resultados_sexta/test_sheet.py`:

```python
from sheet import (BLOCK_METRIC_COLS, CLEAR_RANGES, COLS, DAY_COLS,
                   cell_updates, day_label_updates, month_changed,
                   month_name, partial_days, pending_days, row_for_day,
                   row_is_empty, write_updates)
```

E acrescentar ao fim do arquivo:

```python
def test_month_name_mapeia_janeiro_agosto_dezembro():
    assert month_name(1) == "JANEIRO"
    assert month_name(8) == "AGOSTO"
    assert month_name(12) == "DEZEMBRO"


def test_month_name_rejeita_fora_do_intervalo():
    with pytest.raises(ValueError):
        month_name(0)
    with pytest.raises(ValueError):
        month_name(13)


def test_month_changed_false_quando_bate_ignorando_caixa_e_espaco():
    assert month_changed(" Agosto ", 8) is False


def test_month_changed_true_quando_mes_diferente():
    assert month_changed("JULHO", 8) is True


def test_clear_ranges_cobre_exatamente_os_dois_blocos():
    assert CLEAR_RANGES == {"meta": "A3:R33", "google": "A38:W68"}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `python3 -m pytest scripts/planilha_resultados_sexta/test_sheet.py -v`
Expected: FAIL com `ImportError: cannot import name 'month_name' from 'sheet'`

- [ ] **Step 3: Implementar**

Acrescentar ao fim de `scripts/planilha_resultados_sexta/sheet.py`:

```python
MESES_PT = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
            "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"]


def month_name(month_number):
    """1-12 -> nome do mês em maiúsculo, pt-BR — bate com o rótulo manual da
    aba "Inside Sales"!B1 (ex. "AGOSTO")."""
    if not 1 <= month_number <= 12:
        raise ValueError(f"mês inválido: {month_number!r} (use 1-12)")
    return MESES_PT[month_number - 1]


def month_changed(active_label, month_number):
    """True se o rótulo de mês ativo na planilha for diferente do mês
    corrente — sinal para limpar o "Banco de dados" antes de gravar."""
    return active_label.strip().upper() != month_name(month_number)


# Ranges a limpar na virada de mês — as colunas graváveis + "Day" dos dois
# blocos. Nunca cobre TikTok/Pinterest (fora do escopo desta skill).
CLEAR_RANGES = {"meta": "A3:R33", "google": "A38:W68"}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `python3 -m pytest scripts/planilha_resultados_sexta/test_sheet.py -v`
Expected: PASS, 27 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/planilha_resultados_sexta/sheet.py scripts/planilha_resultados_sexta/test_sheet.py
git commit -m "feat(planilha-resultados-sexta): detecta virada de mês e define ranges de limpeza"
```

---

### Task 4: Bucket de campanha Google para o cruzamento de Salesforce

**Files:**
- Modify: `scripts/planilha_resultados_sexta/sheet.py`
- Test: `scripts/planilha_resultados_sexta/test_sheet.py`

**Interfaces:**
- Consumes: nada das tasks anteriores.
- Produces: `UTMCAM_TO_GOOGLE_TYPE: dict[str, str]`, `DEFAULT_GOOGLE_TYPE: str`, `google_channel_bucket(utmcam: str | None) -> str`.

- [ ] **Step 1: Escrever os testes que falham**

Atualizar o import em `scripts/planilha_resultados_sexta/test_sheet.py` acrescentando `google_channel_bucket`, e adicionar ao fim do arquivo:

```python
def test_google_channel_bucket_mapeia_campanhas_ativas():
    assert google_channel_bucket("institucional") == "search"
    assert google_channel_bucket("search_aberturaPJ") == "search"
    assert google_channel_bucket("search_contabilidade") == "search"
    assert google_channel_bucket("pmax_funcionalidade") == "pmax"
    assert google_channel_bucket("pmax_oferta") == "pmax"


def test_google_channel_bucket_ignora_caixa():
    assert google_channel_bucket("PMAX_OFERTA") == "pmax"


def test_google_channel_bucket_fallback_para_slug_desconhecido():
    assert google_channel_bucket("cnpj_medico") == "search"
    assert google_channel_bucket("contabilidade_nivel_brasil") == "search"


def test_google_channel_bucket_nao_infere_por_prefixo():
    """Decisão do cliente (2026-08-21): slug de campanha antiga/reestruturada
    cai no fallback "search", mesmo tendo prefixo "pmax_" — não adivinhar."""
    assert google_channel_bucket("pmax_plataforma_financeira_medicopj_2") == "search"


def test_google_channel_bucket_fallback_para_none():
    assert google_channel_bucket(None) == "search"
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `python3 -m pytest scripts/planilha_resultados_sexta/test_sheet.py -v`
Expected: FAIL com `ImportError: cannot import name 'google_channel_bucket' from 'sheet'`

- [ ] **Step 3: Implementar**

Acrescentar ao fim de `scripts/planilha_resultados_sexta/sheet.py`:

```python
# Mapa Opportunity.UtmCam__c (slug interno do Salesforce) -> tipo de
# campanha Google, só pras 5 campanhas ATIVAS hoje (2026-08-21):
#   institucional              -> BOO - Search - Institucional
#   search_aberturaPJ          -> BOO - Search - Abertura PJ
#   search_contabilidade       -> BOO - Search - Contabilidade Médica
#   pmax_funcionalidade        -> BOO - Pmax - Funcionalidades
#   pmax_oferta                -> BOO - Pmax - Oferta
# Revisar sempre que a conta Google Ads for reestruturada — mesmo problema
# que já quebrou o GOOGLE_UTMCAM_ALIAS da antiga skill planilha-resultados.
UTMCAM_TO_GOOGLE_TYPE = {
    "institucional": "search",
    "search_aberturapj": "search",
    "search_contabilidade": "search",
    "pmax_funcionalidade": "pmax",
    "pmax_oferta": "pmax",
}

# Decisão do cliente (2026-08-21): UtmCam__c de campanha antiga/reestruturada
# sem mapeamento conhecido cai em "search" — não descartar o número do
# dashboard, e não inferir por prefixo do slug (ver teste de regressão).
DEFAULT_GOOGLE_TYPE = "search"


def google_channel_bucket(utmcam):
    """Slug de Opportunity.UtmCam__c -> "search"/"pmax"/"dgen".

    None ou slug sem mapeamento conhecido -> DEFAULT_GOOGLE_TYPE."""
    if utmcam is None:
        return DEFAULT_GOOGLE_TYPE
    return UTMCAM_TO_GOOGLE_TYPE.get(utmcam.strip().lower(), DEFAULT_GOOGLE_TYPE)
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `python3 -m pytest scripts/planilha_resultados_sexta/test_sheet.py -v`
Expected: PASS, 32 testes

- [ ] **Step 5: Commit**

```bash
git add scripts/planilha_resultados_sexta/sheet.py scripts/planilha_resultados_sexta/test_sheet.py
git commit -m "feat(planilha-resultados-sexta): mapeia UtmCam__c pro tipo de campanha Google"
```

---

### Task 5: A skill e o comando de chat

**Files:**
- Create: `.claude/skills/planilha-resultados-sexta.md`
- Create: `.claude/commands/planilha-resultados-sexta.md`

**Interfaces:**
- Consumes: todo o módulo `scripts/planilha_resultados_sexta/sheet.py` (Tasks 1-4); `scripts/acompanhamento_diario/qualification.py` (`mql_day`, `sql_day`); `.claude/salesforce_mcp_server.py` (`sf_query_all`).
- Produces: o comando `/planilha-resultados-sexta`.

Esta task não tem teste automatizado de pytest — a skill é um documento de
instruções. A verificação real dela é a Task 6.

- [ ] **Step 1: Escrever a skill**

Criar `.claude/skills/planilha-resultados-sexta.md`:

````markdown
---
name: planilha-resultados-sexta
description: Coleta dados consolidados de Meta Ads, Google Ads, GA4 e Salesforce (MQL/SQL do dia) e grava na aba "Banco de dados - Inside Sales" da planilha "[CAVEO] | Nova Planilha de ROAS e Resultados". Preenche retroativo os dias-do-mês pendentes, sem segmentação por Médico/Formando. Detecta e limpa (com confirmação) a virada de mês. Use para atualizar o dashboard de ROAS e Resultados.
---

# Skill: Planilha de Resultados (Sexta) — Caveo

Coleta por **dia-do-mês × canal** e grava na aba `Banco de dados - Inside
Sales`. Substitui a skill `planilha-resultados` (aposentada). **Sem
segmentação Médico/Formando** — todo número é o total de mídia paga
atribuída ao canal.

## Contas e planilha

| Recurso | Identificador |
|---|---|
| Meta Ads | `act_438086148409254` |
| Google Ads | `3921127876` |
| GA4 | property `488647966` |
| Salesforce | `caveo.my.salesforce.com` |
| Planilha | `13Q3c4mGocuEI-yRbMUdiNsXhZhMJX17HOG8JRdcS-ok` |
| Aba de escrita | `Banco de dados - Inside Sales` |
| Aba de leitura (mês ativo) | `Inside Sales`, célula `B1` |
| Auth Sheets | `.claude/sheets_credentials.json` (service account `reporte-ka-sheets@caveo-496716.iam.gserviceaccount.com`) |
| Helper | `scripts/planilha_resultados_sexta/sheet.py` |

## Fundação (LER ANTES DE QUALQUER SOQL)

Canal pago (Meta/Google) usa o modelo **cpc + cruzamento** de
`docs/fundacao-dados.md` (seção "Fragmentos SOQL prontos"), fuso `-03:00` —
os fragmentos completos estão na Fase 2D. MQL/SQL usam `QUALIFICATION_RULES`
(fundação seção 7) via `from qualification import mql_day, sql_day`
(`scripts/acompanhamento_diario/qualification.py`) — **nunca reimplementar**.
**Sem `classify_contratante`/`allocate`** — esta skill não segmenta.

## Réguas de métrica (NÃO alterar de cabeça)

### Meta Ads — split por `objective`

`OUTCOME_AWARENESS` → bloco Awareness; qualquer outro objective → bloco
Demais Campanhas.

| Coluna | Chave | Régua |
|---|---|---|
| B (Awareness) | `meta_aw_invest` | `spend` |
| C (Awareness) | `meta_aw_alcance` | `reach` |
| D (Awareness) | `meta_aw_impressoes` | `impressions` |
| E (Awareness) | `meta_aw_seguidores` | sem métrica de Ads Insights — **gravar sempre 0** (ver "Pontos de Atenção") |
| H (Demais) | `meta_invest` | `spend` |
| I (Demais) | `meta_alcance` | `reach` |
| J (Demais) | `meta_impressoes` | `impressions` |
| K (Demais) | `meta_cliques` | `actions[link_click]` |
| L (Demais) | `meta_lpv` | `actions[landing_page_view]` |
| M (Demais) | `meta_leads` | `actions[complete_registration]` (fallback `offsite_conversion.fb_pixel_complete_registration`) — "Registro Concluído", **não** `lead`/`onsite_web_lead` |
| N (Demais) | `meta_mql` | Salesforce — dia da 1ª transição que cruza o gate MQL, opps atribuídas a Meta |
| O (Demais) | `meta_sql` | Salesforce — idem, gate SQL |

### Google Ads — split por `campaign.advertising_channel_type`

`SEARCH` → Search; `PERFORMANCE_MAX` → PMax; `DEMAND_GEN` → DGen. Hoje a
conta só tem Search e PMax ativas — o bloco DGen fica zerado até existir uma
campanha desse tipo.

| Coluna | Chave (Search / PMax / DGen) | Régua |
|---|---|---|
| B / J / R | `*_invest` | `metrics.cost_micros / 1_000_000` |
| C / K / S | `*_impressoes` | `metrics.impressions` |
| D / L / T | `*_cliques` | `metrics.clicks` |
| E / M / U | `*_conv` | `metrics.conversions` (arredondar no fim — faz o papel de "Leads") |
| F / N / V | `*_mql` | Salesforce — dia da 1ª transição que cruza o gate MQL, bucket pelo tipo de campanha (ver Fase 2D) |
| G / O / W | `*_sql` | Salesforce — idem, gate SQL |

### GA4

| Coluna | Chave | Régua |
|---|---|---|
| R (bloco meta) | `ga4_sessoes` | `sessions` do property `488647966`, total do site (sem filtro de página) |

## Colunas fora do alcance da skill

TikTok Ads (linhas 74-104) e Pinterest Ads (linhas 109-139): a aba `Inside
Sales` já tem fórmulas apontando pra lá, mas nem o cabeçalho existe no
`Banco de dados` — a Caveo não anuncia nesses canais hoje. **Nunca criar
nem escrever nesses blocos.** "Vendas"/"Receita"/"Ticket Médio" e a coluna
"Meta" (metas) da aba `Inside Sales`: preenchimento manual do time
comercial/cliente — **nunca tocar**.

## Zero explícito (regra de ouro)

Todo dia dentro do período processado grava as métricas com `0` quando não
houve ocorrência. Célula nunca fica em branco por falta de dado — "célula
vazia" é o sinal de "dia pendente" na Fase 1.

## Fase 0 — Alvo

- **Padrão:** `UNTIL_DAY = dia-do-mês de D-1` (ou o último dia do mês
  corrente, se D-1 já for mês passado). Calcular com `calendar.monthrange`.
- **Override:** `$ARGUMENTS` aceita um dia-do-mês (`1`-`31`) e, nesse caso,
  **força a regravação** daquele dia mesmo já preenchido.
- Informar: `Coletando de 01 a [UNTIL_DAY] de [MÊS]...`

## Fase 0.5 — Virada de mês (checar toda execução, ação destrutiva)

```python
import gspread
from google.oauth2.service_account import Credentials
import sys
sys.path.insert(0, 'scripts/planilha_resultados_sexta')
from sheet import CLEAR_RANGES, month_changed, month_name

SHEET_ID = '13Q3c4mGocuEI-yRbMUdiNsXhZhMJX17HOG8JRdcS-ok'

creds = Credentials.from_service_account_file(
    '.claude/sheets_credentials.json',
    scopes=['https://www.googleapis.com/auth/spreadsheets'])
gc = gspread.authorize(creds)
sh = gc.open_by_key(SHEET_ID)
inside_sales = sh.worksheet('Inside Sales')
banco = sh.worksheet('Banco de dados - Inside Sales')

active_label = inside_sales.acell('B1').value or ''
mudou = month_changed(active_label, HOJE.month)  # HOJE = date.today()
print('rótulo atual:', active_label, '| mês corrente:', HOJE.month, '| mudou:', mudou)
```

**Se `mudou` for `True`:** avisar o usuário exatamente assim e PARAR até
confirmação:

```
A planilha ainda está no mês [rótulo atual], mas hoje é [mês corrente]. Preciso
limpar as linhas 3-33 e 38-68 do "Banco de dados" antes de gravar o mês novo.
Confirma a limpeza? (sim para confirmar)
```

Só após "sim":

```python
for rng in CLEAR_RANGES.values():
    banco.batch_clear([rng])
inside_sales.update_acell('B1', month_name(HOJE.month))
print('Limpeza feita, mês atualizado para', month_name(HOJE.month))
```

**Se `mudou` for `False`:** seguir direto para a Fase 1, sem tocar em nada.

## Fase 1 — Reconhecimento

```python
grid_meta = {r + 3: row for r, row in enumerate(banco.get('A3:R33'))}
grid_google = {r + 38: row for r, row in enumerate(banco.get('A38:W68'))}

from sheet import partial_days, pending_days

pendentes = sorted(set(pending_days('meta', grid_meta, UNTIL_DAY))
                   | set(pending_days('google', grid_google, UNTIL_DAY)))
parciais = sorted(set(partial_days('meta', grid_meta, UNTIL_DAY))
                  | set(partial_days('google', grid_google, UNTIL_DAY)))
dias_alvo = [d for d in pendentes if d not in parciais]
print('pendentes:', pendentes)
print('parciais (serão pulados):', parciais)
print('dias-alvo:', dias_alvo)
```

Com `$ARGUMENTS = dia`: `dias_alvo = [dia]` direto, ignorando pendente/parcial
(força regravação). Se `dias_alvo` vier vazio (sem override), avisar e parar.

## Fase 2 — Coleta (para cada dia de `dias_alvo`, `MIN_DIA`/`MAX_DIA` = extremos)

### 2A. Meta — objetivo das campanhas (uma chamada) + insights (uma chamada POR DIA)

`mcp__meta-ads-mcp__get_campaigns` com `account_id="act_438086148409254"`,
`status_filter=""`, `limit=200` → construir `objetivo_por_campanha = {id:
objective}`.

Para cada dia em `dias_alvo`: `mcp__meta-ads-mcp__get_insights` com
`object_id="act_438086148409254"`, `level="campaign"`,
`time_range={"since": DIA, "until": DIA}`, `limit=100` (uma chamada por dia —
o MCP ignora `time_increment` e agrega o range inteiro).

Por linha (campanha) do dia: olhar `objetivo_por_campanha[campaign_id]`. Se
`"OUTCOME_AWARENESS"`: somar `spend`→`meta_aw_invest`, `reach`→`meta_aw_alcance`,
`impressions`→`meta_aw_impressoes`. Caso contrário: somar `spend`→`meta_invest`,
`reach`→`meta_alcance`, `impressions`→`meta_impressoes`, o `value` da action
`link_click`→`meta_cliques`, o `value` da action `landing_page_view`→`meta_lpv`,
o `value` da action `complete_registration` (fallback
`offsite_conversion.fb_pixel_complete_registration`)→`meta_leads`.
`meta_aw_seguidores` = sempre `0` (ver Pontos de Atenção).

### 2B. Google — uma chamada cobre `MIN_DIA`-`MAX_DIA`

`mcp__google-ads-mcp__search_search` com `customer_id="3921127876"`,
`resource="campaign"`, fields `["campaign.id",
"campaign.advertising_channel_type", "segments.date", "metrics.cost_micros",
"metrics.impressions", "metrics.clicks", "metrics.conversions"]`, conditions
`["segments.date BETWEEN '[MIN_DIA]' AND '[MAX_DIA]'"]`.

Por linha: bucket = `"search"` se `advertising_channel_type == "SEARCH"`,
`"pmax"` se `"PERFORMANCE_MAX"`, `"dgen"` se `"DEMAND_GEN"` — qualquer outro
valor é inesperado hoje; **avisar e não gravar** essa linha, não adivinhar.
Agrupar por `(segments.date, bucket)` e somar: `cost_micros`/1e6 →
`google_{bucket}_invest`, `impressions` → `google_{bucket}_impressoes`,
`clicks` → `google_{bucket}_cliques`, `conversions` (arredondar só no fim) →
`google_{bucket}_conv`.

### 2C. GA4 — uma chamada cobre `MIN_DIA`-`MAX_DIA`

`mcp__ga4__ga4_run_report` com `metrics=["sessions"]`, `dimensions=["date"]`,
`date_start`/`date_end` no intervalo, `limit=500`. A dimensão `date` volta
como `YYYYMMDD` — converter pra dia-do-mês antes de casar com `dias_alvo`.

### 2D. Salesforce — MQL/SQL por dia × canal (rodar num script Python, não pelo MCP tool)

```python
import json, io, os, sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

os.environ.update(json.load(io.open('.mcp.json'))
                  ['mcpServers']['salesforce-mcp']['env'])
sys.path.insert(0, '.claude')
sys.path.insert(0, 'scripts/acompanhamento_diario')
sys.path.insert(0, 'scripts/planilha_resultados_sexta')
import salesforce_mcp_server as sf
from qualification import mql_day, sql_day
from sheet import google_channel_bucket

BR = timezone(timedelta(hours=-3))
YEAR_MONTH = f'{ANO:04d}-{MES:02d}'  # ANO/MES = mês corrente sendo processado

def dia_br(ts):
    """'2026-08-18T00:02:43.000+0000' -> '2026-08-17' (dia em -03:00)."""
    return datetime.strptime(ts, '%Y-%m-%dT%H:%M:%S.%f%z').astimezone(BR).date().isoformat()

def dia_do_mes_se_no_periodo(iso_date):
    """ISO date -> dia-do-mês, só se cair no mês corrente sendo processado.
    Sem esse filtro, uma transição de julho com dia-do-mês 5 seria confundida
    com o dia 5 de agosto — os dois meses reciclam os mesmos números de linha."""
    if iso_date is not None and iso_date.startswith(YEAR_MONTH):
        return int(iso_date[8:10])
    return None

# Fragmentos cpc + cruzamento da fundação, OR-combinados e prefixados com
# "Opportunity." (obrigatório em OpportunityHistory).
HIST_FRAG = {
    'meta': ("((Opportunity.UtmMed__c LIKE '%cpc%' AND (NOT Opportunity.UtmSou__c LIKE '%google%')) "
             "OR ((Opportunity.UtmMed__c = null OR (NOT Opportunity.UtmMed__c LIKE '%cpc%')) "
             "AND (Opportunity.fbc__c != null OR Opportunity.fbclid__c != null)))"),
    'google': ("((Opportunity.UtmMed__c LIKE '%cpc%' AND Opportunity.UtmSou__c LIKE '%google%') "
               "OR ((Opportunity.UtmMed__c = null OR (NOT Opportunity.UtmMed__c LIKE '%cpc%')) "
               "AND (Opportunity.gclid__c != null OR Opportunity.gbraid__c != null) "
               "AND Opportunity.fbc__c = null AND Opportunity.fbclid__c = null))"),
}

# acc[dia] = {"meta_mql": 0, "meta_sql": 0, "google_search_mql": 0, ...} —
# zero explícito pré-carregado pra todo dia em dias_alvo antes de acumular.
acc = {d: {k: 0 for k in (
    'meta_mql', 'meta_sql', 'google_search_mql', 'google_search_sql',
    'google_pmax_mql', 'google_pmax_sql', 'google_dgen_mql', 'google_dgen_sql')}
    for d in dias_alvo}

LOOKBACK = f'{ANO - 1:04d}-{MES:02d}-01'  # 12 meses antes do início do mês

for canal in ('meta', 'google'):
    res = sf.sf_query_all(
        "SELECT OpportunityId, StageName, CreatedDate, "
        "Opportunity.IsWon, Opportunity.UtmCam__c "
        "FROM OpportunityHistory "
        f"WHERE Opportunity.CreatedDate >= {LOOKBACK}T00:00:00-03:00 "
        f"AND Opportunity.CreatedDate <= {MAX_DIA_ISO}T23:59:59-03:00 "
        f"AND {HIST_FRAG[canal]} ORDER BY OpportunityId, CreatedDate",
        max_records=50000)
    opps = defaultdict(lambda: {'history': [], 'is_won': False, 'utmcam': None})
    for r in res['records']:
        o = opps[r['OpportunityId']]
        o['history'].append({'stage': r['StageName'], 'date': dia_br(r['CreatedDate'])})
        o['is_won'] = (bool((r.get('Opportunity') or {}).get('IsWon'))
                       or r['StageName'] == 'Ganho não Identificado' or o['is_won'])
        if o['utmcam'] is None:
            o['utmcam'] = (r.get('Opportunity') or {}).get('UtmCam__c')
    for o in opps.values():
        prefixo = canal if canal == 'meta' else f"google_{google_channel_bucket(o['utmcam'])}"
        d_mql = dia_do_mes_se_no_periodo(mql_day(o['history'], o['is_won']))
        d_sql = dia_do_mes_se_no_periodo(sql_day(o['history'], o['is_won']))
        if d_mql in acc: acc[d_mql][f'{prefixo}_mql'] += 1
        if d_sql in acc: acc[d_sql][f'{prefixo}_sql'] += 1
```

**Se qualquer uma das quatro fontes falhar, interromper antes de gravar.**

## Fase 3 — Cálculo e preview

Combinar 2A-2D em `METRICAS = {dia: {chave de COLS: valor}}`, garantindo as
30 chaves sempre presentes (zero explícito). Imprimir a tabela dia × 30
métricas e as células A1 exatas que serão gravadas
(`cell_updates`/`day_label_updates`). Então perguntar:

```
Gravar estes dias na aba "Banco de dados - Inside Sales"? (sim para confirmar)
```

## Fase 4 — Gravação (só após "sim")

```python
from sheet import cell_updates, day_label_updates, write_updates

total = 0
for dia, metrics in sorted(METRICAS.items()):
    total += write_updates(banco, day_label_updates(dia), value_input_option='RAW')
    total += write_updates(banco, cell_updates(dia, metrics), value_input_option='RAW')
print(f'Gravadas {total} células.')
```

## Fase 5 — Relatório

Dizer se houve virada de mês (e o que foi limpo), quantas células foram
gravadas, e listar os dias parciais que foram pulados.

## Pontos de Atenção

- **"Seguidores" (Awareness) não tem métrica de Ads Insights nativa** — é
  dado de Page Insights, API diferente. Gravar sempre `0` até existir uma
  campanha `OUTCOME_AWARENESS` ativa que permita validar a fonte certa.
- **Sem segmentação.** Não importar `classify_contratante`/`allocate` — toda
  oportunidade que bate com `[FILTRO_META]`/`[FILTRO_GOOGLE]` conta, mesmo
  Revalida ou `TipCte__c` vazio.
- **`UTMCAM_TO_GOOGLE_TYPE` cobre só as 5 campanhas ativas hoje** — revisar
  se a conta Google Ads mudar de estrutura (mesmo problema que já quebrou o
  alias da antiga `planilha-resultados`).
- **Virada de mês é destrutiva** — nunca limpar `Banco de dados` sem
  confirmação explícita.
- **Fuso:** Salesforce devolve datas em UTC; sempre converter pra `-03:00`
  antes de extrair o dia (`dia_br`).
- **`dia_do_mes_se_no_periodo` é obrigatório** no cruzamento de Salesforce —
  sem ele, uma transição de um mês anterior com o mesmo dia-do-mês seria
  contada na linha errada.
````

- [ ] **Step 2: Conferir que a skill carrega**

Run: `python3 -c "
import pathlib
texto = pathlib.Path('.claude/skills/planilha-resultados-sexta.md').read_text()
assert texto.startswith('---'), 'sem frontmatter'
head = texto.split('---')[1]
assert 'name: planilha-resultados-sexta' in head, 'name errado'
assert 'description:' in head, 'sem description'
print('frontmatter ok')
"`
Expected: `frontmatter ok`

- [ ] **Step 3: Criar o comando de chat**

Criar `.claude/commands/planilha-resultados-sexta.md`:

```markdown
---
description: Coleta Meta+Google+GA4+Salesforce → aba "Banco de dados - Inside Sales" da nova planilha de ROAS e Resultados
argument-hint: [dia-do-mês opcional 1-31]
---

Invoque a skill `planilha-resultados-sexta` para esta tarefa. Argumentos do usuário (se houver): $ARGUMENTS
```

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/planilha-resultados-sexta.md .claude/commands/planilha-resultados-sexta.md
git commit -m "feat(planilha-resultados-sexta): skill de coleta e o comando de chat"
```

---

### Task 6: Aposentar `planilha-resultados`, atualizar o mapa e rodar de verdade

**Files:**
- Delete: `.claude/skills/planilha-resultados.md`
- Delete: `scripts/planilha_resultados/` (inteiro, incl. testes)
- Delete: `.claude/commands/planilha-resultados.md`
- Modify: `docs/projeto-mapa.md`
- Test: execução real contra a planilha, com confirmação humana

**Interfaces:**
- Consumes: tudo das Tasks 1-5.
- Produces: nada de código.

- [ ] **Step 1: Rodar a suíte inteira do helper novo**

Run: `python3 -m pytest scripts/planilha_resultados_sexta/ -v`
Expected: PASS, 32 testes

- [ ] **Step 2: Remover a skill antiga**

```bash
git rm .claude/skills/planilha-resultados.md .claude/commands/planilha-resultados.md
git rm -r scripts/planilha_resultados/
```

- [ ] **Step 3: Atualizar o mapa do projeto**

Abrir `docs/projeto-mapa.md`, localizar a linha de `planilha-resultados.md`
na árvore de skills e trocá-la pela entrada de `planilha-resultados-sexta.md`
(mesmo formato das vizinhas), descrevendo: coleta diária de Meta/Google/GA4/
Salesforce (sem segmentação) → aba `Banco de dados - Inside Sales` da nova
planilha de ROAS, helper em `scripts/planilha_resultados_sexta/`, e uma nota
de que substitui a antiga `planilha-resultados` (aposentada em 2026-08-21).

- [ ] **Step 4: Rodar a skill em modo preview**

Invocar `/planilha-resultados-sexta` sem argumentos. Conferir no preview:

- a checagem de virada de mês roda e reporta corretamente (mês da planilha
  bate com agosto/2026, então não deve pedir confirmação de limpeza)
- `dias-alvo` cobre do dia 1 até o dia-do-mês de ontem
- nenhuma célula do preview cai em `A`, `F`, `G`, `P`, `Q` (bloco meta) ou
  `A`, `H`, `I`, `P`, `Q` (bloco google)

**Não confirmar ainda.**

- [ ] **Step 5: Conferir a régua contra um dia conhecido**

Rodar a skill com `$ARGUMENTS = 13` (13 de agosto) em modo preview e conferir
manualmente contra `mcp__meta-ads-mcp__get_insights` e
`mcp__google-ads-mcp__search_search` chamados direto pro mesmo dia — os
totais de investimento/impressões/cliques devem bater exatamente.

- [ ] **Step 6: Gravar os dias pendentes**

Voltar ao preview sem `$ARGUMENTS` e confirmar com "sim". Depois abrir a
planilha e verificar que as linhas escritas têm as métricas certas e que a
aba `Inside Sales` (100% fórmula) atualizou os totais de `SUM` sem
`#REF!`/`#DIV/0!` novos.

- [ ] **Step 7: Commit**

```bash
git add docs/projeto-mapa.md
git commit -m "feat(planilha-resultados-sexta): aposenta planilha-resultados e registra a skill nova no mapa"
```

---

## Self-Review

**Cobertura da spec:**

| Requisito da spec | Task |
|---|---|
| Layout da aba, dia-do-mês → linha, colunas por bloco | 1 |
| Colunas proibidas (Day/espaçadores nunca graváveis) | 1 |
| Detecção de dia pendente/parcial | 2 |
| Virada de mês (detectar + limpar com confirmação) | 3, skill Fase 0.5 |
| Bucket Google Search/PMax/DGen (ad spend, via API) | skill Fase 2B |
| Bucket Google Search/PMax/DGen (MQL/SQL, via UtmCam__c) | 4 |
| Split Meta Awareness × Demais (via objective) | skill Fase 2A |
| MQL/SQL "do dia", sem segmentação | skill Fase 2D |
| Fora do escopo (TikTok/Pinterest/Vendas/Metas) | skill (seção dedicada) |
| Zero explícito | skill Fase 3 |
| Retirada da `planilha-resultados` | 6 |
| Testes | 1-4 |
| Entrada em `docs/projeto-mapa.md` | 6 |

**Placeholders:** nenhum "TBD"/"TODO". O único passo descritivo é a Task 6
Step 3, que edita um arquivo cujo formato exato depende do estado atual do
mapa — e diz para copiar o formato das entradas vizinhas.

**Consistência de tipos:** `grid` é sempre `{int: list}` (linha → valores
desde a coluna A); dias circulam sempre como `int` (1-31), nunca como string
ou data ISO; `block` é sempre `"meta"` ou `"google"`; `write_updates` tem a
mesma assinatura em todas as tasks. `google_channel_bucket` devolve sempre
uma das três strings `"search"`/`"pmax"`/`"dgen"`, nunca `None`.
