import apiClient from './client';
import type {
  ApiResponse,
  HostNodeResponse,
  SearchNodesDto,
  UpdateHostNodeDto,
} from '@distributed-compute/shared-types';

export async function getNodes(): Promise<ApiResponse<HostNodeResponse[]>> {
  const response = await apiClient.get<ApiResponse<HostNodeResponse[]>>('/api/nodes');
  return response.data;
}

export async function getMyNodes(): Promise<ApiResponse<HostNodeResponse[]>> {
  const response = await apiClient.get<ApiResponse<HostNodeResponse[]>>('/api/nodes/my');
  return response.data;
}

export async function getNodeById(id: string): Promise<ApiResponse<HostNodeResponse>> {
  const response = await apiClient.get<ApiResponse<HostNodeResponse>>(`/api/nodes/${id}`);
  return response.data;
}

export async function searchNodes(
  params: SearchNodesDto
): Promise<ApiResponse<HostNodeResponse[]>> {
  const response = await apiClient.get<ApiResponse<HostNodeResponse[]>>('/api/marketplace/search', {
    params,
  });
  return response.data;
}

export async function updateNode(
  id: string,
  data: UpdateHostNodeDto
): Promise<ApiResponse<HostNodeResponse>> {
  const response = await apiClient.patch<ApiResponse<HostNodeResponse>>(`/api/nodes/${id}`, data);
  return response.data;
}

export async function setMaintenanceMode(
  id: string,
  enabled: boolean
): Promise<ApiResponse<HostNodeResponse>> {
  const response = await apiClient.post<ApiResponse<HostNodeResponse>>(
    `/api/nodes/${id}/maintenance`,
    { enabled }
  );
  return response.data;
}

export async function toggleSmartPricing(
  id: string,
  enabled: boolean
): Promise<ApiResponse<HostNodeResponse>> {
  const response = await apiClient.patch<ApiResponse<HostNodeResponse>>(`/api/nodes/${id}`, {
    pricingConfig: { smartPricingEnabled: enabled },
  });
  return response.data;
}
