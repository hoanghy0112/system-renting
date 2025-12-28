import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PortAllocatorService {
  private readonly logger = new Logger(PortAllocatorService.name);
  private readonly portRangeStart: number;
  private readonly portRangeEnd: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.portRangeStart = this.configService.get('FRP_PORT_RANGE_START', 10000);
    this.portRangeEnd = this.configService.get('FRP_PORT_RANGE_END', 10100);
  }

  /**
   * Allocate a free port for a node/rental
   */
  async allocatePort(nodeId: string, rentalId?: string): Promise<number> {
    // Find the first available port in the range
    for (let port = this.portRangeStart; port <= this.portRangeEnd; port++) {
      const existing = await this.prisma.portAllocation.findUnique({
        where: { port },
      });

      if (!existing || !existing.isActive) {
        // Allocate this port
        await this.prisma.portAllocation.upsert({
          where: { port },
          update: {
            nodeId,
            rentalId,
            isActive: true,
            allocatedAt: new Date(),
            releasedAt: null,
          },
          create: {
            port,
            nodeId,
            rentalId,
            isActive: true,
          },
        });

        this.logger.debug(`Allocated port ${port} for node ${nodeId}`);
        return port;
      }
    }

    throw new Error('No available ports in the configured range');
  }

  /**
   * Release a specific port
   */
  async releasePort(port: number): Promise<void> {
    await this.prisma.portAllocation.update({
      where: { port },
      data: {
        isActive: false,
        releasedAt: new Date(),
      },
    });

    this.logger.debug(`Released port ${port}`);
  }

  /**
   * Release all ports for a rental
   */
  async releasePortsByRental(rentalId: string): Promise<void> {
    const result = await this.prisma.portAllocation.updateMany({
      where: { rentalId, isActive: true },
      data: {
        isActive: false,
        releasedAt: new Date(),
      },
    });

    this.logger.debug(`Released ${result.count} ports for rental ${rentalId}`);
  }

  /**
   * Release all ports for a node
   */
  async releasePortsByNode(nodeId: string): Promise<void> {
    const result = await this.prisma.portAllocation.updateMany({
      where: { nodeId, isActive: true },
      data: {
        isActive: false,
        releasedAt: new Date(),
      },
    });

    this.logger.debug(`Released ${result.count} ports for node ${nodeId}`);
  }

  /**
   * Get all active port allocations
   */
  async getActiveAllocations(): Promise<
    { port: number; nodeId: string | null; rentalId: string | null }[]
  > {
    return this.prisma.portAllocation.findMany({
      where: { isActive: true },
      select: {
        port: true,
        nodeId: true,
        rentalId: true,
      },
    });
  }

  /**
   * Check if a port is available
   */
  async isPortAvailable(port: number): Promise<boolean> {
    const allocation = await this.prisma.portAllocation.findUnique({
      where: { port },
    });

    return !allocation || !allocation.isActive;
  }

  /**
   * Get remaining available ports count
   */
  async getAvailablePortsCount(): Promise<number> {
    const activeCount = await this.prisma.portAllocation.count({
      where: { isActive: true },
    });

    return this.portRangeEnd - this.portRangeStart + 1 - activeCount;
  }
}
