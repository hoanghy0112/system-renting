"""Hardware detection and metrics collection."""

import platform
import subprocess
from dataclasses import dataclass
from typing import Any

import psutil
import structlog

from .models import GPUInfo, HardwareSpecs, NetworkInfo, NodeMetrics, SystemInfo

logger = structlog.get_logger()


@dataclass
class NVMLState:
    """State for NVML initialization."""

    initialized: bool = False
    available: bool = False


class HardwareDetector:
    """Detects and monitors system hardware capabilities."""

    def __init__(self) -> None:
        """Initialize the hardware detector."""
        self._nvml_state = NVMLState()
        self._init_nvml()

    def _init_nvml(self) -> None:
        """Initialize NVIDIA Management Library if available."""
        try:
            import pynvml

            pynvml.nvmlInit()
            self._nvml_state.initialized = True
            self._nvml_state.available = True
            logger.info("NVML initialized successfully")
        except ImportError:
            logger.warning("pynvml not installed, GPU detection disabled")
            self._nvml_state.available = False
        except Exception as e:
            logger.warning("NVML initialization failed", error=str(e))
            self._nvml_state.available = False

    def _cleanup_nvml(self) -> None:
        """Shutdown NVML if initialized."""
        if self._nvml_state.initialized:
            try:
                import pynvml

                pynvml.nvmlShutdown()
            except Exception:
                pass
            self._nvml_state.initialized = False

    def __del__(self) -> None:
        """Cleanup on destruction."""
        self._cleanup_nvml()

    def detect_gpus(self) -> list[GPUInfo]:
        """Detect available NVIDIA GPUs using pynvml."""
        gpus: list[GPUInfo] = []

        if not self._nvml_state.available:
            # Try fallback to nvidia-smi
            return self._detect_gpus_nvidia_smi()

        try:
            import pynvml

            device_count = pynvml.nvmlDeviceGetCount()
            driver_version = pynvml.nvmlSystemGetDriverVersion()

            for i in range(device_count):
                handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                name = pynvml.nvmlDeviceGetName(handle)
                if isinstance(name, bytes):
                    name = name.decode("utf-8")

                memory_info = pynvml.nvmlDeviceGetMemoryInfo(handle)

                # Get CUDA version
                try:
                    cuda_version = pynvml.nvmlSystemGetCudaDriverVersion_v2()
                    cuda_str = f"{cuda_version // 1000}.{(cuda_version % 1000) // 10}"
                except Exception:
                    cuda_str = None

                # Get temperature and utilization
                try:
                    temp = pynvml.nvmlDeviceGetTemperature(
                        handle, pynvml.NVML_TEMPERATURE_GPU
                    )
                except Exception:
                    temp = None

                try:
                    util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                    utilization = float(util.gpu)
                except Exception:
                    utilization = None

                gpus.append(
                    GPUInfo(
                        index=i,
                        name=name,
                        vram_total_mb=memory_info.total // (1024 * 1024),
                        vram_available_mb=memory_info.free // (1024 * 1024),
                        cuda_version=cuda_str,
                        driver_version=driver_version,
                        temperature=float(temp) if temp is not None else None,
                        utilization=utilization,
                    )
                )

            logger.info("GPU detection complete", count=len(gpus))
        except Exception as e:
            logger.warning("GPU detection failed", error=str(e))

        return gpus

    def _detect_gpus_nvidia_smi(self) -> list[GPUInfo]:
        """Fallback GPU detection using nvidia-smi CLI."""
        gpus: list[GPUInfo] = []

        try:
            result = subprocess.run(
                [
                    "nvidia-smi",
                    "--query-gpu=index,name,memory.total,memory.free,temperature.gpu,utilization.gpu,driver_version",
                    "--format=csv,noheader,nounits",
                ],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode != 0:
                logger.warning("nvidia-smi returned non-zero exit code")
                return gpus

            for line in result.stdout.strip().split("\n"):
                if not line:
                    continue

                parts = [p.strip() for p in line.split(",")]
                if len(parts) >= 5:
                    idx, name, mem_total, mem_free, temp = parts[:5]
                    utilization = parts[5] if len(parts) > 5 else None
                    driver = parts[6] if len(parts) > 6 else None

                    gpus.append(
                        GPUInfo(
                            index=int(idx),
                            name=name,
                            vram_total_mb=int(float(mem_total)),
                            vram_available_mb=int(float(mem_free)),
                            driver_version=driver,
                            temperature=float(temp) if temp else None,
                            utilization=float(utilization) if utilization else None,
                        )
                    )

        except FileNotFoundError:
            logger.info("nvidia-smi not found, no NVIDIA GPUs available")
        except subprocess.TimeoutExpired:
            logger.warning("nvidia-smi timed out")
        except Exception as e:
            logger.warning("nvidia-smi detection failed", error=str(e))

        return gpus

    def detect_system(self) -> SystemInfo:
        """Detect system hardware specifications."""
        # CPU info
        cpu_model = platform.processor() or "Unknown"
        if not cpu_model or cpu_model == "Unknown":
            # Try to get more detailed CPU info
            try:
                if platform.system() == "Linux":
                    with open("/proc/cpuinfo", "r") as f:
                        for line in f:
                            if "model name" in line:
                                cpu_model = line.split(":")[1].strip()
                                break
            except Exception:
                pass

        cpu_cores = psutil.cpu_count(logical=False) or 1
        cpu_threads = psutil.cpu_count(logical=True) or 1

        # Memory info
        mem = psutil.virtual_memory()
        ram_total_mb = mem.total // (1024 * 1024)
        ram_available_mb = mem.available // (1024 * 1024)

        # Disk info (root partition)
        disk = psutil.disk_usage("/")
        disk_total_gb = disk.total / (1024**3)
        disk_available_gb = disk.free / (1024**3)

        # OS info
        os_name = platform.system()
        os_version = platform.release()
        hostname = platform.node()

        return SystemInfo(
            cpu_model=cpu_model,
            cpu_cores=cpu_cores,
            cpu_threads=cpu_threads,
            ram_total_mb=ram_total_mb,
            ram_available_mb=ram_available_mb,
            disk_total_gb=round(disk_total_gb, 2),
            disk_available_gb=round(disk_available_gb, 2),
            os_name=os_name,
            os_version=os_version,
            hostname=hostname,
        )

    def detect_network(self, timeout: int = 30) -> NetworkInfo | None:
        """
        Detect network bandwidth using speedtest-cli.

        This can be slow (30+ seconds), so it's optional and should only
        be called during initial registration.
        """
        try:
            import speedtest

            st = speedtest.Speedtest()
            st.get_best_server()

            # Run tests
            download = st.download() / 1_000_000  # Convert to Mbps
            upload = st.upload() / 1_000_000

            # Get latency from best server
            latency = st.results.ping

            return NetworkInfo(
                download_mbps=round(download, 2),
                upload_mbps=round(upload, 2),
                latency_ms=round(latency, 2),
            )
        except ImportError:
            logger.warning("speedtest-cli not installed")
            return None
        except Exception as e:
            logger.warning("Network speed test failed", error=str(e))
            return None

    def get_full_specs(self, include_network: bool = False) -> HardwareSpecs:
        """Get complete hardware specifications for registration."""
        gpus = self.detect_gpus()
        system = self.detect_system()
        network = self.detect_network() if include_network else None

        return HardwareSpecs(
            gpus=gpus,
            system=system,
            network=network,
        )

    def get_current_metrics(self) -> NodeMetrics:
        """Get current real-time metrics for heartbeat."""
        # CPU temperature (Linux only, may require lm-sensors)
        cpu_temp = self._get_cpu_temperature()

        # CPU usage
        cpu_usage = psutil.cpu_percent(interval=0.1)

        # Memory
        mem = psutil.virtual_memory()
        ram_usage_mb = mem.used // (1024 * 1024)
        ram_total_mb = mem.total // (1024 * 1024)

        # Disk
        disk = psutil.disk_usage("/")
        disk_usage_gb = disk.used / (1024**3)
        disk_total_gb = disk.total / (1024**3)

        # Network I/O (approximate rates)
        net_io = psutil.net_io_counters()
        # Note: These are cumulative bytes, not rates. For rates you'd need
        # to track deltas over time. For now we return 0.
        network_rx_mbps = 0.0
        network_tx_mbps = 0.0

        # GPU metrics
        gpu_temps: list[float] = []
        gpu_utils: list[float] = []
        gpu_mem_used: list[int] = []

        gpus = self.detect_gpus()
        for gpu in gpus:
            if gpu.temperature is not None:
                gpu_temps.append(gpu.temperature)
            else:
                gpu_temps.append(0.0)

            if gpu.utilization is not None:
                gpu_utils.append(gpu.utilization)
            else:
                gpu_utils.append(0.0)

            gpu_mem_used.append(gpu.vram_total_mb - gpu.vram_available_mb)

        return NodeMetrics(
            cpu_temp=cpu_temp,
            cpu_usage_percent=cpu_usage,
            gpu_temp=gpu_temps,
            gpu_utilization=gpu_utils,
            gpu_memory_used_mb=gpu_mem_used,
            ram_usage_mb=ram_usage_mb,
            ram_total_mb=ram_total_mb,
            disk_usage_gb=round(disk_usage_gb, 2),
            disk_total_gb=round(disk_total_gb, 2),
            network_rx_mbps=network_rx_mbps,
            network_tx_mbps=network_tx_mbps,
        )

    def _get_cpu_temperature(self) -> float | None:
        """Get CPU temperature if available."""
        try:
            temps = psutil.sensors_temperatures()
            if not temps:
                return None

            # Try common sensor names
            for name in ["coretemp", "cpu_thermal", "k10temp", "zenpower"]:
                if name in temps:
                    readings = temps[name]
                    if readings:
                        return readings[0].current

            # Just return the first available
            for readings in temps.values():
                if readings:
                    return readings[0].current

        except Exception:
            pass

        return None
