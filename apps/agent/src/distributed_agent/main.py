"""Main entry point and CLI for the DistributedCompute Host Agent."""

import asyncio
import signal
import sys
from pathlib import Path
from typing import Any

import structlog
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from . import __version__
from .backend_client import BackendClient
from .config import AgentSettings
from .docker_manager import DockerManager
from .hardware import HardwareDetector
from .models import (
    BackendCommand,
    DrainNodeCommand,
    NodeStatus,
    StartInstanceCommand,
    StopInstanceCommand,
    UpdateConfigCommand,
)
from .tunnel import TunnelManager

# Configure structlog
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()
console = Console()
app = typer.Typer(
    name="distributed-agent",
    help="DistributedCompute Host Agent - Manage GPU resources for rental marketplace",
    add_completion=False,
)


class AgentOrchestrator:
    """Orchestrates all agent components."""

    def __init__(self, settings: AgentSettings) -> None:
        """Initialize the orchestrator."""
        self.settings = settings
        self.hardware = HardwareDetector()
        self.docker = DockerManager(settings.docker)
        self.tunnel = TunnelManager(settings.frp)
        self.backend = BackendClient(settings.backend, settings.node)

        self._running = False
        self._shutdown_event = asyncio.Event()

        # Register command handlers
        self.backend.register_handler("start_instance", self._handle_start_instance)
        self.backend.register_handler("stop_instance", self._handle_stop_instance)
        self.backend.register_handler("drain_node", self._handle_drain_node)
        self.backend.register_handler("update_config", self._handle_update_config)

    async def _handle_start_instance(self, command: BackendCommand) -> None:
        """Handle start_instance command."""
        if not isinstance(command, StartInstanceCommand):
            return

        data = command.data
        rental_id = data.rental_id

        logger.info(
            "Starting instance",
            rental_id=rental_id,
            image=data.image,
        )

        try:
            # Start container
            container_id, connection_info = self.docker.start_container(data)

            # Get actual port mappings from Docker
            local_ports = self.docker.get_container_ports(container_id)

            # Create tunnel
            self.tunnel.create_tunnel(
                rental_id=rental_id,
                port_mapping=data.proxy_port_mapping,
                local_ports=local_ports,
            )

            # Report success
            await self.backend.send_instance_started(
                rental_id=rental_id,
                container_id=container_id,
                ssh_host=self.settings.frp.server_addr,
                ssh_port=data.proxy_port_mapping.get("22", 22),
                additional_ports={
                    k: v for k, v in data.proxy_port_mapping.items() if k != "22"
                },
            )

            # Update status if this is the first rental
            if self.backend.status == NodeStatus.ONLINE:
                self.backend.status = NodeStatus.BUSY

            logger.info(
                "Instance started successfully",
                rental_id=rental_id,
                container_id=container_id[:12],
            )

        except Exception as e:
            logger.error("Failed to start instance", rental_id=rental_id, error=str(e))
            await self.backend.send_error("START_INSTANCE_FAILED", str(e))

    async def _handle_stop_instance(self, command: BackendCommand) -> None:
        """Handle stop_instance command."""
        if not isinstance(command, StopInstanceCommand):
            return

        data = command.data
        rental_id = data.rental_id
        container_id = data.container_id

        logger.info("Stopping instance", rental_id=rental_id)

        try:
            # Destroy tunnel first
            self.tunnel.destroy_tunnel(rental_id)

            # Stop container
            self.docker.stop_container(
                container_id=container_id,
                rental_id=rental_id,
                graceful=data.graceful,
                timeout=data.timeout_seconds,
            )

            # Report success
            await self.backend.send_instance_stopped(
                rental_id=rental_id,
                container_id=container_id,
                reason="requested",
            )

            # Update status if no more active rentals
            if not self.docker.list_active_rentals():
                self.backend.status = NodeStatus.ONLINE

            logger.info("Instance stopped successfully", rental_id=rental_id)

        except Exception as e:
            logger.error("Failed to stop instance", rental_id=rental_id, error=str(e))
            await self.backend.send_instance_stopped(
                rental_id=rental_id,
                container_id=container_id,
                reason="error",
                error_message=str(e),
            )

    async def _handle_drain_node(self, command: BackendCommand) -> None:
        """Handle drain_node command."""
        if not isinstance(command, DrainNodeCommand):
            return

        logger.info("Draining node", reason=command.data.reason)
        self.backend.status = NodeStatus.MAINTENANCE

    async def _handle_update_config(self, command: BackendCommand) -> None:
        """Handle update_config command."""
        if not isinstance(command, UpdateConfigCommand):
            return

        config = command.data.config
        logger.info(
            "Updating config",
            heartbeat_interval=config.heartbeat_interval_ms,
            max_rentals=config.max_concurrent_rentals,
        )

        # Update settings
        if config.heartbeat_interval_ms > 0:
            self.backend.heartbeat_interval = config.heartbeat_interval_ms / 1000

        if config.allowed_images:
            self.settings.docker.allowed_images = config.allowed_images

    def _get_metrics(self) -> Any:
        """Get current metrics for heartbeat."""
        return self.hardware.get_current_metrics()

    async def run(self) -> None:
        """Run the agent."""
        self._running = True

        logger.info(
            "Starting agent",
            node_id=self.settings.node.id,
            backend_url=self.settings.backend.url,
        )

        # Print hardware specs
        specs = self.hardware.get_full_specs()
        logger.info(
            "Hardware detected",
            gpus=len(specs.gpus),
            cpu_model=specs.system.cpu_model,
            ram_gb=specs.system.ram_total_mb // 1024,
        )

        try:
            await self.backend.run(self._get_metrics)
        except asyncio.CancelledError:
            logger.info("Agent cancelled")
        finally:
            await self.shutdown()

    async def shutdown(self) -> None:
        """Graceful shutdown."""
        if not self._running:
            return

        self._running = False
        logger.info("Shutting down agent...")

        # Stop accepting new work
        self.backend.status = NodeStatus.OFFLINE

        # Disconnect from backend
        await self.backend.disconnect()

        # Destroy all tunnels
        self.tunnel.destroy_all_tunnels()

        # Note: We don't stop containers on shutdown - they continue running
        # This allows for agent restarts without disrupting rentals

        logger.info("Agent shutdown complete")


