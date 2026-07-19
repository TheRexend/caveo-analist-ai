#!/bin/bash
# Lê credenciais do .mcp.json (e do arquivo Google OAuth) e sobe para a Vercel.
# Uso: bash scripts/push_env_to_vercel.sh
# Pré-requisito: vercel CLI autenticado e projeto vinculado (vercel link)

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MCP="$SCRIPT_DIR/.mcp.json"

if [ ! -f "$MCP" ]; then
  echo "❌ .mcp.json não encontrado em $SCRIPT_DIR"
  exit 1
fi

# Adiciona variável na Vercel (todos os environments)
add_env() {
  local key="$1"
  local value="$2"
  if [ -z "$value" ]; then
    echo "⚠️  $key está vazio — pulando"
    return
  fi
  echo "→ $key"
  # printf '%s' (não echo) para não interpretar os \n escapados do private_key GA4.
  printf '%s' "$value" | vercel env add "$key" production --yes 2>/dev/null || true
  printf '%s' "$value" | vercel env add "$key" preview   --yes 2>/dev/null || true
  printf '%s' "$value" | vercel env add "$key" development --yes 2>/dev/null || true
}

echo "📦 Lendo .mcp.json..."

# ── Meta ──────────────────────────────────────────────────────────────
META_ACCESS_TOKEN=$(python3 -c "import json; d=json.load(open('$MCP')); print(d['mcpServers']['meta-ads-mcp']['env']['META_ACCESS_TOKEN'])")
META_AD_ACCOUNT_ID=$(python3 -c "import json; d=json.load(open('$MCP')); print(d['mcpServers']['meta-ads-mcp']['env']['META_AD_ACCOUNT_ID'])")

add_env "META_ACCESS_TOKEN" "$META_ACCESS_TOKEN"
add_env "META_AD_ACCOUNT_ID" "$META_AD_ACCOUNT_ID"

# ── Salesforce ────────────────────────────────────────────────────────
SF_INSTANCE_URL=$(python3 -c "import json; d=json.load(open('$MCP')); print(d['mcpServers']['salesforce-mcp']['env']['SF_INSTANCE_URL'])")
SF_CLIENT_ID=$(python3 -c "import json; d=json.load(open('$MCP')); print(d['mcpServers']['salesforce-mcp']['env']['SF_CLIENT_ID'])")
SF_CLIENT_SECRET=$(python3 -c "import json; d=json.load(open('$MCP')); print(d['mcpServers']['salesforce-mcp']['env']['SF_CLIENT_SECRET'])")
SF_ACCESS_TOKEN=$(python3 -c "import json; d=json.load(open('$MCP')); print(d['mcpServers']['salesforce-mcp']['env']['SF_ACCESS_TOKEN'])")
SF_REFRESH_TOKEN=$(python3 -c "import json; d=json.load(open('$MCP')); print(d['mcpServers']['salesforce-mcp']['env']['SF_REFRESH_TOKEN'])")

add_env "SF_INSTANCE_URL"   "$SF_INSTANCE_URL"
add_env "SF_CLIENT_ID"      "$SF_CLIENT_ID"
add_env "SF_CLIENT_SECRET"  "$SF_CLIENT_SECRET"
add_env "SF_ACCESS_TOKEN"   "$SF_ACCESS_TOKEN"
add_env "SF_REFRESH_TOKEN"  "$SF_REFRESH_TOKEN"

# ── Google Ads — variáveis diretas ────────────────────────────────────
GOOGLE_ADS_DEVELOPER_TOKEN=$(python3 -c "import json; d=json.load(open('$MCP')); print(d['mcpServers']['google-ads-mcp']['env']['GOOGLE_ADS_DEVELOPER_TOKEN'])")
GOOGLE_ADS_LOGIN_CUSTOMER_ID=$(python3 -c "import json; d=json.load(open('$MCP')); print(d['mcpServers']['google-ads-mcp']['env']['GOOGLE_ADS_LOGIN_CUSTOMER_ID'])")
GOOGLE_ADS_TARGET_CUSTOMER_ID=$(python3 -c "import json; d=json.load(open('$MCP')); print(d['mcpServers']['google-ads-mcp']['env']['GOOGLE_ADS_TARGET_CUSTOMER_ID'])")

