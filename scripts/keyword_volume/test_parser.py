# scripts/keyword_volume/test_parser.py
from parser import sorted_rows


def test_sorts_by_volume_descending():
    raw = [
        {"keyword": "b", "avg_monthly_searches": 100, "competition": "LOW",
         "low_top_of_page_bid_micros": 1_000_000, "high_top_of_page_bid_micros": 2_000_000},
        {"keyword": "a", "avg_monthly_searches": 500, "competition": "HIGH",
         "low_top_of_page_bid_micros": 3_000_000, "high_top_of_page_bid_micros": 4_000_000},
    ]
    result = sorted_rows(raw)
    assert [r["keyword"] for r in result] == ["a", "b"]


def test_none_volume_sorts_last():
    raw = [
        {"keyword": "sem_dado", "avg_monthly_searches": None, "competition": "UNSPECIFIED",
         "low_top_of_page_bid_micros": None, "high_top_of_page_bid_micros": None},
        {"keyword": "com_dado", "avg_monthly_searches": 10, "competition": "LOW",
         "low_top_of_page_bid_micros": 500_000, "high_top_of_page_bid_micros": 900_000},
    ]
    result = sorted_rows(raw)
    assert [r["keyword"] for r in result] == ["com_dado", "sem_dado"]


def test_converts_micros_to_brl():
    raw = [{"keyword": "x", "avg_monthly_searches": 10, "competition": "MEDIUM",
            "low_top_of_page_bid_micros": 1_500_000, "high_top_of_page_bid_micros": 2_750_000}]
    result = sorted_rows(raw)
    assert result[0]["low_bid_brl"] == 1.5
    assert result[0]["high_bid_brl"] == 2.75


def test_missing_bids_stay_none():
    raw = [{"keyword": "x", "avg_monthly_searches": 10, "competition": "LOW",
            "low_top_of_page_bid_micros": None, "high_top_of_page_bid_micros": None}]
    result = sorted_rows(raw)
    assert result[0]["low_bid_brl"] is None
    assert result[0]["high_bid_brl"] is None


def test_competition_labels_in_portuguese():
    raw = [
        {"keyword": "a", "avg_monthly_searches": 1, "competition": "LOW",
         "low_top_of_page_bid_micros": None, "high_top_of_page_bid_micros": None},
        {"keyword": "b", "avg_monthly_searches": 1, "competition": "MEDIUM",
         "low_top_of_page_bid_micros": None, "high_top_of_page_bid_micros": None},
        {"keyword": "c", "avg_monthly_searches": 1, "competition": "HIGH",
         "low_top_of_page_bid_micros": None, "high_top_of_page_bid_micros": None},
        {"keyword": "d", "avg_monthly_searches": 1, "competition": "UNSPECIFIED",
         "low_top_of_page_bid_micros": None, "high_top_of_page_bid_micros": None},
    ]
    result = {r["keyword"]: r["competition"] for r in sorted_rows(raw)}
    assert result == {"a": "Baixa", "b": "Média", "c": "Alta", "d": "Não informado"}


def test_zero_volume_with_unspecified_competition_treated_as_missing():
    """proto-plus devolve 0/UNSPECIFIED (nunca None) pra keyword sem histórico —
    essa combinação exata deve virar dado ausente, não "zero buscas de verdade"."""
    raw = [
        {"keyword": "sem_historico", "avg_monthly_searches": 0, "competition": "UNSPECIFIED",
         "low_top_of_page_bid_micros": 0, "high_top_of_page_bid_micros": 0},
        {"keyword": "com_dado", "avg_monthly_searches": 10, "competition": "LOW",
         "low_top_of_page_bid_micros": 500_000, "high_top_of_page_bid_micros": 900_000},
    ]
    result = {r["keyword"]: r for r in sorted_rows(raw)}

    assert result["sem_historico"]["avg_monthly_searches"] is None
    assert result["sem_historico"]["low_bid_brl"] is None
    assert result["sem_historico"]["high_bid_brl"] is None
    assert result["sem_historico"]["competition"] == "Não informado"
    # e continua ordenando por último, atrás de dado real
    assert [r["keyword"] for r in sorted_rows(raw)] == ["com_dado", "sem_historico"]


def test_zero_volume_with_unknown_competition_treated_as_missing():
    raw = [{"keyword": "x", "avg_monthly_searches": 0, "competition": "UNKNOWN",
            "low_top_of_page_bid_micros": 0, "high_top_of_page_bid_micros": 0}]
    result = sorted_rows(raw)
    assert result[0]["avg_monthly_searches"] is None
    assert result[0]["low_bid_brl"] is None
    assert result[0]["high_bid_brl"] is None


def test_zero_volume_with_real_competition_signal_stays_zero():
    """Volume 0 com concorrência LOW/MEDIUM/HIGH é sinal real — não normaliza."""
    raw = [{"keyword": "baixo_mas_real", "avg_monthly_searches": 0, "competition": "LOW",
            "low_top_of_page_bid_micros": 100_000, "high_top_of_page_bid_micros": 200_000}]
    result = sorted_rows(raw)
    assert result[0]["avg_monthly_searches"] == 0
    assert result[0]["competition"] == "Baixa"
    assert result[0]["low_bid_brl"] == 0.1
    assert result[0]["high_bid_brl"] == 0.2
