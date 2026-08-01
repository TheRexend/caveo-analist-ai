"""Universo (marcador BOO) e bloco de cada campanha nas abas Mês-a-Mês Formando/Médico.

O split Formando/Médico por tag fica em alloc.py (reusa segments.classify_segment).
Espelha o design 2026-07-23-reporte-resultados-ka-segmentado.
"""

GOOGLE_LEADGEN_CHANNELS = ("PERFORMANCE_MAX", "DISPLAY", "VIDEO", "DEMAND_GEN")


def is_boo(name):
    """True se a campanha tem o marcador da agência ('[BOO]' no Meta, 'BOO -' no
    Google). Teste único: contém 'boo' (case-insensitive)."""
    return "boo" in (name or "").lower()


def _is_topo(name):
    return "[topo]" in (name or "").lower()


def block_of(name, platform, channel_type=None):
    """Bloco da campanha ou 'excluded'.

    platform: 'meta' | 'google'. channel_type (Google) ex.: 'SEARCH',
    'PERFORMANCE_MAX', 'DISPLAY', 'VIDEO', 'DEMAND_GEN'.
    """
    if not is_boo(name):
        return "excluded"
    if platform == "meta":
        return "meta_awareness" if _is_topo(name) else "meta_captacao"
    if platform == "google":
        if _is_topo(name):
            return "google_awareness"
        ct = (channel_type or "").upper()
        if ct == "SEARCH":
            return "google_search"
        if ct in GOOGLE_LEADGEN_CHANNELS:
            return "google_yt_pmax"
    return "excluded"
