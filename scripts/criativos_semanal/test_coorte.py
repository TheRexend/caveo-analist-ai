from datetime import date

from coorte import agrupar, coorte_de, janela

REF = date(2026, 8, 19)   # "hoje" fixo nos testes


def test_janela_cobre_14_dias_terminando_ontem():
    inicio, fim = janela(REF)
    assert inicio == date(2026, 8, 5)
    assert fim == date(2026, 8, 18)
    assert (fim - inicio).days == 13   # 14 dias inclusivos


def test_coorte_madura_e_a_primeira_metade():
    # D-14 a D-8: já passou a fase de aprendizado de 5-7 dias.
    assert coorte_de("2026-08-05T10:00:00-0300", REF) == "madura"
    assert coorte_de("2026-08-11T23:59:00-0300", REF) == "madura"


def test_coorte_recente_e_a_segunda_metade():
    assert coorte_de("2026-08-12T20:37:59-0300", REF) == "recente"
    assert coorte_de("2026-08-18T08:00:00-0300", REF) == "recente"


def test_criativo_de_hoje_esta_fora_da_janela():
    # A janela termina ontem: o dia corrente ainda está incompleto.
    assert coorte_de("2026-08-19T09:00:00-0300", REF) == "fora"


def test_criativo_velho_esta_fora_da_janela():
    assert coorte_de("2026-07-30T09:00:00-0300", REF) == "fora"


def test_agrupar_separa_as_tres_faixas():
    anuncios = [
        {"ad_id": "1", "created_time": "2026-08-06T10:00:00-0300"},
        {"ad_id": "2", "created_time": "2026-08-13T10:00:00-0300"},
        {"ad_id": "3", "created_time": "2026-06-01T10:00:00-0300"},
    ]
    g = agrupar(anuncios, REF)
    assert [a["ad_id"] for a in g["madura"]] == ["1"]
    assert [a["ad_id"] for a in g["recente"]] == ["2"]
    assert [a["ad_id"] for a in g["fora"]] == ["3"]


def test_agrupar_sem_anuncios_devolve_as_tres_chaves_vazias():
    g = agrupar([], REF)
    assert g == {"madura": [], "recente": [], "fora": []}
