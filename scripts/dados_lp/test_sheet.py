import pytest

from sheet import (BOUNCE_FORMAT, COLS, append_rows_payload,
                   build_date_row_map, cell_updates, check_consecutive,
                   ensure_bounce_format, missing_dates, partial_dates,
                   pending_dates, row_is_empty, write_updates)


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


# Fatias de C..T (índice 0 = C, 17 = T). Atenção: J (7) e R (15) são colunas de
# RÓTULO e vêm sempre preenchidas, mesmo numa linha sem nenhum dado — e o gspread
# corta os vazios do fim, por isso a linha vazia para no rótulo de GA4.
LINHA_VAZIA = ["", "", "", "", "", "", "", "Google Ads",
               "", "", "", "", "", "", "", "GA4"]
LINHA_CHEIA = ["36708", "344", "12", "2339,59", "8", "3", "1", "Google Ads",
               "56623", "3340", "140", "3651,51", "20", "6", "2", "GA4",
               "3365", "2,00%"]
# O parcial de verdade desde 2026-08-18: plataforma e GA4 gravados, as seis
# colunas de Salesforce (G/H/I e O/P/Q) ainda vazias.
LINHA_PARCIAL = ["36708", "344", "12", "2339,59", "", "", "", "Google Ads",
                 "56623", "3340", "140", "3651,51", "", "", "", "GA4",
                 "3365", "2,00%"]


def test_row_is_empty_ignora_rotulos_das_colunas_J_e_R():
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


def test_partial_dates_pega_dia_sem_as_colunas_de_salesforce():
    """O estado exato das linhas 2..6 quando F/G/H e O/P/Q foram criadas."""
    dmap = {"2026-08-13": 2}
    assert partial_dates(dmap, {2: LINHA_PARCIAL}, "2026-08-13") == ["2026-08-13"]
    assert pending_dates(dmap, {2: LINHA_PARCIAL}, "2026-08-13") == []


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


def test_append_rows_payload_clona_data_rotulos_e_formulas():
    ups = dict(append_rows_payload(61, ["2026-10-11"]))
    assert ups["A61"] == "11/10/2026"
    assert ups["B61"] == "Meta Ads"
    assert ups["J61"] == "Google Ads"
    assert ups["R61"] == "GA4"
    assert ups["U61"] == "Total Geral"
    assert ups["V61"] == "=K61+C61"
    assert ups["W61"] == "=L61+D61"
    assert ups["X61"] == "=W61/V61"
    assert ups["Y61"] == "=S61"
    assert ups["Z61"] == "=(N61+F61)/Y61"
    assert ups["AA61"] == "=Y61/W61"
    assert ups["AB61"] == "=M61+E61"
    assert ups["AC61"] == "=AB61/Y61"
    assert ups["AD61"] == "=G61+O61"
    assert ups["AE61"] == "=H61+P61"
    assert ups["AF61"] == "=I61+Q61"


def test_append_rows_payload_incrementa_a_linha_por_data():
    ups = dict(append_rows_payload(61, ["2026-10-11", "2026-10-12"]))
    assert ups["A62"] == "12/10/2026"
    assert ups["Y62"] == "=S62"
    assert ups["Z62"] == "=(N62+F62)/Y62"
    assert ups["AF62"] == "=I62+Q62"


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


class FakeWorksheet:
    def __init__(self):
        self.calls = []

    def batch_update(self, body, value_input_option=None):
        self.calls.append((body, value_input_option))


def test_cell_updates_mapeia_as_dezesseis_colunas():
    ups = dict(cell_updates(3, {
        "meta_impressoes": 36710, "meta_cliques": 344, "meta_leads": 12,
        "meta_invest": 2339.59, "meta_mql": 8, "meta_sql": 3,
        "meta_fechamentos": 1, "google_impressoes": 56642,
        "google_cliques": 3322, "google_leads": 136, "google_invest": 3635.67,
        "google_mql": 20, "google_sql": 6, "google_fechamentos": 2,
        "ga4_sessoes": 3196, "ga4_bounce": 0.0087609}))
    assert ups == {
        "C3": 36710, "D3": 344, "E3": 12, "F3": 2339.59,
        "G3": 8, "H3": 3, "I3": 1,
        "K3": 56642, "L3": 3322, "M3": 136, "N3": 3635.67,
        "O3": 20, "P3": 6, "Q3": 2,
        "S3": 3196, "T3": 0.0087609,
    }


def test_cell_updates_aceita_so_o_bloco_de_salesforce():
    """Backfill cirúrgico: não toca nas células de plataforma já gravadas."""
    ups = dict(cell_updates(2, {"meta_mql": 8, "meta_sql": 3,
                                "meta_fechamentos": 1, "google_mql": 20,
                                "google_sql": 6, "google_fechamentos": 2}))
    assert ups == {"G2": 8, "H2": 3, "I2": 1, "O2": 20, "P2": 6, "Q2": 2}


def test_cell_updates_nunca_toca_rotulo_nem_formula():
    ups = dict(cell_updates(3, {key: 0 for key in COLS}))
    proibidas = {f"{col}3" for col in
                 ["B", "J", "R", "U", "V", "W", "X", "Y", "Z",
                  "AA", "AB", "AC", "AD", "AE", "AF"]}
    assert set(ups) & proibidas == set()


def test_cell_updates_rejeita_chave_desconhecida():
    with pytest.raises(ValueError):
        cell_updates(3, {"meta_impressoes": 1, "total_geral": 99})


def test_cell_updates_mantem_zero_explicito_e_ignora_none():
    ups = dict(cell_updates(3, {"meta_leads": 0, "meta_invest": None}))
    assert ups["E3"] == 0
    assert "F3" not in ups


def test_investimento_meta_e_a_coluna_F_nao_a_I():
    """Regressão: a I é fechamentos Meta. Trocar as duas some com a venda e
    joga dinheiro na coluna de resultado."""
    ups = dict(cell_updates(3, {"meta_invest": 1757.0, "meta_fechamentos": 1}))
    assert ups == {"F3": 1757.0, "I3": 1}


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


class FakeFormattableWorksheet:
    def __init__(self):
        self.formats = []

    def format(self, cell_range, cell_format):
        self.formats.append((cell_range, cell_format))


def test_ensure_bounce_format_aplica_percentual_na_coluna_T():
    ws = FakeFormattableWorksheet()
    assert ensure_bounce_format(ws, 3, 60) == "T3:T60"
    assert ws.formats == [("T3:T60", BOUNCE_FORMAT)]


def test_bounce_format_e_o_mesmo_da_linha_preenchida_a_mao():
    assert BOUNCE_FORMAT == {
        "numberFormat": {"type": "PERCENT", "pattern": "0.00%"}}


def test_ensure_bounce_format_ignora_intervalo_vazio():
    ws = FakeFormattableWorksheet()
    assert ensure_bounce_format(ws, 5, 4) is None
    assert ws.formats == []
