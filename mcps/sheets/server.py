#!/usr/bin/env python3
"""
Servidor MCP local para Google Sheets.
Protocolo: JSON-RPC 2.0 sobre stdio (MCP spec 2024-11-05), no mesmo padrão do
mcps/salesforce/server.py.

Substitui os scripts gspread soltos das skills de relatório (planilha-resultados,
reporte-resultados-ka) por chamadas de ferramenta.

Dependências (mcps/.venv): gspread, google-auth  (ver requirements.txt).
Credenciais: reusa a service account das skills.

Env vars:
  SHEETS_CREDENTIALS  caminho do JSON do service account
                      (hoje: .claude/sheets_credentials.json —
                       reporte-ka-sheets@caveo-496716.iam.gserviceaccount.com)
"""
import json, os, sys

CREDS_PATH = os.environ.get("SHEETS_CREDENTIALS", "")
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

_gc = None


def _client():
    global _gc
    if _gc is None:
        import gspread                                    # pip: gspread
        from google.oauth2.service_account import Credentials  # pip: google-auth
        creds = Credentials.from_service_account_file(CREDS_PATH, scopes=SCOPES)
        _gc = gspread.authorize(creds)
    return _gc


def _read(spreadsheet_id, worksheet, cell_range=None):
    ws = _client().open_by_key(spreadsheet_id).worksheet(worksheet)
    return ws.get(cell_range) if cell_range else ws.get_all_values()


def _write(spreadsheet_id, worksheet, cell, values):
    ws = _client().open_by_key(spreadsheet_id).worksheet(worksheet)
    ws.update(values=values, range_name=cell)
    return {"updated": cell}


TOOLS = [
    {
        "name": "sheets_read",
        "description": "Lê valores de uma aba de planilha Google (por ID + nome da aba, com range opcional A1).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "spreadsheet_id": {"type": "string"},
                "worksheet": {"type": "string"},
                "range": {"type": "string", "description": "Range A1 opcional (ex: B2:H10)"},
            },
            "required": ["spreadsheet_id", "worksheet"],
        },
    },
    {
        "name": "sheets_write",
        "description": "Escreve uma matriz de valores num range A1 de uma aba (ex: cell 'B2', values [[123]]).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "spreadsheet_id": {"type": "string"},
                "worksheet": {"type": "string"},
                "cell": {"type": "string", "description": "Range A1 (ex: B2 ou A29:H29)"},
                "values": {"type": "array", "description": "Matriz [[...]] de valores"},
            },
            "required": ["spreadsheet_id", "worksheet", "cell", "values"],
        },
    },
]


def handle(req):
    method = req.get("method", "")
    if method == "initialize":
        return {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}},
                "serverInfo": {"name": "sheets-mcp", "version": "0.1.0"}}
    if method in ("notifications/initialized", "ping"):
        return None
    if method == "tools/list":
        return {"tools": TOOLS}
    if method == "tools/call":
        name = req["params"]["name"]
        args = req["params"].get("arguments", {})
        try:
            if name == "sheets_read":
                data = _read(args["spreadsheet_id"], args["worksheet"], args.get("range"))
            elif name == "sheets_write":
                data = _write(args["spreadsheet_id"], args["worksheet"], args["cell"], args["values"])
            else:
                return {"content": [{"type": "text", "text": f"Ferramenta desconhecida: {name}"}], "isError": True}
            return {"content": [{"type": "text", "text": json.dumps(data, indent=2, ensure_ascii=False)}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": f"Erro: {e}"}], "isError": True}
    return None


def main():
    if not CREDS_PATH:
        sys.stderr.write("[sheets-mcp] Defina SHEETS_CREDENTIALS.\n")
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            continue
        result = handle(req)
        if result is None:
            continue
        sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": req.get("id"), "result": result}) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
