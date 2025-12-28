"""WebSocket client for backend communication with heartbeat and command handling."""

import asyncio
import json
from typing import Any, Callable, Coroutine

import structlog
import websockets
import websockets.client
from websockets.exceptions import ConnectionClosed, InvalidStatusCode

from .config import BackendConfig, NodeConfig
from .models import (
    AgentErrorEvent,
    AgentErrorEventData,
    BackendCommand,
    DrainNodeCommand,
    HeartbeatEvent,
    HeartbeatEventData,
    InstanceStartedEvent,
    InstanceStartedEventData,
    InstanceStoppedEvent,
    InstanceStoppedEventData,
    NodeMetrics,
    NodeStatus,
    StartInstanceCommand,
    StopInstanceCommand,
    UpdateConfigCommand,
    parse_backend_command,
)

logger = structlog.get_logger()


# Type alias for command handlers
CommandHandler = Callable[[BackendCommand], Coroutine[Any, Any, None]]


class BackendClient:
    """WebSocket client for backend communication."""

    def __init__(
        self,
        backend_config: BackendConfig,
        node_config: NodeConfig,
    ) -> None:
        """Initialize the backend client."""
        self.backend_url = backend_config.url
        self.api_key = backend_config.api_key
        self.reconnect_delay = backend_config.reconnect_delay_seconds
        self.max_reconnect_attempts = backend_config.max_reconnect_attempts
        self.heartbeat_interval = node_config.heartbeat_interval_seconds
        self.node_id = node_config.id

        self._connection: websockets.client.WebSocketClientProtocol | None = None
        self._connected = False
        self._should_run = False
        self._reconnect_count = 0

        # Command handlers
        self._command_handlers: dict[str, CommandHandler] = {}

        # Status
        self._status = NodeStatus.OFFLINE
        self._is_draining = False

    @property
    def is_connected(self) -> bool:
        """Check if currently connected."""
        return self._connected and self._connection is not None

    @property
    def status(self) -> NodeStatus:
        """Get current node status."""
        return self._status

    @status.setter
    def status(self, value: NodeStatus) -> None:
        """Set node status."""
        self._status = value

    def register_handler(self, event_type: str, handler: CommandHandler) -> None:
        """Register a handler for a specific command type."""
        self._command_handlers[event_type] = handler
        logger.debug("Handler registered", event_type=event_type)

    async def connect(self) -> bool:
        """
        Establish WebSocket connection to the backend.

        Returns:
            True if connection successful, False otherwise.
        """
        if self._connected:
            logger.debug("Already connected")
            return True

        headers = {"Authorization": f"Bearer {self.api_key}"}

        try:
            logger.info(
                "Connecting to backend",
                url=self.backend_url,
                node_id=self.node_id,
            )

            self._connection = await websockets.client.connect(
                self.backend_url,
                additional_headers=headers,
                ping_interval=20,
                ping_timeout=10,
            )

            self._connected = True
            self._reconnect_count = 0
            self._status = NodeStatus.ONLINE

            logger.info("Connected to backend successfully")
            return True

        except InvalidStatusCode as e:
            logger.error(
                "Connection rejected",
                status_code=e.status_code,
                error=str(e),
            )
            return False
        except Exception as e:
            logger.error("Connection failed", error=str(e))
            return False

    async def disconnect(self) -> None:
        """Close the WebSocket connection gracefully."""
        self._should_run = False
        self._status = NodeStatus.OFFLINE

        if self._connection:
            try:
                await self._connection.close()
            except Exception:
                pass
            self._connection = None

        self._connected = False
        logger.info("Disconnected from backend")

    async def send_message(self, message: dict[str, Any]) -> bool:
        """Send a JSON message to the backend."""
        if not self.is_connected or self._connection is None:
            logger.warning("Cannot send message, not connected")
            return False

        try:
            data = json.dumps(message)
            await self._connection.send(data)
            return True
        except ConnectionClosed:
            self._connected = False
            logger.warning("Connection closed while sending")
            return False
        except Exception as e:
            logger.error("Failed to send message", error=str(e))
            return False

    async def send_heartbeat(self, metrics: NodeMetrics) -> bool:
        """Send a heartbeat with current metrics."""
        event = HeartbeatEvent(
            data=HeartbeatEventData(
                node_id=self.node_id,
                status=self._status,
                metrics=metrics,
            )
        )

        return await self.send_message(event.model_dump())

    async def send_instance_started(
        self,
        rental_id: str,
        container_id: str,
        ssh_host: str,
        ssh_port: int,
        additional_ports: dict[str, int],
    ) -> bool:
        """Send instance_started event."""
        from .models import ConnectionInfo

        event = InstanceStartedEvent(
            data=InstanceStartedEventData(
                rental_id=rental_id,
                container_id=container_id,
                connection_info=ConnectionInfo(
                    ssh_host=ssh_host,
                    ssh_port=ssh_port,
                    additional_ports=additional_ports,
                ),
            )
        )

        return await self.send_message(event.model_dump())

    async def send_instance_stopped(
        self,
        rental_id: str,
        container_id: str,
        reason: str,
        error_message: str | None = None,
    ) -> bool:
        """Send instance_stopped event."""
        event = InstanceStoppedEvent(
            data=InstanceStoppedEventData(
                rental_id=rental_id,
                container_id=container_id,
                reason=reason,
                error_message=error_message,
            )
        )

        return await self.send_message(event.model_dump())

    async def send_error(
        self,
        error_code: str,
        message: str,
    ) -> bool:
        """Send agent_error event."""
        event = AgentErrorEvent(
            data=AgentErrorEventData(
                node_id=self.node_id,
                error_code=error_code,
                message=message,
            )
        )

        return await self.send_message(event.model_dump())

    async def _handle_message(self, raw_message: str) -> None:
        """Handle an incoming message from the backend."""
        try:
            data = json.loads(raw_message)
            event_type = data.get("event")

            logger.debug("Received message", event_type=event_type)

            command = parse_backend_command(data)
            if command is None:
                logger.warning("Unknown command type", event_type=event_type)
                return

            # Find and execute handler
            handler = self._command_handlers.get(event_type)
            if handler:
                try:
                    await handler(command)
                except Exception as e:
                    logger.error(
                        "Handler error",
                        event_type=event_type,
                        error=str(e),
                    )
                    await self.send_error("HANDLER_ERROR", str(e))
            else:
                logger.warning("No handler for command", event_type=event_type)

        except json.JSONDecodeError:
            logger.error("Invalid JSON received", message=raw_message[:100])
        except Exception as e:
            logger.error("Error handling message", error=str(e))

    async def listen_commands(self) -> None:
        """Listen for incoming commands from the backend."""
        if not self.is_connected or self._connection is None:
            logger.error("Cannot listen, not connected")
            return

        try:
            async for message in self._connection:
                if isinstance(message, bytes):
                    message = message.decode("utf-8")
                await self._handle_message(message)
        except ConnectionClosed as e:
            logger.warning("Connection closed", code=e.code, reason=e.reason)
            self._connected = False
        except Exception as e:
            logger.error("Error in listen loop", error=str(e))
            self._connected = False

    async def run(
        self,
        get_metrics: Callable[[], NodeMetrics],
    ) -> None:
        """
        Main run loop with reconnection logic.

        Args:
            get_metrics: Callable that returns current metrics for heartbeat
        """
        self._should_run = True

        while self._should_run:
            # Attempt connection
            connected = await self.connect()

            if not connected:
                self._reconnect_count += 1

                if (
                    self.max_reconnect_attempts > 0
                    and self._reconnect_count >= self.max_reconnect_attempts
                ):
                    logger.error("Max reconnection attempts reached")
                    break

                delay = min(
                    self.reconnect_delay * (2 ** min(self._reconnect_count, 5)),
                    300,  # Max 5 minutes
                )
                logger.info(
                    "Reconnecting",
                    attempt=self._reconnect_count,
                    delay=delay,
                )
                await asyncio.sleep(delay)
                continue

            # Start heartbeat and listen tasks
            heartbeat_task = asyncio.create_task(
                self._heartbeat_loop(get_metrics)
            )
            listen_task = asyncio.create_task(self.listen_commands())

            # Wait for either to complete (usually means disconnect)
            done, pending = await asyncio.wait(
                [heartbeat_task, listen_task],
                return_when=asyncio.FIRST_COMPLETED,
            )

            # Cancel pending tasks
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

            # If we should still run, reconnect
            if self._should_run:
                self._connected = False
                self._reconnect_count += 1
                logger.info("Connection lost, will reconnect")
                await asyncio.sleep(self.reconnect_delay)

    async def _heartbeat_loop(
        self,
        get_metrics: Callable[[], NodeMetrics],
    ) -> None:
        """Send heartbeats at regular intervals."""
        while self._should_run and self.is_connected:
            try:
                metrics = get_metrics()
                await self.send_heartbeat(metrics)
                logger.debug("Heartbeat sent", status=self._status.value)
            except Exception as e:
                logger.error("Heartbeat failed", error=str(e))

            await asyncio.sleep(self.heartbeat_interval)

    def stop(self) -> None:
        """Signal the client to stop."""
        self._should_run = False
