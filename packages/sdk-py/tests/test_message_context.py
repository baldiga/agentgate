import pytest
from unittest.mock import AsyncMock
from agentgate.message_context import MessageContext

PAYLOAD = {
    "message": "What is Q1 budget?",
    "user": {"id": "u_1", "name": "Sara", "email": "sara@acme.com"},
    "role": "MARKETING_MANAGER",
    "permissions": ["read", "query"],
    "thread_id": "t_1",
    "channel_id": None,
    "is_superadmin": False,
    "sources": {"files": [], "api_keys": [], "repos": []},
}


def make_mock_ws():
    ws = AsyncMock()
    ws.send = AsyncMock()
    return ws


@pytest.mark.asyncio
async def test_exposes_all_user_context_fields():
    ws = make_mock_ws()
    ctx = MessageContext("msg-1", PAYLOAD, ws)

    assert ctx.message == "What is Q1 budget?"
    assert ctx.user == {"id": "u_1", "name": "Sara", "email": "sara@acme.com"}
    assert ctx.role == "MARKETING_MANAGER"
    assert ctx.permissions == ["read", "query"]
    assert ctx.thread_id == "t_1"
    assert ctx.channel_id is None
    assert ctx.is_superadmin is False
    assert ctx.sources == {"files": [], "api_keys": [], "repos": []}


@pytest.mark.asyncio
async def test_reply_sends_single_done_true_frame():
    ws = make_mock_ws()
    ctx = MessageContext("msg-1", PAYLOAD, ws)

    await ctx.reply("Here is your budget summary.")

    ws.send.assert_called_once_with({
        "type": "reply",
        "messageId": "msg-1",
        "content": "Here is your budget summary.",
        "done": True,
    })


@pytest.mark.asyncio
async def test_reply_stream_sends_chunks_then_done_true_closer():
    ws = make_mock_ws()
    ctx = MessageContext("msg-1", PAYLOAD, ws)

    async def generate():
        yield "chunk-1"
        yield "chunk-2"
        yield "chunk-3"

    await ctx.reply_stream(generate())

    assert ws.send.call_count == 4
    calls = ws.send.call_args_list
    assert calls[0].args[0] == {"type": "reply", "messageId": "msg-1", "content": "chunk-1", "done": False}
    assert calls[1].args[0] == {"type": "reply", "messageId": "msg-1", "content": "chunk-2", "done": False}
    assert calls[2].args[0] == {"type": "reply", "messageId": "msg-1", "content": "chunk-3", "done": False}
    assert calls[3].args[0] == {"type": "reply", "messageId": "msg-1", "content": "", "done": True}


@pytest.mark.asyncio
async def test_reply_stream_with_empty_generator_sends_only_closer():
    ws = make_mock_ws()
    ctx = MessageContext("msg-1", PAYLOAD, ws)

    async def empty():
        return
        yield  # make it an async generator

    await ctx.reply_stream(empty())

    ws.send.assert_called_once_with({
        "type": "reply",
        "messageId": "msg-1",
        "content": "",
        "done": True,
    })
