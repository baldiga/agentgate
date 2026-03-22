"""MessageContext — wraps UserContext and provides reply/reply_stream methods."""
from __future__ import annotations
from typing import AsyncIterable, Any


class MessageContext:
    """
    Passed to the user's message handler. Exposes all UserContext fields
    and provides reply() / reply_stream() for sending responses.
    """

    def __init__(self, message_id: str, payload: dict, ws: Any) -> None:
        self._message_id = message_id
        self._ws = ws

        # UserContext fields — exposed as read-only attributes
        self.message: str = payload["message"]
        self.user: dict = payload["user"]
        self.role: str = payload["role"]
        self.permissions: list[str] = payload["permissions"]
        self.thread_id: str = payload["thread_id"]
        self.channel_id: str | None = payload.get("channel_id")
        self.is_superadmin: bool = payload.get("is_superadmin", False)
        self.sources: dict = payload.get("sources", {})

    async def reply(self, content: str) -> None:
        """Send a single complete response."""
        await self._ws.send({
            "type": "reply",
            "messageId": self._message_id,
            "content": content,
            "done": True,
        })

    async def reply_stream(self, generator: AsyncIterable[str]) -> None:
        """Stream response chunks, then send a done=True closer."""
        async for chunk in generator:
            await self._ws.send({
                "type": "reply",
                "messageId": self._message_id,
                "content": chunk,
                "done": False,
            })
        # Always send closer
        await self._ws.send({
            "type": "reply",
            "messageId": self._message_id,
            "content": "",
            "done": True,
        })
