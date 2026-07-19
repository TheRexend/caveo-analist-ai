#!/usr/bin/env python3
"""
Google Tag Manager MCP Server

Provides tools to read and write GTM configurations for both web
and server-side containers using the GTM API v2, authenticated via OAuth 2.0.

Setup:
  1. Download OAuth 2.0 Desktop credentials from Google Cloud Console
     (APIs & Services → Credentials → OAuth 2.0 Client IDs → Desktop app)
  2. Save the file as ~/.claude/mcps/gtm/credentials.json
  3. On first run, a browser window will open for authentication
"""

import json
import asyncio
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict
from mcp.server.fastmcp import FastMCP
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow

# ── Server ────────────────────────────────────────────────────────────────────

mcp = FastMCP("gtm_mcp")

# ── Auth ──────────────────────────────────────────────────────────────────────

SCOPES = [
    "https://www.googleapis.com/auth/tagmanager.readonly",
    "https://www.googleapis.com/auth/tagmanager.edit.containers",
    "https://www.googleapis.com/auth/tagmanager.publish",
]

MCP_DIR = Path.home() / ".claude" / "mcps" / "gtm"
CREDENTIALS_PATH = MCP_DIR / "credentials.json"
TOKEN_PATH = MCP_DIR / "token.json"


def _get_service():
    """Return an authenticated GTM API v2 service object."""
    if not CREDENTIALS_PATH.exists():
        raise FileNotFoundError(
            f"credentials.json not found at {CREDENTIALS_PATH}.\n"
            "Steps to fix:\n"
            "  1. Open https://console.cloud.google.com\n"
            "  2. Enable the Tag Manager API (APIs & Services → Library → search 'Tag Manager')\n"
            "  3. Create OAuth 2.0 credentials (APIs & Services → Credentials → + Create → OAuth client → Desktop app)\n"
            "  4. Download JSON and save it to ~/.claude/mcps/gtm/credentials.json"
        )

    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_PATH), SCOPES)
            creds = flow.run_local_server(port=0)
        MCP_DIR.mkdir(parents=True, exist_ok=True)
        TOKEN_PATH.write_text(creds.to_json())

    return build("tagmanager", "v2", credentials=creds)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _handle_error(e: Exception) -> str:
    """Format API errors into clear, actionable messages."""
    try:
        from googleapiclient.errors import HttpError
        if isinstance(e, HttpError):
            status = e.resp.status
            msgs = {
                400: "Bad request — check the body/parameter format matches GTM API v2 spec.",
                403: "Permission denied — ensure your Google account has GTM Editor or Publisher role on this container.",
                404: "Resource not found — check account_id, container_id, workspace_id, and resource IDs.",
                409: "Conflict — a resource with this name may already exist.",
                429: "Rate limit exceeded — wait a moment and retry.",
            }
            return f"Error {status}: {msgs.get(status, e.reason)}"
    except ImportError:
        pass
    if isinstance(e, FileNotFoundError):
        return f"Setup error: {e}"
    return f"Error ({type(e).__name__}): {e}"


def _ws_path(account_id: str, container_id: str, workspace_id: str) -> str:
    return f"accounts/{account_id}/containers/{container_id}/workspaces/{workspace_id}"


# ── Input Models ──────────────────────────────────────────────────────────────

class AccountInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class ContainerInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    account_id: str = Field(..., description="GTM account ID — numeric string found in the GTM URL (e.g. '6290263120')")


class WorkspaceInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    account_id: str = Field(..., description="GTM account ID (numeric string)")
    container_id: str = Field(..., description="GTM container ID (numeric string, NOT the GTM-XXXXX public ID)")


class WorkspaceResourceInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    account_id: str = Field(..., description="GTM account ID")
    container_id: str = Field(..., description="GTM container ID (numeric)")
    workspace_id: str = Field(..., description="GTM workspace ID (numeric, e.g. '46')")


