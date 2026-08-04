"""Formatação pura das métricas do Keyword Planner: sem I/O, sem chamada de rede."""

COMPETITION_LABELS = {
    "LOW": "Baixa",
    "MEDIUM": "Média",
    "HIGH": "Alta",
    "UNSPECIFIED": "Não informado",
    "UNKNOWN": "Não informado",
}

# proto-plus nunca devolve None para campos numéricos não setados — devolve o
# escalar default (0). Uma keyword sem histórico no Keyword Planner chega aqui
# como avg_monthly_searches=0 + competition UNSPECIFIED/UNKNOWN + bids=0, que é
# indistinguível de "buscada zero vezes de verdade" se não normalizarmos. Só
# nessa combinação exata tratamos como dado ausente; volume 0 com sinal de
# concorrência real (LOW/MEDIUM/HIGH) fica como está.
_NO_DATA_COMPETITION = {"UNSPECIFIED", "UNKNOWN"}


def _micros_to_brl(micros):
    return round(micros / 1_000_000, 2) if micros is not None else None


def _normalize_missing_data(item):
    """Se volume==0 e concorrência não informada, trata como ausente (None) em
    vez de zero — assim o tratamento de None já existente (ordena por último,
    célula em branco na planilha) passa a valer de fato."""
    if item.get("avg_monthly_searches") == 0 and item.get("competition") in _NO_DATA_COMPETITION:
        return {
            **item,
            "avg_monthly_searches": None,
            "low_top_of_page_bid_micros": None,
            "high_top_of_page_bid_micros": None,
        }
    return item


def _sort_key(item):
    volume = item.get("avg_monthly_searches")
    return (volume is None, -(volume or 0))


def sorted_rows(raw_metrics):
    """Ordena por volume médio mensal (desc, None por último); converte lances micros -> R$."""
    rows = []
    normalized = (_normalize_missing_data(item) for item in raw_metrics)
    for item in sorted(normalized, key=_sort_key):
        rows.append({
            "keyword": item["keyword"],
            "avg_monthly_searches": item.get("avg_monthly_searches"),
            "competition": COMPETITION_LABELS.get(item.get("competition"), "Não informado"),
            "low_bid_brl": _micros_to_brl(item.get("low_top_of_page_bid_micros")),
            "high_bid_brl": _micros_to_brl(item.get("high_top_of_page_bid_micros")),
        })
    return rows
