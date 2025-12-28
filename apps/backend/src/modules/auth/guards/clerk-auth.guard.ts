import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const clerkUser = await this.authService.verifyClerkToken(token);

    if (!clerkUser) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Attach user to request
    const user = await this.authService.getOrCreateUser(clerkUser);
    (request as any).user = user;

    return true;
  }
}
