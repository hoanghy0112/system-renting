"""FRP tunnel management for NAT traversal."""

import os
import shutil
import signal
import subprocess
import tempfile
from pathlib import Path

import structlog

from .config import FRPConfig

logger = structlog.get_logger()


class TunnelError(Exception):
    """Base exception for tunnel-related errors."""

    pass


class FRPCNotFoundError(TunnelError):
    """Raised when frpc binary is not found."""

    pass


class TunnelManager:
    """Manages FRP tunnels for exposing container ports publicly."""

    def __init__(self, config: FRPConfig) -> None:
        """Initialize the tunnel manager."""
        self.config = config
        self._frpc_path: str | None = None
        self._active_tunnels: dict[str, subprocess.Popen[bytes]] = {}
        self._tunnel_configs: dict[str, Path] = {}  # rental_id -> config file path

    @property
    def frpc_path(self) -> str:
        """Get the path to the frpc binary."""
        if self._frpc_path is not None:
            return self._frpc_path

        # Try configured path first
        if self.config.frpc_path:
            if os.path.isfile(self.config.frpc_path) and os.access(
                self.config.frpc_path, os.X_OK
            ):
                self._frpc_path = self.config.frpc_path
                return self._frpc_path
            else:
                logger.warning(
                    "Configured frpc path not valid", path=self.config.frpc_path
                )

        # Try to find in PATH
        frpc_in_path = shutil.which("frpc")
        if frpc_in_path:
            self._frpc_path = frpc_in_path
            logger.info("Found frpc in PATH", path=frpc_in_path)
            return self._frpc_path

        # Try common locations
        common_paths = [
            "/usr/local/bin/frpc",
            "/usr/bin/frpc",
            os.path.expanduser("~/.local/bin/frpc"),
            "./frpc",
            "./bin/frpc",
        ]

        for path in common_paths:
            if os.path.isfile(path) and os.access(path, os.X_OK):
                self._frpc_path = path
                logger.info("Found frpc", path=path)
                return self._frpc_path

        raise FRPCNotFoundError(
            "frpc binary not found. Please install FRP or set frpc_path in config."
        )

    def _generate_tunnel_config(
        self,
        rental_id: str,
        port_mapping: dict[str, int],
        local_ports: dict[str, int],
    ) -> str:
        """
        Generate frpc configuration for a rental.

        Args:
            rental_id: Unique ID for this rental
            port_mapping: Container port -> assigned public port
            local_ports: Container port -> actual host port (from Docker)
        """
        config_lines = [
            "[common]",
            f"server_addr = {self.config.server_addr}",
            f"server_port = {self.config.server_port}",
        ]

        if self.config.token:
            config_lines.append(f"token = {self.config.token}")

        config_lines.append("")

        # Create a proxy for each port mapping
        for container_port, public_port in port_mapping.items():
            local_port = local_ports.get(container_port, int(container_port))
            proxy_name = f"{rental_id[:8]}_{container_port}"

            config_lines.extend(
                [
                    f"[{proxy_name}]",
                    "type = tcp",
                    "local_ip = 127.0.0.1",
                    f"local_port = {local_port}",
                    f"remote_port = {public_port}",
                    "",
                ]
            )

        return "\n".join(config_lines)

    def create_tunnel(
        self,
        rental_id: str,
        port_mapping: dict[str, int],
        local_ports: dict[str, int] | None = None,
    ) -> None:
        """
        Create FRP tunnels for a rental.

        Args:
            rental_id: Unique rental identifier
            port_mapping: Container port -> assigned public port
            local_ports: Container port -> actual bound host port (optional)
        """
        if rental_id in self._active_tunnels:
            logger.warning("Tunnel already exists for rental", rental_id=rental_id)
            return

        if local_ports is None:
            local_ports = {p: int(p) for p in port_mapping.keys()}

        logger.info(
            "Creating tunnel",
            rental_id=rental_id,
            port_mapping=port_mapping,
            local_ports=local_ports,
        )

        # Generate config file
        config_content = self._generate_tunnel_config(
            rental_id, port_mapping, local_ports
        )

        # Write config to temp file
        config_file = Path(tempfile.mktemp(prefix=f"frpc_{rental_id[:8]}_", suffix=".ini"))
        config_file.write_text(config_content)
        self._tunnel_configs[rental_id] = config_file

        logger.debug("FRP config written", path=str(config_file))

        # Start frpc process
        try:
            process = subprocess.Popen(
                [self.frpc_path, "-c", str(config_file)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            self._active_tunnels[rental_id] = process

            logger.info(
                "Tunnel started",
                rental_id=rental_id,
                pid=process.pid,
                server=f"{self.config.server_addr}:{self.config.server_port}",
            )

        except FileNotFoundError:
            config_file.unlink(missing_ok=True)
            raise FRPCNotFoundError(f"frpc not found at {self.frpc_path}")
        except Exception as e:
            config_file.unlink(missing_ok=True)
            raise TunnelError(f"Failed to start tunnel: {e}")

    def destroy_tunnel(self, rental_id: str) -> None:
        """Stop and cleanup a tunnel for a rental."""
        process = self._active_tunnels.get(rental_id)

        if process is None:
            logger.debug("No tunnel found for rental", rental_id=rental_id)
            return

        logger.info("Destroying tunnel", rental_id=rental_id, pid=process.pid)

        try:
            # Try graceful termination first
            process.terminate()

            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                # Force kill if needed
                process.kill()
                process.wait(timeout=2)

        except Exception as e:
            logger.warning("Error stopping tunnel process", error=str(e))

        # Cleanup
        del self._active_tunnels[rental_id]

        # Remove config file
        config_file = self._tunnel_configs.pop(rental_id, None)
        if config_file and config_file.exists():
            config_file.unlink()

        logger.info("Tunnel destroyed", rental_id=rental_id)

    def destroy_all_tunnels(self) -> None:
        """Stop all active tunnels."""
        rental_ids = list(self._active_tunnels.keys())
        for rental_id in rental_ids:
            self.destroy_tunnel(rental_id)

    def get_tunnel_status(self, rental_id: str) -> str:
        """Get the status of a tunnel."""
        process = self._active_tunnels.get(rental_id)

        if process is None:
            return "not_found"

        poll_result = process.poll()
        if poll_result is None:
            return "running"
        elif poll_result == 0:
            return "exited_ok"
        else:
            return f"exited_error_{poll_result}"

    def get_tunnel_logs(self, rental_id: str, timeout: float = 0.1) -> tuple[str, str]:
        """
        Get stdout/stderr from a tunnel process (non-blocking).

        Returns:
            Tuple of (stdout, stderr)
        """
        process = self._active_tunnels.get(rental_id)

        if process is None or process.stdout is None or process.stderr is None:
            return "", ""

        try:
            stdout, stderr = process.communicate(timeout=timeout)
            return (
                stdout.decode("utf-8") if stdout else "",
                stderr.decode("utf-8") if stderr else "",
            )
        except subprocess.TimeoutExpired:
            return "", ""

    def list_active_tunnels(self) -> dict[str, int]:
        """Get a mapping of rental_id -> process pid for active tunnels."""
        active = {}

        for rental_id, process in list(self._active_tunnels.items()):
            if process.poll() is None:  # Still running
                active[rental_id] = process.pid
            else:
                # Clean up dead tunnel
                logger.warning("Found dead tunnel, cleaning up", rental_id=rental_id)
                config_file = self._tunnel_configs.pop(rental_id, None)
                if config_file and config_file.exists():
                    config_file.unlink()
                del self._active_tunnels[rental_id]

        return active

    def health_check(self) -> dict[str, str]:
        """Check health of all tunnels."""
        results = {}
        for rental_id in self._active_tunnels:
            results[rental_id] = self.get_tunnel_status(rental_id)
        return results

    def __del__(self) -> None:
        """Cleanup on destruction."""
        self.destroy_all_tunnels()
