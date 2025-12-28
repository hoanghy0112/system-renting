import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { WsAuthGuard } from './guards/ws-auth.guard';

@Module({
  providers: [AuthService, ClerkAuthGuard, WsAuthGuard],
  exports: [AuthService, ClerkAuthGuard, WsAuthGuard],
})
export class AuthModule {}
