from alloc import allocate_row


def test_taggeada_vai_100_no_segmento():
    r = allocate_row("[MM] Captação", {"invest": 1000.0, "impr": 500, "clicks": 40, "leads": 10})
    assert r["mm"] == {"invest": 1000.0, "impr": 500, "clicks": 40, "leads": 10}
    assert r["rf"] == {"invest": 0, "impr": 0, "clicks": 0, "leads": 0}


def test_rf_tag():
    r = allocate_row("BOO - [RF] Search", {"invest": 200.0, "leads": 3})
    assert r["rf"] == {"invest": 200.0, "leads": 3}
    assert r["mm"] == {"invest": 0, "leads": 0}


def test_institucional_rateia_todas_as_metricas():
    r = allocate_row("BOO - [Search] - Institucional",
                     {"invest": 1000.0, "impr": 800, "clicks": 40, "leads": 8},
                     opp_mm=3, opp_rf=1)
    assert r["mm"] == {"invest": 750.0, "impr": 600.0, "clicks": 30.0, "leads": 6.0}
    assert r["rf"] == {"invest": 250.0, "impr": 200.0, "clicks": 10.0, "leads": 2.0}


def test_institucional_zero_opps_fallback_50_50():
    r = allocate_row("Institucional", {"invest": 1000.0, "leads": 10}, 0, 0)
    assert r["mm"] == {"invest": 500.0, "leads": 5.0}
    assert r["rf"] == {"invest": 500.0, "leads": 5.0}
