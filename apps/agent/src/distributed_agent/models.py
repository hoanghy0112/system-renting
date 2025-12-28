"""Pydantic models matching the TypeScript shared-types for WebSocket communication."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ==========================================
# Enums (matching TypeScript entities)
# ==========================================


class NodeStatus(str, Enum):
    """Status of a host node."""

    ONLINE = "online"
    BUSY = "busy"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"


class RentalStatus(str, Enum):
    """Status of a rental."""

    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


# ==========================================
# Hardware Info Models
# ==========================================


class GPUInfo(BaseModel):
    """Information about a single GPU."""

    index: int
    name: str
    vram_total_mb: int
    vram_available_mb: int
    cuda_version: str | None = None
    driver_version: str | None = None
    temperature: float | None = None
    utilization: float | None = None


class SystemInfo(BaseModel):
    """System hardware information."""

    cpu_model: str
    cpu_cores: int
    cpu_threads: int
    ram_total_mb: int
    ram_available_mb: int
    disk_total_gb: float
    disk_available_gb: float
    os_name: str
    os_version: str
    hostname: str


class NetworkInfo(BaseModel):
    """Network bandwidth information."""

    download_mbps: float
    upload_mbps: float
    latency_ms: float


class HardwareSpecs(BaseModel):
    """Complete hardware specifications for registration."""

    gpus: list[GPUInfo]
    system: SystemInfo
    network: NetworkInfo | None = None


# ==========================================
# Metrics Models (for heartbeat)
# ==========================================


class NodeMetrics(BaseModel):
    """Real-time metrics sent in heartbeat."""

    cpu_temp: float | None = None
    cpu_usage_percent: float
    gpu_temp: list[float] = Field(default_factory=list)
    gpu_utilization: list[float] = Field(default_factory=list)
    gpu_memory_used_mb: list[int] = Field(default_factory=list)
    ram_usage_mb: int
    ram_total_mb: int
    disk_usage_gb: float
    disk_total_gb: float
    network_rx_mbps: float = 0.0
    network_tx_mbps: float = 0.0


# ==========================================
# Agent → Backend Events
# ==========================================


class HeartbeatEventData(BaseModel):
    """Data payload for heartbeat event."""

    node_id: str
    status: NodeStatus
    metrics: NodeMetrics


class HeartbeatEvent(BaseModel):
    """Heartbeat event sent to backend every 5 seconds."""

    event: str = "heartbeat"
    data: HeartbeatEventData


class ConnectionInfo(BaseModel):
    """Connection info for a started instance."""

    ssh_host: str
    ssh_port: int
    additional_ports: dict[str, int] = Field(default_factory=dict)


class InstanceStartedEventData(BaseModel):
    """Data payload for instance_started event."""

    rental_id: str
    container_id: str
    connection_info: ConnectionInfo


class InstanceStartedEvent(BaseModel):
    """Event sent when a container is successfully started."""

    event: str = "instance_started"
    data: InstanceStartedEventData


class InstanceStoppedEventData(BaseModel):
    """Data payload for instance_stopped event."""

    rental_id: str
    container_id: str
    reason: str  # "requested", "error", "timeout"
    error_message: str | None = None


class InstanceStoppedEvent(BaseModel):
    """Event sent when a container is stopped."""

    event: str = "instance_stopped"
    data: InstanceStoppedEventData


class AgentErrorEventData(BaseModel):
    """Data payload for agent_error event."""

    node_id: str
    error_code: str
    message: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class AgentErrorEvent(BaseModel):
    """Event sent when an error occurs."""

    event: str = "agent_error"
    data: AgentErrorEventData


# ==========================================
# Backend → Agent Commands
# ==========================================


class ResourceLimits(BaseModel):
    """Resource limits for a container."""

    gpu_indices: list[str]
    cpu_cores: int
    ram_limit: str  # e.g., "16g"
    disk_limit: str | None = None


class StartInstanceCommandData(BaseModel):
    """Data payload for start_instance command."""

    rental_id: str
    image: str
    resource_limits: ResourceLimits
    env_vars: dict[str, str] = Field(default_factory=dict)
    proxy_port_mapping: dict[str, int] = Field(default_factory=dict)


class StartInstanceCommand(BaseModel):
    """Command to start a new container instance."""

    event: str = "start_instance"
    data: StartInstanceCommandData


class StopInstanceCommandData(BaseModel):
    """Data payload for stop_instance command."""

    rental_id: str
    container_id: str
    graceful: bool = True
    timeout_seconds: int = 30


class StopInstanceCommand(BaseModel):
    """Command to stop a container instance."""

    event: str = "stop_instance"
    data: StopInstanceCommandData


class DrainNodeCommandData(BaseModel):
    """Data payload for drain_node command."""

    node_id: str
    reason: str | None = None


class DrainNodeCommand(BaseModel):
    """Command to drain the node (stop accepting new rentals)."""

    event: str = "drain_node"
    data: DrainNodeCommandData


class AgentConfigData(BaseModel):
    """Agent configuration that can be updated remotely."""

    heartbeat_interval_ms: int = 5000
    max_concurrent_rentals: int = 0
    allowed_images: list[str] = Field(default_factory=list)


class UpdateConfigCommandData(BaseModel):
    """Data payload for update_config command."""

    node_id: str
    config: AgentConfigData


class UpdateConfigCommand(BaseModel):
    """Command to update agent configuration."""

    event: str = "update_config"
    data: UpdateConfigCommandData


# ==========================================
# Container State
# ==========================================


class ActiveRental(BaseModel):
    """Represents an active rental with its container."""

    rental_id: str
    container_id: str
    image: str
    started_at: datetime
    resource_limits: ResourceLimits
    connection_info: ConnectionInfo
    tunnel_process_id: int | None = None


# ==========================================
# Type aliases for parsing incoming messages
# ==========================================

BackendCommand = StartInstanceCommand | StopInstanceCommand | DrainNodeCommand | UpdateConfigCommand


def parse_backend_command(data: dict[str, Any]) -> BackendCommand | None:
    """Parse a raw message from the backend into a typed command."""
    event_type = data.get("event")

    match event_type:
        case "start_instance":
            return StartInstanceCommand(**data)
        case "stop_instance":
            return StopInstanceCommand(**data)
        case "drain_node":
            return DrainNodeCommand(**data)
        case "update_config":
            return UpdateConfigCommand(**data)
        case _:
            return None
