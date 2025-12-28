import { NodeSpecs, PricingConfig, LocationData, NodeStatus, RentalStatus } from '../entities';

// ==========================================
// API Request DTOs
// ==========================================

export interface CreateHostNodeDto {
  specs: NodeSpecs;
  pricingConfig: PricingConfig;
  locationData?: LocationData;
}

export interface UpdateHostNodeDto {
  pricingConfig?: PricingConfig;
  locationData?: LocationData;
}

export interface SearchNodesDto {
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

export interface CreateRentalDto {
  nodeId: string;
  image: string;
  resourceLimits: {
    gpuIndices: string[];
    cpuCores: number;
    ramLimit: string;
  };
  envVars?: Record<string, string>;
  estimatedDurationHours?: number;
}

export interface TopUpBalanceDto {
  amount: number;
  paymentMethodId: string;
}

// ==========================================
// API Response DTOs
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HostNodeResponse {
  id: string;
  ownerId: string;
  ownerEmail?: string;
  specs: NodeSpecs;
  pricingConfig: PricingConfig;
  status: NodeStatus;
  locationData?: LocationData;
  currentRentalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalResponse {
  id: string;
  renterId: string;
  nodeId: string;
  node?: HostNodeResponse;
  startTime: string;
  endTime?: string;
  costPerHour: number;
  totalCost?: number;
  containerId?: string;
  connectionInfo?: {
    sshHost: string;
    sshPort: number;
    sshUser: string;
    jupyterUrl?: string;
    additionalPorts: Record<string, number>;
  };
  status: RentalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserResponse {
  id: string;
  email: string;
  role: string;
  balance: number;
  createdAt: string;
}

export interface TransactionResponse {
  id: string;
  amount: number;
  type: string;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

export interface MarketplaceStatsResponse {
  totalNodes: number;
  availableNodes: number;
  averageHourlyRate: number;
  totalGpus: number;
}

export interface PriceSuggestionResponse {
  suggestedHourlyRate: number;
  marketAverage: number;
  marketLow: number;
  marketHigh: number;
  demandLevel: 'low' | 'medium' | 'high';
}
