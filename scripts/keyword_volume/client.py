"""Chamada ao Keyword Planner (KeywordPlanIdeaService.GenerateKeywordHistoricalMetrics).

Único módulo que fala com a rede. build_request() é puro (testável sem
credenciais reais); build_client()/fetch_historical_metrics() exigem
credenciais válidas e não têm teste automatizado de chamada real.
"""
from google.ads.googleads.client import GoogleAdsClient
from google.oauth2 import service_account

_ADS_SCOPE = "https://www.googleapis.com/auth/adwords"

# Verificados ao vivo contra a conta real (search_search em geo_target_constant
# / language_constant) durante o planejamento — não são valores adivinhados.
GEO_TARGET_BRAZIL = "geoTargetConstants/2076"
LANGUAGE_PORTUGUESE = "languageConstants/1014"


def build_client(config):
    creds = service_account.Credentials.from_service_account_file(
        config["credentials_path"], scopes=[_ADS_SCOPE]
    )
    return GoogleAdsClient(
        credentials=creds,
        developer_token=config["developer_token"],
        login_customer_id=config["login_customer_id"],
        use_proto_plus=True,
    )


def build_request(client, customer_id, keywords):
    request = client.get_type("GenerateKeywordHistoricalMetricsRequest")
    request.customer_id = customer_id
    request.keywords.extend(keywords)
    request.language = LANGUAGE_PORTUGUESE
    request.geo_target_constants.append(GEO_TARGET_BRAZIL)
    request.keyword_plan_network = client.enums.KeywordPlanNetworkEnum.GOOGLE_SEARCH
    return request


def fetch_historical_metrics(config, keywords):
    client = build_client(config)
    service = client.get_service("KeywordPlanIdeaService")
    request = build_request(client, config["target_customer_id"], keywords)
    response = service.generate_keyword_historical_metrics(request=request)

    results = []
    for result in response.results:
        metrics = result.keyword_metrics
        results.append({
            "keyword": result.text,
            "avg_monthly_searches": metrics.avg_monthly_searches,
            "competition": metrics.competition.name,
            "low_top_of_page_bid_micros": metrics.low_top_of_page_bid_micros,
            "high_top_of_page_bid_micros": metrics.high_top_of_page_bid_micros,
        })
    return results
