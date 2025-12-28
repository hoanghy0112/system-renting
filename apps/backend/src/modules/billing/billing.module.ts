import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { SmartPricingService } from './smart-pricing.service';
import { TransactionsService } from './transactions.service';
import { AuthModule } from '../auth/auth.module';
import { FleetModule } from '../fleet/fleet.module';
import { ProxyModule } from '../proxy/proxy.module';

@Module({
  imports: [AuthModule, FleetModule, ProxyModule],
  controllers: [BillingController],
  providers: [BillingService, SmartPricingService, TransactionsService],
  exports: [BillingService, SmartPricingService, TransactionsService],
})
export class BillingModule {}
