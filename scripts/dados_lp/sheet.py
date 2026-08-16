"""Layout da aba 'Dados Landingpage' + leitura/escrita no Google Sheets.

Lógica pura (mapa de datas, escolha de linhas, montagem de células) separada de
uma casca fina de I/O sobre gspread, no padrão de scripts/acompanhamento_diario/.

O contrato central é COLS: ele não contém as colunas de rótulo (B, G, L, O) nem
as de fórmula (P..W), então é estruturalmente impossível esta skill sobrescrever
o bloco Total Geral de uma linha existente.
"""
from datetime import date, timedelta

FIRST_DATA_ROW = 2


def _parse_br_date(text):
    """'13/08/2026' -> '2026-08-13'. Devolve None se não for uma data válida."""
    parts = str(text).strip().split("/")
    if len(parts) != 3:
        return None
    day, month, year = parts
    if not (day.isdigit() and month.isdigit() and year.isdigit()):
        return None
    try:
        return date(int(year), int(month), int(day)).isoformat()
    except ValueError:
        return None


def build_date_row_map(col_a):
    """Coluna A inteira (com cabeçalho) -> {'2026-08-13': 2, ...}.

    Lê a coluna de verdade em vez de assumir um offset fixo: a aba pode ser
    estendida por fora da skill. Células que não são data (cabeçalho, branco,
    rodapé) são ignoradas."""
    out = {}
    for index, raw in enumerate(col_a):
        row = index + 1
        if row < FIRST_DATA_ROW:
            continue
        iso = _parse_br_date(raw)
        if iso is not None:
            out[iso] = row
    return out


def check_consecutive(date_row_map):
    """Datas ISO que faltam para a coluna A ser uma sequência diária íntegra.

    Lista vazia = tabela íntegra. NÃO conserta nada: buraco no meio da tabela é
    anomalia que interrompe a execução, porque inserir linha no meio deslocaria
    as linhas seguintes e quebraria as âncoras das fórmulas P..W."""
    if not date_row_map:
        return []
    present = set(date_row_map)
    cursor = date.fromisoformat(min(present))
    last = date.fromisoformat(max(present))
    expected = set()
    while cursor <= last:
        expected.add(cursor.isoformat())
        cursor += timedelta(days=1)
    return sorted(expected - present)
