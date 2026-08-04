import json
from config import load_google_ads_config


def test_loads_expected_fields_from_mcp_json(tmp_path):
    mcp_json = tmp_path / ".mcp.json"
    mcp_json.write_text(json.dumps({
        "mcpServers": {
            "google-ads-mcp": {
                "command": "/whatever/google-ads-mcp",
                "env": {
                    "GOOGLE_ADS_DEVELOPER_TOKEN": "tok123",
                    "GOOGLE_ADS_LOGIN_CUSTOMER_ID": "111",
                    "GOOGLE_ADS_TARGET_CUSTOMER_ID": "222",
                    "GOOGLE_APPLICATION_CREDENTIALS": "/path/creds.json",
                },
            },
            "other-server": {"command": "whatever"},
        }
    }))

    config = load_google_ads_config(str(mcp_json))

    assert config == {
        "developer_token": "tok123",
        "login_customer_id": "111",
        "target_customer_id": "222",
        "credentials_path": "/path/creds.json",
    }
