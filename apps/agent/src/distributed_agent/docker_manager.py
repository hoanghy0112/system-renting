"""Docker container management with GPU passthrough support."""

import fnmatch
from typing import Any

import docker
import docker.errors
import docker.types
import structlog

from .config import DockerConfig
from .models import ConnectionInfo, ResourceLimits, StartInstanceCommandData

logger = structlog.get_logger()


class DockerError(Exception):
    """Base exception for Docker-related errors."""

    pass


class ImageNotAllowedError(DockerError):
    """Raised when trying to use a disallowed image."""

    pass


class ContainerStartError(DockerError):
    """Raised when container fails to start."""

    pass


class DockerManager:
    """Manages Docker containers for rentals with GPU passthrough support."""

    def __init__(self, config: DockerConfig) -> None:
        """Initialize the Docker manager."""
        self.config = config
        self._client: docker.DockerClient | None = None
        self._active_containers: dict[str, str] = {}  # rental_id -> container_id

    @property
    def client(self) -> docker.DockerClient:
        """Get or create Docker client."""
        if self._client is None:
            try:
                self._client = docker.from_env()
                # Verify connection
                self._client.ping()
                logger.info("Docker client initialized")
            except docker.errors.DockerException as e:
                logger.error("Failed to connect to Docker daemon", error=str(e))
                raise DockerError(f"Cannot connect to Docker: {e}")
        return self._client

    def is_image_allowed(self, image: str) -> bool:
        """Check if an image is in the allowed list."""
        for pattern in self.config.allowed_images:
            if fnmatch.fnmatch(image, pattern):
                return True
        return False

    def pull_image(self, image: str) -> None:
        """Pull a Docker image if not already present."""
        try:
            self.client.images.get(image)
            logger.info("Image already present", image=image)
        except docker.errors.ImageNotFound:
            logger.info("Pulling image", image=image)
            try:
                self.client.images.pull(image)
                logger.info("Image pulled successfully", image=image)
            except docker.errors.APIError as e:
                raise DockerError(f"Failed to pull image {image}: {e}")

    def start_container(
        self,
        config: StartInstanceCommandData,
    ) -> tuple[str, ConnectionInfo]:
        """
        Start a new container for a rental.

        Returns:
            Tuple of (container_id, connection_info)
        """
        rental_id = config.rental_id
        image = config.image
        limits = config.resource_limits
        env_vars = config.env_vars
        port_mapping = config.proxy_port_mapping

        logger.info(
            "Starting container",
            rental_id=rental_id,
            image=image,
            gpu_indices=limits.gpu_indices,
        )

        # Validate image
        if not self.is_image_allowed(image):
            raise ImageNotAllowedError(
                f"Image '{image}' is not in the allowed list. "
                f"Allowed patterns: {self.config.allowed_images}"
            )

        # Ensure image is available
        self.pull_image(image)

        # Build container configuration
        container_config = self._build_container_config(
            image=image,
            limits=limits,
            env_vars=env_vars,
            port_mapping=port_mapping,
        )

        try:
            container = self.client.containers.run(**container_config)
            container_id = container.id

            # Track the container
            self._active_containers[rental_id] = container_id

            # Build connection info
            # The actual public ports come from the proxy, not direct port mapping
            # For now, we return the container's internal ports
            connection_info = ConnectionInfo(
                ssh_host="localhost",  # Will be replaced by tunnel manager
                ssh_port=22,  # Default SSH port
                additional_ports={
                    str(k): v for k, v in port_mapping.items() if str(k) != "22"
                },
            )

            logger.info(
                "Container started successfully",
                rental_id=rental_id,
                container_id=container_id[:12],
            )

            return container_id, connection_info

        except docker.errors.ContainerError as e:
            raise ContainerStartError(f"Container exited with error: {e}")
        except docker.errors.ImageNotFound as e:
            raise ContainerStartError(f"Image not found: {e}")
        except docker.errors.APIError as e:
            raise ContainerStartError(f"Docker API error: {e}")

    def _build_container_config(
        self,
        image: str,
        limits: ResourceLimits,
        env_vars: dict[str, str],
        port_mapping: dict[str, int],
    ) -> dict[str, Any]:
        """Build the container run configuration."""
        config: dict[str, Any] = {
            "image": image,
            "detach": True,
            "environment": env_vars,
            "network_mode": self.config.defaults.network_mode,
            "restart_policy": {"Name": self.config.defaults.restart_policy},
        }

        # CPU limits
        if limits.cpu_cores > 0:
            config["cpu_count"] = limits.cpu_cores

        # Memory limits
        if limits.ram_limit:
            config["mem_limit"] = limits.ram_limit

        # GPU passthrough using NVIDIA Container Toolkit
        if limits.gpu_indices:
            config["device_requests"] = [
                docker.types.DeviceRequest(
                    device_ids=limits.gpu_indices,
                    capabilities=[["gpu"]],
                )
            ]

        # Port bindings (for local access, tunneling handles public access)
        if port_mapping:
            config["ports"] = {
                f"{container_port}/tcp": None  # Random host port
                for container_port in port_mapping.keys()
            }

        return config

    def stop_container(
        self,
        container_id: str,
        rental_id: str | None = None,
        graceful: bool = True,
        timeout: int = 30,
    ) -> None:
        """Stop a running container."""
        logger.info(
            "Stopping container",
            container_id=container_id[:12],
            rental_id=rental_id,
            graceful=graceful,
        )

        try:
            container = self.client.containers.get(container_id)

            if graceful:
                container.stop(timeout=timeout)
            else:
                container.kill()

            # Remove from tracking
            if rental_id and rental_id in self._active_containers:
                del self._active_containers[rental_id]

            logger.info("Container stopped", container_id=container_id[:12])

        except docker.errors.NotFound:
            logger.warning("Container not found", container_id=container_id[:12])
            # Still remove from tracking
            if rental_id and rental_id in self._active_containers:
                del self._active_containers[rental_id]
        except docker.errors.APIError as e:
            raise DockerError(f"Failed to stop container: {e}")

    def remove_container(self, container_id: str, force: bool = False) -> None:
        """Remove a stopped container."""
        try:
            container = self.client.containers.get(container_id)
            container.remove(force=force)
            logger.info("Container removed", container_id=container_id[:12])
        except docker.errors.NotFound:
            logger.debug("Container already removed", container_id=container_id[:12])
        except docker.errors.APIError as e:
            raise DockerError(f"Failed to remove container: {e}")

    def get_container_logs(
        self,
        container_id: str,
        tail: int = 100,
        timestamps: bool = True,
    ) -> str:
        """Get logs from a container."""
        try:
            container = self.client.containers.get(container_id)
            logs = container.logs(tail=tail, timestamps=timestamps)
            return logs.decode("utf-8") if isinstance(logs, bytes) else logs
        except docker.errors.NotFound:
            return f"Container {container_id[:12]} not found"
        except docker.errors.APIError as e:
            return f"Error getting logs: {e}"

    def get_container_status(self, container_id: str) -> str | None:
        """Get the status of a container."""
        try:
            container = self.client.containers.get(container_id)
            return container.status
        except docker.errors.NotFound:
            return None

    def list_active_rentals(self) -> dict[str, str]:
        """Get a mapping of rental_id -> container_id for active rentals."""
        # Verify containers still exist
        active = {}
        for rental_id, container_id in self._active_containers.items():
            status = self.get_container_status(container_id)
            if status is not None:
                active[rental_id] = container_id

        self._active_containers = active
        return active.copy()

    def cleanup_stopped_containers(self) -> list[str]:
        """Remove all stopped containers managed by this agent."""
        removed = []

        for rental_id, container_id in list(self._active_containers.items()):
            status = self.get_container_status(container_id)
            if status in ("exited", "dead"):
                try:
                    self.remove_container(container_id)
                    removed.append(container_id)
                    del self._active_containers[rental_id]
                except DockerError:
                    pass

        if removed:
            logger.info("Cleaned up stopped containers", count=len(removed))

        return removed

    def get_container_ports(self, container_id: str) -> dict[str, int]:
        """Get the host port mappings for a container."""
        try:
            container = self.client.containers.get(container_id)
            ports = container.ports

            result = {}
            for container_port, host_bindings in ports.items():
                if host_bindings:
                    # Extract port number from "80/tcp" format
                    port_num = container_port.split("/")[0]
                    result[port_num] = int(host_bindings[0]["HostPort"])

            return result
        except docker.errors.NotFound:
            return {}
        except Exception as e:
            logger.warning("Failed to get container ports", error=str(e))
            return {}
