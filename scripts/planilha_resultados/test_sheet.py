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
