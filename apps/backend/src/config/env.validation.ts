import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  // InfluxDB
  INFLUXDB_URL: z.string().url(),
  INFLUXDB_TOKEN: z.string().min(1),
  INFLUXDB_ORG: z.string().min(1),
  INFLUXDB_BUCKET: z.string().min(1),

  // Clerk Authentication (optional for development)
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),

  // FRP Proxy Server
  FRP_SERVER_ADDR: z.string().default('localhost'),
  FRP_SERVER_PORT: z.coerce.number().default(7000),
  FRP_AUTH_TOKEN: z.string().min(1),
  FRP_PORT_RANGE_START: z.coerce.number().default(10000),
  FRP_PORT_RANGE_END: z.coerce.number().default(10100),

  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().optional(),

  // Logging
  LOG_RETENTION_DAYS: z.coerce.number().default(30),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    process.stderr.write('❌ Invalid environment variables:\n');
    process.stderr.write(JSON.stringify(result.error.format(), null, 2) + '\n');
    throw new Error('Environment validation failed');
  }

  process.stdout.write('✅ Environment variables validated successfully\n');
  return result.data;
}

export function getEnvConfig(): EnvConfig {
  return envSchema.parse(process.env);
}
