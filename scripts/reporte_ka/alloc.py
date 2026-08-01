"""Split Médico/Formando de uma campanha para TODAS as métricas (invest/impr/clicks/leads).

Reusa segments.classify_segment. Campanha taggeada [rf]/[mm] (legada) -> 100%
no segmento da tag; sem tag (institucional) -> 100% Médico (mídia paga mira só
Médico, sem rateio institucional).
"""
from segments import classify_segment  # scripts/acompanhamento_diario/segments.py (via conftest)


def allocate_row(name, metrics):
    """metrics: {chave: número}. Retorna {'medico': {...}, 'formando': {...}} com
    as MESMAS chaves. Campanha taggeada -> tudo no segmento da tag; institucional
    -> tudo em Médico."""
    seg = classify_segment(name)
    if seg == "formando":
        return {"formando": dict(metrics), "medico": {k: 0 for k in metrics}}
    return {"medico": dict(metrics), "formando": {k: 0 for k in metrics}}