class TagGetInput(WorkspaceResourceInput):
    tag_id: str = Field(..., description="GTM tag ID (numeric)")


class TagCreateInput(WorkspaceResourceInput):
    tag_body: dict = Field(
        ...,
        description=(
            "GTM API v2 tag object. Required: name (str), type (str). "
            "Optional: parameter (list of {type, key, value}), firingTriggerId (list of trigger ID strings), paused (bool). "
            "Example: {\"name\": \"My Tag\", \"type\": \"html\", "
            "\"parameter\": [{\"type\": \"TEMPLATE\", \"key\": \"html\", \"value\": \"<script>...</script>\"}], "
            "\"firingTriggerId\": [\"123\"]}"
        )
    )


class TagUpdateInput(WorkspaceResourceInput):
    tag_id: str = Field(..., description="GTM tag ID to update")
    tag_body: dict = Field(..., description="Full updated GTM API v2 tag object")


class TriggerCreateInput(WorkspaceResourceInput):
    trigger_body: dict = Field(
        ...,
        description=(
            "GTM API v2 trigger object. Required: name, type. "
            "Common types: PAGEVIEW, WINDOW_LOADED, CUSTOM_EVENT, FORM_SUBMISSION. "
            "For CUSTOM_EVENT include customEventFilter: [{type: EQUALS, parameter: [{type: TEMPLATE, key: arg0, value: '{{_event}}'}, {type: TEMPLATE, key: arg1, value: 'my_event'}]}]"
        )
    )


class VariableCreateInput(WorkspaceResourceInput):
    variable_body: dict = Field(
        ...,
        description=(
            "GTM API v2 variable object. Required: name, type. "
            "Common types: k (1st-party cookie), jsm (custom JS), c (constant), v (data layer). "
            "Example cookie: {\"name\": \"cookie | _fbp\", \"type\": \"k\", \"parameter\": [{\"type\": \"TEMPLATE\", \"key\": \"name\", \"value\": \"_fbp\"}]}"
        )
    )


class ClientCreateInput(WorkspaceResourceInput):
    client_body: dict = Field(
        ...,
        description=(
            "GTM API v2 client object (server containers only). Required: name, type, parameter list. "
            "Clients receive HTTP requests and route them to tags. "
            "Example Stape webhook client: {\"name\": \"Webhook Salesforce\", \"type\": \"stape_webhook\", \"parameter\": [...]}"
        )
    )


class VersionCreateInput(WorkspaceResourceInput):
    name: str = Field(..., description="Version name (e.g. 'v2.3 - Meta CAPI via Stape')", min_length=1, max_length=200)
    notes: str = Field(default="", description="Optional release notes describing the changes")


class VersionPublishInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    account_id: str = Field(..., description="GTM account ID")
    container_id: str = Field(..., description="GTM container ID")
    version_id: str = Field(..., description="Container version ID returned by gtm_create_version")


# ── Tools — Discovery ─────────────────────────────────────────────────────────

