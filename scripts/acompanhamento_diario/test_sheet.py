import pytest

from sheet import day_to_row, cell_updates, write_updates, read_fechamentos


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


def test_cell_updates_mantem_zero_explicito():
    # 0 é um valor real (zero MQL/SQL/fechamento naquele dia) e deve ser
    # gravado, não tratado como ausente — só None é omitido.
    ups = cell_updates("mm", 1, {"mql_meta": 0, "sql_meta": 0, "fechamento": 0})
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

    def __init__(self, mm_col=None, rf_col=None):
        self.mm_col = mm_col or []
        self.rf_col = rf_col or []

    def get(self, rng):
        if rng.startswith("O46"):
            return [[v] if v != "" else [] for v in self.mm_col]
        if rng.startswith("O88"):
            return [[v] if v != "" else [] for v in self.rf_col]
        raise ValueError(f"range inesperado: {rng}")


def test_read_fechamentos_valores_presentes():
    ws = _FakeReadWS(mm_col=["2", "1", "0"], rf_col=["1", "3"])
    out = read_fechamentos(ws)
    assert out["mm"][1] == 2
    assert out["mm"][2] == 1
    assert out["mm"][3] == 0  # zero explícito é um valor, não ausência
    assert out["rf"][1] == 1
    assert out["rf"][2] == 3


def test_read_fechamentos_dia_vazio_no_meio_e_none():
    ws = _FakeReadWS(mm_col=["2", "1", "", "0", "3"])
    out = read_fechamentos(ws)
    assert out["mm"][3] is None
    assert out["mm"][4] == 0
    assert out["mm"][5] == 3


def test_read_fechamentos_dias_finais_omitidos_pelo_gspread_sao_none():
    ws = _FakeReadWS(mm_col=["2", "1"])  # dias 3..31 nem aparecem na resposta
    out = read_fechamentos(ws)
    assert out["mm"][3] is None
    assert out["mm"][31] is None


def test_read_fechamentos_cobre_dias_1_a_31_nos_dois_segmentos():
    ws = _FakeReadWS()  # planilha totalmente vazia (mês novo)
    out = read_fechamentos(ws)
    assert set(out.keys()) == {"mm", "rf"}
    assert set(out["mm"].keys()) == set(range(1, 32))
    assert all(v is None for v in out["mm"].values())
    assert all(v is None for v in out["rf"].values())
