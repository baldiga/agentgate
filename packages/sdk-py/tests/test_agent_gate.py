import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import hmac as hmac_module
import hashlib
import json
from agentgate.agent_gate import AgentGate


TOKEN = "test-sdk-token-for-agentgate"
AGENT_ID = "cmo-agent"
GATEWAY = "ws://localhost:3001"

BASE_CONTEXT = {
    "message": "Hello agent",
    "user": {"id": "u_1", "name": "Sara", "email": "sara@acme.com"},
    "role": "MARKETING_MANAGER",
    "permissions": ["read"],
    "thread_id": "t_1",
    "channel_id": None,
    "is_superadmin": False,
    "sources": {},
}


def _sort_keys(obj):
    if isinstance(obj, dict):
        return {k: _sort_keys(v) for k, v in sorted(obj.items())}
    if isinstance(obj, list):
        return [_sort_keys(i) for i in obj]
    return obj


def sign_payload(payload: dict, token: str) -> str:
    canonical = json.dumps(_sort_keys(payload), separators=(",", ":"))
    return hmac_module.new(
        token.encode("utf-8"),
        canonical.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


@pytest.mark.asyncio
async def test_calls_handler_with_message_context_on_valid_hmac():
    gate = AgentGate(token=TOKEN, agent_id=AGENT_ID, gateway_url=GATEWAY, reconnect=False)
    handler = AsyncMock()
    gate.on_message(handler)

    hmac_val = sign_payload(BASE_CONTEXT, TOKEN)
    msg = {
        "type": "message",
        "messageId": "msg-1",
        "payload": {**BASE_CONTEXT, "hmac": hmac_val},
    }

    await gate._dispatch(msg)

    handler.assert_called_once()
    ctx = handler.call_args[0][0]
    assert ctx.message == "Hello agent"
    assert ctx.role == "MARKETING_MANAGER"


@pytest.mark.asyncio
async def test_drops_message_when_hmac_invalid():
    gate = AgentGate(token=TOKEN, agent_id=AGENT_ID, gateway_url=GATEWAY, reconnect=False)
    handler = AsyncMock()
    gate.on_message(handler)

    msg = {
        "type": "message",
        "messageId": "msg-bad",
        "payload": {**BASE_CONTEXT, "hmac": "tampered"},
    }

    await gate._dispatch(msg)

    handler.assert_not_called()


@pytest.mark.asyncio
async def test_ignores_non_message_frames():
    gate = AgentGate(token=TOKEN, agent_id=AGENT_ID, gateway_url=GATEWAY, reconnect=False)
    handler = AsyncMock()
    gate.on_message(handler)

    await gate._dispatch({"type": "connected", "agentId": AGENT_ID})

    handler.assert_not_called()


def test_on_message_returns_self_for_chaining():
    gate = AgentGate(token=TOKEN, agent_id=AGENT_ID, gateway_url=GATEWAY, reconnect=False)
    result = gate.on_message(AsyncMock())
    assert result is gate
