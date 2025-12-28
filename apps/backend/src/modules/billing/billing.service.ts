import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FleetGateway } from '../fleet/fleet.gateway';
import { ProxyService } from '../proxy/proxy.service';
import { TransactionsService } from './transactions.service';
import { RentalStatus, NodeStatus } from '@prisma/client';
import {
  CreateRentalDto,
  RentalResponse,
  StartInstanceCommand,
} from '@distributed-compute/shared-types';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fleetGateway: FleetGateway,
    private readonly proxyService: ProxyService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async createRental(
    renterId: string,
    data: CreateRentalDto,
  ): Promise<RentalResponse> {
    // Get node and verify availability
    const node = await this.prisma.hostNode.findUnique({
      where: { id: data.nodeId },
      include: {
        rentals: {
          where: { status: RentalStatus.ACTIVE },
        },
      },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    if (node.status !== NodeStatus.ONLINE) {
      throw new BadRequestException('Node is not available');
    }

    if (node.rentals.length > 0) {
      throw new BadRequestException('Node is currently in use');
    }

    // Check renter balance
    const renter = await this.prisma.user.findUnique({
      where: { id: renterId },
    });

    if (!renter) {
      throw new NotFoundException('User not found');
    }

    const costPerHour = (node.pricingConfig as any).hourlyRate;
    const estimatedCost = costPerHour * (data.estimatedDurationHours || 1);

    if (Number(renter.balance) < estimatedCost) {
      throw new BadRequestException('Insufficient balance');
    }

    // Allocate proxy ports
    const portMapping = await this.proxyService.allocatePortsForRental(
      data.nodeId,
    );

    // Create rental
    const rental = await this.prisma.rental.create({
      data: {
        renterId,
        nodeId: data.nodeId,
        costPerHour,
        image: data.image,
        resourceLimits: data.resourceLimits as any,
        status: RentalStatus.PENDING,
      },
      include: {
        node: true,
      },
    });

    // Send start_instance command to agent
    const command: StartInstanceCommand['data'] = {
      rentalId: rental.id,
      image: data.image,
      resourceLimits: data.resourceLimits,
      envVars: data.envVars || {},
      proxyPortMapping: portMapping,
    };

    const sent = await this.fleetGateway.sendStartInstance(data.nodeId, command);

    if (!sent) {
      // Rollback rental if agent not connected
      await this.prisma.rental.delete({ where: { id: rental.id } });
      await this.proxyService.releasePortsForRental(rental.id);
      throw new BadRequestException('Node agent is not connected');
    }

    this.logger.log(`Created rental ${rental.id} for node ${data.nodeId}`);

    return this.toRentalResponse(rental);
  }

  async stopRental(rentalId: string, userId: string): Promise<RentalResponse> {
    const rental = await this.prisma.rental.findFirst({
      where: { id: rentalId, renterId: userId },
      include: { node: true },
    });

    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    if (rental.status !== RentalStatus.ACTIVE) {
      throw new BadRequestException('Rental is not active');
    }

    // Send stop command
    await this.fleetGateway.sendStopInstance(rental.nodeId, {
      rentalId: rental.id,
      containerId: rental.containerId!,
      graceful: true,
      timeoutSeconds: 30,
    });

    // Calculate and deduct cost
    const endTime = new Date();
    const durationHours =
      (endTime.getTime() - rental.startTime.getTime()) / (1000 * 60 * 60);
    const totalCost = Number(rental.costPerHour) * durationHours;

    // Update rental
    const updatedRental = await this.prisma.rental.update({
      where: { id: rentalId },
      data: {
        status: RentalStatus.COMPLETED,
        endTime,
        totalCost,
      },
      include: { node: true },
    });

    // Create debit transaction
    await this.transactionsService.createDebit(
      userId,
      totalCost,
      rentalId,
      `Rental for ${durationHours.toFixed(2)} hours`,
    );

    // Credit the host
    await this.transactionsService.createCredit(
      rental.node.ownerId,
      totalCost * 0.85, // 15% platform fee
      rentalId,
      `Earnings from rental`,
    );

    // Release proxy ports
    await this.proxyService.releasePortsForRental(rentalId);

    return this.toRentalResponse(updatedRental);
  }

  async getRentalById(rentalId: string): Promise<RentalResponse> {
    const rental = await this.prisma.rental.findUnique({
      where: { id: rentalId },
      include: { node: true },
    });

    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    return this.toRentalResponse(rental);
  }

  async getRentalsByUser(userId: string): Promise<RentalResponse[]> {
    const rentals = await this.prisma.rental.findMany({
      where: { renterId: userId },
      include: { node: true },
      orderBy: { createdAt: 'desc' },
    });

    return rentals.map((r) => this.toRentalResponse(r));
  }

  async getActiveRentals(): Promise<RentalResponse[]> {
    const rentals = await this.prisma.rental.findMany({
      where: { status: RentalStatus.ACTIVE },
      include: { node: true },
    });

    return rentals.map((r) => this.toRentalResponse(r));
  }

  private toRentalResponse(rental: any): RentalResponse {
    return {
      id: rental.id,
      renterId: rental.renterId,
      nodeId: rental.nodeId,
      node: rental.node
        ? {
            id: rental.node.id,
            ownerId: rental.node.ownerId,
            specs: rental.node.specs,
            pricingConfig: rental.node.pricingConfig,
            status: rental.node.status,
            locationData: rental.node.locationData,
            createdAt: rental.node.createdAt.toISOString(),
            updatedAt: rental.node.updatedAt.toISOString(),
          }
        : undefined,
      startTime: rental.startTime.toISOString(),
      endTime: rental.endTime?.toISOString(),
      costPerHour: Number(rental.costPerHour),
      totalCost: rental.totalCost ? Number(rental.totalCost) : undefined,
      containerId: rental.containerId,
      connectionInfo: rental.connectionInfo,
      status: rental.status,
      createdAt: rental.createdAt.toISOString(),
      updatedAt: rental.updatedAt.toISOString(),
    };
  }
}
