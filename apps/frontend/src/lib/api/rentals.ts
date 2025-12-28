import apiClient from './client';
import type {
  ApiResponse,
  RentalResponse,
  CreateRentalDto,
} from '@distributed-compute/shared-types';

export async function getRentals(): Promise<ApiResponse<RentalResponse[]>> {
  const response = await apiClient.get<ApiResponse<RentalResponse[]>>('/api/rentals');
  return response.data;
}

export async function getRentalById(id: string): Promise<ApiResponse<RentalResponse>> {
  const response = await apiClient.get<ApiResponse<RentalResponse>>(`/api/rentals/${id}`);
  return response.data;
}

export async function createRental(data: CreateRentalDto): Promise<ApiResponse<RentalResponse>> {
  const response = await apiClient.post<ApiResponse<RentalResponse>>('/api/rentals', data);
  return response.data;
}

export async function stopRental(id: string): Promise<ApiResponse<RentalResponse>> {
  const response = await apiClient.post<ApiResponse<RentalResponse>>(`/api/rentals/${id}/stop`);
  return response.data;
}

export async function getActiveRentals(): Promise<ApiResponse<RentalResponse[]>> {
  const response = await apiClient.get<ApiResponse<RentalResponse[]>>('/api/rentals', {
    params: { status: 'ACTIVE' },
  });
  return response.data;
}
