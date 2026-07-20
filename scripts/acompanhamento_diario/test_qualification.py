from qualification import mql_day, sql_day


def test_mql_no_dia_que_atinge_aguardando():
    h = [{"stage": "Nova", "date": "2026-07-01"},
         {"stage": "Contato Realizado", "date": "2026-07-02"},
         {"stage": "Aguardando Resposta", "date": "2026-07-03"}]
    assert mql_day(h, is_won=False) == "2026-07-03"
    assert sql_day(h, is_won=False) is None


def test_sql_no_dia_da_proposta_mql_permanece_na_captacao():
    h = [{"stage": "Aguardando Resposta", "date": "2026-07-03"},
         {"stage": "Proposta Enviada", "date": "2026-07-10"}]
    assert mql_day(h, is_won=False) == "2026-07-03"
    assert sql_day(h, is_won=False) == "2026-07-10"


def test_pula_aguardando_direto_para_proposta_conta_como_mql_e_sql():
    h = [{"stage": "Nova", "date": "2026-07-01"},
         {"stage": "Proposta Enviada", "date": "2026-07-05"}]
    assert mql_day(h, is_won=False) == "2026-07-05"
    assert sql_day(h, is_won=False) == "2026-07-05"


def test_won_sem_transicao_de_estagio_usa_data_do_ganho():
    h = [{"stage": "Fechado", "date": "2026-07-10"}]
    assert mql_day(h, is_won=True) == "2026-07-10"
    assert sql_day(h, is_won=True) == "2026-07-10"


def test_nunca_qualifica_quando_nao_atinge_e_nao_ganho():
    h = [{"stage": "Nova", "date": "2026-07-01"},
         {"stage": "Contato Realizado", "date": "2026-07-02"}]
    assert mql_day(h, is_won=False) is None
    assert sql_day(h, is_won=False) is None


def test_retrocede_e_reavanca_conta_a_primeira_transicao():
    h = [{"stage": "Aguardando Resposta", "date": "2026-07-03"},
         {"stage": "Contato Realizado", "date": "2026-07-04"},
         {"stage": "Aguardando Resposta", "date": "2026-07-06"}]
    assert mql_day(h, is_won=False) == "2026-07-03"


def test_ordem_de_entrada_nao_importa():
    h = [{"stage": "Proposta Enviada", "date": "2026-07-10"},
         {"stage": "Aguardando Resposta", "date": "2026-07-03"}]
    assert mql_day(h, is_won=False) == "2026-07-03"
    assert sql_day(h, is_won=False) == "2026-07-10"


def test_reuniao_agendada_sozinha_dispara_mql_sem_sql():
    h = [{"stage": "Nova", "date": "2026-07-01"},
         {"stage": "Reunião Agendada", "date": "2026-07-04"}]
    assert mql_day(h, is_won=False) == "2026-07-04"
    assert sql_day(h, is_won=False) is None


def test_won_com_proposta_explicita_usa_a_transicao_nao_a_data_do_ganho():
    h = [{"stage": "Proposta Enviada", "date": "2026-07-05"},
         {"stage": "Fechado", "date": "2026-07-12"}]
    # A transição explícita de gate vence o fallback de ganho:
    # SQL é o dia da Proposta Enviada, não o dia do fechamento.
    assert sql_day(h, is_won=True) == "2026-07-05"
    assert mql_day(h, is_won=True) == "2026-07-05"
