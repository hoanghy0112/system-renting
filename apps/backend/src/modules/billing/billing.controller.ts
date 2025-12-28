import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
  ApiBody,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { SmartPricingService } from './smart-pricing.service';
import { TransactionsService } from './transactions.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import {
  CreateRentalDto,
  ApiResponse as ApiResponseType,
  RentalResponse,
  TransactionResponse,
  PriceSuggestionResponse,
  NodeSpecs,
} from '@distributed-compute/shared-types';

@ApiTags('Billing')
@ApiBearerAuth('clerk-jwt')
@Controller('billing')
@UseGuards(ClerkAuthGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly smartPricingService: SmartPricingService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Post('rentals')
  @ApiOperation({
    summary: 'Create a new rental',
    description: 'Start a new compute rental on a specified node. Validates balance and node availability.',
  })
  @ApiBody({
    description: 'Rental creation parameters',
    schema: {
      type: 'object',
      required: ['nodeId', 'image', 'resourceLimits'],
      properties: {
        nodeId: { type: 'string', format: 'uuid', description: 'Target node UUID' },
        image: { type: 'string', example: 'pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime' },
        resourceLimits: {
          type: 'object',
          properties: {
            gpuIndices: { type: 'array', items: { type: 'string' }, example: ['0'] },
            cpuCores: { type: 'number', example: 4 },
            ramLimit: { type: 'string', example: '16g' },
          },
        },
        envVars: { type: 'object', additionalProperties: { type: 'string' } },
        estimatedDurationHours: { type: 'number', example: 8 },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Rental created successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient balance or node unavailable' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  async createRental(
    @Req() req: Request,
    @Body() body: CreateRentalDto,
  ): Promise<ApiResponseType<RentalResponse>> {
    const user = (req as any).user;
    const rental = await this.billingService.createRental(user.id, body);
    return { success: true, data: rental };
  }

  @Post('rentals/:id/stop')
  @ApiOperation({
    summary: 'Stop an active rental',
    description: 'Stop a running rental and calculate final cost. Deducts from renter, credits host.',
  })
  @ApiParam({ name: 'id', description: 'Rental UUID' })
  @ApiResponse({ status: 200, description: 'Rental stopped successfully' })
  @ApiResponse({ status: 400, description: 'Rental is not active' })
  @ApiResponse({ status: 404, description: 'Rental not found' })
  async stopRental(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<RentalResponse>> {
    const user = (req as any).user;
    const rental = await this.billingService.stopRental(id, user.id);
    return { success: true, data: rental };
  }

  @Get('rentals')
  @ApiOperation({
    summary: 'List my rentals',
    description: 'Get all rentals for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'List of user rentals' })
  async getMyRentals(
    @Req() req: Request,
  ): Promise<ApiResponseType<RentalResponse[]>> {
    const user = (req as any).user;
    const rentals = await this.billingService.getRentalsByUser(user.id);
    return { success: true, data: rentals };
  }

  @Get('rentals/:id')
  @ApiOperation({
    summary: 'Get rental by ID',
    description: 'Get details of a specific rental.',
  })
  @ApiParam({ name: 'id', description: 'Rental UUID' })
  @ApiResponse({ status: 200, description: 'Rental details' })
  @ApiResponse({ status: 404, description: 'Rental not found' })
  async getRental(
    @Param('id') id: string,
  ): Promise<ApiResponseType<RentalResponse>> {
    const rental = await this.billingService.getRentalById(id);
    return { success: true, data: rental };
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'List my transactions',
    description: 'Get all financial transactions for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'List of user transactions' })
  async getMyTransactions(
    @Req() req: Request,
  ): Promise<ApiResponseType<TransactionResponse[]>> {
    const user = (req as any).user;
    const transactions = await this.transactionsService.getTransactionsByUser(
      user.id,
    );
    return { success: true, data: transactions };
  }

  @Get('balance')
  @ApiOperation({
    summary: 'Get my balance',
    description: 'Get current account balance for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Current balance' })
  async getMyBalance(@Req() req: Request): Promise<ApiResponseType<{ balance: number }>> {
    const user = (req as any).user;
    const balance = await this.transactionsService.getUserBalance(user.id);
    return { success: true, data: { balance } };
  }

  @Post('price-suggestion')
  @ApiOperation({
    summary: 'Get price suggestion',
    description: 'Get AI-powered pricing recommendation based on node specs.',
  })
  @ApiBody({
    description: 'Node specifications for pricing analysis',
    schema: {
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
  })
  @ApiResponse({ status: 200, description: 'Pricing suggestion' })
  async getPriceSuggestion(
    @Body() specs: NodeSpecs,
  ): Promise<ApiResponseType<PriceSuggestionResponse>> {
    const suggestion = await this.smartPricingService.getSuggestedPrice(specs);
    return { success: true, data: suggestion };
  }
}

