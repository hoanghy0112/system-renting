# Data Types Reference

Complete reference for all DTOs, entities, and enums used in the API.

---

## Enums

### Role
User account type.
```typescript
enum Role {
  RENT = 'RENT',       // Can only rent compute
  LEASE = 'LEASE',     // Can only lease compute
  BOTH = 'BOTH'        // Can do both (default)
}
```

### NodeStatus
Current state of a host node.
```typescript
enum NodeStatus {
  ONLINE = 'ONLINE',           // Available for rentals
  OFFLINE = 'OFFLINE',         // Agent not connected
  BUSY = 'BUSY',               // Currently processing a rental
  MAINTENANCE = 'MAINTENANCE'  // Under maintenance
}
```

### RentalStatus
State of a compute rental.
```typescript
enum RentalStatus {
  PENDING = 'PENDING',       // Waiting for container start
  ACTIVE = 'ACTIVE',         // Container running
  COMPLETED = 'COMPLETED',   // Finished normally
  CANCELLED = 'CANCELLED'    // Cancelled before completion
}
```

### TransactionType
Type of financial transaction.
```typescript
enum TransactionType {
  CREDIT = 'CREDIT',  // Money added (top-up, earnings)
  DEBIT = 'DEBIT'     // Money deducted (rental cost)
}
```

---

## Entity Interfaces

### NodeSpecs
Hardware specifications of a host node.
```typescript
interface NodeSpecs {
  gpus: GpuSpec[];
  cpuModel: string;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  networkSpeedMbps: number;
}

interface GpuSpec {
  model: string;     // e.g., "RTX 4090"
  vram: number;      // GB
  tflops: number;    // Compute performance
  count: number;     // Number of identical GPUs
}
```

### PricingConfig
Node pricing configuration.
```typescript
interface PricingConfig {
  hourlyRate: number;           // USD per hour
  smartPricingEnabled: boolean; // Auto-adjust based on demand
  minimumRate?: number;         // Floor price for smart pricing
  maximumRate?: number;         // Ceiling price for smart pricing
}
```

### LocationData
Geographic information.
```typescript
interface LocationData {
  country: string;
  city: string;
  latitude?: number;
  longitude?: number;
}
```

### ConnectionInfo
Rental connection details.
```typescript
interface ConnectionInfo {
  sshHost: string;      // Proxy hostname
  sshPort: number;      // SSH port on proxy
  sshUser: string;      // SSH username (usually 'root')
  jupyterUrl?: string;  // Direct Jupyter URL if available
  additionalPorts: Record<string, number>; // Container port → proxy port
}
```

---

## Request DTOs

### CreateHostNodeDto
```typescript
interface CreateHostNodeDto {
  specs: NodeSpecs;
  pricingConfig: PricingConfig;
  locationData?: LocationData;
}
```

### UpdateHostNodeDto
```typescript
interface UpdateHostNodeDto {
  pricingConfig?: PricingConfig;
  locationData?: LocationData;
}
```

### SearchNodesDto
```typescript
interface SearchNodesDto {
  minGpuVram?: number;
  minGpuTflops?: number;
  minCpuCores?: number;
  minRamGb?: number;
  minDiskGb?: number;
  maxHourlyRate?: number;
  gpuModel?: string;
  country?: string;
  city?: string;
  status?: NodeStatus;
  sortBy?: 'price' | 'performance' | 'location';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

### CreateRentalDto
```typescript
interface CreateRentalDto {
  nodeId: string;
  image: string;  // Docker image
  resourceLimits: {
    gpuIndices: string[];
    cpuCores: number;
    ramLimit: string;  // e.g., "16g"
  };
  envVars?: Record<string, string>;
  estimatedDurationHours?: number;
}
```

---

## Response DTOs

### ApiResponse<T>
Wrapper for all API responses.
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### HostNodeResponse
```typescript
interface HostNodeResponse {
  id: string;
  ownerId: string;
  ownerEmail?: string;
  specs: NodeSpecs;
  pricingConfig: PricingConfig;
  status: NodeStatus;
  locationData?: LocationData;
  currentRentalId?: string;
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}
```

### RentalResponse
```typescript
interface RentalResponse {
  id: string;
  renterId: string;
  nodeId: string;
  node?: HostNodeResponse;
  startTime: string;
  endTime?: string;
  costPerHour: number;
  totalCost?: number;
  containerId?: string;
  connectionInfo?: ConnectionInfo;
  status: RentalStatus;
  createdAt: string;
  updatedAt: string;
}
```

### TransactionResponse
```typescript
interface TransactionResponse {
  id: string;
  amount: number;
  type: string;          // 'CREDIT' or 'DEBIT'
  referenceId?: string;  // Related rental ID
  description?: string;
  createdAt: string;
}
```

### MarketplaceStatsResponse
```typescript
interface MarketplaceStatsResponse {
  totalNodes: number;
  availableNodes: number;
  averageHourlyRate: number;
  totalGpus: number;
}
```

### PriceSuggestionResponse
```typescript
interface PriceSuggestionResponse {
  suggestedHourlyRate: number;
  marketAverage: number;
  marketLow: number;
  marketHigh: number;
  demandLevel: 'low' | 'medium' | 'high';
}
```

---

## WebSocket Event Types

### NodeMetrics
Real-time hardware metrics.
```typescript
interface NodeMetrics {
  cpuTemp: number;
  cpuUsagePercent: number;
  gpuTemp: number[];
  gpuUtilization: number[];
  gpuMemoryUsedMb: number[];
  ramUsageMb: number;
  ramTotalMb: number;
  diskUsageGb: number;
  diskTotalGb: number;
  networkRxMbps: number;
  networkTxMbps: number;
}
```

### ResourceLimits
Container resource constraints.
```typescript
interface ResourceLimits {
  gpuIndices: string[];
  cpuCores: number;
  ramLimit: string;
  diskLimit?: string;
}
```
