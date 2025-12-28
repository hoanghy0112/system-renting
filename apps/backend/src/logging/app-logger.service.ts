import { Injectable, LoggerService as NestLoggerService, Logger } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { LogLevel } from '@distributed-compute/shared-types';

/**
 * AppLoggerService wraps NestJS Logger and persists logs to InfluxDB.
 * Can be injected into any service as a drop-in replacement.
 */
@Injectable()
export class AppLoggerService implements NestLoggerService {
  private readonly consoleLogger = new Logger();
  private context: string = 'Application';

  constructor(private readonly loggingService: LoggingService) {}

  /**
   * Set the logging context (e.g., service name)
   */
  setContext(context: string): AppLoggerService {
    this.context = context;
    return this;
  }

  /**
   * Create a new logger instance with a specific context
   */
  forContext(context: string): AppLoggerService {
    const logger = new AppLoggerService(this.loggingService);
    logger.context = context;
    return logger;
  }

  log(message: string, context?: string, metadata?: Record<string, unknown>): void {
    const ctx = context || this.context;
    this.consoleLogger.log(message, ctx);
    this.loggingService.info(ctx, message, metadata).catch(() => {
      // Silently ignore to prevent infinite loops
    });
  }

  error(
    message: string,
    trace?: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    const ctx = context || this.context;
    this.consoleLogger.error(message, trace, ctx);
    this.loggingService
      .error(ctx, message, { ...metadata, trace })
      .catch(() => {
        // Silently ignore
      });
  }

  warn(message: string, context?: string, metadata?: Record<string, unknown>): void {
    const ctx = context || this.context;
    this.consoleLogger.warn(message, ctx);
    this.loggingService.warn(ctx, message, metadata).catch(() => {
      // Silently ignore
    });
  }

  debug(message: string, context?: string, metadata?: Record<string, unknown>): void {
    const ctx = context || this.context;
    this.consoleLogger.debug?.(message, ctx);
    this.loggingService.debug(ctx, message, metadata).catch(() => {
      // Silently ignore
    });
  }

  verbose(message: string, context?: string, metadata?: Record<string, unknown>): void {
    const ctx = context || this.context;
    this.consoleLogger.verbose?.(message, ctx);
    this.loggingService.debug(ctx, message, metadata).catch(() => {
      // Silently ignore
    });
  }

  /**
   * Log with custom level
   */
  logWithLevel(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): void {
    const ctx = context || this.context;

    // Log to console
    switch (level) {
      case LogLevel.DEBUG:
        this.consoleLogger.debug?.(message, ctx);
        break;
      case LogLevel.INFO:
        this.consoleLogger.log(message, ctx);
        break;
      case LogLevel.WARN:
        this.consoleLogger.warn(message, ctx);
        break;
      case LogLevel.ERROR:
        this.consoleLogger.error(message, undefined, ctx);
        break;
    }

    // Persist to InfluxDB
    this.loggingService.log(level, ctx, message, metadata).catch(() => {
      // Silently ignore
    });
  }
}
