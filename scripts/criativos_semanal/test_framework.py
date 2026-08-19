from framework import MIN_IMPRESSOES, kpis


def _anuncio(**kw):
    base = {"impressoes": 1000, "views_3s": 250, "p75": 30,
            "link_clicks": 20, "spend": 300.0, "registros": 2}
    base.update(kw)
    return base


def test_piso_de_volume_e_500_impressoes():
    assert MIN_IMPRESSOES == 500


def test_kpis_do_caso_completo():
    k = kpis(_anuncio())
    assert k["hook_rate"] == 0.25            # 250 / 1000
    assert k["hold_rate_hook"] == 0.12       # 30 / 250
    assert k["hold_rate_impr"] == 0.03       # 30 / 1000
    assert k["ctr_link"] == 0.02             # 20 / 1000
    assert k["cpa"] == 150.0                 # 300 / 2


def test_anuncio_estatico_nao_tem_hook_nem_hold():
    # Estático não gera view de vídeo: os dois primeiros níveis não existem.
    k = kpis(_anuncio(views_3s=0, p75=0))
    assert k["hook_rate"] == 0.0
    assert k["hold_rate_hook"] is None       # denominador zero, não é "0%"
    assert k["hold_rate_impr"] == 0.0
    assert k["ctr_link"] == 0.02


def test_sem_registro_o_cpa_e_indefinido_nao_zero():
    # Dividir por zero registro não pode virar CPA 0 (que seria 🟢).
    k = kpis(_anuncio(registros=0))
    assert k["cpa"] is None


def test_sem_impressao_todos_os_kpis_por_impressao_sao_indefinidos():
    k = kpis(_anuncio(impressoes=0, views_3s=0, p75=0, link_clicks=0))
    assert k["hook_rate"] is None
    assert k["ctr_link"] is None
    assert k["hold_rate_impr"] is None
