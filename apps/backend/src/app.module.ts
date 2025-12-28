import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { BillingModule } from './modules/billing/billing.module';
import { ProxyModule } from './modules/proxy/proxy.module';
import { RedisModule } from './redis/redis.module';
import { InfluxModule } from './influx/influx.module';
import { LoggingModule } from './logging/logging.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    InfluxModule,
    LoggingModule,
    AuthModule,
    FleetModule,
    MarketplaceModule,
    BillingModule,
    ProxyModule,
  ],
})
export class AppModule {}

