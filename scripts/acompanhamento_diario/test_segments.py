from segments import classify_segment, allocate, classify_contratante


def test_classify_por_tag():
    assert classify_segment("[MM] Search Médico") == "mm"
    assert classify_segment("[RF] Meta [LEADS]") == "rf"
    assert classify_segment("[mm] minúsculo") == "mm"


def test_classify_sem_tag_e_institucional():
    assert classify_segment("Search Institucional") == "institucional"
    assert classify_segment("[LEADS] Genérica sem segmento") == "institucional"


def test_allocate_campanha_taggeada_vai_100_por_cento():
    r = allocate("[MM] Campanha", spend=1000.0, leads=10)
    assert r["mm"] == {"spend": 1000.0, "leads": 10}
    assert r["rf"] == {"spend": 0.0, "leads": 0.0}


def test_allocate_institucional_rateia_pelo_opp_share():
    # Exemplo do usuário: R$1000, 10 leads, 5 opps MM de 10 -> R$500 p/ MM.
    r = allocate("Search Institucional", spend=1000.0, leads=10, opp_mm=5, opp_rf=5)
    assert r["mm"]["spend"] == 500.0
    assert r["rf"]["spend"] == 500.0
    assert r["mm"]["leads"] == 5.0
    assert r["rf"]["leads"] == 5.0


def test_allocate_institucional_ratio_desigual():
    r = allocate("Institucional", spend=1000.0, leads=8, opp_mm=3, opp_rf=1)
    assert r["mm"]["spend"] == 750.0
    assert r["rf"]["spend"] == 250.0


def test_allocate_institucional_zero_opps_cai_no_fallback_50_50():
    r = allocate("Institucional", spend=1000.0, leads=10, opp_mm=0, opp_rf=0)
    assert r["mm"]["spend"] == 500.0
    assert r["rf"]["spend"] == 500.0
    assert r["mm"]["leads"] == 5.0
    assert r["rf"]["leads"] == 5.0


def test_classify_contratante_formando_sempre_rf():
    assert classify_contratante("Formando", None) == "rf"
    assert classify_contratante("Formando", "Vai se formar") == "rf"


def test_classify_contratante_medico_dividido_pela_recencia():
    assert classify_contratante("Médico", "Menos de 3 anos") == "rf"
    assert classify_contratante("Médico", "Vai se formar") == "rf"
    assert classify_contratante("Médico", "Mais de 3 anos") == "mm"
    assert classify_contratante("Médico", None) == "mm"  # fallback


def test_classify_contratante_revalida_e_mm():
    assert classify_contratante("Revalida", None) == "mm"


def test_classify_contratante_tipcte_nulo_ou_desconhecido_e_none():
    assert classify_contratante(None, None) is None
    assert classify_contratante("Outro", "Menos de 3 anos") is None
