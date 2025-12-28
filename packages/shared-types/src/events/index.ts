// ==========================================
// WebSocket Event Types
// ==========================================

// Agent → Backend Events

export interface HeartbeatEvent {
  event: 'heartbeat';
  data: {
    nodeId: string;
    status: 'online' | 'busy' | 'maintenance';
    metrics: NodeMetrics;
  };
}

export interface NodeMetrics {
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

export interface InstanceStartedEvent {
  event: 'instance_started';
  data: {
    rentalId: string;
    containerId: string;
    connectionInfo: {
      sshHost: string;
      sshPort: number;
      additionalPorts: Record<string, number>;
    };
  };
}

export interface InstanceStoppedEvent {
  event: 'instance_stopped';
  data: {
    rentalId: string;
    containerId: string;
    reason: 'requested' | 'error' | 'timeout';
    errorMessage?: string;
  };
}

export interface AgentErrorEvent {
  event: 'agent_error';
  data: {
    nodeId: string;
    errorCode: string;
    message: string;
    timestamp: string;
  };
}

// Backend → Agent Commands

export interface StartInstanceCommand {
  event: 'start_instance';
  data: {
    rentalId: string;
    image: string;
    resourceLimits: ResourceLimits;
    envVars: Record<string, string>;
    proxyPortMapping: Record<string, number>; // container port → public port
  };
}

export interface ResourceLimits {
  gpuIndices: string[];
  cpuCores: number;
  ramLimit: string; // e.g., "16g"
  diskLimit?: string; // e.g., "100g"
}

export interface StopInstanceCommand {
  event: 'stop_instance';
  data: {
    rentalId: string;
    containerId: string;
    graceful: boolean;
    timeoutSeconds?: number;
  };
}

export interface DrainNodeCommand {
  event: 'drain_node';
  data: {
    nodeId: string;
    reason?: string;
  };
}

export interface UpdateConfigCommand {
  event: 'update_config';
  data: {
    nodeId: string;
    config: Partial<AgentConfig>;
  };
}

export interface AgentConfig {
  heartbeatIntervalMs: number;
  maxConcurrentRentals: number;
  allowedImages: string[];
}

// Union types for type guards
export type AgentToBackendEvent =
  | HeartbeatEvent
  | InstanceStartedEvent
  | InstanceStoppedEvent
  | AgentErrorEvent;

export type BackendToAgentCommand =
  | StartInstanceCommand
  | StopInstanceCommand
  | DrainNodeCommand
  | UpdateConfigCommand;
