from framework import (MIN_IMPRESSOES, avaliar, kpis, nivel_quebrado,
                       status)


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


def test_status_usa_faixa_como_piso_acima_da_faixa_e_verde():
    assert status("hook_rate", 0.25) == "verde"
    assert status("hook_rate", 0.18) == "amarelo"
    assert status("hook_rate", 0.14) == "vermelho"


def test_hook_rate_nas_bordas_exatas_da_faixa():
    # As bordas pertencem ao amarelo: 15% não é crítico e 20% ainda não é bom.
    assert status("hook_rate", 0.15) == "amarelo"
    assert status("hook_rate", 0.20) == "amarelo"
    assert status("hook_rate", 0.2001) == "verde"
    assert status("hook_rate", 0.1499) == "vermelho"


def test_status_do_cpa_e_invertido():
    # CPA alto é ruim: a escala anda ao contrário dos outros três KPIs.
    assert status("cpa", 120.0) == "verde"
    assert status("cpa", 145.0) == "amarelo"
    assert status("cpa", 180.0) == "vermelho"


def test_status_indefinido_e_na():
    assert status("hold_rate_hook", None) == "na"


def test_cascata_para_no_primeiro_vermelho():
    sts = {"hook_rate": "vermelho", "hold_rate_hook": "vermelho",
           "ctr_link": "vermelho", "cpa": "vermelho"}
    assert nivel_quebrado(sts) == "gancho"


def test_amarelo_nao_quebra_a_cascata():
    # Amarelo é atenção, não causa. A cascata segue para o próximo nível.
    sts = {"hook_rate": "amarelo", "hold_rate_hook": "amarelo",
           "ctr_link": "vermelho", "cpa": "verde"}
    assert nivel_quebrado(sts) == "interesse"


def test_na_nao_quebra_a_cascata():
    # Estático: gancho e retenção são N/A, o julgamento começa no interesse.
    sts = {"hook_rate": "na", "hold_rate_hook": "na",
           "ctr_link": "verde", "cpa": "vermelho"}
    assert nivel_quebrado(sts) == "conversao"


def test_tudo_verde_nao_quebra_nivel_nenhum():
    sts = {"hook_rate": "verde", "hold_rate_hook": "verde",
           "ctr_link": "verde", "cpa": "verde"}
    assert nivel_quebrado(sts) is None


def test_abaixo_do_piso_e_inconclusivo_mesmo_com_kpi_otimo():
    a = avaliar(_anuncio(impressoes=400, views_3s=200, p75=60,
                         link_clicks=20, spend=100.0, registros=2))
    assert a["veredito"] == "inconclusivo"


def test_tudo_verde_e_escalar():
    a = avaliar(_anuncio(impressoes=1000, views_3s=400, p75=80,
                         link_clicks=30, spend=200.0, registros=2))
    assert a["nivel_quebrado"] is None
    assert a["veredito"] == "escalar"


def test_tudo_verde_com_cpa_vermelho_sai_do_escopo_de_criativo():
    a = avaliar(_anuncio(impressoes=1000, views_3s=400, p75=80,
                         link_clicks=30, spend=400.0, registros=2))
    assert a["nivel_quebrado"] == "conversao"
    assert a["veredito"] == "fora_criativo"


def test_hook_vermelho_com_menos_de_dois_hooks_no_angulo_e_iterar():
    a = avaliar(_anuncio(impressoes=1000, views_3s=100), hooks_no_angulo=1)
    assert a["nivel_quebrado"] == "gancho"
    assert a["veredito"] == "iterar"


def test_hook_vermelho_com_dois_hooks_no_angulo_mata_o_angulo():
    # A cadência manda testar 2-3 aberturas antes de descartar o conceito.
    a = avaliar(_anuncio(impressoes=1000, views_3s=100), hooks_no_angulo=2)
    assert a["veredito"] == "matar"


def test_ctr_vermelho_nao_mata_angulo_mesmo_com_muitos_hooks():
    # Só o gancho reprovado condena o ângulo; CTR ruim é problema de promessa.
    a = avaliar(_anuncio(impressoes=1000, views_3s=400, p75=80,
                         link_clicks=5, spend=200.0, registros=2),
                hooks_no_angulo=3)
    assert a["nivel_quebrado"] == "interesse"
    assert a["veredito"] == "iterar"


def test_amarelo_em_tudo_e_iterar_nao_escalar():
    # hook 18% · hold 12,2% · CTR 2% · CPA R$145 — os quatro na faixa amarela.
    a = avaliar(_anuncio(impressoes=1000, views_3s=180, p75=22,
                         link_clicks=20, spend=290.0, registros=2))
    assert set(a["status"].values()) == {"amarelo"}
    assert a["nivel_quebrado"] is None
    assert a["veredito"] == "iterar"
