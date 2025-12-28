import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType } from '@prisma/client';
import { TransactionResponse } from '@distributed-compute/shared-types';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createCredit(
    userId: string,
    amount: number,
    referenceId?: string,
    description?: string,
  ): Promise<TransactionResponse> {
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Create transaction record
      const txn = await tx.transaction.create({
        data: {
          userId,
          amount,
          type: TransactionType.CREDIT,
          referenceId,
          description,
        },
      });

      // Update user balance
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: { increment: amount },
        },
      });

      return txn;
    });

    this.logger.log(
      `Created credit transaction: userId=${userId}, amount=$${amount}`,
    );

    return this.toTransactionResponse(transaction);
  }

  async createDebit(
    userId: string,
    amount: number,
    referenceId?: string,
    description?: string,
  ): Promise<TransactionResponse> {
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Create transaction record
      const txn = await tx.transaction.create({
        data: {
          userId,
          amount,
          type: TransactionType.DEBIT,
          referenceId,
          description,
        },
      });

      // Update user balance
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: amount },
        },
      });

      return txn;
    });

    this.logger.log(
      `Created debit transaction: userId=${userId}, amount=$${amount}`,
    );

    return this.toTransactionResponse(transaction);
  }

  async getTransactionsByUser(userId: string): Promise<TransactionResponse[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map((t) => this.toTransactionResponse(t));
  }

  async getUserBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    return user ? Number(user.balance) : 0;
  }

  private toTransactionResponse(transaction: any): TransactionResponse {
    return {
      id: transaction.id,
      amount: Number(transaction.amount),
      type: transaction.type,
      referenceId: transaction.referenceId,
      description: transaction.description,
      createdAt: transaction.createdAt.toISOString(),
    };
  }
}
