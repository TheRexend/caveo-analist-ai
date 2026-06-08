#!/usr/bin/env python3
"""
Caveo Analyst AI — Dashboard API Server
Flask · porta 8765 · Meta Ads + Google Ads + Salesforce + SQLite goals
"""
import json, os, sqlite3, sys, urllib.request, urllib.parse, urllib.error
from datetime import datetime, date, timedelta
from flask import Flask, jsonify, request, send_from_directory, send_file

# ── Auto-carregar credenciais do .mcp.json do projeto ────────────────────────
def _load_mcp_env():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    mcp_path = os.path.join(base, ".mcp.json")
    try:
        with open(mcp_path) as f:
            mcp = json.load(f)
        for server in mcp.get("mcpServers", {}).values():
            for k, v in server.get("env", {}).items():
                if k not in os.environ:
                    os.environ[k] = v
    except Exception:
        pass

_load_mcp_env()

# ── Config ─────────────────────────────────────────────────────────────────
META_TOKEN    = os.environ.get("META_ACCESS_TOKEN", "")
META_ACCOUNT  = os.environ.get("META_AD_ACCOUNT_ID", "act_438086148409254")
GADS_DEVTOKEN = os.environ.get("GOOGLE_ADS_DEVELOPER_TOKEN", "")
GADS_TARGET   = os.environ.get("GOOGLE_ADS_TARGET_CUSTOMER_ID", "3921127876")
GADS_LOGIN    = os.environ.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID", "5029399396")
GADS_CREDS    = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
SF_INSTANCE   = os.environ.get("SF_INSTANCE_URL", "https://caveo.my.salesforce.com")
SF_CLIENT_ID  = os.environ.get("SF_CLIENT_ID", "")
SF_SECRET     = os.environ.get("SF_CLIENT_SECRET", "")
SF_REFRESH    = os.environ.get("SF_REFRESH_TOKEN", "")
SF_TOKEN      = os.environ.get("SF_ACCESS_TOKEN", "")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "goals.db")

app = Flask(__name__, static_folder="static")

# ── CORS helper ──────────────────────────────────────────────────────────────
@app.after_request
def _cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    return resp

