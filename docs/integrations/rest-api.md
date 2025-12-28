# REST API Reference

Complete reference for the DistributedCompute REST API.

**Base URL**: `/api`  
**Content-Type**: `application/json`

---

## Marketplace API

Endpoints for browsing and managing compute nodes.

### Search Nodes
```http
GET /marketplace/nodes
```

Browse available compute nodes with optional filters.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `minGpuVram` | number | Minimum GPU VRAM in GB |
| `minGpuTflops` | number | Minimum GPU compute power |
| `minCpuCores` | number | Minimum CPU cores |
| `minRamGb` | number | Minimum RAM in GB |
| `minDiskGb` | number | Minimum disk space in GB |
| `maxHourlyRate` | number | Maximum hourly rate in USD |
| `gpuModel` | string | Filter by GPU model name |
| `country` | string | Filter by location country |
| `city` | string | Filter by location city |
| `status` | string | `ONLINE`, `OFFLINE`, `BUSY`, `MAINTENANCE` |
| `sortBy` | string | `price`, `performance`, `location` |
| `sortOrder` | string | `asc`, `desc` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |

**Response**:
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "uuid",
        "ownerId": "uuid",
        "specs": {
          "gpus": [{ "model": "RTX 4090", "vram": 24, "tflops": 82.6, "count": 1 }],
          "cpuModel": "AMD Ryzen 9 7950X",
          "cpuCores": 16,
          "ramGb": 64,
          "diskGb": 2000,
          "networkSpeedMbps": 1000
        },
        "pricingConfig": { "hourlyRate": 2.5, "smartPricingEnabled": true },
        "status": "ONLINE",
        "locationData": { "country": "USA", "city": "San Francisco" },
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z"
      }
    ],
    "total": 150
  },
  "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

---

### Get Node by ID
```http
GET /marketplace/nodes/:id
```

**Auth**: Optional  
**Response**: Single `HostNodeResponse` object

---

### Get Marketplace Stats
```http
GET /marketplace/stats
```

Get aggregate marketplace statistics.

**Response**:
```json
{
  "success": true,
  "data": {
    "totalNodes": 500,
    "availableNodes": 320,
    "averageHourlyRate": 3.25,
    "totalGpus": 1200
  }
}
```

---

### Create Node 🔒
```http
POST /marketplace/nodes
```

Register a new host node. Requires authentication.

**Auth**: Required (Clerk JWT)

**Request Body**:
```json
{
  "specs": {
    "gpus": [{ "model": "RTX 4090", "vram": 24, "tflops": 82.6, "count": 2 }],
    "cpuModel": "AMD Ryzen 9 7950X",
    "cpuCores": 16,
    "ramGb": 64,
    "diskGb": 2000,
    "networkSpeedMbps": 1000
  },
  "pricingConfig": {
    "hourlyRate": 3.0,
    "smartPricingEnabled": true,
    "minimumRate": 2.0,
    "maximumRate": 5.0
  },
  "locationData": {
    "country": "USA",
    "city": "San Francisco"
  }
}
```

---

### Update Node 🔒
```http
PUT /marketplace/nodes/:id
```

Update node pricing or location. Owner only.

**Auth**: Required (must be owner)

**Request Body**:
```json
{
  "pricingConfig": { "hourlyRate": 3.5 },
  "locationData": { "city": "Los Angeles" }
}
```

---

### Delete Node 🔒
```http
DELETE /marketplace/nodes/:id
```

Remove a node from the marketplace. Owner only.

**Auth**: Required (must be owner)

---

### Get My Nodes 🔒
```http
GET /marketplace/my-nodes
```

List all nodes owned by the authenticated user.

**Auth**: Required

---

## Billing API 🔒

All billing endpoints require Clerk JWT authentication.

### Create Rental
```http
POST /billing/rentals
```

Start a new compute rental.

**Request Body**:
```json
{
  "nodeId": "uuid-of-target-node",
  "image": "pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime",
  "resourceLimits": {
    "gpuIndices": ["0"],
    "cpuCores": 4,
    "ramLimit": "16g"
  },
  "envVars": {
    "JUPYTER_TOKEN": "my-secret-token"
  },
  "estimatedDurationHours": 8
}
```

**Response**: `RentalResponse` with `status: "PENDING"`

---

### Stop Rental
```http
POST /billing/rentals/:id/stop
```

Stop an active rental. Calculates final cost.

**Response**: Updated `RentalResponse` with `status: "COMPLETED"` and `totalCost`

---

### List My Rentals
```http
GET /billing/rentals
```

Get all rentals for the authenticated user.

---

### Get Rental by ID
```http
GET /billing/rentals/:id
```

Get details of a specific rental.

---

### Get Transactions
```http
GET /billing/transactions
```

List all transactions for the authenticated user.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "amount": 25.50,
      "type": "DEBIT",
      "referenceId": "rental-uuid",
      "description": "Rental for 8.50 hours",
      "createdAt": "2024-01-15T18:30:00Z"
    }
  ]
}
```

---

### Get Balance
```http
GET /billing/balance
```

Get current account balance.

**Response**:
```json
{
  "success": true,
  "data": { "balance": 150.75 }
}
```

---

### Get Price Suggestion
```http
POST /billing/price-suggestion
```

Get AI-powered pricing recommendation based on node specs.

**Request Body**: `NodeSpecs` object

**Response**:
```json
{
  "success": true,
  "data": {
    "suggestedHourlyRate": 3.25,
    "marketAverage": 3.50,
    "marketLow": 1.50,
    "marketHigh": 8.00,
    "demandLevel": "high"
  }
}
```

---

## Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Your balance is insufficient for this rental",
    "details": { "required": 50.00, "available": 25.00 }
  }
}
```

**Common Error Codes**:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | Invalid or missing auth token |
| `FORBIDDEN` | 403 | Not allowed to access resource |
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `INSUFFICIENT_BALANCE` | 400 | Not enough funds |
| `NODE_UNAVAILABLE` | 400 | Node is offline or busy |
