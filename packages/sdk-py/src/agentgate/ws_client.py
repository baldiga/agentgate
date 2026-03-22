"""
Async WebSocket client with auto-reconnect and exponential backoff.
Uses the 'websockets' library (asyncio-native).
"""
import asyncio
import json
import logging
import random
from typing import Any, Callable, Awaitable, Optional

import websockets

logger = logging.getLogger(__name__)

MessageCallback = Callable[[dict], Awaitable[None]]


class WsClient:
    """
    Async WebSocket client. Usage:
        client = WsClient(url, reconnect=True)
        client.on_message(handler)
        await client.connect()
    """

    def __init__(
        self,
        url: str,
        reconnect: bool = True,
        reconnect_max_delay: float = 30.0,
    ):
        self._url = url
        self._should_reconnect = reconnect
        self._reconnect_max_delay = reconnect_max_delay
        self._callback: Optional[MessageCallback] = None
        self._ws = None  # current websockets connection
        self._reconnect_delay = 1.0

    def on_message(self, callback: MessageCallback) -> "WsClient":
        """Register an async callback for incoming messages."""
        self._callback = callback
        return self

    async def send(self, data: Any) -> None:
        """JSON-serialise data and send over the WebSocket."""
        if self._ws is not None:
            await self._ws.send(json.dumps(data))

    def disconnect(self) -> None:
        """Signal the connect loop to stop after the current iteration."""
        self._should_reconnect = False

    async def connect(self) -> None:
        """
        Open a WebSocket connection and process messages.
        If reconnect=True, retry with exponential backoff on disconnect/error.
        """
        while True:
            try:
                async with websockets.connect(self._url) as ws:
                    self._ws = ws
                    self._reconnect_delay = 1.0  # reset backoff on success
                    logger.debug("WsClient connected to %s", self._url)
                    async for raw in ws:
                        try:
                            msg = json.loads(raw)
                            if self._callback:
                                await self._callback(msg)
                        except json.JSONDecodeError:
                            logger.debug("WsClient: dropped non-JSON frame")
            except Exception as exc:
                logger.debug("WsClient disconnected: %s", exc)
            finally:
                self._ws = None

            if not self._should_reconnect:
                break

            # Exponential backoff with ±25% jitter
            jitter = (random.random() - 0.5) * 0.5 * self._reconnect_delay
            delay = min(self._reconnect_delay + jitter, self._reconnect_max_delay)
            logger.debug("WsClient reconnecting in %.1fs", delay)
            await asyncio.sleep(delay)
            self._reconnect_delay = min(self._reconnect_delay * 2, self._reconnect_max_delay)
