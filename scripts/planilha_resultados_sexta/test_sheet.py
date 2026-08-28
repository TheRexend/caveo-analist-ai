import pytest

from sheet import (BLOCK_METRIC_COLS, CLEAR_RANGES, COLS, DAY_COLS,
                   cell_updates, day_label_updates, month_changed,
                   month_name, partial_days, pending_days, row_for_day,
                   row_is_empty, write_updates)


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
