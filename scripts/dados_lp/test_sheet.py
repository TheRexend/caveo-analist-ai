import pytest

from sheet import (COLS, build_date_row_map, check_consecutive, missing_dates,
                   partial_dates, pending_dates, row_is_empty)


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
