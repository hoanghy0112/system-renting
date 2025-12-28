# WebSocket API Reference

Real-time communication protocol between Host Agents and the Backend.

**Endpoint**: `ws://localhost:3000/fleet`  
**Protocol**: Socket.IO

---

## Connection

### Authentication
Connect with Bearer token in handshake headers:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/fleet', {
  extraHeaders: {
    Authorization: `Bearer ${HOST_API_KEY}`
  }
});
```

The `HOST_API_KEY` is a unique key associated with a registered node. Invalid keys will result in immediate disconnection.

### Connection Lifecycle
1. **Connect** - Socket opens, auth validated
2. **Authenticated** - Node marked `ONLINE` in database
3. **Active** - Heartbeats and commands exchanged
4. **Disconnect** - Node marked `OFFLINE`, cleanup performed

---

## Agent → Backend Events

Events sent from the Host Agent to the Backend.

### `heartbeat`

Periodic health check (every 5 seconds).

**Payload**:
```json
{
  "nodeId": "uuid",
  "status": "online",
  "metrics": {
    "cpuTemp": 45.5,
    "cpuUsagePercent": 35,
    "gpuTemp": [60.0, 58.0],
    "gpuUtilization": [80, 10],
    "gpuMemoryUsedMb": [12000, 2000],
    "ramUsageMb": 32000,
    "ramTotalMb": 65536,
    "diskUsageGb": 500,
    "diskTotalGb": 2000,
    "networkRxMbps": 125.5,
    "networkTxMbps": 45.2
  }
}
```

**Status Values**:
| Status | Description |
|--------|-------------|
| `online` | Available for new rentals |
| `busy` | Currently processing a rental |
| `maintenance` | Under maintenance, not accepting rentals |

**Response**: `{ "success": true }`

---

### `instance_started`

Confirms a container has started successfully.

**Payload**:
```json
{
  "rentalId": "uuid",
  "containerId": "docker-container-id",
  "connectionInfo": {
    "sshHost": "proxy.yourdomain.com",
    "sshPort": 10022,
    "additionalPorts": {
      "8888": 10888
    }
  }
}
```

**Response**: `{ "success": true }`

---

### `instance_stopped`

Confirms a container has stopped.

**Payload**:
```json
{
  "rentalId": "uuid",
  "containerId": "docker-container-id",
  "reason": "requested",
  "errorMessage": null
}
```

**Reason Values**:
| Reason | Description |
|--------|-------------|
| `requested` | Stopped by user/platform request |
| `error` | Stopped due to an error |
| `timeout` | Container exceeded time limit |

---

## Backend → Agent Commands

Commands sent from the Backend to Host Agents.

### `start_instance`

Instructs agent to start a Docker container.

**Payload**:
```json
{
  "rentalId": "uuid",
  "image": "pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime",
  "resourceLimits": {
    "gpuIndices": ["0"],
    "cpuCores": 4,
    "ramLimit": "16g",
    "diskLimit": "100g"
  },
  "envVars": {
    "JUPYTER_TOKEN": "xyz123"
  },
  "proxyPortMapping": {
    "22": 10022,
    "8888": 10888
  }
}
```

**Expected Agent Response**: Emit `instance_started` event on success.

---

### `stop_instance`

Instructs agent to stop a running container.

**Payload**:
```json
{
  "rentalId": "uuid",
  "containerId": "docker-container-id",
  "graceful": true,
  "timeoutSeconds": 30
}
```

**Expected Agent Response**: Emit `instance_stopped` event on completion.

---

### `drain_node`

Put node in maintenance mode.

**Payload**:
```json
{
  "nodeId": "uuid",
  "reason": "Scheduled maintenance"
}
```

Agent should:
1. Stop accepting new rentals
2. Wait for current rentals to complete
3. Report `status: "maintenance"` in heartbeats

---

## Error Handling

### Connection Errors
```javascript
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
  // Implement exponential backoff retry
});
```

### Reconnection
Socket.IO handles automatic reconnection. Ensure your agent:
1. Re-authenticates on reconnect
2. Resumes heartbeat immediately
3. Reports current container states

---

## Implementation Example (Python Agent)

```python
import socketio

sio = socketio.Client()

@sio.event
def connect():
    print("Connected to backend")
    start_heartbeat_loop()

@sio.on('start_instance')
def on_start_instance(data):
    container_id = docker_client.run_container(
        image=data['image'],
        gpu_indices=data['resourceLimits']['gpuIndices']
    )
    sio.emit('instance_started', {
        'rentalId': data['rentalId'],
        'containerId': container_id,
        'connectionInfo': get_connection_info()
    })

sio.connect(
    'http://backend:3000/fleet',
    headers={'Authorization': f'Bearer {API_KEY}'}
)
```
