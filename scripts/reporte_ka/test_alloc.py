from alloc import allocate_row


def test_taggeada_medico_vai_100_no_segmento():
    r = allocate_row("[MM] Captação", {"invest": 1000.0, "impr": 500, "clicks": 40, "leads": 10})
    assert r["medico"] == {"invest": 1000.0, "impr": 500, "clicks": 40, "leads": 10}
    assert r["formando"] == {"invest": 0, "impr": 0, "clicks": 0, "leads": 0}


def test_formando_tag():
    r = allocate_row("BOO - [RF] Search", {"invest": 200.0, "leads": 3})
    assert r["formando"] == {"invest": 200.0, "leads": 3}
    assert r["medico"] == {"invest": 0, "leads": 0}


def test_institucional_vai_100_por_cento_medico():
    r = allocate_row("BOO - [Search] - Institucional",
                     {"invest": 1000.0, "impr": 800, "clicks": 40, "leads": 8})
    assert r["medico"] == {"invest": 1000.0, "impr": 800, "clicks": 40, "leads": 8}
    assert r["formando"] == {"invest": 0, "impr": 0, "clicks": 0, "leads": 0}
