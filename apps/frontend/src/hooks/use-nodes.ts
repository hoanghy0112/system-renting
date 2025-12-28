'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyNodes, getNodeById, updateNode, setMaintenanceMode, toggleSmartPricing } from '@/lib/api/nodes';
import type { UpdateHostNodeDto } from '@distributed-compute/shared-types';

export function useMyNodes() {
  return useQuery({
    queryKey: ['nodes', 'my'],
    queryFn: getMyNodes,
    refetchInterval: 10000, // Poll every 10 seconds
  });
}

export function useNode(id: string) {
  return useQuery({
    queryKey: ['nodes', 'detail', id],
    queryFn: () => getNodeById(id),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useUpdateNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHostNodeDto }) =>
      updateNode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
    },
  });
}

export function useSetMaintenanceMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      setMaintenanceMode(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
    },
  });
}

export function useToggleSmartPricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toggleSmartPricing(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
    },
  });
}
