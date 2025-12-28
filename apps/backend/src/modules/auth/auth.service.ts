import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';

export interface ClerkUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Verify a Clerk session token
   * In production, use @clerk/clerk-sdk-node to verify
   */
  async verifyClerkToken(token: string): Promise<ClerkUser | null> {
    const clerkSecretKey = this.configService.get('CLERK_SECRET_KEY');

    if (!clerkSecretKey) {
      // Development mode - return mock user
      this.logger.warn('Clerk not configured, using mock authentication');
      return {
        id: 'dev-user-id',
        email: 'dev@example.com',
      };
    }

    // TODO: Implement Clerk token verification
    // const clerk = Clerk({ secretKey: clerkSecretKey });
    // const session = await clerk.sessions.verifySession(sessionId, token);
    // return session.userId;

    return null;
  }

  /**
   * Get or create a user from Clerk data
   */
  async getOrCreateUser(clerkUser: ClerkUser): Promise<User> {
    let user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: clerkUser.email,
        },
      });
      this.logger.log(`Created new user: ${user.email}`);
    }

    return user;
  }

  /**
   * Verify a Host Agent API key
   */
  async verifyAgentApiKey(apiKey: string): Promise<{ nodeId: string; ownerId: string } | null> {
    const node = await this.prisma.hostNode.findUnique({
      where: { apiKey },
      select: { id: true, ownerId: true },
    });

    if (!node) {
      return null;
    }

    return { nodeId: node.id, ownerId: node.ownerId };
  }
}
