"""Lê as credenciais do Google Ads já usadas pelo MCP, direto do .mcp.json.

Fonte única de verdade: em vez de duplicar developer token / customer id /
caminho da service account num .env separado, reaproveita o que já existe em
.mcp.json (gitignorado) para o servidor google-ads-mcp.
"""
import json


def load_google_ads_config(mcp_json_path=".mcp.json"):
    with open(mcp_json_path) as f:
        data = json.load(f)
    env = data["mcpServers"]["google-ads-mcp"]["env"]
    return {
        "developer_token": env["GOOGLE_ADS_DEVELOPER_TOKEN"],
        "login_customer_id": env["GOOGLE_ADS_LOGIN_CUSTOMER_ID"],
        "target_customer_id": env["GOOGLE_ADS_TARGET_CUSTOMER_ID"],
        "credentials_path": env["GOOGLE_APPLICATION_CREDENTIALS"],
    }
