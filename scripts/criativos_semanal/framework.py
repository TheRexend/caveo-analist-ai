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


# Faixas acordadas com o cliente, lidas como PISO: acima da faixa é 🟢, não
# "fora do padrão". `invertido=True` marca o KPI em que valor alto é ruim.
BENCHMARKS = {
    # Revisto em 2026-08-19 (era 0.20/0.30). A faixa original deixava a conta
    # inteira em 🔴/🟡 e não separava nada: nenhum criativo chegava a 30%.
    "hook_rate": {"critico": 0.15, "atencao": 0.20, "invertido": False},
    "hold_rate_hook": {"critico": 0.10, "atencao": 0.15, "invertido": False},
    "ctr_link": {"critico": 0.015, "atencao": 0.025, "invertido": False},
    "cpa": {"critico": 150.0, "atencao": 140.0, "invertido": True},
}

# Ordem da cascata: KPI → nome do nível. O primeiro vermelho define a causa.
CASCATA = (
    ("hook_rate", "gancho"),
    ("hold_rate_hook", "retencao"),
    ("ctr_link", "interesse"),
    ("cpa", "conversao"),
)


def status(kpi, valor):
    """Classifica um KPI contra o benchmark. None vira "na" (indefinido)."""
    if valor is None:
        return "na"
    b = BENCHMARKS[kpi]
    if b["invertido"]:
        if valor > b["critico"]:
            return "vermelho"
        return "amarelo" if valor >= b["atencao"] else "verde"
    if valor < b["critico"]:
        return "vermelho"
    return "amarelo" if valor <= b["atencao"] else "verde"


def nivel_quebrado(sts):
    """Primeiro nível vermelho da cascata. Amarelo e "na" não interrompem."""
    for kpi, nivel in CASCATA:
        if sts.get(kpi) == "vermelho":
            return nivel
    return None


def _veredito(anuncio, sts, nivel, hooks_no_angulo):
    if anuncio["impressoes"] < MIN_IMPRESSOES:
        return "inconclusivo"
    if nivel is None:
        # Nada vermelho: só escala se não houver amarelo pendurado.
        tem_amarelo = any(v == "amarelo" for v in sts.values())
        return "iterar" if tem_amarelo else "escalar"
    if nivel == "conversao":
        # Criativo entrega os três primeiros níveis e a conversão não vem:
        # o problema está na LP ou na medição, não na peça.
        return "fora_criativo"
    if nivel == "gancho" and hooks_no_angulo >= 2:
        # Cadência: 2-3 aberturas de 3s antes de descartar o conceito.
        return "matar"
    return "iterar"


def avaliar(anuncio, hooks_no_angulo=0):
    """Anúncio enriquecido com KPIs, status, nível quebrado e veredito.

    `hooks_no_angulo` é quantas aberturas diferentes já foram testadas no mesmo
    ângulo, vindo do registro histórico (ver matriz.hooks_por_angulo).
    """
    k = kpis(anuncio)
    sts = {kpi: status(kpi, k[kpi]) for kpi, _ in CASCATA}
    nivel = nivel_quebrado(sts)
    saida = dict(anuncio)
    saida.update(k)
    saida["status"] = sts
    saida["nivel_quebrado"] = nivel
    saida["veredito"] = _veredito(anuncio, sts, nivel, hooks_no_angulo)
    return saida
