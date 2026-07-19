#!/usr/bin/env python3
"""
Servidor MCP local para Google Analytics 4 (Data API v1beta).
Protocolo: JSON-RPC 2.0 sobre stdio (MCP spec 2024-11-05), no mesmo padrão do
mcps/salesforce/server.py.

Serve o agente `ga4-analise` e a skill `reporte-ga4`.

Dependências (mcps/.venv): google-auth, requests  (ver requirements.txt).
Credenciais: service account com acesso à propriedade GA4 da Caveo.

Env vars:
  GA4_PROPERTY_ID              ID numérico da propriedade GA4 (ex: 123456789)
  GOOGLE_APPLICATION_CREDENTIALS  caminho do JSON do service account
"""
import json, os, sys

PROPERTY_ID = os.environ.get("GA4_PROPERTY_ID", "")
CREDS_PATH = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]
BASE = "https://analyticsdata.googleapis.com/v1beta"

_token = ""


def _access_token():
    """Token do service account via google-auth (RS256 — não dá p/ fazer só com stdlib)."""
    global _token
    from google.oauth2 import service_account          # pip: google-auth
    from google.auth.transport.requests import Request  # pip: google-auth (requests)
    creds = service_account.Credentials.from_service_account_file(CREDS_PATH, scopes=SCOPES)
    creds.refresh(Request())
    _token = creds.token
    return _token


def _run_report(body):
    import requests  # pip: requests
    if not _token:
        _access_token()
    url = f"{BASE}/properties/{PROPERTY_ID}:runReport"
    r = requests.post(url, headers={"Authorization": f"Bearer {_token}"}, json=body)
    if r.status_code == 401:
        _access_token()
        r = requests.post(url, headers={"Authorization": f"Bearer {_token}"}, json=body)
    r.raise_for_status()
    return r.json()


TOOLS = [
    {
        "name": "ga4_run_report",
        "description": (
            "Roda um relatório na GA4 Data API (runReport) da propriedade da Caveo. "
            "Passe dimensions, metrics e dateRanges. Ex de métricas: activeUsers, "
            "sessions, newUsers, engagementRate, averageSessionDuration, conversions. "
            "Ex de dimensões: sessionDefaultChannelGroup, landingPage, pagePath, "
            "sessionSource, sessionMedium."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "dimensions": {"type": "array", "items": {"type": "string"}, "description": "Nomes de dimensões GA4"},
                "metrics": {"type": "array", "items": {"type": "string"}, "description": "Nomes de métricas GA4"},
                "date_start": {"type": "string", "description": "YYYY-MM-DD"},
                "date_end": {"type": "string", "description": "YYYY-MM-DD"},
                "limit": {"type": "integer", "default": 100},
            },
            "required": ["metrics", "date_start", "date_end"],
        },
    }
]


def handle(req):
    method = req.get("method", "")
    if method == "initialize":
        return {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}},
                "serverInfo": {"name": "ga4-mcp", "version": "0.1.0"}}
    if method in ("notifications/initialized", "ping"):
        return None
    if method == "tools/list":
        return {"tools": TOOLS}
    if method == "tools/call":
        name = req["params"]["name"]
        args = req["params"].get("arguments", {})
        try:
            if name == "ga4_run_report":
                body = {
                    "dateRanges": [{"startDate": args["date_start"], "endDate": args["date_end"]}],
                    "dimensions": [{"name": d} for d in args.get("dimensions", [])],
                    "metrics": [{"name": m} for m in args["metrics"]],
                    "limit": args.get("limit", 100),
                }
                data = _run_report(body)
                text = json.dumps(data, indent=2, ensure_ascii=False)
            else:
                return {"content": [{"type": "text", "text": f"Ferramenta desconhecida: {name}"}], "isError": True}
            return {"content": [{"type": "text", "text": text}]}
        except Exception as e:
            return {"content": [{"type": "text", "text": f"Erro: {e}"}], "isError": True}
    return None


def main():
    if not PROPERTY_ID or not CREDS_PATH:
        sys.stderr.write("[ga4-mcp] Defina GA4_PROPERTY_ID e GOOGLE_APPLICATION_CREDENTIALS.\n")
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
