'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRentals, getRentalById, createRental, stopRental, getActiveRentals } from '@/lib/api/rentals';
import type { CreateRentalDto } from '@distributed-compute/shared-types';

export function useRentals() {
  return useQuery({
    queryKey: ['rentals', 'list'],
    queryFn: getRentals,
    refetchInterval: 10000,
  });
}

export function useActiveRentals() {
  return useQuery({
    queryKey: ['rentals', 'active'],
    queryFn: getActiveRentals,
    refetchInterval: 5000, // Poll more frequently for active rentals
  });
}

export function useRental(id: string) {
  return useQuery({
    queryKey: ['rentals', 'detail', id],
    queryFn: () => getRentalById(id),
    enabled: !!id,
    refetchInterval: 5000,
  });
}

export function useCreateRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRentalDto) => createRental(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
    },
  });
}

export function useStopRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => stopRental(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
    },
  });
}
