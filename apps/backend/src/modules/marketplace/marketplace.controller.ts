import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { MarketplaceService } from './marketplace.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import {
  SearchNodesDto,
  CreateHostNodeDto,
  UpdateHostNodeDto,
  ApiResponse,
  HostNodeResponse,
  MarketplaceStatsResponse,
} from '@distributed-compute/shared-types';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('nodes')
  async searchNodes(
    @Query() query: SearchNodesDto,
  ): Promise<ApiResponse<{ nodes: HostNodeResponse[]; total: number }>> {
    const result = await this.marketplaceService.searchNodes(query);
    return {
      success: true,
      data: result,
      meta: {
        page: query.page || 1,
        limit: query.limit || 20,
        total: result.total,
        totalPages: Math.ceil(result.total / (query.limit || 20)),
      },
    };
  }

  @Get('nodes/:id')
  async getNode(
    @Param('id') id: string,
  ): Promise<ApiResponse<HostNodeResponse>> {
    const node = await this.marketplaceService.getNodeById(id);
    return { success: true, data: node };
  }

  @Get('stats')
  async getStats(): Promise<ApiResponse<MarketplaceStatsResponse>> {
    const stats = await this.marketplaceService.getMarketplaceStats();
    return { success: true, data: stats };
  }

  @Post('nodes')
  @UseGuards(ClerkAuthGuard)
  async createNode(
    @Req() req: Request,
    @Body() body: CreateHostNodeDto,
  ): Promise<ApiResponse<HostNodeResponse>> {
    const user = (req as any).user;
    const node = await this.marketplaceService.createNode(user.id, body);
    return { success: true, data: node };
  }

  @Put('nodes/:id')
  @UseGuards(ClerkAuthGuard)
  async updateNode(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateHostNodeDto,
  ): Promise<ApiResponse<HostNodeResponse>> {
    const user = (req as any).user;
    const node = await this.marketplaceService.updateNode(id, user.id, body);
    return { success: true, data: node };
  }

  @Delete('nodes/:id')
  @UseGuards(ClerkAuthGuard)
  async deleteNode(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponse<null>> {
    const user = (req as any).user;
    await this.marketplaceService.deleteNode(id, user.id);
    return { success: true };
  }

  @Get('my-nodes')
  @UseGuards(ClerkAuthGuard)
  async getMyNodes(
    @Req() req: Request,
  ): Promise<ApiResponse<HostNodeResponse[]>> {
    const user = (req as any).user;
    const nodes = await this.marketplaceService.getNodesByOwner(user.id);
    return { success: true, data: nodes };
  }
}
