"""Leitura e escrita do registro histórico de criativos testados.

Módulo de I/O. Formato JSONL append-only: uma linha JSON por criativo testado.
Escolhido em vez de tabela Markdown porque matriz.py consome o registro
programaticamente e parsear Markdown em Python é frágil.
"""
import json
from pathlib import Path

CAMINHO_PADRAO = "data/criativos_registro.jsonl"


def ler(caminho):
    """Todas as linhas do registro. Lista vazia se o arquivo não existir."""
    p = Path(caminho)
    if not p.exists():
        return []
    linhas = []
    for bruta in p.read_text(encoding="utf-8").splitlines():
        if bruta.strip():
            linhas.append(json.loads(bruta))
    return linhas


def acrescentar(caminho, linhas):
    """Acrescenta linhas ao fim do registro. Devolve quantas gravou."""
    if not linhas:
        return 0
    p = Path(caminho)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        for linha in linhas:
            # ensure_ascii=False: o registro é lido por humanos no terminal.
            f.write(json.dumps(linha, ensure_ascii=False) + "\n")
    return len(linhas)