def setup_logging(level: str, fmt: str) -> None:
    """Configure logging based on settings."""
    import logging

    log_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(level=log_level)

    if fmt == "json":
        structlog.configure(
            processors=[
                structlog.stdlib.add_log_level,
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.JSONRenderer(),
            ],
        )


@app.command()
def start(
    config: Path = typer.Option(
        Path("agent.yaml"),
        "--config",
        "-c",
        help="Path to configuration file",
    ),
    log_level: str = typer.Option(
        None,
        "--log-level",
        "-l",
        help="Override log level (DEBUG, INFO, WARNING, ERROR)",
    ),
) -> None:
    """Start the agent and connect to the backend."""
    console.print(
        Panel.fit(
            f"[bold blue]DistributedCompute Agent[/bold blue] v{__version__}",
            border_style="blue",
        )
    )

    # Load configuration
    if config.exists():
        console.print(f"Loading config from [cyan]{config}[/cyan]")
        settings = AgentSettings.from_yaml(config)
    else:
        console.print("[yellow]No config file found, using environment variables[/yellow]")
        settings = AgentSettings.from_env()

    # Override log level if specified
    if log_level:
        settings.logging.level = log_level.upper()

    # Setup logging
    setup_logging(settings.logging.level, settings.logging.format)

    # Validate required settings
    missing = settings.validate_required()
    if missing:
        console.print(f"[red]Missing required configuration:[/red] {', '.join(missing)}")
        console.print("Run [cyan]distributed-agent setup[/cyan] to configure the agent.")
        raise typer.Exit(1)

    # Create orchestrator
    orchestrator = AgentOrchestrator(settings)

    # Setup signal handlers
    def signal_handler(sig: int, frame: Any) -> None:
        console.print("\n[yellow]Received shutdown signal...[/yellow]")
        orchestrator.backend.stop()

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Run
    console.print("[green]Starting agent...[/green]")
    try:
        asyncio.run(orchestrator.run())
    except KeyboardInterrupt:
        pass

    console.print("[green]Agent stopped.[/green]")


