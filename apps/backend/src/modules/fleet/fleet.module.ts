import { Module } from '@nestjs/common';
import { FleetGateway } from './fleet.gateway';
import { FleetService } from './fleet.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [FleetGateway, FleetService],
  exports: [FleetService],
})
export class FleetModule {}