@mcp.tool(
    name="gtm_list_accounts",
    annotations={"title": "List GTM Accounts", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
)
async def gtm_list_accounts(params: AccountInput) -> str:
    """List all Google Tag Manager accounts accessible by the authenticated user.

    Returns:
        str: JSON array of accounts — each with accountId, name, path.
             Use accountId as the account_id parameter in subsequent tools.
    """
    def _call():
        return _get_service().accounts().list().execute()
    try:
        result = await asyncio.to_thread(_call)
        accounts = result.get("account", [])
        return json.dumps(
            [{"accountId": a.get("accountId"), "name": a.get("name"), "path": a.get("path")} for a in accounts],
            indent=2, ensure_ascii=False
        )
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="gtm_list_containers",
    annotations={"title": "List GTM Containers", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
)
async def gtm_list_containers(params: ContainerInput) -> str:
    """List all GTM containers in an account — both web (WEB) and server-side (SERVER) containers.

    Args:
        params.account_id: GTM account ID (numeric)

    Returns:
        str: JSON array — each with containerId, name, publicId (e.g. GTM-WZZC6BHZ), usageContext (WEB or SERVER), path.
             Use containerId (numeric) as container_id in subsequent tools — NOT the GTM-XXXXX public ID.
    """
    def _call():
        return _get_service().accounts().containers().list(
            parent=f"accounts/{params.account_id}"
        ).execute()
    try:
        result = await asyncio.to_thread(_call)
        containers = result.get("container", [])
        return json.dumps(
            [{
                "containerId": c.get("containerId"),
                "name": c.get("name"),
                "publicId": c.get("publicId"),
                "usageContext": c.get("usageContext"),
                "path": c.get("path"),
            } for c in containers],
            indent=2, ensure_ascii=False
        )
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="gtm_list_workspaces",
    annotations={"title": "List GTM Workspaces", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
)
async def gtm_list_workspaces(params: WorkspaceInput) -> str:
    """List all workspaces in a GTM container.

    Args:
        params.account_id, container_id: GTM numeric identifiers

    Returns:
        str: JSON array — each with workspaceId, name, description, path.
             Use workspaceId as workspace_id in subsequent tools.
    """
    def _call():
        return _get_service().accounts().containers().workspaces().list(
            parent=f"accounts/{params.account_id}/containers/{params.container_id}"
        ).execute()
    try:
        result = await asyncio.to_thread(_call)
        workspaces = result.get("workspace", [])
        return json.dumps(
            [{"workspaceId": w.get("workspaceId"), "name": w.get("name"), "description": w.get("description"), "path": w.get("path")} for w in workspaces],
            indent=2, ensure_ascii=False
        )
    except Exception as e:
        return _handle_error(e)


# ── Tools — Reading ───────────────────────────────────────────────────────────

@mcp.tool(
    name="gtm_list_tags",
    annotations={"title": "List GTM Tags", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
)
async def gtm_list_tags(params: WorkspaceResourceInput) -> str:
    """List all tags in a GTM workspace — name, type, firing trigger IDs, and paused status.

    Returns:
        str: JSON array — each with tagId, name, type, firingTriggerId (list), paused, path.
    """
    def _call():
        return _get_service().accounts().containers().workspaces().tags().list(
            parent=_ws_path(params.account_id, params.container_id, params.workspace_id)
        ).execute()
    try:
        result = await asyncio.to_thread(_call)
        tags = result.get("tag", [])
        return json.dumps(
            [{"tagId": t.get("tagId"), "name": t.get("name"), "type": t.get("type"),
              "firingTriggerId": t.get("firingTriggerId", []), "paused": t.get("paused", False), "path": t.get("path")} for t in tags],
            indent=2, ensure_ascii=False
        )
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="gtm_get_tag",
    annotations={"title": "Get GTM Tag Details", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
)
async def gtm_get_tag(params: TagGetInput) -> str:
    """Get full details of a specific GTM tag — all parameters, settings, and metadata.

    Returns:
        str: Full GTM API v2 tag object as JSON (use this as template for gtm_update_tag).
    """
    def _call():
        path = f"{_ws_path(params.account_id, params.container_id, params.workspace_id)}/tags/{params.tag_id}"
        return _get_service().accounts().containers().workspaces().tags().get(path=path).execute()
    try:
        result = await asyncio.to_thread(_call)
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="gtm_list_triggers",
    annotations={"title": "List GTM Triggers", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
)
async def gtm_list_triggers(params: WorkspaceResourceInput) -> str:
    """List all triggers in a GTM workspace — name, type, and filter conditions.

    Returns:
        str: JSON array — each with triggerId, name, type, customEventFilter, filter, path.
    """
    def _call():
        return _get_service().accounts().containers().workspaces().triggers().list(
            parent=_ws_path(params.account_id, params.container_id, params.workspace_id)
        ).execute()
    try:
        result = await asyncio.to_thread(_call)
        triggers = result.get("trigger", [])
        return json.dumps(
            [{"triggerId": t.get("triggerId"), "name": t.get("name"), "type": t.get("type"),
              "customEventFilter": t.get("customEventFilter"), "filter": t.get("filter"), "path": t.get("path")} for t in triggers],
            indent=2, ensure_ascii=False
        )
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="gtm_list_variables",
    annotations={"title": "List GTM Variables", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
)
async def gtm_list_variables(params: WorkspaceResourceInput) -> str:
    """List all variables in a GTM workspace — name, type, and parameter values.

    Returns:
        str: JSON array — each with variableId, name, type, parameter (list), path.
    """
    def _call():
        return _get_service().accounts().containers().workspaces().variables().list(
            parent=_ws_path(params.account_id, params.container_id, params.workspace_id)
        ).execute()
    try:
        result = await asyncio.to_thread(_call)
        variables = result.get("variable", [])
        return json.dumps(
            [{"variableId": v.get("variableId"), "name": v.get("name"), "type": v.get("type"),
              "parameter": v.get("parameter"), "path": v.get("path")} for v in variables],
            indent=2, ensure_ascii=False
        )
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="gtm_list_clients",
    annotations={"title": "List GTM Clients (Server Container)", "readOnlyHint": True, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
)
async def gtm_list_clients(params: WorkspaceResourceInput) -> str:
    """List all clients in a GTM server-side container workspace.
    Clients receive incoming HTTP requests and route them to tags.
    Only available on SERVER-type containers (not web containers).

    Returns:
        str: JSON array — each with clientId, name, type, parameter (list), path.
             Returns empty array [] if no clients exist or container is web-type.
    """
    def _call():
        return _get_service().accounts().containers().workspaces().clients().list(
            parent=_ws_path(params.account_id, params.container_id, params.workspace_id)
        ).execute()
    try:
        result = await asyncio.to_thread(_call)
        clients = result.get("client", [])
        return json.dumps(
            [{"clientId": c.get("clientId"), "name": c.get("name"), "type": c.get("type"),
              "parameter": c.get("parameter"), "path": c.get("path")} for c in clients],
            indent=2, ensure_ascii=False
        )
    except Exception as e:
        return _handle_error(e)


# ── Tools — Writing ───────────────────────────────────────────────────────────

@mcp.tool(
    name="gtm_create_tag",
    annotations={"title": "Create GTM Tag", "readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": True}
)
async def gtm_create_tag(params: TagCreateInput) -> str:
    """Create a new tag in a GTM workspace. Changes are saved as a draft — use gtm_create_version + gtm_publish_version to go live.

    Returns:
        str: Created tag object as JSON with assigned tagId.
    """
    def _call():
        return _get_service().accounts().containers().workspaces().tags().create(
            parent=_ws_path(params.account_id, params.container_id, params.workspace_id),
            body=params.tag_body
        ).execute()
    try:
        result = await asyncio.to_thread(_call)
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="gtm_update_tag",
    annotations={"title": "Update GTM Tag", "readOnlyHint": False, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
)
async def gtm_update_tag(params: TagUpdateInput) -> str:
    """Update an existing tag in a GTM workspace. Use gtm_get_tag first to get the current state, then modify and pass back.
    Changes are saved as draft — publish with gtm_create_version + gtm_publish_version.

    Returns:
        str: Updated tag object as JSON.
    """
    def _call():
        path = f"{_ws_path(params.account_id, params.container_id, params.workspace_id)}/tags/{params.tag_id}"
        return _get_service().accounts().containers().workspaces().tags().update(
            path=path, body=params.tag_body
        ).execute()
    try:
        result = await asyncio.to_thread(_call)
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="gtm_create_trigger",
    annotations={"title": "Create GTM Trigger", "readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": True}
)
async def gtm_create_trigger(params: TriggerCreateInput) -> str:
    """Create a new trigger in a GTM workspace. Changes saved as draft — publish to go live.

    Returns:
        str: Created trigger object as JSON with assigned triggerId. Use triggerId as firingTriggerId when creating tags.
    """
    def _call():
        return _get_service().accounts().containers().workspaces().triggers().create(
            parent=_ws_path(params.account_id, params.container_id, params.workspace_id),
            body=params.trigger_body
        ).execute()
    try:
        result = await asyncio.to_thread(_call)
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="gtm_create_variable",
    annotations={"title": "Create GTM Variable", "readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": True}
)
async def gtm_create_variable(params: VariableCreateInput) -> str:
    """Create a new variable in a GTM workspace. Changes saved as draft — publish to go live.

    Returns:
        str: Created variable object as JSON with assigned variableId.
    """
    def _call():
        return _get_service().accounts().containers().workspaces().variables().create(
            parent=_ws_path(params.account_id, params.container_id, params.workspace_id),
            body=params.variable_body
        ).execute()
    try:
        result = await asyncio.to_thread(_call)
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="gtm_create_client",
    annotations={"title": "Create GTM Client (Server Container)", "readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": True}
)
async def gtm_create_client(params: ClientCreateInput) -> str:
    """Create a new client in a GTM server-side container. Clients define how incoming HTTP requests are received and parsed.
    Only works on SERVER-type containers. Changes saved as draft — publish to go live.

    Returns:
        str: Created client object as JSON with assigned clientId.
    """
    def _call():
        return _get_service().accounts().containers().workspaces().clients().create(
            parent=_ws_path(params.account_id, params.container_id, params.workspace_id),
            body=params.client_body
        ).execute()
    try:
        result = await asyncio.to_thread(_call)
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as e:
        return _handle_error(e)


