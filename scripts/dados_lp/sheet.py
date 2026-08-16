"""Layout da aba 'Dados Landingpage' + leitura/escrita no Google Sheets.

Lógica pura (mapa de datas, escolha de linhas, montagem de células) separada de
uma casca fina de I/O sobre gspread, no padrão de scripts/acompanhamento_diario/.

O contrato central é COLS: ele não contém as colunas de rótulo (B, G, L, O) nem
as de fórmula (P..W), então é estruturalmente impossível esta skill sobrescrever
o bloco Total Geral de uma linha existente.
"""
from datetime import date, timedelta

FIRST_DATA_ROW = 2

# Métrica -> coluna. A ordem define a ordem dos updates.
# NÃO inclui B, G, L, O (rótulos) nem P..W (fórmulas) — de propósito.
COLS = {
    "meta_impressoes": "C",
    "meta_cliques": "D",
    "meta_leads": "E",
    "meta_invest": "F",
    "google_impressoes": "H",
    "google_cliques": "I",
    "google_leads": "J",
    "google_invest": "K",
    "ga4_sessoes": "M",
    "ga4_bounce": "N",
}

# grid_row é a fatia C..N devolvida pelo gspread: índice 0 = C.
_GRID_FIRST_COL = "C"


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


def _filled_count(grid_row):
    """Quantas das dez células graváveis estão preenchidas nessa fatia C..N.

    Olha só as colunas de COLS: G e L carregam rótulo fixo em toda linha e não
    podem contar como 'dado'. O gspread também corta os vazios do fim, então a
    fatia pode vir mais curta que 12 — daí o teste de comprimento."""
    count = 0
    for col in COLS.values():
        index = ord(col) - ord(_GRID_FIRST_COL)
        value = grid_row[index] if index < len(grid_row) else ""
        if str(value).strip() != "":
            count += 1
    return count


def row_is_empty(grid_row):
    """True se nenhuma das dez células graváveis estiver preenchida."""
    return _filled_count(grid_row) == 0


def pending_dates(date_row_map, grid, until):
    """Datas <= until cuja linha existe e está totalmente vazia.

    Linha parcialmente preenchida fica de fora: sobrescrever dado que já está lá
    é decisão do usuário, via o override de $ARGUMENTS."""
    out = []
    for iso in sorted(date_row_map):
        if iso <= until and row_is_empty(grid.get(date_row_map[iso], [])):
            out.append(iso)
    return out


def partial_dates(date_row_map, grid, until):
    """Datas <= until com a linha pela metade. Não são gravadas, mas o preview
    precisa avisar que elas existem."""
    out = []
    for iso in sorted(date_row_map):
        if iso > until:
            continue
        count = _filled_count(grid.get(date_row_map[iso], []))
        if 0 < count < len(COLS):
            out.append(iso)
    return out


def missing_dates(date_row_map, until):
    """Datas <= until posteriores à última data da coluna A, em sequência diária.

    São as linhas que ainda não existem e precisam ser criadas."""
    if not date_row_map:
        raise ValueError("coluna A sem nenhuma data: não há sequência para continuar")
    cursor = date.fromisoformat(max(date_row_map)) + timedelta(days=1)
    end = date.fromisoformat(until)
    out = []
    while cursor <= end:
        out.append(cursor.isoformat())
        cursor += timedelta(days=1)
    return out
