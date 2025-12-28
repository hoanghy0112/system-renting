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
import { BillingService } from './billing.service';
import { SmartPricingService } from './smart-pricing.service';
import { TransactionsService } from './transactions.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import {
  CreateRentalDto,
  ApiResponse,
  RentalResponse,
  TransactionResponse,
  PriceSuggestionResponse,
  NodeSpecs,
} from '@distributed-compute/shared-types';

@Controller('billing')
@UseGuards(ClerkAuthGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly smartPricingService: SmartPricingService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Post('rentals')
  async createRental(
    @Req() req: Request,
    @Body() body: CreateRentalDto,
  ): Promise<ApiResponse<RentalResponse>> {
    const user = (req as any).user;
    const rental = await this.billingService.createRental(user.id, body);
    return { success: true, data: rental };
  }

  @Post('rentals/:id/stop')
  async stopRental(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponse<RentalResponse>> {
    const user = (req as any).user;
    const rental = await this.billingService.stopRental(id, user.id);
    return { success: true, data: rental };
  }

  @Get('rentals')
  async getMyRentals(
    @Req() req: Request,
  ): Promise<ApiResponse<RentalResponse[]>> {
    const user = (req as any).user;
    const rentals = await this.billingService.getRentalsByUser(user.id);
    return { success: true, data: rentals };
  }

  @Get('rentals/:id')
  async getRental(
    @Param('id') id: string,
  ): Promise<ApiResponse<RentalResponse>> {
    const rental = await this.billingService.getRentalById(id);
    return { success: true, data: rental };
  }

  @Get('transactions')
  async getMyTransactions(
    @Req() req: Request,
  ): Promise<ApiResponse<TransactionResponse[]>> {
    const user = (req as any).user;
    const transactions = await this.transactionsService.getTransactionsByUser(
      user.id,
    );
    return { success: true, data: transactions };
  }

  @Get('balance')
  async getMyBalance(@Req() req: Request): Promise<ApiResponse<{ balance: number }>> {
    const user = (req as any).user;
    const balance = await this.transactionsService.getUserBalance(user.id);
    return { success: true, data: { balance } };
  }

  @Post('price-suggestion')
  async getPriceSuggestion(
    @Body() specs: NodeSpecs,
  ): Promise<ApiResponse<PriceSuggestionResponse>> {
    const suggestion = await this.smartPricingService.getSuggestedPrice(specs);
    return { success: true, data: suggestion };
  }
}
