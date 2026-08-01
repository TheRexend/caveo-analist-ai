from blocks import block_of
from alloc import allocate_row
from sheet import cell_updates
from qualification import mql_day, sql_day


def test_pipeline_midia_para_celulas():
    data = {"medico": {}, "formando": {}}

    def acc(seg, block, metrics):
        b = data[seg].setdefault(block, {})
        for k, v in metrics.items():
            b[k] = b.get(k, 0) + v

    rows = [
        {"name": "[BOO] [MM] [FUNDO] [LEADS]", "platform": "meta", "ct": None,
         "metrics": {"invest": 1000.0, "impr": 5000, "clicks": 100, "leads": 10}},
        {"name": "BOO - [Search] - Institucional", "platform": "google", "ct": "SEARCH",
         "metrics": {"invest": 800.0, "impr": 4000, "clicks": 80, "leads": 8}},
    ]
    for r in rows:
        blk = block_of(r["name"], r["platform"], r["ct"])
        assert blk != "excluded"
        al = allocate_row(r["name"], r["metrics"])
        for seg in ("medico", "formando"):
            acc(seg, blk, al[seg])

    ups_medico = dict(cell_updates("N", data["medico"]))
    ups_formando = dict(cell_updates("N", data["formando"]))
    assert ups_medico["N21"] == 1000.0   # meta captação 100% Médico (taggeada [MM])
    assert ups_medico["N4"] == 800.0     # google search institucional: 100% Médico (sem rateio)
    assert ups_formando["N4"] == 0       # Formando não recebe nada da campanha institucional (zero explícito, não ausente)


def test_qualification_reuse_conta_mql_sql():
    op_prop = [{"stage": "Nova", "date": "2026-07-02"},
               {"stage": "Proposta Enviada", "date": "2026-07-10"}]
    op_aguard = [{"stage": "Aguardando Resposta", "date": "2026-07-05"}]
    assert mql_day(op_prop, False) is not None
    assert sql_day(op_prop, False) is not None
    assert mql_day(op_aguard, False) is not None
    assert sql_day(op_aguard, False) is None
