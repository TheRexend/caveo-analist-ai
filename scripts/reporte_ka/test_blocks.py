from blocks import is_boo, block_of


def test_is_boo_casa_meta_e_google():
    assert is_boo("[BOO] [MM] [FUNDO] [LEADS]")
    assert is_boo("BOO - [RF] [Search] - Cnpj médico")
    assert is_boo("boo minúsculo")


def test_is_boo_exclui_sem_marcador():
    assert not is_boo("comunidade_campanha_conversao_webinar")
    assert not is_boo("🏎️ Turbo - [CP14] - [Leads]")
    assert not is_boo("")
    assert not is_boo(None)


def test_block_meta_captacao_e_awareness():
    assert block_of("[BOO] [MM] [FUNDO] [LEADS] Captação", "meta") == "meta_captacao"
    assert block_of("[BOO] [RF] - [FUNDO] - [LEADS]", "meta") == "meta_captacao"
    assert block_of("[BOO] [MM] - [TOPO] - [DISTRIBUICAO]", "meta") == "meta_awareness"


def test_block_google_por_channel_type():
    assert block_of("BOO - [RF] [Search] - Cnpj médico", "google", "SEARCH") == "google_search"
    assert block_of("BOO - [Search] - Institucional", "google", "SEARCH") == "google_search"
    assert block_of("BOO - [MM] [Pmax] [Fundo] Plataforma", "google", "PERFORMANCE_MAX") == "google_yt_pmax"
    assert block_of("BOO - [DemandGen] Leads", "google", "DEMAND_GEN") == "google_yt_pmax"


def test_block_google_awareness_topo():
    assert block_of("BOO - [DemandGen] [Topo] Encontrar Público", "google", "DEMAND_GEN") == "google_awareness"


def test_block_exclui_sem_boo_ou_channel_desconhecido():
    assert block_of("comunidade_webinar", "meta") == "excluded"
    assert block_of("BOO - algo", "google", "HOTEL") == "excluded"
