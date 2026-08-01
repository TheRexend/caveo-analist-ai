"""Resolução da coluna do mês (Realizado) e mapeamento célula→métrica das abas
Mês-a-Mês Formando/Médico. A coluna NÃO é fixa: cada mês (de mai/26 em diante) ocupa um
trio Realizado|Meta|Δ%; as colunas Realizado andam de 3 em 3 (H, K, N, Q...).
A linha 1 guarda o 1º-dia-do-mês como número de série (NÃO é dia 1: o formato
mmmm/yy só exibe mês/ano); a linha 2 marca 'Realizado'. Comparar ano+mês.
"""
from datetime import date, timedelta

_SHEETS_EPOCH = date(1899, 12, 30)  # serial 0 do Google Sheets

# bloco -> {métrica: linha}. Ordem define a ordem dos updates.
ROWS = {
    "google_search":    {"invest": 4,  "impr": 5,  "clicks": 6,  "leads": 9},
    "google_yt_pmax":   {"invest": 12, "impr": 13, "clicks": 15, "leads": 18},
    "meta_captacao":    {"invest": 21, "impr": 22, "clicks": 24, "leads": 27},
    "meta_awareness":   {"invest": 30, "impr": 31, "engaj": 33},
    "google_awareness": {"invest": 35, "impr": 36, "engaj": 38},
    "sf":               {"mql": 43, "sql": 46, "vendas": 49, "faturamento": 52},
}


def col_letter(n):
    """1 -> 'A', 14 -> 'N', 27 -> 'AA'."""
    if n < 1:
        raise ValueError(f"coluna inválida: {n}")
    s = ""
    while n > 0:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def _serial_to_date(serial):
    return _SHEETS_EPOCH + timedelta(days=int(serial))


def resolve_realizado_column(row1, row2, ano, mes):
    """Índice 1-based da coluna 'Realizado' cujo serial (row1) cai em ano/mês.
    row2[i] deve ser 'Realizado'. Retorna None se não existir."""
    for i, v in enumerate(row1):
        r2 = row2[i] if i < len(row2) else ""
        if str(r2).strip().lower() != "realizado":
            continue
        if isinstance(v, bool):
            continue
        if isinstance(v, (int, float)):
            d = _serial_to_date(v)
            if d.year == ano and d.month == mes:
                return i + 1
    return None


def cell_updates(col, data):
    """col: letra da coluna. data: {bloco: {métrica: valor}}.
    Retorna [(A1, valor)] na ordem de ROWS, ignorando None (0 é gravado)."""
    out = []
    for block, metrics in ROWS.items():
        vals = data.get(block, {})
        for metric, row in metrics.items():
            value = vals.get(metric)
            if value is not None:
                out.append((f"{col}{row}", value))
    return out


def write_updates(worksheet, updates):
    """batch_update numa worksheet gspread. Retorna nº de células gravadas."""
    body = [{"range": a1, "values": [[value]]} for a1, value in updates]
    if body:
        worksheet.batch_update(body)
    return len(body)
