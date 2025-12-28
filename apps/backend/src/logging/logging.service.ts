import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InfluxDB, Point, WriteApi, QueryApi } from '@influxdata/influxdb-client';
import { DeleteAPI } from '@influxdata/influxdb-client-apis';
import { LogLevel, LogEntry, LogQueryOptions } from '@distributed-compute/shared-types';

const LOG_MEASUREMENT = 'application_logs';

@Injectable()
export class LoggingService implements OnModuleInit {
  private client: InfluxDB;
  private writeApi: WriteApi;
  private queryApi: QueryApi;
  private deleteApi: DeleteAPI;
  private readonly logger = new Logger(LoggingService.name);
  private bucket: string;
  private org: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('INFLUXDB_URL')!;
    const token = this.configService.get<string>('INFLUXDB_TOKEN')!;
    this.org = this.configService.get<string>('INFLUXDB_ORG')!;
    this.bucket = this.configService.get<string>('INFLUXDB_BUCKET')!;

    this.client = new InfluxDB({ url, token });
    this.writeApi = this.client.getWriteApi(this.org, this.bucket, 'ns');
    this.queryApi = this.client.getQueryApi(this.org);
    this.deleteApi = new DeleteAPI(this.client);

    this.logger.log('LoggingService connected to InfluxDB');
  }

  /**
   * Write a log entry to InfluxDB
   */
  async log(
    level: LogLevel,
    context: string,
    message: string,
    metadata?: Record<string, unknown>,
    traceId?: string,
  ): Promise<void> {
    try {
      const point = new Point(LOG_MEASUREMENT)
        .tag('level', level)
        .tag('context', context)
        .stringField('message', message)
        .timestamp(new Date());

      if (traceId) {
        point.tag('trace_id', traceId);
      }

      if (metadata) {
        point.stringField('metadata', JSON.stringify(metadata));
      }

      this.writeApi.writePoint(point);
      await this.writeApi.flush();
    } catch (error) {
      // Fallback to console to avoid infinite loops
      this.logger.error('Failed to write log to InfluxDB', error);
    }
  }

  /**
   * Helper methods for different log levels
   */
  async debug(context: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.DEBUG, context, message, metadata);
  }

  async info(context: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.INFO, context, message, metadata);
  }

  async warn(context: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.WARN, context, message, metadata);
  }

  async error(context: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.ERROR, context, message, metadata);
  }

  /**
   * Query logs from InfluxDB
   */
  async query(options: LogQueryOptions): Promise<LogEntry[]> {
    const { context, level, startTime, endTime, limit = 100, traceId } = options;
    const start = startTime || '-1h';
    const stop = endTime || 'now()';

    let filterClauses = `r._measurement == "${LOG_MEASUREMENT}"`;
    if (context) {
      filterClauses += ` and r.context == "${context}"`;
    }
    if (level) {
      filterClauses += ` and r.level == "${level}"`;
    }
    if (traceId) {
      filterClauses += ` and r.trace_id == "${traceId}"`;
    }

    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${start}, stop: ${stop})
        |> filter(fn: (r) => ${filterClauses})
        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: ${limit})
    `;

    const results: LogEntry[] = [];
    return new Promise((resolve, reject) => {
      this.queryApi.queryRows(query, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          results.push({
            timestamp: o._time as string,
            level: o.level as LogLevel,
            context: o.context as string,
            message: o.message as string,
            metadata: o.metadata ? JSON.parse(o.metadata as string) : undefined,
            traceId: o.trace_id as string | undefined,
          });
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(results);
        },
      });
    });
  }

  /**
   * Clean up old logs based on retention policy
   * Runs daily at 3 AM by default
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldLogs(): Promise<void> {
    const retentionDays = this.configService.get<number>('LOG_RETENTION_DAYS') || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      await this.deleteApi.postDelete({
        org: this.org,
        bucket: this.bucket,
        body: {
          start: '1970-01-01T00:00:00Z',
          stop: cutoffDate.toISOString(),
          predicate: `_measurement="${LOG_MEASUREMENT}"`,
        },
      });

      this.logger.log(
        `Cleaned up logs older than ${retentionDays} days (before ${cutoffDate.toISOString()})`,
      );
    } catch (error) {
      this.logger.error('Failed to cleanup old logs', error);
    }
  }

  /**
   * Manual cleanup trigger (useful for testing)
   */
  async manualCleanup(retentionDays: number): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    await this.deleteApi.postDelete({
      org: this.org,
      bucket: this.bucket,
      body: {
        start: '1970-01-01T00:00:00Z',
        stop: cutoffDate.toISOString(),
        predicate: `_measurement="${LOG_MEASUREMENT}"`,
      },
    });

    this.logger.log(
      `Manually cleaned up logs older than ${retentionDays} days`,
    );
  }
}
