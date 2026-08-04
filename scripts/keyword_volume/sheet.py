"""Linhas da planilha (puro) + escrita no Google Sheets (I/O fino).

Mesma credencial/autenticação já usada pelas outras skills do projeto
(.claude/sheets_credentials.json via gspread).
"""
import os
import gspread
from google.oauth2.service_account import Credentials

_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"
_CREDENTIALS_FILE = ".claude/sheets_credentials.json"

HEADER = [
    "Keyword", "Tema/Ad group candidato", "Balde de funil",
    "Volume médio mensal", "Concorrência", "Lance mín. (R$)", "Lance máx. (R$)",
]


def build_sheet_rows(rows, theme_lookup):
    """PURO: junta as métricas já ordenadas (parser.sorted_rows) com o mapeamento
    tema/balde de funil do seeds CSV, pronto pra gravar na planilha."""
    out = []
    for row in rows:
        tema, balde = theme_lookup.get(row["keyword"], ("(não mapeado)", "(não mapeado)"))
        out.append([
            row["keyword"],
            tema,
            balde,
            row["avg_monthly_searches"] if row["avg_monthly_searches"] is not None else "",
            row["competition"],
            row["low_bid_brl"] if row["low_bid_brl"] is not None else "",
            row["high_bid_brl"] if row["high_bid_brl"] is not None else "",
        ])
    return out


def authorize():
    creds = Credentials.from_service_account_file(_CREDENTIALS_FILE, scopes=[_SHEETS_SCOPE, _DRIVE_SCOPE])
    return gspread.authorize(creds)


def get_or_create_spreadsheet(gc, sheet_id_path, title, share_email):
    if os.path.exists(sheet_id_path):
        with open(sheet_id_path) as f:
            sheet_id = f.read().strip()
        return gc.open_by_key(sheet_id)

    sh = gc.create(title)
    sh.share(share_email, perm_type="user", role="writer")
    with open(sheet_id_path, "w") as f:
        f.write(sh.id)
    return sh


def get_or_create_worksheet(spreadsheet, tab_name):
    try:
        return spreadsheet.worksheet(tab_name)
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title=tab_name, rows="1000", cols=str(len(HEADER)))
        ws.append_row(HEADER)
        return ws


def write_rows(worksheet, rows):
    if rows:
        worksheet.append_rows(rows)
    return len(rows)
