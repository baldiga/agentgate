import asyncio
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from agentgate.ws_client import WsClient


@pytest.mark.asyncio
async def test_message_callback_called_with_parsed_json():
    """WsClient parses incoming JSON frames and calls the registered callback."""
    received = []

    async def on_msg(msg):
        received.append(msg)

    async def fake_ws_iter(messages):
        for m in messages:
            yield m

    class FakeWs:
        def __init__(self, messages):
            self._iter = fake_ws_iter(messages)
            self.closed = False

        def __aiter__(self):
            return self._iter

        async def send(self, data):
            pass

        async def close(self):
            self.closed = True

    msg_data = json.dumps({"type": "message", "messageId": "x"})

    fake_ws = FakeWs([msg_data])
    cm = AsyncMock()
    cm.__aenter__.return_value = fake_ws
    cm.__aexit__.return_value = False

    client = WsClient("ws://test", reconnect=False)
    client.on_message(on_msg)

    with patch("agentgate.ws_client.websockets.connect", return_value=cm):
        await client.connect()

    assert received == [{"type": "message", "messageId": "x"}]


@pytest.mark.asyncio
async def test_malformed_frames_are_ignored():
    """Non-JSON frames must not raise and must not call the callback."""
    received = []

    async def on_msg(msg):
        received.append(msg)

    async def fake_ws_iter(messages):
        for m in messages:
            yield m

    class FakeWs:
        def __init__(self, messages):
            self._iter = fake_ws_iter(messages)
            self.closed = False

        def __aiter__(self):
            return self._iter

        async def send(self, data):
            pass

    fake_ws = FakeWs(["not-valid-json"])
    cm = AsyncMock()
    cm.__aenter__.return_value = fake_ws
    cm.__aexit__.return_value = False

    client = WsClient("ws://test", reconnect=False)
    client.on_message(on_msg)

    with patch("agentgate.ws_client.websockets.connect", return_value=cm):
        await client.connect()

    assert received == []


@pytest.mark.asyncio
async def test_send_serialises_to_json():
    """send() JSON-serialises data and passes it to the underlying WebSocket."""
    import json as _json

    sent = []

    class FakeWs:
        closed = False

        async def send(self, data):
            sent.append(data)

    client = WsClient("ws://test", reconnect=False)
    client._ws = FakeWs()  # inject directly

    await client.send({"type": "reply", "done": True})

    assert len(sent) == 1
    parsed = _json.loads(sent[0])
    assert parsed == {"type": "reply", "done": True}


def test_disconnect_sets_should_reconnect_to_false():
    """disconnect() must set _should_reconnect=False so the loop exits."""
    client = WsClient("ws://test", reconnect=True, reconnect_max_delay=30.0)

    assert client._should_reconnect is True

    client.disconnect()

    assert client._should_reconnect is False
