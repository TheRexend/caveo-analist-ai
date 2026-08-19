"""Métricas de vídeo do Meta Ads pela Graph API.

Módulo de I/O. Existe porque o MCP do Meta tem lista de campos FIXA e não
expõe video_p*_watched_actions nem video_thruplay_watched_actions — sem eles
não há hold rate. Todo o resto (impressões, cliques, spend, actions) o MCP dá.

Credencial: lida de .mcp.json, o mesmo caminho de scripts/push_env_to_vercel.sh.
Nenhuma credencial nova.
"""
import json
from pathlib import Path

import requests

CONTA = "act_438086148409254"
API = "https://graph.facebook.com/v25.0"

CAMPOS = ",".join([
    "ad_id", "ad_name", "adset_id", "adset_name", "campaign_name",
    "impressions", "spend", "actions",
    "video_play_actions", "video_thruplay_watched_actions",
    "video_p25_watched_actions", "video_p50_watched_actions",
    "video_p75_watched_actions", "video_p100_watched_actions",
])


def token(caminho_mcp=".mcp.json"):
    """O META_ACCESS_TOKEN do .mcp.json. Falha alto se não existir."""
    p = Path(caminho_mcp)
    if not p.exists():
        raise RuntimeError(
            f"Não achei {p} para ler o token do Meta. "
            "A skill não pode gerar o deck sem as métricas de retenção.")
    dados = json.loads(p.read_text(encoding="utf-8"))
    tok = (dados.get("mcpServers", {}).get("meta-ads-mcp", {})
           .get("env", {}).get("META_ACCESS_TOKEN"))
    if not tok:
        raise RuntimeError(
            "META_ACCESS_TOKEN ausente em mcpServers.meta-ads-mcp.env "
            f"de {p}. A skill não pode gerar o deck sem retenção.")
    return tok


def extrair(lista, tipo):
    """Soma o `value` das entradas de `actions` cujo action_type bate."""
    if not lista:
        return 0
    return sum(int(float(e["value"])) for e in lista
               if e.get("action_type") == tipo)


def normalizar(linha):
    """Linha crua da Graph API → dicionário que framework.avaliar consome."""
    acoes = linha.get("actions")
    return {
        "ad_id": linha["ad_id"],
        "ad_name": linha["ad_name"],
        "adset_id": linha["adset_id"],
        "campaign_name": linha["campaign_name"],
        "impressoes": int(linha.get("impressions", 0)),
        # video_view no Meta É a view de 3 segundos.
        "views_3s": extrair(acoes, "video_view"),
        "p75": extrair(linha.get("video_p75_watched_actions"), "video_view"),
        "link_clicks": extrair(acoes, "link_click"),
        "registros": extrair(acoes, "complete_registration"),
        "spend": float(linha.get("spend", 0.0)),
    }


def insights_video(since, until, tok, conta=CONTA):
    """Insights nível anúncio COM os campos de vídeo. Casca fina sobre HTTP."""
    linhas, url = [], f"{API}/{conta}/insights"
    params = {
        "level": "ad", "fields": CAMPOS, "limit": 200, "access_token": tok,
        "time_range": json.dumps({"since": since, "until": until}),
    }
    while url:
        r = requests.get(url, params=params, timeout=60)
        r.raise_for_status()
        corpo = r.json()
        linhas.extend(corpo.get("data", []))
        url = corpo.get("paging", {}).get("next")
        params = None   # o `next` já vem com querystring completa
    return [normalizar(l) for l in linhas]
