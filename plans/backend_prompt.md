# Backend Development Prompt (NestJS)

## Context

You are building **DistributedCompute**, a GPU/Compute rental marketplace platform (similar to vast.ai). Please refer to the attached `technical_design_doc.md` for the complete architecture, protocols, and database strategy.

The system consists of three main components:
- **Central Platform (Backend & Database)**: Orchestrates the market, handles payments, auth, and stores persistent data
- **Web Frontend (Next.js)**: Interface for Renters (Marketplace) and Hosts (Fleet Management)
- **Host Agent (Python)**: Runs on the provider's machine, manages Docker containers, resources, and secure tunnels

---

## Task

Create the Backend using NestJS with a focus on **monorepo integration** for shared TypeScript types.

---

## Requirements

### 1. Monorepo Setup (Turborepo/Nx)

Initialize the project as a monorepo to share TypeScript interfaces between Backend and Frontend:

```
distributed-compute/
├── apps/
│   ├── backend/          # NestJS application
│   └── frontend/         # Next.js application
├── packages/
│   └── shared-types/     # Shared DTOs and interfaces
├── turbo.json            # Turborepo config
└── package.json          # Root workspace
```

**Shared Types Package** (`packages/shared-types`):
- Define all DTOs (Data Transfer Objects) used by both Backend and Frontend
- Export TypeScript interfaces for API responses, WebSocket events, and entities
- If Backend changes an API response, Frontend knows immediately via TypeScript errors

### 2. Architecture

Use **Domain-Driven Design (DDD)** approach with these modules:

| Module | Responsibility |
|--------|---------------|
| `AuthModule` | Clerk integration, JWT validation, Guards |
| `MarketplaceModule` | Node search, filtering, matching algorithm |
| `FleetModule` | WebSocket Gateway, Agent management, heartbeats |
| `BillingModule` | Per-minute billing calculation, transactions |
| `ProxyModule` | FRP tunnel management, port allocation |

### 3. Database Strategy

**PostgreSQL (via Prisma)** - Persistent state data:

```prisma
model User {
  id        String   @id @default(uuid())
  clerkId   String   @unique
  email     String   @unique
  role      Role     @default(BOTH)
  balance   Decimal  @default(0)
  hostNodes HostNode[]
  rentals   Rental[]
  transactions Transaction[]
}

model HostNode {
  id            String   @id @default(uuid())
  ownerId       String
  owner         User     @relation(fields: [ownerId], references: [id])
  specs         Json     // GPU model, VRAM, CPU cores, RAM, disk
  pricingConfig Json     // hourly rates, smart pricing enabled
  status        NodeStatus @default(OFFLINE)
  locationData  Json?    // country, city, lat/lng
  rentals       Rental[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Rental {
  id             String   @id @default(uuid())
  renterId       String
  renter         User     @relation(fields: [renterId], references: [id])
  nodeId         String
  node           HostNode @relation(fields: [nodeId], references: [id])
  startTime      DateTime @default(now())
  endTime        DateTime?
  costPerHour    Decimal
  containerId    String?
  connectionInfo Json?    // SSH string, ports, proxy address
  status         RentalStatus @default(PENDING)
}

model Transaction {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  amount      Decimal
  type        TransactionType
  referenceId String?  // rental_id or external payment ref
  createdAt   DateTime @default(now())
}

enum Role { RENT, LEASE, BOTH }
enum NodeStatus { ONLINE, OFFLINE, BUSY, MAINTENANCE }
enum RentalStatus { PENDING, ACTIVE, COMPLETED, CANCELLED }
enum TransactionType { CREDIT, DEBIT }
```

**InfluxDB** - High-frequency time-series metrics:
- Store heartbeat data (CPU/GPU temps, utilization, RAM usage)
- Query for analytics dashboards
- Do NOT store in PostgreSQL (will cause performance issues)

**Redis** - Caching:
- Marketplace search results
- Session management
- Real-time node availability

### 4. WebSocket Gateway (FleetGateway)

```typescript
// Heartbeat payload from Agent (every 5 seconds)
interface HeartbeatEvent {
  event: 'heartbeat';
  data: {
    node_id: string;
    status: 'online' | 'busy' | 'maintenance';
    metrics: {
      cpu_temp: number;
      gpu_temp: number[];      // Array for multiple GPUs
      gpu_utilization: number[];
      ram_usage_mb: number;
      disk_usage_gb: number;
    };
  };
}

// Command to Agent - Start container
interface StartInstanceEvent {
  event: 'start_instance';
  data: {
    rental_id: string;
    image: string;  // e.g., "pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime"
    resource_limits: {
      gpu_indices: string[];
      cpu_cores: number;
      ram_limit: string;
    };
    env_vars: Record<string, string>;
    proxy_port_mapping: Record<string, number>;  // container:public port
  };
}

// Command to Agent - Stop container
interface StopInstanceEvent {
  event: 'stop_instance';
  data: { rental_id: string; container_id: string; };
}

// Command to Agent - Drain node
interface DrainNodeEvent {
  event: 'drain_node';
  data: { node_id: string; };
}
```

**Authentication**: Handshake with `Authorization: Bearer <HOST_API_KEY>` header.

### 5. Business Logic

**Smart Pricing Service**:
- Calculate suggested price for a HostNode based on GPU model
- Query market averages for similar hardware
- Allow hosts to enable "Auto-match market rate"

**Matching Service**:
- Search algorithm to find available nodes by CPU/RAM/GPU requirements
- Support filters: GPU VRAM, TFLOPS, Location, Price range
- Return sorted by relevance (closest location, lowest price)

### 6. Proxy Module (FRP Integration)

Manage tunnel connections using FRP (Fast Reverse Proxy):

- **frps (Server)**: Runs on docker-compose
- **frpc (Client)**: Bundled in Python Agent

Backend responsibilities:
- Allocate public ports for new rentals
- Track active tunnels and port mappings
- Clean up tunnels when rentals end

### 7. Security

- All HTTP endpoints require Clerk Auth Guards
- Global Exception Filter for standardized JSON error responses
- Secrets via `.env` (never hardcoded)
- Validate `.env` schema on startup (using `zod` or `joi`)

---

## Expected Output

1. **Folder structure** following DDD pattern
2. **`app.module.ts`** with all module imports
3. **`prisma/schema.prisma`** complete schema
4. **`FleetGateway`** implementation with heartbeat listener and command emitters
5. **`SmartPricingService`** implementation
6. **`packages/shared-types`** with exported DTOs
7. **Docker Compose** for local development (Postgres, InfluxDB, Redis)
8. **`.env.example`** with all required environment variables
