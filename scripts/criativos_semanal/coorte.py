"""Coortes de entrada de criativo, por data de inclusão do anúncio.

Módulo PURO. A janela de 14 dias cobre duas coortes: a "madura" (D-14 a D-8),
que já passou a fase de aprendizado de 5-7 dias e portanto sustenta destaque,
e a "recente" (D-7 a D-1), que é leitura preliminar.
"""
from datetime import date, timedelta

DIAS_JANELA = 14
DIAS_COORTE = 7


def janela(ref):
    """(início, fim) da janela criativa. Termina ontem: hoje é dia incompleto."""
    fim = ref - timedelta(days=1)
    inicio = ref - timedelta(days=DIAS_JANELA)
    return inicio, fim


def _data_de(created_time):
    """A parte de data de "2026-08-12T20:37:59-0300"."""
    return date.fromisoformat(created_time[:10])


def coorte_de(created_time, ref):
    inicio, fim = janela(ref)
    d = _data_de(created_time)
    if d < inicio or d > fim:
        return "fora"
    return "madura" if d < inicio + timedelta(days=DIAS_COORTE) else "recente"


def agrupar(anuncios, ref):
    grupos = {"madura": [], "recente": [], "fora": []}
    for a in anuncios:
        grupos[coorte_de(a["created_time"], ref)].append(a)
    return grupos