# ── Tools — Publishing ────────────────────────────────────────────────────────

@mcp.tool(
    name="gtm_create_version",
    annotations={"title": "Create GTM Container Version", "readOnlyHint": False, "destructiveHint": False, "idempotentHint": False, "openWorldHint": True}
)
async def gtm_create_version(params: VersionCreateInput) -> str:
    """Freeze the current workspace changes into a container version ready for publishing.
    After creating, use gtm_publish_version with the returned containerVersionId to go live.

    Returns:
        str: JSON with containerVersionId, name, container name, and path.
    """
    def _call():
        return _get_service().accounts().containers().workspaces().create_version(
            path=_ws_path(params.account_id, params.container_id, params.workspace_id),
            body={"name": params.name, "notes": params.notes}
        ).execute()
    try:
        result = await asyncio.to_thread(_call)
        cv = result.get("containerVersion", {})
        return json.dumps({
            "containerVersionId": cv.get("containerVersionId"),
            "name": cv.get("name"),
            "notes": cv.get("notes"),
            "container": cv.get("container", {}).get("name"),
            "path": cv.get("path"),
        }, indent=2, ensure_ascii=False)
    except Exception as e:
        return _handle_error(e)


@mcp.tool(
    name="gtm_publish_version",
    annotations={"title": "Publish GTM Version Live", "readOnlyHint": False, "destructiveHint": False, "idempotentHint": True, "openWorldHint": True}
)
async def gtm_publish_version(params: VersionPublishInput) -> str:
    """Publish a GTM container version to production — makes it live for all users immediately.
    Always create a version first (gtm_create_version), then publish with the returned version ID.

    Returns:
        str: JSON confirmation with published version details.
    """
    def _call():
        path = f"accounts/{params.account_id}/containers/{params.container_id}/versions/{params.version_id}"
        return _get_service().accounts().containers().versions().publish(path=path).execute()
    try:
        result = await asyncio.to_thread(_call)
        return json.dumps(result, indent=2, ensure_ascii=False)
    except Exception as e:
        return _handle_error(e)


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    mcp.run()
