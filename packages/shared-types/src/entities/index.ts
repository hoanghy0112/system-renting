// ==========================================
// Enums
// ==========================================

export enum Role {
  RENT = 'RENT',
  LEASE = 'LEASE',
  BOTH = 'BOTH',
}

export enum NodeStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  BUSY = 'BUSY',
  MAINTENANCE = 'MAINTENANCE',
}

export enum RentalStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

// ==========================================
// Entity Interfaces
// ==========================================

export interface User {
  id: string;
  clerkId: string;
  email: string;
  role: Role;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GpuSpec {
  model: string;
  vram: number; // in GB
  tflops: number;
  count: number;
}

export interface NodeSpecs {
  gpus: GpuSpec[];
  cpuModel: string;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  networkSpeedMbps: number;
}

export interface PricingConfig {
  hourlyRate: number;
  smartPricingEnabled: boolean;
  minimumRate?: number;
  maximumRate?: number;
}

export interface LocationData {
  country: string;
  city: string;
  latitude?: number;
  longitude?: number;
}

export interface HostNode {
  id: string;
  ownerId: string;
  specs: NodeSpecs;
  pricingConfig: PricingConfig;
  status: NodeStatus;
  locationData?: LocationData;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectionInfo {
  sshHost: string;
  sshPort: number;
  sshUser: string;
  jupyterUrl?: string;
  additionalPorts: Record<string, number>;
}

export interface Rental {
  id: string;
  renterId: string;
  nodeId: string;
  startTime: Date;
  endTime?: Date;
  costPerHour: number;
  containerId?: string;
  connectionInfo?: ConnectionInfo;
  status: RentalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  referenceId?: string;
  description?: string;
  createdAt: Date;
}
