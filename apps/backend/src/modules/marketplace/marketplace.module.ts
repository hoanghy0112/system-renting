import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { MatchingService } from './matching.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, MatchingService],
  exports: [MarketplaceService, MatchingService],
})
export class MarketplaceModule {}
