"""
End-to-end integration tests — spins up a real WebSocket server
and verifies the full SDK message/reply cycle.
"""
import asyncio
import json
import hmac as hmac_module
import hashlib
import pytest
import websockets
from websockets.server import serve as ws_serve
from agentgate.agent_gate import AgentGate

TOKEN = "integration-test-token-32-chars!"
AGENT_ID = "integration-agent"

USER_CONTEXT = {
    "message": "What is Q1 budget?",
    "user": {"id": "u_1", "name": "Sara", "email": "sara@acme.com"},
    "role": "MARKETING_MANAGER",
    "permissions": ["read", "query"],
    "thread_id": "t_1",
    "channel_id": None,
    "is_superadmin": False,
    "sources": {"files": [], "api_keys": [], "repos": []},
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
async def test_full_cycle_receives_signed_message_and_replies():
    """Server sends a signed message; agent handler runs and sends a reply."""
    reply_received: list[dict] = []
    agent_connected = asyncio.Event()

    async def server_handler(ws):
        agent_connected.set()
        hmac_val = sign_payload(USER_CONTEXT, TOKEN)
        await ws.send(json.dumps({
            "type": "message",
            "messageId": "msg-e2e-1",
            "payload": {**USER_CONTEXT, "hmac": hmac_val},
        }))
        raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
        reply_received.append(json.loads(raw))

    async with ws_serve(server_handler, "localhost", 0) as server:
        port = server.sockets[0].getsockname()[1]

        gate = AgentGate(
            token=TOKEN,
            agent_id=AGENT_ID,
            gateway_url=f"ws://localhost:{port}",
            reconnect=False,
        )

        async def handler(ctx):
            await ctx.reply(f"Processed: {ctx.message}")

        gate.on_message(handler)

        # Run the gate connection until server closes
        await asyncio.wait_for(gate.connect(), timeout=5.0)

    assert len(reply_received) == 1
    assert reply_received[0] == {
        "type": "reply",
        "messageId": "msg-e2e-1",
        "content": "Processed: What is Q1 budget?",
        "done": True,
    }


@pytest.mark.asyncio
async def test_drops_tampered_messages_no_reply_sent():
    """Server sends a tampered message; agent must NOT call handler or reply."""
    reply_received: list[dict] = []

    async def server_handler(ws):
        await ws.send(json.dumps({
            "type": "message",
            "messageId": "msg-tampered",
            "payload": {**USER_CONTEXT, "role": "SUPERADMIN", "hmac": "bad-hmac"},
        }))
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=0.2)
            reply_received.append(json.loads(raw))
        except asyncio.TimeoutError:
            pass  # expected — no reply should arrive

    async with ws_serve(server_handler, "localhost", 0) as server:
        port = server.sockets[0].getsockname()[1]

        gate = AgentGate(
            token=TOKEN,
            agent_id=AGENT_ID,
            gateway_url=f"ws://localhost:{port}",
            reconnect=False,
        )
        gate.on_message(lambda ctx: ctx.reply("should not reach here"))

        try:
            await asyncio.wait_for(gate.connect(), timeout=2.0)
        except asyncio.TimeoutError:
            pass

    assert reply_received == []


@pytest.mark.asyncio
async def test_streaming_sends_chunks_then_done_closer():
    """Agent replies with replyStream; server receives 2 chunks + 1 done=True closer."""
    frames_received: list[dict] = []
    done_event = asyncio.Event()

    async def server_handler(ws):
        hmac_val = sign_payload(USER_CONTEXT, TOKEN)
        await ws.send(json.dumps({
            "type": "message",
            "messageId": "msg-stream",
            "payload": {**USER_CONTEXT, "hmac": hmac_val},
        }))
        async for raw in ws:
            frame = json.loads(raw)
            frames_received.append(frame)
            if frame.get("done"):
                done_event.set()
                break

    async with ws_serve(server_handler, "localhost", 0) as server:
        port = server.sockets[0].getsockname()[1]

        gate = AgentGate(
            token=TOKEN,
            agent_id=AGENT_ID,
            gateway_url=f"ws://localhost:{port}",
            reconnect=False,
        )

        async def handler(ctx):
            async def chunks():
                yield "part-one "
                yield "part-two"
            await ctx.reply_stream(chunks())

        gate.on_message(handler)

        await asyncio.wait_for(gate.connect(), timeout=5.0)

    assert len(frames_received) == 3
    assert frames_received[0] == {"type": "reply", "messageId": "msg-stream", "content": "part-one ", "done": False}
    assert frames_received[1] == {"type": "reply", "messageId": "msg-stream", "content": "part-two", "done": False}
    assert frames_received[2] == {"type": "reply", "messageId": "msg-stream", "content": "", "done": True}
