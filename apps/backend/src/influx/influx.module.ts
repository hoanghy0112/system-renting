import { Module, Global } from '@nestjs/common';
import { InfluxService } from './influx.service';

@Global()
@Module({
  providers: [InfluxService],
  exports: [InfluxService],
})
export class InfluxModule {}
