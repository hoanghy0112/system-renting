'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchNodes } from '@/lib/api/nodes';
import type { SearchNodesDto } from '@distributed-compute/shared-types';

export function useMarketplace(filters: SearchNodesDto) {
  return useQuery({
    queryKey: ['marketplace', 'search', filters],
    queryFn: () => searchNodes(filters),
    refetchInterval: 30000, // Refresh marketplace every 30 seconds
  });
}
