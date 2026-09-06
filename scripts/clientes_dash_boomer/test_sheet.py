from datetime import date

import pytest

from sheet import (HEADER, build_row, canal_e_cruzamento, diff_rows,
                    id_row_map, month_bounds_default, parse_period_arg,
                    to_brt_date_str, write_diff)


def test_to_brt_date_str_converte_utc_pro_dia_certo_em_brt():
    # 00:02 UTC = 21:02 do dia anterior em -03:00.
    assert to_brt_date_str("2026-08-18T00:02:43.000+0000") == "17/08/2026"


def test_to_brt_date_str_vazio_quando_sem_data():
    assert to_brt_date_str(None) == ""
    assert to_brt_date_str("") == ""


def test_canal_cpc_direto_meta():
    r = {"UtmSou__c": "facebook", "UtmMed__c": "cpc_cp2_conversao_leads"}
    assert canal_e_cruzamento(r) == ("Meta Ads", False)


def test_canal_cpc_direto_google():
    r = {"UtmSou__c": "google", "UtmMed__c": "cpc"}
    assert canal_e_cruzamento(r) == ("Google/YouTube", False)


def test_canal_cruzamento_meta_via_fbc():
    r = {"UtmSou__c": "bioinsta", "UtmMed__c": "social", "fbc__c": "fb.2.abc"}
    assert canal_e_cruzamento(r) == ("Meta Ads", True)


def test_canal_cruzamento_meta_via_fbclid_quando_sem_fbc():
    r = {"UtmSou__c": None, "UtmMed__c": None, "fbclid__c": "xyz"}
    assert canal_e_cruzamento(r) == ("Meta Ads", True)


def test_canal_cruzamento_google_via_gclid():
    r = {"UtmSou__c": None, "UtmMed__c": None, "gclid__c": "abc"}
    assert canal_e_cruzamento(r) == ("Google/YouTube", True)


def test_canal_cruzamento_meta_tem_prioridade_sobre_google_em_conflito():
    r = {"UtmSou__c": None, "UtmMed__c": None,
         "fbc__c": "fb.2.abc", "gclid__c": "abc"}
    assert canal_e_cruzamento(r) == ("Meta Ads", True)


def test_canal_nao_digital_quando_utm_sou_nao_bate_em_nada():
    r = {"UtmSou__c": "indicacao", "UtmMed__c": "organico"}
    assert canal_e_cruzamento(r) == ("Não Digital", False)


def test_build_row_sem_cruzamento_deixa_descricao_vazia():
    r = {
        "Id": "006abc", "Name": "OP-1 | Fulano", "StageName": "Fechado",
        "IsWon": True, "LastStageChangeDate": "2026-08-08T17:16:03.000+0000",
        "CreatedDate": "2026-08-06T15:56:12.000+0000",
        "UtmSou__c": "google", "UtmMed__c": "cpc", "UtmCam__c": "institucional",
        "UtmCon__c": None, "UtmTer__c": None,
        "gclid__c": None, "gbraid__c": None, "wbraid__c": None,
        "fbclid__c": None, "fbc__c": None,
    }
    row = build_row(r)
    assert len(row) == len(HEADER)
    assert row[0] == "006abc"
    assert row[2] == "Google/YouTube"
    assert row[4] == "TRUE"
    assert row[5] == "08/08/2026"
    assert row[-1] == ""


def test_build_row_cruzamento_preenche_descricao_com_o_sinal_certo():
    r = {
        "Id": "006xyz", "Name": "OP-2 | Ciclana", "StageName": "Fechado",
        "IsWon": True, "LastStageChangeDate": "2026-08-12T10:00:00.000+0000",
        "CreatedDate": "2026-08-01T10:00:00.000+0000",
        "UtmSou__c": None, "UtmMed__c": None, "UtmCam__c": None,
        "UtmCon__c": None, "UtmTer__c": None,
        "gclid__c": "abc123", "gbraid__c": None, "wbraid__c": None,
        "fbclid__c": None, "fbc__c": None,
    }
    row = build_row(r)
    assert row[2] == "Google/YouTube"
    assert "gclid__c" in row[-1]
    assert "cruzamento" in row[-1]