# ── SQLite goals ─────────────────────────────────────────────────────────────
def _db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS monthly_goals (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            month      TEXT NOT NULL,
            metric     TEXT NOT NULL,
            value      REAL NOT NULL,
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_month_metric
        ON monthly_goals(month, metric)
    """)
    conn.commit()
    return conn

# ── Salesforce helpers ────────────────────────────────────────────────────────
_sf_token = SF_TOKEN

def _sf_refresh():
    global _sf_token
    data = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "client_id": SF_CLIENT_ID,
        "client_secret": SF_SECRET,
        "refresh_token": SF_REFRESH,
    }).encode()
    req = urllib.request.Request(
        f"{SF_INSTANCE}/services/oauth2/token", data=data, method="POST"
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        _sf_token = json.loads(r.read())["access_token"]
    return _sf_token

def _sf_query(soql, retry=True):
    global _sf_token
    if not _sf_token and not SF_REFRESH:
        return None
    encoded = urllib.parse.quote(soql)
    url = f"{SF_INSTANCE}/services/data/v63.0/query?q={encoded}"
    req = urllib.request.Request(
        url, headers={"Authorization": f"Bearer {_sf_token}", "Accept": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        if e.code == 401 and retry and SF_REFRESH:
            _sf_refresh()
            return _sf_query(soql, retry=False)
        return None

def _sf_query_all(soql):
    result = _sf_query(soql)
    if not result:
        return []
    records = list(result.get("records", []))
    while not result.get("done") and result.get("nextRecordsUrl"):
        path = result["nextRecordsUrl"]
        req = urllib.request.Request(
            f"{SF_INSTANCE}{path}" if path.startswith("/") else path,
            headers={"Authorization": f"Bearer {_sf_token}", "Accept": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                result = json.loads(r.read())
            records.extend(result.get("records", []))
        except Exception:
            break
    return records

# ── Meta Ads helpers ──────────────────────────────────────────────────────────
def _meta_get(path, params):
    if not META_TOKEN:
        print("[Meta] TOKEN ausente — sem dados", file=sys.stderr)
        return None
    params["access_token"] = META_TOKEN
    qs = urllib.parse.urlencode(params)
    url = f"https://graph.facebook.com/v21.0{path}?{qs}"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read())
        if "error" in data:
            print(f"[Meta] API error: {data['error']}", file=sys.stderr)
            return None
        return data
    except Exception as e:
        print(f"[Meta] request falhou: {e}", file=sys.stderr)
        return None

def _meta_paginate(path, params):
    first = _meta_get(path, params)
    if not first:
        return []
    records = list(first.get("data", []))
    paging = first.get("paging", {})
    while paging.get("next"):
        try:
            req = urllib.request.Request(paging["next"])
            with urllib.request.urlopen(req, timeout=20) as r:
                page = json.loads(r.read())
            records.extend(page.get("data", []))
            paging = page.get("paging", {})
        except Exception:
            break
    return records

def _meta_insights(date_from, date_to, level="campaign"):
    params = {
        "level": level,
        "fields": "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions",
        "time_range": json.dumps({"since": date_from, "until": date_to}),
        "filtering": json.dumps([{"field": "campaign.name", "operator": "CONTAIN", "value": "[LEADS]"}]),
        "limit": 100,
    }
    return _meta_paginate(f"/{META_ACCOUNT}/insights", params)

def _meta_all_campaigns(date_from, date_to):
    """Busca todas as campanhas ativas (sem filtro de nome) — usada na tabela de campanhas."""
    params = {
        "level": "campaign",
        "fields": "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions",
        "time_range": json.dumps({"since": date_from, "until": date_to}),
        "limit": 200,
    }
    return _meta_paginate(f"/{META_ACCOUNT}/insights", params)

def _meta_insights_daily(date_from, date_to):
    params = {
        "level": "account",
        "fields": "spend,impressions,clicks,actions",
        "time_range": json.dumps({"since": date_from, "until": date_to}),
        "time_increment": "1",
        "filtering": json.dumps([{"field": "campaign.name", "operator": "CONTAIN", "value": "[LEADS]"}]),
        "limit": 100,
    }
    return _meta_paginate(f"/{META_ACCOUNT}/insights", params)

def _meta_leads_from_actions(actions):
    # Usa APENAS "lead" (tipo-pai que agrega todos os sub-tipos).
    # "offsite_conversion.fb_pixel_lead" e "onsite_web_lead" têm o mesmo valor — somá-los causaria dupla/tripla contagem.
    for a in (actions or []):
        if a.get("action_type") == "lead":
            return int(float(a.get("value", 0)))
    return 0

# ── Google Ads helpers (SDK gRPC) ─────────────────────────────────────────────
_gads_sdk_client = None

def _gads_client():
    """Retorna GoogleAdsClient com cache. Usa SDK gRPC (requer google-ads package)."""
    global _gads_sdk_client
    if _gads_sdk_client is not None:
        return _gads_sdk_client
    if not GADS_DEVTOKEN:
        print("[Google] GOOGLE_ADS_DEVELOPER_TOKEN ausente", file=sys.stderr)
        return None
    if not GADS_CREDS or not os.path.exists(GADS_CREDS):
        print(f"[Google] credenciais não encontradas: {GADS_CREDS!r}", file=sys.stderr)
        return None
    try:
        from google.ads.googleads.client import GoogleAdsClient
        with open(GADS_CREDS) as f:
            creds = json.load(f)
        if creds.get("type") == "service_account":
            print("[Google] ERRO: service_account não suportado — use authorized_user", file=sys.stderr)
            return None
        _gads_sdk_client = GoogleAdsClient.load_from_dict({
            "developer_token": GADS_DEVTOKEN,
            "client_id":       creds["client_id"],
            "client_secret":   creds["client_secret"],
            "refresh_token":   creds["refresh_token"],
            "login_customer_id": GADS_LOGIN.replace("-", ""),
            "use_proto_plus":  True,
        })
        print("[Google] SDK client criado com sucesso", file=sys.stderr)
        return _gads_sdk_client
    except ImportError:
        print("[Google] google-ads não instalado — rode: pip install google-ads", file=sys.stderr)
        return None
    except Exception as e:
        print(f"[Google] erro ao criar SDK client: {e}", file=sys.stderr)
        return None

def _gads_sdk_rows(gaql):
    """Executa GAQL via gRPC e retorna lista de proto-plus row objects."""
    client = _gads_client()
    if not client:
        return []
    try:
        ga_service = client.get_service("GoogleAdsService")
        customer_id = GADS_TARGET.replace("-", "")
        rows = []
        for batch in ga_service.search_stream(customer_id=customer_id, query=gaql):
            rows.extend(batch.results)
        return rows
    except Exception as e:
        print(f"[Google] erro na query SDK: {e}", file=sys.stderr)
        return []

def _gads_campaigns(date_from, date_to):
    gaql = f"""
        SELECT
          campaign.id, campaign.name,
          metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr,
          metrics.average_cpc, metrics.conversions
        FROM campaign
        WHERE segments.date BETWEEN '{date_from}' AND '{date_to}'
          AND metrics.cost_micros > 0
    """
    rows = _gads_sdk_rows(gaql.strip())
    if not rows and not _gads_client():
        return None
    results = []
    for row in rows:
        m, c = row.metrics, row.campaign
        results.append({
            "campaign": {"id": str(c.id), "name": c.name},
            "metrics": {
                "costMicros":   m.cost_micros,
                "impressions":  m.impressions,
                "clicks":       m.clicks,
                "ctr":          m.ctr,
                "averageCpc":   m.average_cpc,
                "conversions":  m.conversions,
            },
        })
    return {"results": results}

def _gads_daily(date_from, date_to):
    gaql = f"""
        SELECT segments.date,
               metrics.cost_micros, metrics.impressions,
               metrics.clicks, metrics.conversions
        FROM campaign
        WHERE segments.date BETWEEN '{date_from}' AND '{date_to}'
    """
    rows = _gads_sdk_rows(gaql.strip())
    by_date = {}
    for row in rows:
        d = row.segments.date
        m = row.metrics
        if not d:
            continue
        if d not in by_date:
            by_date[d] = {"invest": 0.0, "leads": 0, "oport": 0, "ganho": 0,
                          "impressions": 0, "clicks": 0}
        by_date[d]["invest"]      += m.cost_micros / 1_000_000
        by_date[d]["leads"]       += int(m.conversions)
        by_date[d]["impressions"] += m.impressions
        by_date[d]["clicks"]      += m.clicks
    return by_date

# ── Mock data (fallback) ──────────────────────────────────────────────────────
import math

def _mock_days(date_from, date_to):
    start = datetime.strptime(date_from, "%Y-%m-%d").date()
    end   = datetime.strptime(date_to,   "%Y-%m-%d").date()
    days = []
    i = 0
    d = start
    while d <= end:
        dow = d.weekday()
        wf  = 0.55 if dow >= 5 else 1.05
        seed = (d - date(2000, 1, 1)).days
        noise = 0.7 + abs(math.sin(seed * 1.7)) * 0.6
        trend = 1 + i * 0.005
        ig = 1100 * wf * noise * trend
        im = 850  * wf * noise * trend
        lg = max(1, round(7  * wf * (0.8 + abs(math.sin(seed * 3.1)) * 0.5) * trend))
        lm = max(1, round(5  * wf * (0.8 + abs(math.sin(seed * 2.3)) * 0.5) * trend))
        og = max(0, round(lg * (0.25 + abs(math.sin(seed * 4.1)) * 0.1)))
        om = max(0, round(lm * (0.20 + abs(math.sin(seed * 5.2)) * 0.1)))
        gg = max(0, round(og * (0.20 + abs(math.sin(seed * 6.3)) * 0.12)))
        gm = max(0, round(om * (0.18 + abs(math.sin(seed * 7.4)) * 0.10)))
        days.append({
            "date": d.isoformat(),
            "google": {"invest": round(ig, 2), "leads": lg, "oport": og, "ganho": gg,
                       "impressions": round(ig * 38), "clicks": round(ig * 0.9)},
            "meta":   {"invest": round(im, 2), "leads": lm, "oport": om, "ganho": gm,
                       "impressions": round(im * 62), "clicks": round(im * 1.4)},
        })
        i += 1
        d += timedelta(days=1)
    return days

MOCK_CAMPAIGNS = [
    {"id": "g1", "platform": "google", "name": "[LEADS] Search · Marca + Termos Quentes", "invest": 9840, "impr": 142300, "clicks": 6420, "leads": 78, "oport": 24, "ganho": 6},
    {"id": "g2", "platform": "google", "name": "[LEADS] PMax · Cobertura Geral",           "invest": 7210, "impr": 198400, "clicks": 4180, "leads": 52, "oport": 15, "ganho": 3},
    {"id": "g3", "platform": "google", "name": "[LEADS] Search · Concorrentes",             "invest": 4380, "impr":  62100, "clicks": 2890, "leads": 28, "oport":  6, "ganho": 1},
    {"id": "g4", "platform": "google", "name": "[LEADS] Display · Remarketing",             "invest": 1920, "impr": 312000, "clicks": 1180, "leads": 11, "oport":  3, "ganho": 1},
    {"id": "m1", "platform": "meta",   "name": "[LEADS] ABO · Advantage+ Top of Funnel",    "invest": 8120, "impr": 482100, "clicks": 9320, "leads": 64, "oport": 17, "ganho": 4},
    {"id": "m2", "platform": "meta",   "name": "[LEADS] CBO · Lookalike 1% Compradores",    "invest": 5640, "impr": 298400, "clicks": 5840, "leads": 41, "oport": 11, "ganho": 2},
    {"id": "m3", "platform": "meta",   "name": "[LEADS] Retargeting · 90d Engaged",         "invest": 2780, "impr": 132100, "clicks": 4210, "leads": 24, "oport":  7, "ganho": 1},
    {"id": "m4", "platform": "meta",   "name": "[LEADS] Advantage+ Reels Verticais",        "invest": 3990, "impr": 612400, "clicks": 3120, "leads": 14, "oport":  4, "ganho": 0},
]
for c in MOCK_CAMPAIGNS:
    c["ctr"]        = c["clicks"] / max(1, c["impr"])
    c["cpc"]        = c["invest"] / max(1, c["clicks"])
    c["cpl"]        = c["invest"] / max(1, c["leads"])
    c["cpo"]        = c["invest"] / max(1, c["oport"])
    c["cpf"]        = c["invest"] / max(1, c["ganho"])
    c["txLeadOport"] = c["oport"]  / max(1, c["leads"])
    c["txOportGanho"] = c["ganho"] / max(1, c["oport"])

DEFAULT_FROM = "2026-05-01"
DEFAULT_TO   = date.today().isoformat()

# ── Aggregation helpers ───────────────────────────────────────────────────────
def _agg_days(days, platform):
    s = {"invest": 0.0, "leads": 0, "oport": 0, "ganho": 0}
    for d in days:
        srcs = [d["google"], d["meta"]] if platform == "all" else [d[platform]]
        for x in srcs:
            s["invest"] += x["invest"]
            s["leads"]  += x["leads"]
            s["oport"]  += x["oport"]
            s["ganho"]  += x["ganho"]
    return s

def _derive_metrics(s):
    return {
        **s,
        "cpl":           s["invest"] / max(1, s["leads"]),
        "cpo":           s["invest"] / max(1, s["oport"]),
        "cpf":           s["invest"] / max(1, s["ganho"]),
        "tx_conv":       s["ganho"]  / max(1, s["oport"]),
        "oport_perdidas": max(0, round(s["oport"] * 0.62)),
    }

# ── Salesforce live data ──────────────────────────────────────────────────────
UTM_FILTER = {
    # "Todos" = apenas mídia paga (Meta + Google), sem tráfego orgânico/direto.
    # Inclui {{placement}} — tag Meta não resolvida que ainda identifica o anúncio.
    # IMPORTANTE: não usar UtmMed__c IN ('cpc','ppc') — Meta também usa cpc e contaminaria o filtro Google.
    "all":    "AND (UtmSou__c LIKE 'facebook%' OR UtmSou__c LIKE 'instagram%' "
              "OR UtmSou__c LIKE 'google%' OR UtmSou__c = '{{placement}}' "
              "OR UtmMed__c = 'paid_social')",
    "meta":   "AND (UtmSou__c LIKE 'facebook%' OR UtmSou__c LIKE 'instagram%' "
              "OR UtmSou__c = '{{placement}}' OR UtmMed__c = 'paid_social')",
    "google": "AND UtmSou__c LIKE 'google%'",
}

# Estágios reais do Salesforce da Caveo (confirmados via SOQL em 2026-05-26)
WON_STAGES  = {"Fechado", "Ganho não Identificado"}
LOST_STAGES = {"Perdido"}
EM_TRATAMENTO_STAGES = {
    "Nova", "Contato Realizado", "Aguardando Resposta",
    "Reunião Agendada", "Standy-By", "Stand By", "Transferido para humano",
}
PROPOSTA_STAGES = {"Proposta Enviada"}

def _sf_funnel(date_from, date_to, platform):
    utmf = UTM_FILTER.get(platform, UTM_FILTER["all"])

    # Oportunidades por estágio com UTM de mídia paga
    oport_q = (
        f"SELECT StageName, COUNT(Id) cnt FROM Opportunity "
        f"WHERE CreatedDate >= {date_from}T00:00:00Z "
        f"  AND CreatedDate <= {date_to}T23:59:59Z "
        f"  {utmf} "
        f"GROUP BY StageName"
    )
    or_ = _sf_query(oport_q)
    if not or_ or not or_.get("records"):
        return None

    by_stage = {r["StageName"]: r["cnt"] for r in or_["records"]}

    em_tratamento = sum(v for k, v in by_stage.items() if k in EM_TRATAMENTO_STAGES)
    proposta      = sum(v for k, v in by_stage.items() if k in PROPOSTA_STAGES)
    ganho         = sum(v for k, v in by_stage.items() if k in WON_STAGES)
    perdido       = sum(v for k, v in by_stage.items() if k in LOST_STAGES)
    # Total de opps no CRM = todas as etapas (UTM tracking é no Opportunity, não no Lead)
    total_opps    = sum(by_stage.values())

    return {
        "no_crm":        total_opps,
        "em_tratamento": em_tratamento,
        "proposta":      proposta,
        "ganho":         ganho,
        "perdido":      perdido,
    }

# ── Meta live campaigns ───────────────────────────────────────────────────────
def _build_meta_campaigns(rows):
    result = []
    for r in rows:
        invest = float(r.get("spend", 0))
        impr   = int(r.get("impressions", 0))
        clicks = int(r.get("clicks", 0))
        leads  = _meta_leads_from_actions(r.get("actions", []))
        cid    = r.get("campaign_id", r.get("campaign_name", "?"))
        result.append({
            "id":       f"m_{cid}",
            "platform": "meta",
            "name":     r.get("campaign_name", ""),
            "invest":   invest,
            "impr":     impr,
            "clicks":   clicks,
            "leads":    leads,
            "oport":    0,
            "ganho":    0,
            "ctr":      float(r.get("ctr", clicks / max(1, impr))),
            "cpc":      float(r.get("cpc", invest / max(1, clicks))),
            "cpl":      invest / max(1, leads),
            "cpo":      0,
            "cpf":      0,
            "txLeadOport": 0,
            "txOportGanho": 0,
        })
    return result

def _build_google_campaigns(resp):
    if not resp:
        return []
    result = []
    for row in resp.get("results", []):
        m  = row.get("metrics", {})
        c  = row.get("campaign", {})
        invest = int(m.get("costMicros", 0)) / 1_000_000
        impr   = int(m.get("impressions", 0))
        clicks = int(m.get("clicks", 0))
        leads  = int(float(m.get("conversions", 0)))
        cid    = c.get("id", "?")
        result.append({
            "id":       f"g_{cid}",
            "platform": "google",
            "name":     c.get("name", ""),
            "invest":   invest,
            "impr":     impr,
            "clicks":   clicks,
            "leads":    leads,
            "oport":    0,
            "ganho":    0,
            "ctr":      float(m.get("ctr", clicks / max(1, impr))),
            "cpc":      invest / max(1, clicks),
            "cpl":      invest / max(1, leads),
            "cpo":      0,
            "cpf":      0,
            "txLeadOport": 0,
            "txOportGanho": 0,
        })
    return result

# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.route("/api/metrics")
def api_metrics():
    date_from = request.args.get("from", DEFAULT_FROM)
    date_to   = request.args.get("to",   DEFAULT_TO)
    platform  = request.args.get("platform", "all")

    # Investimento e leads vêm das PLATAFORMAS de anúncios
    meta_rows   = (_meta_insights(date_from, date_to) if META_TOKEN and platform in ("all", "meta") else []) or []
    gads_resp   = (_gads_campaigns(date_from, date_to) if GADS_DEVTOKEN and platform in ("all", "google") else None)

    meta_invest = sum(float(r.get("spend", 0)) for r in meta_rows)
    meta_leads  = sum(_meta_leads_from_actions(r.get("actions", [])) for r in meta_rows)
    gads_invest = sum(int(r.get("metrics", {}).get("costMicros", 0)) / 1_000_000
                      for r in (gads_resp or {}).get("results", []))
    gads_leads  = sum(int(float(r.get("metrics", {}).get("conversions", 0)))
                      for r in (gads_resp or {}).get("results", []))

    if platform == "all":
        invest = meta_invest + gads_invest
        leads  = meta_leads + gads_leads
    elif platform == "meta":
        invest, leads = meta_invest, meta_leads
    else:
        invest, leads = gads_invest, gads_leads

    # Oportunidades e fechamentos vêm do Salesforce (atribuição UTM)
    sf    = _sf_funnel(date_from, date_to, platform)
    oport = sf["no_crm"]   if sf else 0   # total de opps no CRM (todas as etapas)
    ganho = sf["ganho"]    if sf else 0
    lost  = sf["perdido"]  if sf else 0

    using_mock = not meta_rows and not gads_resp and not sf
    if using_mock:
        days = _mock_days(date_from, date_to)
        s    = _agg_days(days, platform)
        m    = _derive_metrics(s)
        m["_mock"] = True
        return jsonify(m)

    return jsonify({
        "invest":          round(invest, 2),
        "leads":           leads,
        "oport":           oport,
        "ganho":           ganho,
        "cpl":             invest / max(1, leads),
        "cpo":             invest / max(1, oport),
        "cpf":             invest / max(1, ganho),
        "tx_conv":         ganho  / max(1, oport),
        "oport_perdidas":  lost,
        "_mock":           False,
    })


@app.route("/api/campaigns")
def api_campaigns():
    date_from = request.args.get("from", DEFAULT_FROM)
    date_to   = request.args.get("to",   DEFAULT_TO)
    platform  = request.args.get("platform", "all")

    # Usa _meta_all_campaigns (sem filtro de nome) para mostrar todas as campanhas ativas
    meta_rows = (_meta_all_campaigns(date_from, date_to) if META_TOKEN and platform in ("all", "meta") else []) or []
    gads_resp = (_gads_campaigns(date_from, date_to) if GADS_DEVTOKEN and platform in ("all", "google") else None)

    using_mock = not meta_rows and not gads_resp

    if using_mock:
        rows = MOCK_CAMPAIGNS
        if platform != "all":
            rows = [c for c in rows if c["platform"] == platform]
        return jsonify(rows)

    meta_cams = _build_meta_campaigns(meta_rows)
    gads_cams = _build_google_campaigns(gads_resp)

    all_cams = []
    if platform in ("all", "meta"):
        all_cams.extend(meta_cams)
    if platform in ("all", "google"):
        all_cams.extend(gads_cams)

    return jsonify(all_cams)


@app.route("/api/funnel")
def api_funnel():
    date_from = request.args.get("from", DEFAULT_FROM)
    date_to   = request.args.get("to",   DEFAULT_TO)
    platform  = request.args.get("platform", "all")

    # Lead Novo = conversões nas plataformas de anúncios
    meta_rows  = (_meta_insights(date_from, date_to) if META_TOKEN and platform in ("all", "meta") else []) or []
    gads_resp  = (_gads_campaigns(date_from, date_to) if GADS_DEVTOKEN and platform in ("all", "google") else None)
    meta_leads = sum(_meta_leads_from_actions(r.get("actions", [])) for r in meta_rows)
    gads_leads = sum(int(float(r.get("metrics", {}).get("conversions", 0)))
                     for r in (gads_resp or {}).get("results", []))

    if platform == "all":
        lead_novo = meta_leads + gads_leads
    elif platform == "meta":
        lead_novo = meta_leads
    else:
        lead_novo = gads_leads

    # Etapas CRM = Salesforce com UTM de mídia paga
    sf = _sf_funnel(date_from, date_to, platform)

    if not sf and not meta_rows and not gads_resp:
        # Fallback mock
        days  = _mock_days(date_from, date_to)
        s     = _agg_days(days, platform)
        lv    = s["leads"]
        return jsonify({
            "lead_novo":     lv,
            "no_crm":        round(lv * 0.85),
            "em_tratamento": s["oport"],
            "proposta":      max(0, round(s["oport"] * 0.20)),
            "ganho":         s["ganho"],
            "perdido":       max(0, round(s["oport"] * 0.30)),
            "_mock": True,
        })

    return jsonify({
        "lead_novo":     lead_novo,
        "no_crm":        sf["no_crm"]        if sf else 0,
        "em_tratamento": sf["em_tratamento"]  if sf else 0,
        "proposta":      sf["proposta"]       if sf else 0,
        "ganho":         sf["ganho"]          if sf else 0,
        "perdido":       sf["perdido"]        if sf else 0,
        "_mock": False,
    })


@app.route("/api/timeline")
def api_timeline():
    date_from = request.args.get("from", DEFAULT_FROM)
    date_to   = request.args.get("to",   DEFAULT_TO)

    meta_daily   = (_meta_insights_daily(date_from, date_to) if META_TOKEN else []) or []
    # _gads_daily agora retorna dict {date: {...}} já agregado por dia
    gads_by_date = (_gads_daily(date_from, date_to) if GADS_DEVTOKEN else {}) or {}

    using_mock = not meta_daily and not gads_by_date
    if using_mock:
        return jsonify(_mock_days(date_from, date_to))

    meta_by_date = {}
    for r in meta_daily:
        d = r.get("date_start") or r.get("date")
        if not d:
            continue
        meta_by_date[d] = {
            "invest":      float(r.get("spend", 0)),
            "leads":       _meta_leads_from_actions(r.get("actions", [])),
            "oport":       0,
            "ganho":       0,
            "impressions": int(r.get("impressions", 0)),
            "clicks":      int(r.get("clicks", 0)),
        }

    empty = {"invest": 0, "leads": 0, "oport": 0, "ganho": 0, "impressions": 0, "clicks": 0}
    all_dates = sorted(set(list(meta_by_date.keys()) + list(gads_by_date.keys())))

    days = []
    for d in all_dates:
        if d < date_from or d > date_to:
            continue
        days.append({
            "date":   d,
            "google": gads_by_date.get(d, dict(empty)),
            "meta":   meta_by_date.get(d, dict(empty)),
        })

    return jsonify(days)


@app.route("/api/goals", methods=["GET", "POST"])
def api_goals():
    if request.method == "GET":
        month = request.args.get("month", date.today().strftime("%Y-%m"))
        with _db() as conn:
            rows = conn.execute(
                "SELECT metric, value FROM monthly_goals WHERE month = ?", (month,)
            ).fetchall()
        goals = {r["metric"]: r["value"] for r in rows}

        # Default values if nothing saved
        defaults = {
            "invest": 60000, "leads": 400, "cpl": 160, "oport": 110,
            "cpo": 560, "tx_conv": 0.25, "ganho": 28, "cpf": 2200, "oport_perdidas": 50,
        }
        for k, v in defaults.items():
            goals.setdefault(k, v)

        return jsonify(goals)

    # POST — save goals
    body = request.get_json(force=True)
    month = body.pop("month", date.today().strftime("%Y-%m"))

    SLUGS = {"invest", "leads", "cpl", "oport", "cpo", "tx_conv", "ganho", "cpf", "oport_perdidas"}
    with _db() as conn:
        for slug, val in body.items():
            if slug not in SLUGS or val is None:
                continue
            conn.execute("""
                INSERT INTO monthly_goals (month, metric, value, updated_at)
                VALUES (?, ?, ?, datetime('now'))
                ON CONFLICT(month, metric) DO UPDATE
                SET value = excluded.value, updated_at = excluded.updated_at
            """, (month, slug, float(val)))
        conn.commit()

    return jsonify({"ok": True})


@app.route("/api/debug")
def api_debug():
    """Verifica status das credenciais e conectividade — útil para diagnóstico."""
    import traceback

    result = {
        "meta": {"token_present": bool(META_TOKEN), "account": META_ACCOUNT},
        "google": {
            "devtoken_present": bool(GADS_DEVTOKEN),
            "creds_path": GADS_CREDS,
            "creds_file_exists": bool(GADS_CREDS and os.path.exists(GADS_CREDS)),
            "target_customer": GADS_TARGET,
            "login_customer": GADS_LOGIN,
        },
        "salesforce": {
            "instance": SF_INSTANCE,
            "token_present": bool(SF_TOKEN),
            "refresh_present": bool(SF_REFRESH),
        },
    }

    # Check Google creds file type
    if GADS_CREDS and os.path.exists(GADS_CREDS):
        try:
            with open(GADS_CREDS) as f:
                c = json.load(f)
            result["google"]["creds_type"] = c.get("type", "unknown")
            result["google"]["has_refresh_token"] = bool(c.get("refresh_token"))
        except Exception as e:
            result["google"]["creds_parse_error"] = str(e)

    # Try Meta ping
    if META_TOKEN:
        try:
            test = _meta_get("/me", {"fields": "id,name"})
            result["meta"]["ping"] = "ok" if test else "error — check logs"
        except Exception:
            result["meta"]["ping"] = "exception"

    # Try Google SDK client
    if GADS_DEVTOKEN and GADS_CREDS:
        client = _gads_client()
        result["google"]["sdk_client"] = "ok" if client else "failed — check logs"

    # Try Salesforce ping
    if SF_TOKEN or SF_REFRESH:
        try:
            r = _sf_query("SELECT Id FROM Lead LIMIT 1")
            result["salesforce"]["ping"] = "ok" if r else "error"
        except Exception:
            result["salesforce"]["ping"] = "exception"

    return jsonify(result)


# ── Static files ──────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_file(os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html"))

@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "static"),
        filename
    )

# ── Start ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("┌─────────────────────────────────────────────┐")
    print("│  Caveo Analyst AI · Dashboard               │")
    print("│  http://localhost:8765                      │")
    print("├─────────────────────────────────────────────┤")
    print(f"│  Meta Ads  {'✓ configurado' if META_TOKEN else '✗ sem token — usando mock'}{'':>10}│")
    print(f"│  Google Ads{'✓ configurado' if GADS_DEVTOKEN else '✗ sem token — usando mock'}{'':>10}│")
    print(f"│  Salesforce{'✓ configurado' if SF_TOKEN else '✗ sem token — usando mock'}{'':>10}│")
    print("└─────────────────────────────────────────────┘")
    app.run(host="0.0.0.0", port=8765, debug=False, threaded=True)
