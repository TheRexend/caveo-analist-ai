"""MQL/SQL a partir de OpportunityHistory.

Espelha config/business-rules.ts (QUALIFICATION_RULES). Cumulativo: a opp conta
se JÁ atingiu o estágio. O dia é o da PRIMEIRA transição que cruza o gate.
"""

# Espelho de QUALIFICATION_RULES (fonte de verdade: config/business-rules.ts).
MQL_REACHED = ("Aguardando Resposta", "Reunião Agendada", "Proposta Enviada")
SQL_REACHED = ("Proposta Enviada",)
# Ganho (WON_CLAUSE da fundação): estágio "Fechado" (IsWon) ou "Ganho não Identificado".
WON_STAGES = ("Fechado", "Ganho não Identificado")


def _first_gate_day(history, reached_stages, is_won):
    gate = set(reached_stages)
    rows = sorted(history, key=lambda h: h["date"])
    for h in rows:
        if h["stage"] in gate:
            return h["date"]
    if is_won:
        for h in rows:
            if h["stage"] in WON_STAGES:
                return h["date"]
    return None


def mql_day(history, is_won):
    """Dia (YYYY-MM-DD) em que a opp virou MQL, ou None."""
    return _first_gate_day(history, MQL_REACHED, is_won)


def sql_day(history, is_won):
    """Dia (YYYY-MM-DD) em que a opp virou SQL, ou None."""
    return _first_gate_day(history, SQL_REACHED, is_won)