@app.command()
def status() -> None:
    """Show current agent status and hardware info."""
    console.print(
        Panel.fit(
            f"[bold blue]DistributedCompute Agent[/bold blue] v{__version__}",
            border_style="blue",
        )
    )

    # Hardware detection
    hardware = HardwareDetector()
    specs = hardware.get_full_specs()

    # System info table
    sys_table = Table(title="System Information")
    sys_table.add_column("Property", style="cyan")
    sys_table.add_column("Value", style="green")

    sys_table.add_row("Hostname", specs.system.hostname)
    sys_table.add_row("OS", f"{specs.system.os_name} {specs.system.os_version}")
    sys_table.add_row("CPU", specs.system.cpu_model)
    sys_table.add_row("CPU Cores", f"{specs.system.cpu_cores} ({specs.system.cpu_threads} threads)")
    sys_table.add_row("RAM", f"{specs.system.ram_total_mb // 1024} GB")
    sys_table.add_row("Disk", f"{specs.system.disk_total_gb:.1f} GB ({specs.system.disk_available_gb:.1f} GB free)")

    console.print(sys_table)

    # GPU table
    if specs.gpus:
        gpu_table = Table(title="GPU Information")
        gpu_table.add_column("Index", style="cyan")
        gpu_table.add_column("Model", style="green")
        gpu_table.add_column("VRAM", style="yellow")
        gpu_table.add_column("Driver", style="dim")

        for gpu in specs.gpus:
            gpu_table.add_row(
                str(gpu.index),
                gpu.name,
                f"{gpu.vram_total_mb // 1024} GB",
                gpu.driver_version or "N/A",
            )

        console.print(gpu_table)
    else:
        console.print("[yellow]No NVIDIA GPUs detected[/yellow]")

    # Check Docker
    try:
        import docker

        client = docker.from_env()
        client.ping()
        console.print("[green]✓ Docker is available[/green]")
    except Exception as e:
        console.print(f"[red]✗ Docker not available: {e}[/red]")


@app.command()
def setup() -> None:
    """Interactive setup wizard for initial configuration."""
    console.print(
        Panel.fit(
            "[bold blue]DistributedCompute Agent Setup[/bold blue]",
            border_style="blue",
        )
    )

    console.print("\nThis wizard will help you configure the agent.\n")

    # Collect configuration
    backend_url = typer.prompt(
        "Backend WebSocket URL",
        default="wss://api.example.com/fleet",
    )

    api_key = typer.prompt(
        "API Key (from your dashboard)",
        hide_input=True,
    )

    node_id = typer.prompt(
        "Node ID (leave empty to auto-generate)",
        default="",
    )

    frp_server = typer.prompt(
        "FRP Server Address",
        default="proxy.example.com",
    )

    frp_port = typer.prompt(
        "FRP Server Port",
        default="7000",
    )

    frp_token = typer.prompt(
        "FRP Token",
        hide_input=True,
    )

    # Generate config file
    config_content = f"""# DistributedCompute Agent Configuration
# Generated by setup wizard

backend:
  url: "{backend_url}"
  api_key: "{api_key}"

node:
  id: "{node_id}"
  heartbeat_interval_seconds: 5

frp:
  server_addr: "{frp_server}"
  server_port: {frp_port}
  token: "{frp_token}"

docker:
  allowed_images:
    - "pytorch/pytorch:*"
    - "tensorflow/tensorflow:*"
    - "jupyter/scipy-notebook:*"
    - "nvidia/cuda:*"

logging:
  level: "INFO"
  format: "text"
"""

    config_path = Path("agent.yaml")
    config_path.write_text(config_content)

    console.print(f"\n[green]Configuration saved to {config_path}[/green]")
    console.print("\nTo start the agent, run:")
    console.print("  [cyan]distributed-agent start[/cyan]")


@app.command()
def version() -> None:
    """Show version information."""
    console.print(f"distributed-agent v{__version__}")


@app.command()
def stop() -> None:
    """Stop the running agent gracefully."""
    console.print("[yellow]Sending stop signal to agent...[/yellow]")
    console.print("If the agent is running in this terminal, press Ctrl+C.")
    console.print("If running as a service, use your service manager to stop it.")


if __name__ == "__main__":
    app()
