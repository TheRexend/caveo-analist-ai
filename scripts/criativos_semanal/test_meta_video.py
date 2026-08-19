import json

import pytest
from meta_video import CONTA, extrair, normalizar, token


def test_conta_e_a_da_caveo():
    assert CONTA == "act_438086148409254"


def test_token_sai_do_mcp_json(tmp_path):
    p = tmp_path / ".mcp.json"
    p.write_text(json.dumps({"mcpServers": {"meta-ads-mcp": {
        "env": {"META_ACCESS_TOKEN": "EAAtoken123"}}}}), encoding="utf-8")
    assert token(p) == "EAAtoken123"


def test_token_ausente_falha_alto_com_mensagem_util(tmp_path):
    # Falhar cedo e claro: um deck sem retenção não pode sair em silêncio.
    p = tmp_path / ".mcp.json"
    p.write_text(json.dumps({"mcpServers": {}}), encoding="utf-8")
    with pytest.raises(RuntimeError, match="META_ACCESS_TOKEN"):
        token(p)


def test_arquivo_mcp_inexistente_falha_alto(tmp_path):
    # A mensagem tem de dizer o que faltou, não só que algo deu errado.
    with pytest.raises(RuntimeError, match="token do Meta"):
        token(tmp_path / "nao_existe.json")


def test_extrair_soma_o_tipo_pedido():
    acoes = [{"action_type": "video_view", "value": "465"},
             {"action_type": "link_click", "value": "26"}]
    assert extrair(acoes, "video_view") == 465
    assert extrair(acoes, "link_click") == 26


def test_extrair_tipo_ausente_e_zero():
    assert extrair([{"action_type": "post_engagement", "value": "5"}],
                   "video_view") == 0


def test_extrair_lista_ausente_e_zero():
    assert extrair(None, "video_view") == 0


def test_normalizar_monta_o_dicionario_que_o_framework_consome():
    linha = {
        "ad_id": "120246069173850088", "ad_name": "CAV082611SV1",
        "adset_id": "120246069043410088", "campaign_name": "[BOO] [LEADS] X",
        "impressions": "1663", "spend": "175.67",
        "actions": [{"action_type": "video_view", "value": "465"},
                    {"action_type": "link_click", "value": "26"},
                    {"action_type": "complete_registration", "value": "1"}],
        "video_p75_watched_actions": [{"action_type": "video_view", "value": "70"}],
    }
    n = normalizar(linha)
    assert n["ad_id"] == "120246069173850088"
    assert n["ad_name"] == "CAV082611SV1"
    assert n["impressoes"] == 1663
    assert n["views_3s"] == 465
    assert n["p75"] == 70
    assert n["link_clicks"] == 26
    assert n["registros"] == 1
    assert n["spend"] == 175.67


def test_normalizar_anuncio_estatico_zera_os_campos_de_video():
    # Sem chave de vídeo na resposta: estático, não erro.
    linha = {"ad_id": "1", "ad_name": "EST", "adset_id": "2",
             "campaign_name": "C", "impressions": "900", "spend": "50.0",
             "actions": [{"action_type": "link_click", "value": "18"}]}
    n = normalizar(linha)
    assert n["views_3s"] == 0
    assert n["p75"] == 0
    assert n["link_clicks"] == 18
    assert n["registros"] == 0
