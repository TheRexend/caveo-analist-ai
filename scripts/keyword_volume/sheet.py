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


# gc.create() (abaixo, no branch de primeira execução) fala com a API do Google
# Drive, não só a de Sheets — criar um arquivo novo é uma operação de Drive.
# Isso exige a API do Drive habilitada no projeto GCP por trás de
# .claude/sheets_credentials.json (hoje, caveo-496716) além do scope
# drive.file já pedido em authorize(). Se a API do Drive estiver desabilitada
# nesse projeto, gc.create() falha com 403 "Google Drive API has not been
# used in project ... or it is disabled" — não é um bug de código, é uma
# configuração do projeto GCP, feita uma única vez em
# https://console.developers.google.com/apis/api/drive.googleapis.com.
# Contorno sem depender de habilitar a API: crie manualmente uma planilha em
# branco, compartilhe-a (Editor) com o e-mail de service account desse
# credentials.json (client_email), e grave o ID da planilha em
# scripts/keyword_volume/.sheet_id (gitignorado) — isso faz get_or_create_spreadsheet
# pular direto pro branch open_by_key(), que só precisa do scope de Sheets.
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
        ws = spreadsheet.worksheet(tab_name)
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title=tab_name, rows="1000", cols=str(len(HEADER)))
        ws.append_row(HEADER)
        return ws

    # A aba já existia (ex.: uma segunda execução no mesmo dia, já que
    # --tab-name usa a data de hoje por padrão). write_rows() só sabe dar
    # append — sem isso, cada re-execução duplicaria as linhas de dado.
    # Zera de volta pra só o cabeçalho antes de devolver, deixando a escrita
    # idempotente; uma aba nova (branch acima) não precisa disso.
    if len(ws.get_all_values()) > 1:
        ws.resize(rows=1)
    return ws


def write_rows(worksheet, rows):
    if rows:
        worksheet.append_rows(rows)
    return len(rows)
