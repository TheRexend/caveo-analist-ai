#!/usr/bin/env python3
"""
Servidor MCP local para Salesforce REST API.
Protocolo: JSON-RPC 2.0 sobre stdio (MCP spec 2024-11-05).
Suporta renovação automática de access_token via refresh_token.
"""
import json, os, sys, urllib.request, urllib.parse, urllib.error

INSTANCE_URL   = os.environ.get("SF_INSTANCE_URL",   "https://caveo.my.salesforce.com")
CLIENT_ID      = os.environ.get("SF_CLIENT_ID",      "")
CLIENT_SECRET  = os.environ.get("SF_CLIENT_SECRET",  "")
REFRESH_TOKEN  = os.environ.get("SF_REFRESH_TOKEN",  "")
API_VERSION    = "v63.0"

_access_token = os.environ.get("SF_ACCESS_TOKEN", "")


def refresh_access_token():
    global _access_token
    data = urllib.parse.urlencode({
        "grant_type":    "refresh_token",
        "client_id":     CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "refresh_token": REFRESH_TOKEN,
    }).encode()
    req = urllib.request.Request(
        f"{INSTANCE_URL}/services/oauth2/token",
        data=data,
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        tokens = json.loads(r.read())
    _access_token = tokens["access_token"]
    return _access_token


def sf_request(path, retry=True):
    url = f"{INSTANCE_URL}/services/data/{API_VERSION}{path}"
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {_access_token}", "Accept": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        if e.code == 401 and retry and REFRESH_TOKEN:
            refresh_access_token()
            return sf_request(path, retry=False)
        raise


def sf_query(soql):
    encoded = urllib.parse.quote(soql)
    return sf_request(f"/query?q={encoded}")


def sf_query_all(soql, max_records=10000):
    encoded = urllib.parse.quote(soql)
    result = sf_request(f"/query?q={encoded}")
    records = list(result.get("records", []))

    while not result.get("done") and result.get("nextRecordsUrl") and len(records) < max_records:
        path = result["nextRecordsUrl"].split(f"/services/data/{API_VERSION}")[-1]
        result = sf_request(path)
        records.extend(result.get("records", []))

    return {"totalSize": len(records), "done": True, "records": records[:max_records]}


def sf_describe(object_name):
    data = sf_request(f"/sobjects/{object_name}/describe")
    fields = [
        {"name": f["name"], "label": f["label"], "type": f["type"]}
        for f in data.get("fields", [])
    ]
    return {"objectName": object_name, "fields": fields}


TOOLS = [
    {
        "name": "salesforce_query",
        "description": (
            "Executa uma query SOQL no Salesforce da Caveo. "
            "Use para buscar Leads, Oportunidades e outros objetos com campos UTM "
            "(UtmSou__c, UtmMed__c, UtmCam__c, UtmCon__c, UtmTer__c, UrlUtm__c). "
            "Retorna até 2000 registros por chamada."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Query SOQL completa (SELECT ... FROM ... WHERE ...)"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "salesforce_query_all",
        "description": (
            "Executa SOQL com paginação automática, retornando todos os registros "
            "mesmo quando o resultado ultrapassa 2000 linhas."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Query SOQL completa"},
                "max_records": {"type": "integer", "description": "Limite máximo de registros (padrão: 10000)", "default": 10000}
            },
            "required": ["query"]
        }
    },
    {
        "name": "salesforce_describe",
        "description": "Descreve os campos de um objeto Salesforce (ex: Lead, Opportunity, Contact).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "object_name": {"type": "string", "description": "Nome do objeto (ex: Lead, Opportunity)"}
            },
            "required": ["object_name"]
        }
    }
]


def handle(req):
    method = req.get("method", "")

    if method == "initialize":
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "salesforce-mcp", "version": "1.1.0"}
        }

    if method in ("notifications/initialized", "ping"):
        return None

    if method == "tools/list":
        return {"tools": TOOLS}

    if method == "tools/call":
        name = req["params"]["name"]
        args = req["params"].get("arguments", {})
        try:
            if name == "salesforce_query":
                data = sf_query(args["query"])
                text = json.dumps(data, indent=2, ensure_ascii=False)
            elif name == "salesforce_query_all":
                data = sf_query_all(args["query"], args.get("max_records", 10000))
                text = json.dumps(data, indent=2, ensure_ascii=False)
            elif name == "salesforce_describe":
                data = sf_describe(args["object_name"])
                text = json.dumps(data, indent=2, ensure_ascii=False)
            else:
                return {"content": [{"type": "text", "text": f"Ferramenta desconhecida: {name}"}], "isError": True}
            return {"content": [{"type": "text", "text": text}]}
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            return {"content": [{"type": "text", "text": f"Erro HTTP {e.code}: {body}"}], "isError": True}
        except Exception as e:
            return {"content": [{"type": "text", "text": f"Erro: {e}"}], "isError": True}

    return None


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            continue

        req_id = req.get("id")
        result = handle(req)
        if result is None:
            continue

        sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": req_id, "result": result}) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
