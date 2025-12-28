'use client';

// Force dynamic rendering to avoid Clerk errors during build
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarketplaceTable } from '@/components/rent/marketplace-table';
import { TemplateStore } from '@/components/rent/template-store';
import { ActiveRentals } from '@/components/rent/active-rentals';
import { NodeStatus, RentalStatus } from '@distributed-compute/shared-types';
import type { HostNodeResponse, RentalResponse } from '@distributed-compute/shared-types';

// Mock marketplace data
const MOCK_MARKETPLACE: HostNodeResponse[] = [
    {
        id: '1',
        ownerId: 'owner-1',
        specs: {
            gpus: [{ model: 'RTX 4090', vram: 24, tflops: 82.6, count: 1 }],
            cpuModel: 'AMD Ryzen 9 7950X',
            cpuCores: 16,
            ramGb: 64,
            diskGb: 1000,
            networkSpeedMbps: 1000,
        },
        pricingConfig: { hourlyRate: 1.2, smartPricingEnabled: true },
        status: NodeStatus.ONLINE,
        locationData: { country: 'USA', city: 'San Francisco' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: '2',
        ownerId: 'owner-2',
        specs: {
            gpus: [{ model: 'A100', vram: 80, tflops: 312, count: 1 }],
            cpuModel: 'AMD EPYC 7763',
            cpuCores: 64,
            ramGb: 256,
            diskGb: 2000,
            networkSpeedMbps: 10000,
        },
        pricingConfig: { hourlyRate: 2.5, smartPricingEnabled: false },
        status: NodeStatus.ONLINE,
        locationData: { country: 'Germany', city: 'Frankfurt' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: '3',
        ownerId: 'owner-3',
        specs: {
            gpus: [{ model: 'RTX 3090', vram: 24, tflops: 35.6, count: 2 }],
            cpuModel: 'Intel Core i9-12900K',
            cpuCores: 16,
            ramGb: 128,
            diskGb: 2000,
            networkSpeedMbps: 500,
        },
        pricingConfig: { hourlyRate: 0.75, smartPricingEnabled: true },
        status: NodeStatus.ONLINE,
        locationData: { country: 'Japan', city: 'Tokyo' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

const MOCK_RENTALS: RentalResponse[] = [
    {
        id: 'rental-1',
        renterId: 'user-1',
        nodeId: '2',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        costPerHour: 2.5,
        status: RentalStatus.ACTIVE,
        connectionInfo: {
            sshHost: 'proxy.distributedcompute.io',
            sshPort: 10022,
            sshUser: 'user',
            jupyterUrl: 'https://proxy.distributedcompute.io:10888',
            additionalPorts: {},
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

export default function RentDashboardPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">GPU Marketplace</h1>
                    <p className="text-muted-foreground">
                        Find and rent GPU compute power from providers worldwide
                    </p>
                </div>
            </div>

            {/* Active Rentals */}
            {MOCK_RENTALS.length > 0 && <ActiveRentals rentals={MOCK_RENTALS} />}

            {/* Template Store */}
            <TemplateStore />

            {/* Marketplace Search */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by GPU model, location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button
                        variant={showFilters ? 'secondary' : 'outline'}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        Filters
                    </Button>
                </div>

                {/* Filters Panel (simplified) */}
                {showFilters && (
                    <div className="p-4 rounded-lg border border-border bg-card">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Min VRAM</label>
                                <Input type="number" placeholder="8 GB" />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Max Price</label>
                                <Input type="number" placeholder="$2.00/hr" />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Min RAM</label>
                                <Input type="number" placeholder="32 GB" />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Location</label>
                                <Input placeholder="Any" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Marketplace Table */}
                <MarketplaceTable nodes={MOCK_MARKETPLACE} />
            </div>
        </div>
    );
}
