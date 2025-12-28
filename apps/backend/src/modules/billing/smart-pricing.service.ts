import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PriceSuggestionResponse, NodeSpecs } from '@distributed-compute/shared-types';

// GPU pricing data based on market averages
const GPU_BASE_PRICES: Record<string, number> = {
  // Consumer GPUs
  'RTX 4090': 0.50,
  'RTX 4080': 0.40,
  'RTX 4070 Ti': 0.30,
  'RTX 4070': 0.25,
  'RTX 3090': 0.35,
  'RTX 3080': 0.28,
  'RTX 3070': 0.20,
  // Professional GPUs
  'A100': 2.50,
  'A100 80GB': 3.00,
  'A6000': 1.20,
  'A5000': 0.80,
  'A4000': 0.50,
  'H100': 4.00,
  'H100 80GB': 4.50,
  // Older GPUs
  'V100': 0.80,
  'T4': 0.35,
  'P100': 0.50,
};

@Injectable()
export class SmartPricingService {
  private readonly logger = new Logger(SmartPricingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get suggested price for a node based on its specs
   */
  async getSuggestedPrice(specs: NodeSpecs): Promise<PriceSuggestionResponse> {
    // Calculate base price from GPUs
    let basePrice = 0;
    if (specs.gpus && specs.gpus.length > 0) {
      for (const gpu of specs.gpus) {
        const gpuPrice = this.getGpuBasePrice(gpu.model);
        basePrice += gpuPrice * gpu.count;
      }
    }

    // Add CPU/RAM premium
    const cpuPremium = specs.cpuCores * 0.01; // $0.01 per core
    const ramPremium = specs.ramGb * 0.005; // $0.005 per GB
    const diskPremium = specs.diskGb * 0.001; // $0.001 per GB
    const networkPremium = specs.networkSpeedMbps > 1000 ? 0.05 : 0;

    basePrice += cpuPremium + ramPremium + diskPremium + networkPremium;

    // Get market data
    const marketData = await this.getMarketData(specs);

    // Calculate final suggestion
    const suggestedHourlyRate = this.adjustForMarket(basePrice, marketData);

    return {
      suggestedHourlyRate: Math.round(suggestedHourlyRate * 100) / 100,
      marketAverage: marketData.average,
      marketLow: marketData.low,
      marketHigh: marketData.high,
      demandLevel: marketData.demandLevel,
    };
  }

  /**
   * Get base price for a GPU model
   */
  private getGpuBasePrice(model: string): number {
    // Try exact match first
    if (GPU_BASE_PRICES[model]) {
      return GPU_BASE_PRICES[model];
    }

    // Try partial match
    for (const [gpuModel, price] of Object.entries(GPU_BASE_PRICES)) {
      if (model.toLowerCase().includes(gpuModel.toLowerCase())) {
        return price;
      }
    }

    // Default price for unknown GPUs based on assumed performance
    this.logger.warn(`Unknown GPU model: ${model}, using default price`);
    return 0.20;
  }

  /**
   * Get market data for similar nodes
   */
  private async getMarketData(specs: NodeSpecs): Promise<{
    average: number;
    low: number;
    high: number;
    demandLevel: 'low' | 'medium' | 'high';
  }> {
    // Find similar nodes
    const similarNodes = await this.prisma.hostNode.findMany({
      where: {
        status: { in: ['ONLINE', 'BUSY'] },
      },
      select: {
        pricingConfig: true,
        status: true,
      },
      take: 100,
    });

    if (similarNodes.length === 0) {
      return {
        average: 0.50,
        low: 0.20,
        high: 1.00,
        demandLevel: 'medium',
      };
    }

    // Extract hourly rates
    const rates = similarNodes
      .map((n) => (n.pricingConfig as any)?.hourlyRate as number)
      .filter((r) => r != null && r > 0);

    if (rates.length === 0) {
      return {
        average: 0.50,
        low: 0.20,
        high: 1.00,
        demandLevel: 'medium',
      };
    }

    rates.sort((a, b) => a - b);

    const average = rates.reduce((a, b) => a + b, 0) / rates.length;
    const low = rates[0];
    const high = rates[rates.length - 1];

    // Calculate demand based on busy vs online ratio
    const busyCount = similarNodes.filter((n) => n.status === 'BUSY').length;
    const demandRatio = busyCount / similarNodes.length;

    let demandLevel: 'low' | 'medium' | 'high';
    if (demandRatio < 0.3) {
      demandLevel = 'low';
    } else if (demandRatio < 0.7) {
      demandLevel = 'medium';
    } else {
      demandLevel = 'high';
    }

    return {
      average: Math.round(average * 100) / 100,
      low: Math.round(low * 100) / 100,
      high: Math.round(high * 100) / 100,
      demandLevel,
    };
  }

  /**
   * Adjust price based on market conditions
   */
  private adjustForMarket(
    basePrice: number,
    marketData: { average: number; demandLevel: 'low' | 'medium' | 'high' },
  ): number {
    let adjustment = 1.0;

    // Adjust based on demand
    switch (marketData.demandLevel) {
      case 'low':
        adjustment = 0.9; // 10% discount
        break;
      case 'medium':
        adjustment = 1.0;
        break;
      case 'high':
        adjustment = 1.1; // 10% premium
        break;
    }

    // Blend with market average
    const blendedPrice = basePrice * 0.7 + marketData.average * 0.3;

    return blendedPrice * adjustment;
  }

  /**
   * Calculate optimal price for auto-pricing enabled nodes
   */
  async updateAutoPricedNodes(): Promise<void> {
    const nodes = await this.prisma.hostNode.findMany({
      where: {
        pricingConfig: {
          path: ['smartPricingEnabled'],
          equals: true,
        },
      },
    });

    for (const node of nodes) {
      const specs = node.specs as unknown as NodeSpecs;
      const suggestion = await this.getSuggestedPrice(specs);

      const currentConfig = node.pricingConfig as any;
      const minRate = currentConfig.minimumRate || 0;
      const maxRate = currentConfig.maximumRate || Infinity;

      // Clamp to configured range
      const newRate = Math.max(
        minRate,
        Math.min(maxRate, suggestion.suggestedHourlyRate),
      );

      await this.prisma.hostNode.update({
        where: { id: node.id },
        data: {
          pricingConfig: {
            ...currentConfig,
            hourlyRate: newRate,
          },
        },
      });

      this.logger.log(
        `Updated auto-price for node ${node.id}: $${newRate}/hr`,
      );
    }
  }
}
