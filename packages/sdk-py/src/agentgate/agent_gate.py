"""AgentGate — main entry point for connecting an agent to the platform."""
from __future__ import annotations
import asyncio
import logging
from typing import Callable, Awaitable, Optional

from .ws_client import WsClient
from .message_context import MessageContext
from .crypto import verify_payload_hmac

logger = logging.getLogger(__name__)

MessageHandler = Callable[[MessageContext], Awaitable[None]]


class AgentGate:
    """
    Connect an agent to AgentGate.

    Usage:
        gate = AgentGate(token="...", agent_id="...", gateway_url="wss://...")
        gate.on_message(handler)
        await gate.connect()
    """

    def __init__(
        self,
        token: str,
        agent_id: str,
        gateway_url: str,
        reconnect: bool = True,
        reconnect_max_delay: float = 30.0,
    ) -> None:
        self._token = token
        self._agent_id = agent_id
        url = f"{gateway_url}/ws/agent?agentId={agent_id}&token={token}"

        self._ws = WsClient(url, reconnect=reconnect, reconnect_max_delay=reconnect_max_delay)
        self._ws.on_message(self._dispatch)
        self._handler: Optional[MessageHandler] = None

    def on_message(self, handler: MessageHandler) -> "AgentGate":
        """Register the async handler for incoming messages."""
        self._handler = handler
        return self

    async def connect(self) -> None:
        """Start the WebSocket connection (blocks until disconnected)."""
        logger.info("[AgentGate] Connecting agent %s", self._agent_id)
        await self._ws.connect()

    def disconnect(self) -> None:
        """Stop reconnecting and close the connection."""
        self._ws.disconnect()

    async def _dispatch(self, msg: dict) -> None:
        """Called for every incoming frame. Verifies HMAC and calls handler."""
        if msg.get("type") != "message":
            return

        message_id = msg.get("messageId")
        payload = msg.get("payload")

        if not isinstance(payload, dict) or not message_id:
            logger.warning("[AgentGate] Malformed frame received")
            return

        if not verify_payload_hmac(payload, self._token):
            logger.warning("[AgentGate] Dropping message — HMAC verification failed.")
            return

        if not self._handler:
            logger.warning("[AgentGate] No handler registered. Call on_message() before connect().")
            return

        ctx = MessageContext(message_id, payload, self._ws)

        try:
            await self._handler(ctx)
        except Exception as exc:
            logger.error("[AgentGate] Handler raised an exception: %s", exc)
