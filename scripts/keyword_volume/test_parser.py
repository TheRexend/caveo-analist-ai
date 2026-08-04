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
