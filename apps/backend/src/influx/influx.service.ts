import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfluxDB, Point, WriteApi, QueryApi } from '@influxdata/influxdb-client';
import { NodeMetrics } from '@distributed-compute/shared-types';

@Injectable()
export class InfluxService implements OnModuleInit {
  private client: InfluxDB;
  private writeApi: WriteApi;
  private queryApi: QueryApi;
  private readonly logger = new Logger(InfluxService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('INFLUXDB_URL')!;
    const token = this.configService.get<string>('INFLUXDB_TOKEN')!;
    const org = this.configService.get<string>('INFLUXDB_ORG')!;
    const bucket = this.configService.get<string>('INFLUXDB_BUCKET')!;

    this.client = new InfluxDB({ url, token });
    this.writeApi = this.client.getWriteApi(org, bucket, 'ns');
    this.queryApi = this.client.getQueryApi(org);

    this.logger.log('Connected to InfluxDB');
  }

  async writeNodeMetrics(nodeId: string, metrics: NodeMetrics): Promise<void> {
    const timestamp = new Date();

    // CPU metrics
    const cpuPoint = new Point('cpu_metrics')
      .tag('node_id', nodeId)
      .floatField('temperature', metrics.cpuTemp)
      .floatField('usage_percent', metrics.cpuUsagePercent)
      .timestamp(timestamp);
    this.writeApi.writePoint(cpuPoint);

    // GPU metrics (one point per GPU)
    metrics.gpuTemp.forEach((temp, index) => {
      const gpuPoint = new Point('gpu_metrics')
        .tag('node_id', nodeId)
        .tag('gpu_index', index.toString())
        .floatField('temperature', temp)
        .floatField('utilization', metrics.gpuUtilization[index] || 0)
        .floatField('memory_used_mb', metrics.gpuMemoryUsedMb[index] || 0)
        .timestamp(timestamp);
      this.writeApi.writePoint(gpuPoint);
    });

    // Memory metrics
    const memPoint = new Point('memory_metrics')
      .tag('node_id', nodeId)
      .floatField('ram_usage_mb', metrics.ramUsageMb)
      .floatField('ram_total_mb', metrics.ramTotalMb)
      .floatField('disk_usage_gb', metrics.diskUsageGb)
      .floatField('disk_total_gb', metrics.diskTotalGb)
      .timestamp(timestamp);
    this.writeApi.writePoint(memPoint);

    // Network metrics
    const netPoint = new Point('network_metrics')
      .tag('node_id', nodeId)
      .floatField('rx_mbps', metrics.networkRxMbps)
      .floatField('tx_mbps', metrics.networkTxMbps)
      .timestamp(timestamp);
    this.writeApi.writePoint(netPoint);

    await this.writeApi.flush();
  }

  async getNodeMetricsHistory(
    nodeId: string,
    duration: string = '-1h',
  ): Promise<unknown[]> {
    const bucket = this.configService.get<string>('INFLUXDB_BUCKET')!;

    const query = `
      from(bucket: "${bucket}")
        |> range(start: ${duration})
        |> filter(fn: (r) => r["node_id"] == "${nodeId}")
        |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
        |> yield(name: "mean")
    `;

    const results: unknown[] = [];
    return new Promise((resolve, reject) => {
      this.queryApi.queryRows(query, {
        next(row, tableMeta) {
          results.push(tableMeta.toObject(row));
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

  async getAverageMetrics(
    nodeId: string,
    duration: string = '-24h',
  ): Promise<Record<string, number>> {
    const bucket = this.configService.get<string>('INFLUXDB_BUCKET')!;

    const query = `
      from(bucket: "${bucket}")
        |> range(start: ${duration})
        |> filter(fn: (r) => r["node_id"] == "${nodeId}")
        |> mean()
    `;

    const averages: Record<string, number> = {};
    return new Promise((resolve, reject) => {
      this.queryApi.queryRows(query, {
        next(row, tableMeta) {
          const o = tableMeta.toObject(row);
          averages[o._field as string] = o._value as number;
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(averages);
        },
      });
    });
  }
}
