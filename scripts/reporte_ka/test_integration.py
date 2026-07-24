from blocks import block_of
from alloc import allocate_row
from sheet import cell_updates
from qualification import mql_day, sql_day


def test_pipeline_midia_para_celulas():
    data = {"mm": {}, "rf": {}}

    def acc(seg, block, metrics):
        b = data[seg].setdefault(block, {})
        for k, v in metrics.items():
            b[k] = b.get(k, 0) + v

    rows = [
        {"name": "[BOO] [MM] [FUNDO] [LEADS]", "platform": "meta", "ct": None,
         "metrics": {"invest": 1000.0, "impr": 5000, "clicks": 100, "leads": 10}, "omm": 0, "orf": 0},
        {"name": "BOO - [Search] - Institucional", "platform": "google", "ct": "SEARCH",
         "metrics": {"invest": 800.0, "impr": 4000, "clicks": 80, "leads": 8}, "omm": 3, "orf": 1},
    ]
    for r in rows:
        blk = block_of(r["name"], r["platform"], r["ct"])
        assert blk != "excluded"
        al = allocate_row(r["name"], r["metrics"], r["omm"], r["orf"])
        for seg in ("mm", "rf"):
            acc(seg, blk, al[seg])

    ups_mm = dict(cell_updates("N", data["mm"]))
    ups_rf = dict(cell_updates("N", data["rf"]))
    assert ups_mm["N21"] == 1000.0   # meta captação 100% MM (taggeada)
    assert ups_mm["N4"] == 600.0     # google search: 800 * 0.75 (3 de 4 opps MM)
    assert ups_rf["N4"] == 200.0     # 800 * 0.25


def test_qualification_reuse_conta_mql_sql():
    op_prop = [{"stage": "Nova", "date": "2026-07-02"},
               {"stage": "Proposta Enviada", "date": "2026-07-10"}]
    op_aguard = [{"stage": "Aguardando Resposta", "date": "2026-07-05"}]
    assert mql_day(op_prop, False) is not None
    assert sql_day(op_prop, False) is not None
    assert mql_day(op_aguard, False) is not None
    assert sql_day(op_aguard, False) is None
