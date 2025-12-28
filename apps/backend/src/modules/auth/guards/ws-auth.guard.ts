import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from '../auth.service';

export interface AuthenticatedSocket extends Socket {
  data: {
    nodeId: string;
    ownerId: string;
  };
}

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const authHeader = client.handshake.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn(`WebSocket connection rejected: missing auth header`);
      throw new WsException('Missing or invalid authorization header');
    }

    const apiKey = authHeader.substring(7);
    const nodeInfo = await this.authService.verifyAgentApiKey(apiKey);

    if (!nodeInfo) {
      this.logger.warn(`WebSocket connection rejected: invalid API key`);
      throw new WsException('Invalid API key');
    }

    // Attach node info to socket
    client.data = nodeInfo;
    this.logger.log(`Agent authenticated: nodeId=${nodeInfo.nodeId}`);

    return true;
  }
}
