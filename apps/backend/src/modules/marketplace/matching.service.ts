import { Injectable } from '@nestjs/common';
import { Prisma, NodeStatus } from '@prisma/client';
import { SearchNodesDto, NodeSpecs } from '@distributed-compute/shared-types';

@Injectable()
export class MatchingService {
  /**
   * Build Prisma where clause from search parameters
   */
  buildWhereClause(query: SearchNodesDto): Prisma.HostNodeWhereInput {
    const conditions: Prisma.HostNodeWhereInput[] = [];

    // Status filter
    if (query.status) {
      conditions.push({ status: query.status as NodeStatus });
    } else {
      // Default to only online nodes
      conditions.push({
        status: { in: [NodeStatus.ONLINE] },
      });
    }

    // GPU VRAM filter (requires JSON path query)
    if (query.minGpuVram) {
      conditions.push({
        specs: {
          path: ['gpus', '0', 'vram'],
          gte: query.minGpuVram,
        },
      });
    }

    // CPU cores filter
    if (query.minCpuCores) {
      conditions.push({
        specs: {
          path: ['cpuCores'],
          gte: query.minCpuCores,
        },
      });
    }

    // RAM filter
    if (query.minRamGb) {
      conditions.push({
        specs: {
          path: ['ramGb'],
          gte: query.minRamGb,
        },
      });
    }

    // Disk filter
    if (query.minDiskGb) {
      conditions.push({
        specs: {
          path: ['diskGb'],
          gte: query.minDiskGb,
        },
      });
    }

    // Price filter
    if (query.maxHourlyRate) {
      conditions.push({
        pricingConfig: {
          path: ['hourlyRate'],
          lte: query.maxHourlyRate,
        },
      });
    }

    // GPU model filter (string contains)
    if (query.gpuModel) {
      conditions.push({
        specs: {
          path: ['gpus', '0', 'model'],
          string_contains: query.gpuModel,
        },
      });
    }

    // Location filters
    if (query.country) {
      conditions.push({
        locationData: {
          path: ['country'],
          equals: query.country,
        },
      });
    }

    if (query.city) {
      conditions.push({
        locationData: {
          path: ['city'],
          equals: query.city,
        },
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  /**
   * Score nodes for relevance ranking
   */
  scoreNode(
    specs: NodeSpecs,
    query: SearchNodesDto,
  ): number {
    let score = 0;

    // GPU performance score
    if (specs.gpus && specs.gpus.length > 0) {
      const totalTflops = specs.gpus.reduce((sum, gpu) => sum + (gpu.tflops || 0), 0);
      score += totalTflops * 10;

      const totalVram = specs.gpus.reduce((sum, gpu) => sum + (gpu.vram || 0), 0);
      score += totalVram * 5;
    }

    // CPU score
    score += specs.cpuCores * 2;

    // RAM score
    score += specs.ramGb;

    // Disk score
    score += specs.diskGb * 0.1;

    return score;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