def test_id_row_map_ignora_cabecalho_e_celulas_vazias():
    col_a = ["Id Oportunidade", "006aaa", "", "006bbb"]
    assert id_row_map(col_a) == {"006aaa": 2, "006bbb": 4}


def test_diff_rows_separa_atualizacao_de_novas():
    records = [
        {"Id": "006aaa", "Name": "OP-1", "StageName": "Fechado", "IsWon": True,
         "LastStageChangeDate": None, "CreatedDate": None,
         "UtmSou__c": "google", "UtmMed__c": "cpc"},
        {"Id": "006bbb", "Name": "OP-2", "StageName": "Fechado", "IsWon": True,
         "LastStageChangeDate": None, "CreatedDate": None,
         "UtmSou__c": "google", "UtmMed__c": "cpc"},
    ]
    updates, novas = diff_rows(records, {"006aaa": 5})
    assert [row_num for row_num, _ in updates] == [5]
    assert updates[0][1][0] == "006aaa"
    assert len(novas) == 1
    assert novas[0][0] == "006bbb"


def test_diff_rows_tudo_novo_quando_nao_ha_ids_existentes():
    records = [{"Id": "006ccc", "Name": "OP-3", "StageName": "Fechado",
                "IsWon": True, "LastStageChangeDate": None, "CreatedDate": None,
                "UtmSou__c": "google", "UtmMed__c": "cpc"}]
    updates, novas = diff_rows(records, {})
    assert updates == []
    assert len(novas) == 1


class FakeWorksheet:
    def __init__(self):
        self.batch_calls = []
        self.append_calls = []

    def batch_update(self, body, value_input_option=None):
        self.batch_calls.append((body, value_input_option))

    def append_rows(self, rows, value_input_option=None):
        self.append_calls.append((rows, value_input_option))


def test_write_diff_so_atualiza_quando_ha_updates():
    ws = FakeWorksheet()
    n_upd, n_new = write_diff(ws, [(5, ["006aaa"] + [""] * 17)], [])
    assert (n_upd, n_new) == (1, 0)
    assert ws.batch_calls
    assert not ws.append_calls
    assert ws.batch_calls[0][0][0]["range"] == "A5:R5"


def test_write_diff_so_cria_quando_ha_novas():
    ws = FakeWorksheet()
    n_upd, n_new = write_diff(ws, [], [["006bbb"] + [""] * 17])
    assert (n_upd, n_new) == (0, 1)
    assert not ws.batch_calls
    assert ws.append_calls


def test_write_diff_nao_chama_api_quando_nao_ha_nada():
    ws = FakeWorksheet()
    assert write_diff(ws, [], []) == (0, 0)
    assert not ws.batch_calls and not ws.append_calls


def test_month_bounds_default_meio_do_mes():
    assert month_bounds_default(date(2026, 8, 21)) == (date(2026, 8, 1), date(2026, 8, 20))


def test_month_bounds_default_dia_1_nao_tem_alvo_ainda():
    assert month_bounds_default(date(2026, 8, 1)) is None


def test_parse_period_arg_vazio_usa_padrao():
    assert parse_period_arg("", date(2026, 8, 21)) == (date(2026, 8, 1), date(2026, 8, 20))
    assert parse_period_arg(None, date(2026, 8, 21)) == (date(2026, 8, 1), date(2026, 8, 20))


def test_parse_period_arg_mes_passado_pega_o_mes_inteiro():
    assert parse_period_arg("2026-07", date(2026, 8, 21)) == (date(2026, 7, 1), date(2026, 7, 31))


def test_parse_period_arg_mes_corrente_capa_em_d_menos_1():
    assert parse_period_arg("2026-08", date(2026, 8, 21)) == (date(2026, 8, 1), date(2026, 8, 20))


def test_parse_period_arg_mes_futuro_e_erro():
    with pytest.raises(ValueError):
        parse_period_arg("2026-12", date(2026, 8, 21))


def test_parse_period_arg_intervalo_explicito_nao_capa_em_d_menos_1():
    assert parse_period_arg("2026-08-01 a 2026-08-21", date(2026, 8, 21)) == (
        date(2026, 8, 1), date(2026, 8, 21))


def test_parse_period_arg_intervalo_invertido_e_erro():
    with pytest.raises(ValueError):
        parse_period_arg("2026-08-21 a 2026-08-01", date(2026, 8, 21))
