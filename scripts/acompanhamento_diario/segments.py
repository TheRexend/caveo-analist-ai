"""Classificação de campanha por segmento e classificação de oportunidade.

Oportunidade: espelha config/business-rules.ts (classifyContratante).
Campanha: mecanismo próprio desta camada Python — não existe mais na
fundação TS (SEGMENT_ALLOCATION foi removido no sub-projeto 1). Tags
[rf]/[mm] são um shim de compatibilidade com campanhas legadas; campanha
sem tag = 100% Médico (mídia paga mira só Médico daqui pra frente, sem
rateio institucional).
"""

TAG_FORMANDO = "[rf]"   # tag legada — campanhas antigas podem ainda ter esse nome
TAG_MEDICO = "[mm]"     # tag legada — idem


def classify_segment(campaign_name):
    """'formando', 'medico' ou 'institucional' (case-insensitive).
    Sem tag => institucional (100% Médico na alocação, ver allocate)."""
    n = campaign_name.lower()
    if TAG_FORMANDO in n:
        return "formando"
    if TAG_MEDICO in n:
        return "medico"
    return "institucional"


def allocate(campaign_name, spend, leads):
    """spend/leads de UMA campanha num dia -> {'formando': {...}, 'medico': {...}}.

    Campanha taggeada [rf] => 100% formando. Taggeada [mm] ou institucional
    (sem tag) => 100% medico — mídia paga mira só Médico, sem rateio.
    """
    seg = classify_segment(campaign_name)
    if seg == "formando":
        return {"formando": {"spend": spend, "leads": leads},
                "medico": {"spend": 0.0, "leads": 0.0}}
    return {"formando": {"spend": 0.0, "leads": 0.0},
            "medico": {"spend": spend, "leads": leads}}


def classify_contratante(tip_cte):
    """'formando', 'medico', 'revalida' ou None a partir de TipCte__c."""
    if tip_cte == "Formando":
        return "formando"
    if tip_cte == "Médico":
        return "medico"
    if tip_cte == "Revalida":
        return "revalida"
    return None
