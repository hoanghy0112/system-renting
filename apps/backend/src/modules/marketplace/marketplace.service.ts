import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MatchingService } from './matching.service';
import { NodeStatus, Prisma } from '@prisma/client';
import {
  SearchNodesDto,
  HostNodeResponse,
  MarketplaceStatsResponse,
  CreateHostNodeDto,
  UpdateHostNodeDto,
} from '@distributed-compute/shared-types';
import { createHash } from 'crypto';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly matchingService: MatchingService,
  ) {}

  async searchNodes(query: SearchNodesDto): Promise<{
    nodes: HostNodeResponse[];
    total: number;
  }> {
    // Check cache first
    const cacheKey = this.getQueryHash(query);
    const cached = await this.redis.getCachedSearchResults<HostNodeResponse>(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached search results');
      return { nodes: cached, total: cached.length };
    }

    // Build where clause
    const where = this.matchingService.buildWhereClause(query);

    // Get total count
    const total = await this.prisma.hostNode.count({ where });

    // Get nodes with pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const nodes = await this.prisma.hostNode.findMany({
      where,
      skip,
      take: limit,
      orderBy: this.getOrderBy(query.sortBy, query.sortOrder),
      include: {
        owner: {
          select: { email: true },
        },
      },
    });

    // Transform to response type
    const response = nodes.map((node) => this.toNodeResponse(node));

    // Cache results for 60 seconds
    await this.redis.cacheSearchResults(cacheKey, response, 60);

    return { nodes: response, total };
  }

  async getNodeById(nodeId: string): Promise<HostNodeResponse> {
    const node = await this.prisma.hostNode.findUnique({
      where: { id: nodeId },
      include: {
        owner: { select: { email: true } },
        rentals: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
      },
    });

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    return this.toNodeResponse(node);
  }

  async createNode(
    ownerId: string,
    data: CreateHostNodeDto,
  ): Promise<HostNodeResponse> {
    const node = await this.prisma.hostNode.create({
      data: {
        ownerId,
        specs: data.specs as any,
        pricingConfig: data.pricingConfig as any,
        locationData: data.locationData as any,
      },
      include: {
        owner: { select: { email: true } },
      },
    });

    this.logger.log(`Created new node: ${node.id} for owner ${ownerId}`);
    return this.toNodeResponse(node);
  }

  async updateNode(
    nodeId: string,
    ownerId: string,
    data: UpdateHostNodeDto,
  ): Promise<HostNodeResponse> {
    // Verify ownership
    const existing = await this.prisma.hostNode.findFirst({
      where: { id: nodeId, ownerId },
    });

    if (!existing) {
      throw new NotFoundException('Node not found or not owned by user');
    }

    const node = await this.prisma.hostNode.update({
      where: { id: nodeId },
      data: {
        pricingConfig: data.pricingConfig
          ? (data.pricingConfig as any)
          : undefined,
        locationData: data.locationData
          ? (data.locationData as any)
          : undefined,
      },
      include: {
        owner: { select: { email: true } },
      },
    });

    return this.toNodeResponse(node);
  }

  async deleteNode(nodeId: string, ownerId: string): Promise<void> {
    const existing = await this.prisma.hostNode.findFirst({
      where: { id: nodeId, ownerId },
    });

    if (!existing) {
      throw new NotFoundException('Node not found or not owned by user');
    }

    await this.prisma.hostNode.delete({
      where: { id: nodeId },
    });

    this.logger.log(`Deleted node: ${nodeId}`);
  }

  async getNodesByOwner(ownerId: string): Promise<HostNodeResponse[]> {
    const nodes = await this.prisma.hostNode.findMany({
      where: { ownerId },
      include: {
        owner: { select: { email: true } },
        rentals: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
      },
    });

    return nodes.map((node) => this.toNodeResponse(node));
  }

  async getMarketplaceStats(): Promise<MarketplaceStatsResponse> {
    const [totalNodes, availableNodes, priceStats, gpuCount] = await Promise.all([
      this.prisma.hostNode.count(),
      this.prisma.hostNode.count({
        where: { status: NodeStatus.ONLINE },
      }),
      this.prisma.hostNode.aggregate({
        _avg: {
          // Note: hourlyRate is stored in pricingConfig JSON
        },
      }),
      // Count total GPUs (would need to aggregate from specs JSON)
      Promise.resolve(0),
    ]);

    // Calculate average hourly rate from pricing configs
    const nodes = await this.prisma.hostNode.findMany({
      select: { pricingConfig: true },
    });
    const rates = nodes
      .map((n) => (n.pricingConfig as any)?.hourlyRate)
      .filter((r) => r != null);
    const averageHourlyRate =
      rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;

    return {
      totalNodes,
      availableNodes,
      averageHourlyRate,
      totalGpus: gpuCount,
    };
  }

  private toNodeResponse(node: any): HostNodeResponse {
    return {
      id: node.id,
      ownerId: node.ownerId,
      ownerEmail: node.owner?.email,
      specs: node.specs,
      pricingConfig: node.pricingConfig,
      status: node.status,
      locationData: node.locationData,
      currentRentalId: node.rentals?.[0]?.id,
      createdAt: node.createdAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
    };
  }

  private getOrderBy(
    sortBy?: string,
    sortOrder?: string,
  ): Prisma.HostNodeOrderByWithRelationInput {
    const order = sortOrder === 'desc' ? 'desc' : 'asc';

    switch (sortBy) {
      case 'price':
        // Sort by pricingConfig.hourlyRate requires raw query or computed field
        return { createdAt: order };
      case 'performance':
        return { createdAt: order };
      default:
        return { createdAt: 'desc' };
    }
  }

  private getQueryHash(query: SearchNodesDto): string {
    const str = JSON.stringify(query);
    return createHash('md5').update(str).digest('hex');
  }
}
