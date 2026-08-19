"""Matriz PDA — Persona × Desire × Awareness — e memória de ângulos.

Módulo PURO: recebe o registro já carregado (quem lê o arquivo é registro.py).

Nota de procedência: o P.D.A. original da Pilothouse Digital é
Persona · Desire · *Angle*. O framework com Awareness no terceiro eixo é o Hi5.
Adotamos o rótulo PDA com os eixos abaixo por ser o termo em uso interno.

Eixos ancorados na documentação existente:
  Persona   → docs/personas_medico.md
  Desire    → docs/Dores_Desejos_Publicos_Caveo.md (mapas D1-D7)
  Awareness → 5 níveis de Eugene Schwartz (Breakthrough Advertising, 1966)

ATENÇÃO — os códigos D1..D7 são ESCOPADOS POR ESTÁGIO DE CARREIRA. O documento
de dores traz dois mapas: "Começando a carreira" e "Carreira consolidada". O D3
de um não é o D3 do outro (início = "medo de errar imposto no começo";
consolidado = outra dor). A célula só é inequívoca porque a PERSONA fixa o
estágio:
    Larissa, Diego  → começando a carreira
    Rafael, Camila  → carreira consolidada
Ao ler ou gravar uma célula, resolva o desire no mapa do estágio da persona.
"""
from itertools import product

PERSONAS = ("Larissa", "Diego", "Rafael", "Camila")
DESIRES = ("D1", "D2", "D3", "D4", "D5", "D6", "D7")
AWARENESS = ("inconsciente", "problema", "solucao", "produto", "total")

# Quantas aberturas de 3s a cadência manda testar antes de descartar o conceito.
HOOKS_ANTES_DE_DESCARTAR = 2


def celulas_usadas(registro):
    return {(l["persona"], l["desire"], l["awareness"]) for l in registro}


def celulas_livres(registro):
    """As células da matriz que ainda não foram testadas."""
    usadas = celulas_usadas(registro)
    return [c for c in product(PERSONAS, DESIRES, AWARENESS) if c not in usadas]


def hooks_por_angulo(registro):
    """Quantas aberturas DISTINTAS já foram testadas em cada ângulo."""
    por_angulo = {}
    for l in registro:
        por_angulo.setdefault(l["angulo"], set()).add(l["hook"])
    return {angulo: len(hooks) for angulo, hooks in por_angulo.items()}


def angulos_mortos(registro):
    """Ângulos com 2+ aberturas testadas e TODAS reprovadas no gancho.

    Se alguma abertura passou do gancho, o ângulo segue vivo — o problema
    estava na abertura, não no conceito.
    """
    hooks = hooks_por_angulo(registro)
    mortos = set()
    for angulo, n in hooks.items():
        if n < HOOKS_ANTES_DE_DESCARTAR:
            continue
        linhas = [l for l in registro if l["angulo"] == angulo]
        if all(l["nivel_quebrado"] == "gancho" for l in linhas):
            mortos.add(angulo)
    return mortos
