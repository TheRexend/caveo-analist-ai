"""Mapeamento dia→linha e gravação na aba 'Resultados Mês Atual'.

Blocos: Médico (dia d → linha 45+d), Formando (dia d → linha 87+d). TOTAL é
fórmula =MÉDICO+FORMANDO e nunca é tocado. Ver Global Constraints do plano.
"""

BLOCK_BASE = {"medico": 45, "formando": 87}

# Métrica -> coluna (idêntico nos dois blocos). Ordem define a ordem dos updates.
COLS = {
    "invest_meta": "C",
    "leads_meta": "E",
    "mql_meta": "F",
    "sql_meta": "G",
    "invest_google": "I",
    "leads_google": "K",
    "mql_google": "L",
    "sql_google": "M",
    "fechamento": "O",
}


def day_to_row(segment, day):
    if segment not in BLOCK_BASE:
        raise ValueError(f"segmento inválido: {segment!r} (use 'medico' ou 'formando')")
    if not (1 <= day <= 31):
        raise ValueError(f"dia fora de 1..31: {day}")
    return BLOCK_BASE[segment] + day


def cell_updates(segment, day, metrics):
    """[(A1, valor)] só para as chaves presentes e não-None, na ordem de COLS."""
    row = day_to_row(segment, day)
    out = []
    for key, col in COLS.items():
        value = metrics.get(key)
        if value is not None:
            out.append((f"{col}{row}", value))
    return out


def write_updates(worksheet, updates):
    """batch_update numa worksheet gspread. Retorna nº de células gravadas."""
    body = [{"range": a1, "values": [[value]]} for a1, value in updates]
    if body:
        worksheet.batch_update(body)
    return len(body)


def _parse_fechamento_cell(cell):
    """'' (ausente/vazio) -> None; string numérica -> int (0 é valor real)."""
    if not cell:
        return None
    return int(cell)


def read_fechamentos(worksheet):
    """{'medico': {dia: valor_ou_None}, 'formando': {...}} a partir da coluna O
    (fechamento) dos blocos Médico/Formando. Espelha cell_updates/write_updates
    (escrita) com uma leitura simétrica."""
    out = {}
    for seg, base in BLOCK_BASE.items():
        first_row, last_row = base + 1, base + 31
        rows = worksheet.get(f"O{first_row}:O{last_row}")
        days = {}
        for day in range(1, 32):
            idx = day - 1
            row = rows[idx] if idx < len(rows) else []
            cell = row[0] if row else ""
            days[day] = _parse_fechamento_cell(cell)
        out[seg] = days
    return out
