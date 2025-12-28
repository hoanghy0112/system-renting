import { Module } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { PortAllocatorService } from './port-allocator.service';

@Module({
  providers: [ProxyService, PortAllocatorService],
  exports: [ProxyService, PortAllocatorService],
})
export class ProxyModule {}
