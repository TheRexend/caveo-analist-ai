"""Split RF/MM de uma campanha para TODAS as métricas (invest/impr/clicks/leads).

Reusa segments.classify_segment (fundação SEGMENT_ALLOCATION). Campanha taggeada
[RF]/[MM] -> 100% no segmento; institucional -> rateio por participação de opps
(fallback 50/50).
"""
from segments import classify_segment  # scripts/acompanhamento_diario/segments.py (via conftest)


def _ratio(opp_mm, opp_rf):
    total = opp_mm + opp_rf
    if total == 0:
        return {"mm": 0.5, "rf": 0.5}
    return {"mm": opp_mm / total, "rf": opp_rf / total}


def allocate_row(name, metrics, opp_mm=0, opp_rf=0):
    """metrics: {chave: número}. Retorna {'mm': {...}, 'rf': {...}} com as MESMAS
    chaves. Campanha taggeada -> tudo no segmento; institucional -> rateio."""
    seg = classify_segment(name)
    if seg in ("mm", "rf"):
        other = "rf" if seg == "mm" else "mm"
        return {seg: dict(metrics), other: {k: 0 for k in metrics}}
    r = _ratio(opp_mm, opp_rf)
    return {
        "mm": {k: v * r["mm"] for k, v in metrics.items()},
        "rf": {k: v * r["rf"] for k, v in metrics.items()},
    }
