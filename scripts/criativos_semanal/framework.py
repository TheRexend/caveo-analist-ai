"""Framework de teste de criativo do Meta Ads — cálculo e classificação.

Módulo PURO: recebe dicionários, devolve dicionários. Sem rede, sem arquivo.
Espelha os benchmarks acordados com o cliente (ver o spec
docs/superpowers/specs/2026-08-19-analista-criativo-design.md, §4.1).
"""

# Nenhum criativo abaixo disso recebe veredito diferente de "inconclusivo":
# hook rate e CTR sobre poucas centenas de impressões são ruído, não leitura.
MIN_IMPRESSOES = 500


def _div(numerador, denominador):
    """Divisão que devolve None quando o denominador é zero.

    None significa "indefinido", e é diferente de 0.0. Um CPA de 0 seria lido
    como excelente; um CPA indefinido (nenhum registro) não pode ser julgado.
    """
    if not denominador:
        return None
    return numerador / denominador


def kpis(anuncio):
    """Os quatro KPIs do framework, mais o hold rate no segundo denominador."""
    impressoes = anuncio["impressoes"]
    views_3s = anuncio["views_3s"]
    return {
        "hook_rate": _div(views_3s, impressoes),
        "hold_rate_hook": _div(anuncio["p75"], views_3s),
        "hold_rate_impr": _div(anuncio["p75"], impressoes),
        "ctr_link": _div(anuncio["link_clicks"], impressoes),
        "cpa": _div(anuncio["spend"], anuncio["registros"]),
    }
