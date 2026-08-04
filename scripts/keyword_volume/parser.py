"""Formatação pura das métricas do Keyword Planner: sem I/O, sem chamada de rede."""

COMPETITION_LABELS = {
    "LOW": "Baixa",
    "MEDIUM": "Média",
    "HIGH": "Alta",
    "UNSPECIFIED": "Não informado",
    "UNKNOWN": "Não informado",
}


def _micros_to_brl(micros):
    return round(micros / 1_000_000, 2) if micros is not None else None


def _sort_key(item):
    volume = item.get("avg_monthly_searches")
    return (volume is None, -(volume or 0))


def sorted_rows(raw_metrics):
    """Ordena por volume médio mensal (desc, None por último); converte lances micros -> R$."""
    rows = []
    for item in sorted(raw_metrics, key=_sort_key):
        rows.append({
            "keyword": item["keyword"],
            "avg_monthly_searches": item.get("avg_monthly_searches"),
            "competition": COMPETITION_LABELS.get(item.get("competition"), "Não informado"),
            "low_bid_brl": _micros_to_brl(item.get("low_top_of_page_bid_micros")),
            "high_bid_brl": _micros_to_brl(item.get("high_top_of_page_bid_micros")),
        })
    return rows
