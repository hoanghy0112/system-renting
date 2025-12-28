// ==========================================
// Logging Types
// ==========================================

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  metadata?: Record<string, unknown>;
  traceId?: string;
}

export interface LogQueryOptions {
  context?: string;
  level?: LogLevel;
  startTime?: string;
  endTime?: string;
  limit?: number;
  traceId?: string;
}
