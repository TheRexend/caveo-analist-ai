from sheet import build_sheet_rows, HEADER


def test_build_sheet_rows_joins_theme_lookup():
    rows = [
        {"keyword": "abrir cnpj médico", "avg_monthly_searches": 500,
         "competition": "Baixa", "low_bid_brl": 1.5, "high_bid_brl": 3.0},
    ]
    theme_lookup = {"abrir cnpj médico": ("Abertura de CNPJ Médico", "transacional")}

    result = build_sheet_rows(rows, theme_lookup)

    assert result == [[
        "abrir cnpj médico", "Abertura de CNPJ Médico", "transacional",
        500, "Baixa", 1.5, 3.0,
    ]]


def test_build_sheet_rows_handles_missing_theme():
    rows = [{"keyword": "termo novo", "avg_monthly_searches": None,
             "competition": "Não informado", "low_bid_brl": None, "high_bid_brl": None}]

    result = build_sheet_rows(rows, theme_lookup={})

    assert result == [["termo novo", "(não mapeado)", "(não mapeado)", "", "Não informado", "", ""]]


def test_header_has_expected_columns():
    assert HEADER == [
        "Keyword", "Tema/Ad group candidato", "Balde de funil",
        "Volume médio mensal", "Concorrência", "Lance mín. (R$)", "Lance máx. (R$)",
    ]
