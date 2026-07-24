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
