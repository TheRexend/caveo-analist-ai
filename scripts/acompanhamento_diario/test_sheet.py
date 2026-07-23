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
