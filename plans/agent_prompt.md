# Host Agent Development Prompt (Python)

## Context

You are building **DistributedCompute**, a GPU/Compute rental marketplace platform (similar to vast.ai). Please refer to the attached `technical_design_doc.md` for the complete architecture and communication protocols.

The **Host Agent** is the most critical piece of software. It runs on the provider's machine and must be robust, secure, and cross-platform.

---

## Task

Create the **Host Agent** application in Python that manages GPU resources and Docker containers on the host machine.

---

## Requirements

### 1. Tech Stack

| Package | Purpose |
|---------|---------|
| Python 3.10+ | Runtime |
| `docker` | Docker SDK for Python |
| `psutil` | System metrics (CPU, RAM, disk) |
| `websockets` | Async WebSocket client |
| `typer` | CLI interface |
| `pynvml` / `nvidia-smi` | GPU detection and metrics |
| `speedtest-cli` | Network bandwidth testing |
| `frpc` (binary) | FRP client for tunneling |

### 2. Core Features

#### A. Hardware Handshake (Startup Detection)

On startup, detect and report system capabilities:

```python
class HardwareDetector:
    def detect_gpus(self) -> list[GPUInfo]:
        """
        Use nvidia-smi or pynvml to detect:
        - GPU model name
        - VRAM (total/available)
        - CUDA version
        - Driver version
        """
    
    def detect_system(self) -> SystemInfo:
        """
        Use psutil to detect:
        - CPU model, core count
        - Total RAM
        - Disk space
        - OS version
        """
    
    def detect_network(self) -> NetworkInfo:
        """
        Use speedtest-cli to measure:
        - Download bandwidth (Mbps)
        - Upload bandwidth (Mbps)
        - Latency
        """
```

#### B. Container Orchestration

**CRITICAL**: Use Docker Socket Binding, NOT Docker-in-Docker.

```python
class DockerManager:
    def __init__(self):
        # Connect to host's Docker daemon
        self.client = docker.from_env()
    
    def start_container(self, config: StartInstanceConfig) -> Container:
        """
        - Pull requested image if not cached
        - Create container with resource limits (cgroups)
        - GPU passthrough via NVIDIA Container Toolkit
        - Start container
        - Return container info
        """
        container = self.client.containers.run(
            image=config.image,
            detach=True,
            environment=config.env_vars,
            device_requests=[
                docker.types.DeviceRequest(
                    device_ids=config.gpu_indices,
                    capabilities=[['gpu']]
                )
            ],
            mem_limit=config.ram_limit,
            cpu_count=config.cpu_cores,
            ports=config.port_mapping,
        )
        return container
    
    def stop_container(self, container_id: str, graceful: bool = True):
        """Gracefully stop container"""
    
    def get_container_logs(self, container_id: str) -> str:
        """Get container logs for debugging"""
```

**Container Isolation**:
- Apply strict cgroups limits as per rental agreement
- NEVER mount host filesystem (except explicit cache folders)
- Use specific GPU device IDs, not `--gpus all`

#### C. Tunneling (FRP Integration)

Bundle **frpc** (FRP Client) with the Agent:

```python
class TunnelManager:
    def __init__(self, frpc_path: str, server_addr: str):
        self.frpc_path = frpc_path
        self.server_addr = server_addr
        self.active_tunnels: dict[str, subprocess.Popen] = {}
    
    def create_tunnel(self, rental_id: str, port_mapping: dict[int, int]):
        """
        Dynamically create FRP tunnel config and start frpc subprocess.
        
        port_mapping: {container_port: assigned_public_port}
        Example: {22: 10022, 8888: 10888}
        
        Flow:
        - Generate frpc.ini config for this rental
        - Spawn frpc subprocess
        - Report public address to Backend
        """
    
    def destroy_tunnel(self, rental_id: str):
        """Stop frpc subprocess and cleanup"""
```

**FRP Architecture**:
- **frps (Server)**: Runs on a cheap cloud VPS (DigitalOcean/Vultr)
- **frpc (Client)**: Bundled in this Agent
- **Mapping**: `Public_IP:Assigned_Port` → Tunnel → `Localhost:Container_Port`

#### D. WebSocket Communication

Maintain persistent secure WebSocket connection to Backend:

```python
class BackendClient:
    def __init__(self, backend_url: str, api_key: str):
        self.url = backend_url
        self.api_key = api_key
        self.node_id: str | None = None
    
    async def connect(self):
        """
        Connect with auth header: Authorization: Bearer <HOST_API_KEY>
        Implement exponential backoff retry on disconnect
        """
    
    async def send_heartbeat(self, metrics: Metrics):
        """
        Send every 5 seconds:
        {
            "event": "heartbeat",
            "data": {
                "node_id": "uuid",
                "status": "online",
                "metrics": { cpu_temp, gpu_temp[], gpu_utilization[], ram_usage_mb, disk_usage_gb }
            }
        }
        """
    
    async def listen_commands(self):
        """
        Listen for commands from Backend:
        - start_instance
        - stop_instance
        - drain_node
        """
```

#### E. Heartbeat Loop

```python
async def heartbeat_loop(client: BackendClient, hardware: HardwareDetector):
    while True:
        metrics = Metrics(
            cpu_temp=hardware.get_cpu_temp(),
            gpu_temp=hardware.get_gpu_temps(),
            gpu_utilization=hardware.get_gpu_utilization(),
            ram_usage_mb=hardware.get_ram_usage(),
            disk_usage_gb=hardware.get_disk_usage(),
        )
        await client.send_heartbeat(metrics)
        await asyncio.sleep(5)
```

### 3. CLI Interface (Typer)

```bash
# First run - opens browser for Clerk authentication
$ distributed-agent setup

# Start agent
$ distributed-agent start --config agent.yaml

# Check status
$ distributed-agent status

# Stop agent gracefully
$ distributed-agent stop
```

### 4. Distribution

#### PyInstaller Build

Create `agent.spec` for building cross-platform executables:
- **Windows**: `.exe` single file
- **Linux**: Binary single file
- **macOS**: Binary (Universal2 for M1/Intel)

Bundle frpc binary for each platform.

#### GitHub Actions Workflow

```yaml
# .github/workflows/build.yml
name: Build Agent

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install pyinstaller
      - run: pyinstaller agent.spec
      - uses: actions/upload-artifact@v4
        with:
          name: agent-${{ matrix.os }}
          path: dist/
```

### 5. Security

- **API Key Storage**: Store securely (OS keyring or encrypted local file)
- **Container Isolation**: Never expose host filesystem
- **Encrypted Communication**: WSS (WebSocket Secure) only
- **No Hardcoded Secrets**: All config via `.env` or `agent.yaml`

---

## Expected Output

1. **`main.py`** - Entry point with Typer CLI
2. **`hardware.py`** - `HardwareDetector` class
3. **`docker_manager.py`** - `DockerManager` class
4. **`tunnel.py`** - `TunnelManager` class with FRP integration
5. **`backend_client.py`** - WebSocket client with heartbeat
6. **`requirements.txt`** - All dependencies
7. **`agent.spec`** - PyInstaller spec file
8. **`.github/workflows/build.yml`** - CI/CD for cross-platform builds
9. **`agent.yaml.example`** - Example configuration file
