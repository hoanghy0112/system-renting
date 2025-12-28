# DistributedCompute Host Agent

The Host Agent runs on provider machines to manage GPU resources, Docker containers, and secure tunnels for the DistributedCompute rental marketplace.

## Features

- **Hardware Detection**: Automatically detect GPUs, CPU, RAM, disk, and network capabilities
- **Docker Management**: Create and manage isolated containers with GPU passthrough
- **Secure Tunneling**: FRP-based tunneling for NAT traversal
- **Real-time Metrics**: Heartbeat system with live resource monitoring
- **CLI Interface**: Easy-to-use command-line interface

## Installation

### From Source

```bash
cd apps/agent
pip install -e ".[dev]"
```

### Pre-built Binary

Download the latest release from the [Releases page](https://github.com/your-org/distributed-compute/releases).

## Usage

### Initial Setup

```bash
# Configure the agent (opens browser for authentication)
distributed-agent setup
```

### Start Agent

```bash
# Start with default config
distributed-agent start

# Start with custom config file
distributed-agent start --config /path/to/agent.yaml
```

### Check Status

```bash
distributed-agent status
```

### Stop Agent

```bash
distributed-agent stop
```

## Configuration

Create an `agent.yaml` file based on `agent.yaml.example`:

```yaml
backend:
  url: "wss://api.yourplatform.com/fleet"
  api_key: "${AGENT_API_KEY}"

node:
  id: "${NODE_ID}"
  
frp:
  server_addr: "proxy.yourplatform.com"
  server_port: 7000
  token: "${FRP_TOKEN}"

docker:
  allowed_images:
    - "pytorch/pytorch:*"
    - "tensorflow/tensorflow:*"
    - "jupyter/scipy-notebook:*"
```

## Requirements

- Python 3.10+
- Docker with NVIDIA Container Toolkit (for GPU support)
- Network access to backend WebSocket server

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Type checking
mypy src/

# Linting
ruff check src/
```

## Building Executables

```bash
# Build for current platform
pyinstaller agent.spec
```

The executable will be in the `dist/` directory.
