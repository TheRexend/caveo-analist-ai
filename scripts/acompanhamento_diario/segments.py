"""Classificação de campanha por segmento e rateio de institucionais.

Espelha config/business-rules.ts (SEGMENT_ALLOCATION).
"""

TAG_MM = "[mm]"
TAG_RF = "[rf]"
FALLBACK = {"mm": 0.5, "rf": 0.5}


def classify_segment(campaign_name):
    """'mm', 'rf' ou 'institucional' (case-insensitive). Sem tag => institucional."""
    n = campaign_name.lower()
    if TAG_MM in n:
        return "mm"
    if TAG_RF in n:
        return "rf"
    return "institucional"


def _ratio(opp_mm, opp_rf):
    total = opp_mm + opp_rf
    if total == 0:
        return dict(FALLBACK)
    return {"mm": opp_mm / total, "rf": opp_rf / total}


def allocate(campaign_name, spend, leads, opp_mm=0, opp_rf=0):
    """spend/leads de UMA campanha num dia -> divididos entre mm/rf.

    Campanha taggeada => 100% no segmento. Institucional => rateio por opp-share
    (fallback 50/50 quando não há opps).
    """
    seg = classify_segment(campaign_name)
    if seg in ("mm", "rf"):
        other = "rf" if seg == "mm" else "mm"
        return {seg: {"spend": spend, "leads": leads},
                other: {"spend": 0.0, "leads": 0.0}}
    r = _ratio(opp_mm, opp_rf)
    return {
        "mm": {"spend": spend * r["mm"], "leads": leads * r["mm"]},
        "rf": {"spend": spend * r["rf"], "leads": leads * r["rf"]},
    }


# Espelha CONTRATANTE_RULES / classifyContratante
# (fonte de verdade: config/business-rules.ts).
RF_SEGMENTS = ("Formando",)
MM_SEGMENTS = ("Revalida",)
SPLIT_SEGMENT = "Médico"
RF_RECENCY_VALUES = ("Menos de 3 anos", "Vai se formar")


def classify_contratante(tip_cte, tempo_de_formado):
    """'rf', 'mm' ou None a partir de TipCte__c + Tempo_de_Formado__c."""
    if tip_cte in RF_SEGMENTS:
        return "rf"
    if tip_cte in MM_SEGMENTS:
        return "mm"
    if tip_cte == SPLIT_SEGMENT:
        return "rf" if tempo_de_formado in RF_RECENCY_VALUES else "mm"
    return None
