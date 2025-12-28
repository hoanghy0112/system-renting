import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { NodeStatus, RentalStatus } from '@prisma/client';
import {
  InstanceStartedEvent,
  InstanceStoppedEvent,
} from '@distributed-compute/shared-types';

@Injectable()
export class FleetService {
  private readonly logger = new Logger(FleetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async verifyAndGetNode(
    apiKey: string,
  ): Promise<{ nodeId: string; ownerId: string } | null> {
    const node = await this.prisma.hostNode.findUnique({
      where: { apiKey },
      select: { id: true, ownerId: true },
    });

    if (!node) {
      return null;
    }

    return { nodeId: node.id, ownerId: node.ownerId };
  }

  async setNodeOnline(nodeId: string): Promise<void> {
    await this.prisma.hostNode.update({
      where: { id: nodeId },
      data: {
        status: NodeStatus.ONLINE,
        lastHeartbeat: new Date(),
      },
    });

    await this.redis.setNodeOnline(nodeId, 15);
    this.logger.log(`Node ${nodeId} is now online`);
  }

  async setNodeOffline(nodeId: string): Promise<void> {
    await this.prisma.hostNode.update({
      where: { id: nodeId },
      data: { status: NodeStatus.OFFLINE },
    });

    this.logger.log(`Node ${nodeId} is now offline`);
  }

  async updateHeartbeat(
    nodeId: string,
    status: 'online' | 'busy' | 'maintenance',
  ): Promise<void> {
    const prismaStatus = this.mapStatusToPrisma(status);

    await this.prisma.hostNode.update({
      where: { id: nodeId },
      data: {
        status: prismaStatus,
        lastHeartbeat: new Date(),
      },
    });
  }

  async handleInstanceStarted(data: InstanceStartedEvent['data']): Promise<void> {
    await this.prisma.rental.update({
      where: { id: data.rentalId },
      data: {
        status: RentalStatus.ACTIVE,
        containerId: data.containerId,
        connectionInfo: data.connectionInfo,
      },
    });

    // Update node status to busy
    const rental = await this.prisma.rental.findUnique({
      where: { id: data.rentalId },
      select: { nodeId: true },
    });

    if (rental) {
      await this.prisma.hostNode.update({
        where: { id: rental.nodeId },
        data: { status: NodeStatus.BUSY },
      });
    }

    this.logger.log(`Rental ${data.rentalId} is now active`);
  }

  async handleInstanceStopped(data: InstanceStoppedEvent['data']): Promise<void> {
    const rental = await this.prisma.rental.findUnique({
      where: { id: data.rentalId },
      select: { nodeId: true, startTime: true, costPerHour: true },
    });

    if (!rental) {
      this.logger.warn(`Rental ${data.rentalId} not found`);
      return;
    }

    // Calculate total cost
    const endTime = new Date();
    const durationHours =
      (endTime.getTime() - rental.startTime.getTime()) / (1000 * 60 * 60);
    const totalCost = Number(rental.costPerHour) * durationHours;

    await this.prisma.rental.update({
      where: { id: data.rentalId },
      data: {
        status:
          data.reason === 'error'
            ? RentalStatus.CANCELLED
            : RentalStatus.COMPLETED,
        endTime,
        totalCost,
        containerId: null,
      },
    });

    // Update node status back to online
    await this.prisma.hostNode.update({
      where: { id: rental.nodeId },
      data: { status: NodeStatus.ONLINE },
    });

    this.logger.log(
      `Rental ${data.rentalId} completed: duration=${durationHours.toFixed(2)}h, cost=$${totalCost.toFixed(4)}`,
    );
  }

  async getNodeById(nodeId: string) {
    return this.prisma.hostNode.findUnique({
      where: { id: nodeId },
    });
  }

  async getOnlineNodes() {
    return this.prisma.hostNode.findMany({
      where: {
        status: { in: [NodeStatus.ONLINE, NodeStatus.BUSY] },
      },
    });
  }

  private mapStatusToPrisma(
    status: 'online' | 'busy' | 'maintenance',
  ): NodeStatus {
    switch (status) {
      case 'online':
        return NodeStatus.ONLINE;
      case 'busy':
        return NodeStatus.BUSY;
      case 'maintenance':
        return NodeStatus.MAINTENANCE;
      default:
        return NodeStatus.ONLINE;
    }
  }
}
