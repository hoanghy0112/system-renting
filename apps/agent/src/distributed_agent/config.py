"""Configuration loading and validation for the agent."""

import os
from pathlib import Path
from typing import Any

import yaml
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class BackendConfig(BaseSettings):
    """Backend connection configuration."""

    url: str = Field(
        default="wss://localhost:3000/fleet",
        description="WebSocket URL for the fleet gateway",
    )
    api_key: str = Field(
        default="",
        description="API key for authentication",
    )
    reconnect_delay_seconds: int = Field(default=5, ge=1)
    max_reconnect_attempts: int = Field(default=0, ge=0)  # 0 = infinite


class NodeConfig(BaseSettings):
    """Node identification configuration."""

    id: str = Field(default="", description="Node ID assigned after registration")
    heartbeat_interval_seconds: int = Field(default=5, ge=1)


class FRPConfig(BaseSettings):
    """FRP tunneling configuration."""

    server_addr: str = Field(default="localhost", description="FRP server address")
    server_port: int = Field(default=7000, ge=1, le=65535)
    token: str = Field(default="", description="FRP authentication token")
    frpc_path: str | None = Field(default=None, description="Path to frpc binary")


class DockerDefaults(BaseSettings):
    """Default Docker container settings."""

    network_mode: str = "bridge"
    restart_policy: str = "no"


class DockerConfig(BaseSettings):
    """Docker configuration."""

    allowed_images: list[str] = Field(
        default_factory=lambda: [
            "pytorch/pytorch:*",
            "tensorflow/tensorflow:*",
            "jupyter/scipy-notebook:*",
            "nvidia/cuda:*",
        ]
    )
    defaults: DockerDefaults = Field(default_factory=DockerDefaults)
    cleanup_after_seconds: int = Field(default=300, ge=0)


class ResourceConfig(BaseSettings):
    """Resource limit configuration."""

    max_concurrent_rentals: int = Field(default=0, ge=0)  # 0 = unlimited
    reserved_ram_gb: float = Field(default=2.0, ge=0)
    reserved_cpu_cores: int = Field(default=1, ge=0)


class LoggingConfig(BaseSettings):
    """Logging configuration."""

    level: str = Field(default="INFO")
    format: str = Field(default="json")  # json or text
    file: str | None = Field(default=None)

    @field_validator("level")
    @classmethod
    def validate_level(cls, v: str) -> str:
        """Validate log level."""
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper = v.upper()
        if upper not in valid_levels:
            raise ValueError(f"Invalid log level: {v}. Must be one of {valid_levels}")
        return upper


class AgentSettings(BaseSettings):
    """Main agent settings combining all configuration sections."""

    model_config = SettingsConfigDict(
        env_prefix="AGENT_",
        env_nested_delimiter="__",
        extra="ignore",
    )

    backend: BackendConfig = Field(default_factory=BackendConfig)
    node: NodeConfig = Field(default_factory=NodeConfig)
    frp: FRPConfig = Field(default_factory=FRPConfig)
    docker: DockerConfig = Field(default_factory=DockerConfig)
    resources: ResourceConfig = Field(default_factory=ResourceConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)

    @classmethod
    def from_yaml(cls, path: Path | str) -> "AgentSettings":
        """Load settings from a YAML file, with environment variable expansion."""
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"Configuration file not found: {path}")

        with open(path, "r") as f:
            raw_content = f.read()

        # Expand environment variables in the YAML content
        expanded_content = os.path.expandvars(raw_content)
        data = yaml.safe_load(expanded_content)

        return cls._from_dict(data)

    @classmethod
    def _from_dict(cls, data: dict[str, Any]) -> "AgentSettings":
        """Create settings from a dictionary."""
        return cls(
            backend=BackendConfig(**data.get("backend", {})),
            node=NodeConfig(**data.get("node", {})),
            frp=FRPConfig(**data.get("frp", {})),
            docker=DockerConfig(
                allowed_images=data.get("docker", {}).get(
                    "allowed_images", DockerConfig().allowed_images
                ),
                defaults=DockerDefaults(**data.get("docker", {}).get("defaults", {})),
                cleanup_after_seconds=data.get("docker", {}).get(
                    "cleanup_after_seconds", 300
                ),
            ),
            resources=ResourceConfig(**data.get("resources", {})),
            logging=LoggingConfig(**data.get("logging", {})),
        )

    @classmethod
    def from_env(cls) -> "AgentSettings":
        """Load settings from environment variables only."""
        return cls(
            backend=BackendConfig(
                url=os.getenv("AGENT_BACKEND_URL", "wss://localhost:3000/fleet"),
                api_key=os.getenv("AGENT_API_KEY", ""),
            ),
            node=NodeConfig(
                id=os.getenv("NODE_ID", ""),
            ),
            frp=FRPConfig(
                server_addr=os.getenv("FRP_SERVER_ADDR", "localhost"),
                server_port=int(os.getenv("FRP_SERVER_PORT", "7000")),
                token=os.getenv("FRP_TOKEN", ""),
                frpc_path=os.getenv("FRPC_PATH"),
            ),
        )

    def validate_required(self) -> list[str]:
        """Validate that required fields are set. Returns list of missing fields."""
        missing = []

        if not self.backend.url:
            missing.append("backend.url")
        if not self.backend.api_key:
            missing.append("backend.api_key")
        if not self.node.id:
            missing.append("node.id")
        if not self.frp.server_addr:
            missing.append("frp.server_addr")
        if not self.frp.token:
            missing.append("frp.token")

        return missing
