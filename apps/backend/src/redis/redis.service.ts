import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Disconnected from Redis');
  }

  getClient(): Redis {
    return this.client;
  }

  // Cache helpers
  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // Node status tracking
  async setNodeOnline(nodeId: string, ttlSeconds = 15): Promise<void> {
    await this.set(`node:${nodeId}:online`, { online: true }, ttlSeconds);
  }

  async isNodeOnline(nodeId: string): Promise<boolean> {
    return this.exists(`node:${nodeId}:online`);
  }

  // Search cache
  async cacheSearchResults(
    queryHash: string,
    results: unknown[],
    ttlSeconds = 60,
  ): Promise<void> {
    await this.set(`search:${queryHash}`, results, ttlSeconds);
  }

  async getCachedSearchResults<T>(queryHash: string): Promise<T[] | null> {
    return this.get<T[]>(`search:${queryHash}`);
  }
}
