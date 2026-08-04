from client import build_request, GEO_TARGET_BRAZIL, LANGUAGE_PORTUGUESE


class _FakeRepeatedField(list):
    pass


class _FakeRequest:
    def __init__(self):
        self.customer_id = None
        self.keywords = _FakeRepeatedField()
        self.language = None
        self.geo_target_constants = _FakeRepeatedField()
        self.keyword_plan_network = None


class _FakeKeywordPlanNetworkEnum:
    GOOGLE_SEARCH = "GOOGLE_SEARCH"


class _FakeEnums:
    KeywordPlanNetworkEnum = _FakeKeywordPlanNetworkEnum


class _FakeClient:
    enums = _FakeEnums

    def get_type(self, name):
        assert name == "GenerateKeywordHistoricalMetricsRequest"
        return _FakeRequest()


def test_build_request_sets_expected_fields():
    request = build_request(_FakeClient(), "3921127876", ["abrir cnpj médico", "contador médico"])

    assert request.customer_id == "3921127876"
    assert list(request.keywords) == ["abrir cnpj médico", "contador médico"]
    assert request.language == LANGUAGE_PORTUGUESE
    assert list(request.geo_target_constants) == [GEO_TARGET_BRAZIL]
    assert request.keyword_plan_network == "GOOGLE_SEARCH"


def test_constants_match_verified_resource_names():
    assert GEO_TARGET_BRAZIL == "geoTargetConstants/2076"
    assert LANGUAGE_PORTUGUESE == "languageConstants/1014"