add_env "GOOGLE_ADS_DEVELOPER_TOKEN"     "$GOOGLE_ADS_DEVELOPER_TOKEN"
add_env "GOOGLE_ADS_LOGIN_CUSTOMER_ID"   "$GOOGLE_ADS_LOGIN_CUSTOMER_ID"
add_env "GOOGLE_ADS_TARGET_CUSTOMER_ID"  "$GOOGLE_ADS_TARGET_CUSTOMER_ID"

# ── Google Ads — OAuth do arquivo authorized_user ─────────────────────
CREDS_PATH=$(python3 -c "import json; d=json.load(open('$MCP')); print(d['mcpServers']['google-ads-mcp']['env']['GOOGLE_APPLICATION_CREDENTIALS'])")

if [ ! -f "$CREDS_PATH" ]; then
  # tenta resolver relativo ao projeto
  CREDS_PATH="$SCRIPT_DIR/$CREDS_PATH"
fi

if [ -f "$CREDS_PATH" ]; then
  GOOGLE_ADS_CLIENT_ID=$(python3 -c "import json; d=json.load(open('$CREDS_PATH')); print(d.get('client_id',''))")
  GOOGLE_ADS_CLIENT_SECRET=$(python3 -c "import json; d=json.load(open('$CREDS_PATH')); print(d.get('client_secret',''))")
  GOOGLE_ADS_REFRESH_TOKEN=$(python3 -c "import json; d=json.load(open('$CREDS_PATH')); print(d.get('refresh_token',''))")

  add_env "GOOGLE_ADS_CLIENT_ID"      "$GOOGLE_ADS_CLIENT_ID"
  add_env "GOOGLE_ADS_CLIENT_SECRET"  "$GOOGLE_ADS_CLIENT_SECRET"
  add_env "GOOGLE_ADS_REFRESH_TOKEN"  "$GOOGLE_ADS_REFRESH_TOKEN"
else
  echo "⚠️  Arquivo Google credentials não encontrado em: $CREDS_PATH"
  echo "   Adicione manualmente: GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN"
fi

# ── GA4 (Data API) — property id + service account inline ─────────────
GA4_PROPERTY_ID=$(python3 -c "import json; d=json.load(open('$MCP')); print(d['mcpServers'].get('ga4',{}).get('env',{}).get('GA4_PROPERTY_ID',''))")
add_env "GA4_PROPERTY_ID" "$GA4_PROPERTY_ID"

GA4_CREDS_PATH=$(python3 -c "import json; d=json.load(open('$MCP')); print(d['mcpServers'].get('ga4',{}).get('env',{}).get('GA4_CREDENTIALS',''))")
if [ -n "$GA4_CREDS_PATH" ] && [ ! -f "$GA4_CREDS_PATH" ]; then
  GA4_CREDS_PATH="$SCRIPT_DIR/$GA4_CREDS_PATH"
fi
if [ -f "$GA4_CREDS_PATH" ]; then
  # Minifica o service account para UMA linha (private_key mantém \n escapado);
  # o dashboard lê via GA4_CREDENTIALS_JSON → JSON.parse (ver lib/env.ts).
  GA4_CREDENTIALS_JSON=$(python3 -c "import json; print(json.dumps(json.load(open('$GA4_CREDS_PATH'))))")
  add_env "GA4_CREDENTIALS_JSON" "$GA4_CREDENTIALS_JSON"
else
  echo "⚠️  GA4 credentials não encontrado — adicione GA4_CREDENTIALS_JSON manualmente."
fi

echo ""
echo "✅ Concluído! Faça um redeploy na Vercel para aplicar as variáveis."
