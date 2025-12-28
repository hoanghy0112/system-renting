# DistributedCompute API Integration Guide

This documentation provides a comprehensive guide for integrating with the DistributedCompute platform API.

## Overview

The DistributedCompute platform exposes:
- **REST API** - HTTP endpoints for marketplace, billing, and user management
- **WebSocket API** - Real-time communication for Host Agents

**Base URL**: `http://localhost:3000/api` (development)  
**WebSocket Endpoint**: `ws://localhost:3000/fleet`

## Documentation Index

| Document | Description |
|----------|-------------|
| [REST API Reference](./rest-api.md) | Complete HTTP endpoint documentation |
| [WebSocket API](./websocket-api.md) | Agent-Backend real-time events |
| [Authentication](./authentication.md) | Auth flows for REST and WebSocket |
| [Data Types](./data-types.md) | DTOs, entities, and enums reference |

## Quick Start

### 1. Authentication
All protected endpoints require a Clerk JWT token:
```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
     http://localhost:3000/api/marketplace/nodes
```

### 2. Browse Available Nodes
```bash
GET /api/marketplace/nodes?minGpuVram=8&maxHourlyRate=5
```

### 3. Create a Rental
```bash
POST /api/billing/rentals
{
  "nodeId": "uuid",
  "image": "pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime",
  "resourceLimits": {
    "gpuIndices": ["0"],
    "cpuCores": 4,
    "ramLimit": "16g"
  }
}
```

## OpenAPI Specification

Interactive Swagger documentation is available at:
- **Swagger UI**: `/api/docs`
- **OpenAPI JSON**: `/api/docs-json`
