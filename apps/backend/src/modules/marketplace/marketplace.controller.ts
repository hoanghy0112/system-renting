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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import {
  SearchNodesDto,
  CreateHostNodeDto,
  UpdateHostNodeDto,
  ApiResponse as ApiResponseType,
  HostNodeResponse,
  MarketplaceStatsResponse,
} from '@distributed-compute/shared-types';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('nodes')
  @ApiOperation({
    summary: 'Search nodes',
    description: 'Browse available compute nodes with optional filters for GPU, CPU, RAM, price, and location.',
  })
  @ApiQuery({ name: 'minGpuVram', required: false, type: Number, description: 'Minimum GPU VRAM in GB' })
  @ApiQuery({ name: 'minGpuTflops', required: false, type: Number, description: 'Minimum GPU compute power' })
  @ApiQuery({ name: 'minCpuCores', required: false, type: Number, description: 'Minimum CPU cores' })
  @ApiQuery({ name: 'minRamGb', required: false, type: Number, description: 'Minimum RAM in GB' })
  @ApiQuery({ name: 'minDiskGb', required: false, type: Number, description: 'Minimum disk space in GB' })
  @ApiQuery({ name: 'maxHourlyRate', required: false, type: Number, description: 'Maximum hourly rate in USD' })
  @ApiQuery({ name: 'gpuModel', required: false, type: String, description: 'Filter by GPU model name' })
  @ApiQuery({ name: 'country', required: false, type: String, description: 'Filter by country' })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'Filter by city' })
  @ApiQuery({ name: 'status', required: false, enum: ['ONLINE', 'OFFLINE', 'BUSY', 'MAINTENANCE'] })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['price', 'performance', 'location'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'List of nodes with pagination' })
  async searchNodes(
    @Query() query: SearchNodesDto,
  ): Promise<ApiResponseType<{ nodes: HostNodeResponse[]; total: number }>> {
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
  @ApiOperation({
    summary: 'Get node by ID',
    description: 'Get detailed information about a specific compute node.',
  })
  @ApiParam({ name: 'id', description: 'Node UUID' })
  @ApiResponse({ status: 200, description: 'Node details' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  async getNode(
    @Param('id') id: string,
  ): Promise<ApiResponseType<HostNodeResponse>> {
    const node = await this.marketplaceService.getNodeById(id);
    return { success: true, data: node };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get marketplace stats',
    description: 'Get aggregate statistics about the marketplace.',
  })
  @ApiResponse({ status: 200, description: 'Marketplace statistics' })
  async getStats(): Promise<ApiResponseType<MarketplaceStatsResponse>> {
    const stats = await this.marketplaceService.getMarketplaceStats();
    return { success: true, data: stats };
  }

  @Post('nodes')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth('clerk-jwt')
  @ApiOperation({
    summary: 'Create node',
    description: 'Register a new host node on the marketplace. Requires authentication.',
  })
  @ApiBody({
    description: 'Node registration parameters',
    schema: {
      type: 'object',
      required: ['specs', 'pricingConfig'],
      properties: {
        specs: {
          type: 'object',
          properties: {
            gpus: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  model: { type: 'string', example: 'RTX 4090' },
                  vram: { type: 'number', example: 24 },
                  tflops: { type: 'number', example: 82.6 },
                  count: { type: 'number', example: 1 },
                },
              },
            },
            cpuModel: { type: 'string', example: 'AMD Ryzen 9 7950X' },
            cpuCores: { type: 'number', example: 16 },
            ramGb: { type: 'number', example: 64 },
            diskGb: { type: 'number', example: 2000 },
            networkSpeedMbps: { type: 'number', example: 1000 },
          },
        },
        pricingConfig: {
          type: 'object',
          properties: {
            hourlyRate: { type: 'number', example: 3.0 },
            smartPricingEnabled: { type: 'boolean', example: true },
            minimumRate: { type: 'number', example: 2.0 },
            maximumRate: { type: 'number', example: 5.0 },
          },
        },
        locationData: {
          type: 'object',
          properties: {
            country: { type: 'string', example: 'USA' },
            city: { type: 'string', example: 'San Francisco' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Node created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createNode(
    @Req() req: Request,
    @Body() body: CreateHostNodeDto,
  ): Promise<ApiResponseType<HostNodeResponse>> {
    const user = (req as any).user;
    const node = await this.marketplaceService.createNode(user.id, body);
    return { success: true, data: node };
  }

  @Put('nodes/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth('clerk-jwt')
  @ApiOperation({
    summary: 'Update node',
    description: 'Update node pricing or location. Owner only.',
  })
  @ApiParam({ name: 'id', description: 'Node UUID' })
  @ApiBody({
    description: 'Fields to update',
    schema: {
      type: 'object',
      properties: {
        pricingConfig: {
          type: 'object',
          properties: {
            hourlyRate: { type: 'number' },
            smartPricingEnabled: { type: 'boolean' },
          },
        },
        locationData: {
          type: 'object',
          properties: {
            country: { type: 'string' },
            city: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Node updated successfully' })
  @ApiResponse({ status: 403, description: 'Not the owner of this node' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  async updateNode(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateHostNodeDto,
  ): Promise<ApiResponseType<HostNodeResponse>> {
    const user = (req as any).user;
    const node = await this.marketplaceService.updateNode(id, user.id, body);
    return { success: true, data: node };
  }

  @Delete('nodes/:id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth('clerk-jwt')
  @ApiOperation({
    summary: 'Delete node',
    description: 'Remove a node from the marketplace. Owner only.',
  })
  @ApiParam({ name: 'id', description: 'Node UUID' })
  @ApiResponse({ status: 200, description: 'Node deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not the owner of this node' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  async deleteNode(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<null>> {
    const user = (req as any).user;
    await this.marketplaceService.deleteNode(id, user.id);
    return { success: true };
  }

  @Get('my-nodes')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth('clerk-jwt')
  @ApiOperation({
    summary: 'List my nodes',
    description: 'Get all nodes owned by the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'List of owned nodes' })
  async getMyNodes(
    @Req() req: Request,
  ): Promise<ApiResponseType<HostNodeResponse[]>> {
    const user = (req as any).user;
    const nodes = await this.marketplaceService.getNodesByOwner(user.id);
    return { success: true, data: nodes };
  }
}

