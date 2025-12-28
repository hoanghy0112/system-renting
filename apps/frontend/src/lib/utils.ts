import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function calculateHourlyEarnings(
  gpuModel: string,
  electricityCostPerKwh: number
): { gross: number; net: number; powerConsumption: number } {
  // GPU power consumption estimates (watts)
  const gpuPowerMap: Record<string, { power: number; rate: number }> = {
    'RTX 4090': { power: 450, rate: 1.2 },
    'RTX 4080': { power: 320, rate: 0.85 },
    'RTX 4070 Ti': { power: 285, rate: 0.65 },
    'RTX 3090': { power: 350, rate: 0.75 },
    'RTX 3080': { power: 320, rate: 0.55 },
    'A100': { power: 400, rate: 2.5 },
    'H100': { power: 700, rate: 4.0 },
  };

  const gpu = gpuPowerMap[gpuModel] || { power: 300, rate: 0.5 };
  const powerConsumptionKw = gpu.power / 1000;
  const electricityCostPerHour = powerConsumptionKw * electricityCostPerKwh;
  const grossEarnings = gpu.rate;
  const netEarnings = grossEarnings - electricityCostPerHour;

  return {
    gross: grossEarnings,
    net: Math.max(0, netEarnings),
    powerConsumption: gpu.power,
  };
}

export function getNodeStatusColor(status: string): string {
  switch (status) {
    case 'ONLINE':
      return 'bg-green-500';
    case 'BUSY':
      return 'bg-yellow-500';
    case 'MAINTENANCE':
      return 'bg-orange-500';
    case 'OFFLINE':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

export function getRentalStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'text-green-500';
    case 'PENDING':
      return 'text-yellow-500';
    case 'COMPLETED':
      return 'text-blue-500';
    case 'CANCELLED':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}
