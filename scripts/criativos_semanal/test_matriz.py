from matriz import (AWARENESS, DESIRES, PERSONAS, angulos_mortos,
                    celulas_livres, celulas_usadas, hooks_por_angulo)


def _linha(**kw):
    base = {"persona": "Rafael", "desire": "D3", "awareness": "problema",
            "angulo": "plantão como moeda", "hook": "h1",
            "nivel_quebrado": None, "veredito": "escalar"}
    base.update(kw)
    return base


def test_os_tres_eixos_vem_das_fontes_da_caveo():
    assert PERSONAS == ("Larissa", "Diego", "Rafael", "Camila")
    assert DESIRES == ("D1", "D2", "D3", "D4", "D5", "D6", "D7")
    assert AWARENESS == ("inconsciente", "problema", "solucao",
                         "produto", "total")


def test_celulas_usadas_ignora_repeticao():
    r = [_linha(hook="h1"), _linha(hook="h2")]
    assert celulas_usadas(r) == {("Rafael", "D3", "problema")}


def test_matriz_completa_tem_140_celulas():
    assert len(celulas_livres([])) == 4 * 7 * 5


def test_celula_testada_sai_das_livres():
    livres = celulas_livres([_linha()])
    assert ("Rafael", "D3", "problema") not in livres
    assert len(livres) == 139


def test_hooks_por_angulo_conta_hooks_distintos():
    r = [_linha(hook="h1"), _linha(hook="h2"), _linha(hook="h1")]
    assert hooks_por_angulo(r) == {"plantão como moeda": 2}


def test_angulo_com_dois_hooks_reprovados_no_gancho_esta_morto():
    r = [_linha(hook="h1", nivel_quebrado="gancho", veredito="iterar"),
         _linha(hook="h2", nivel_quebrado="gancho", veredito="matar")]
    assert angulos_mortos(r) == {"plantão como moeda"}


def test_angulo_com_um_hook_bom_nao_esta_morto():
    # Basta uma abertura passar no gancho para o ângulo seguir vivo.
    r = [_linha(hook="h1", nivel_quebrado="gancho"),
         _linha(hook="h2", nivel_quebrado="interesse")]
    assert angulos_mortos(r) == set()


def test_angulo_com_um_hook_so_nao_esta_morto():
    r = [_linha(hook="h1", nivel_quebrado="gancho")]
    assert angulos_mortos(r) == set()


def test_registro_vazio_nao_tem_angulo_morto_nem_celula_usada():
    assert angulos_mortos([]) == set()
    assert celulas_usadas([]) == set()
    assert hooks_por_angulo([]) == {}
