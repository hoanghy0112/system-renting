import apiClient from './client';
import type {
  ApiResponse,
  UserResponse,
  TransactionResponse,
  TopUpBalanceDto,
} from '@distributed-compute/shared-types';

export async function getCurrentUser(): Promise<ApiResponse<UserResponse>> {
  const response = await apiClient.get<ApiResponse<UserResponse>>('/api/users/me');
  return response.data;
}

export async function getBalance(): Promise<ApiResponse<{ balance: number }>> {
  const response = await apiClient.get<ApiResponse<{ balance: number }>>('/api/billing/balance');
  return response.data;
}

export async function getTransactions(): Promise<ApiResponse<TransactionResponse[]>> {
  const response = await apiClient.get<ApiResponse<TransactionResponse[]>>(
    '/api/billing/transactions'
  );
  return response.data;
}

export async function topUpBalance(
  data: TopUpBalanceDto
): Promise<ApiResponse<{ balance: number }>> {
  const response = await apiClient.post<ApiResponse<{ balance: number }>>(
    '/api/billing/top-up',
    data
  );
  return response.data;
}
