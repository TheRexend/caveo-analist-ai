from segments import classify_segment, allocate, classify_contratante


def test_classify_por_tag():
    assert classify_segment("[MM] Search Médico") == "medico"
    assert classify_segment("[RF] Meta [LEADS]") == "formando"
    assert classify_segment("[mm] minúsculo") == "medico"


def test_classify_sem_tag_e_institucional():
    assert classify_segment("Search Institucional") == "institucional"
    assert classify_segment("[LEADS] Genérica sem segmento") == "institucional"


def test_allocate_campanha_taggeada_formando_vai_100_por_cento():
    r = allocate("[RF] Campanha", spend=1000.0, leads=10)
    assert r["formando"] == {"spend": 1000.0, "leads": 10}
    assert r["medico"] == {"spend": 0.0, "leads": 0.0}


def test_allocate_campanha_taggeada_medico_vai_100_por_cento():
    r = allocate("[MM] Campanha", spend=1000.0, leads=10)
    assert r["medico"] == {"spend": 1000.0, "leads": 10}
    assert r["formando"] == {"spend": 0.0, "leads": 0.0}


def test_allocate_institucional_vai_100_por_cento_medico():
    # Sem tag => 100% Médico, sem rateio (mídia paga mira só Médico).
    r = allocate("Search Institucional", spend=1000.0, leads=10)
    assert r["medico"] == {"spend": 1000.0, "leads": 10}
    assert r["formando"] == {"spend": 0.0, "leads": 0.0}


def test_classify_contratante_formando():
    assert classify_contratante("Formando") == "formando"


def test_classify_contratante_medico():
    assert classify_contratante("Médico") == "medico"


def test_classify_contratante_revalida():
    assert classify_contratante("Revalida") == "revalida"


def test_classify_contratante_tipcte_nulo_ou_desconhecido_e_none():
    assert classify_contratante(None) is None
    assert classify_contratante("Outro") is None
