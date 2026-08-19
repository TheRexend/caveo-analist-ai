import json

from registro import CAMINHO_PADRAO, acrescentar, ler


def test_caminho_padrao_e_o_do_spec():
    assert CAMINHO_PADRAO == "data/criativos_registro.jsonl"


def test_ler_arquivo_inexistente_devolve_lista_vazia(tmp_path):
    # Primeira execução: o registro ainda não existe e isso não é erro.
    assert ler(tmp_path / "nao_existe.jsonl") == []


def test_acrescentar_cria_o_arquivo_e_o_diretorio(tmp_path):
    alvo = tmp_path / "sub" / "reg.jsonl"
    assert acrescentar(alvo, [{"ad_id": "1"}]) == 1
    assert alvo.exists()


def test_ida_e_volta_preserva_os_dados(tmp_path):
    alvo = tmp_path / "reg.jsonl"
    linhas = [{"ad_id": "1", "hook_rate": 0.24}, {"ad_id": "2", "hook_rate": None}]
    acrescentar(alvo, linhas)
    assert ler(alvo) == linhas


def test_acrescentar_e_append_only(tmp_path):
    alvo = tmp_path / "reg.jsonl"
    acrescentar(alvo, [{"ad_id": "1"}])
    acrescentar(alvo, [{"ad_id": "2"}])
    assert [l["ad_id"] for l in ler(alvo)] == ["1", "2"]


def test_acrescentar_lista_vazia_nao_escreve_nada(tmp_path):
    alvo = tmp_path / "reg.jsonl"
    assert acrescentar(alvo, []) == 0
    assert not alvo.exists()


def test_acentuacao_e_gravada_legivel(tmp_path):
    # O registro é lido por humanos no terminal: nada de \\u00e2ngulo.
    alvo = tmp_path / "reg.jsonl"
    acrescentar(alvo, [{"angulo": "plantão como moeda"}])
    assert "plantão" in alvo.read_text(encoding="utf-8")


def test_linha_em_branco_no_arquivo_e_ignorada(tmp_path):
    alvo = tmp_path / "reg.jsonl"
    alvo.write_text(json.dumps({"ad_id": "1"}) + "\n\n", encoding="utf-8")
    assert ler(alvo) == [{"ad_id": "1"}]
