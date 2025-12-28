'use client';

// Force dynamic rendering to avoid Clerk errors during build
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NodeList } from '@/components/host/node-list';
import { AnalyticsCharts } from '@/components/host/analytics-charts';
import { Skeleton } from '@/components/ui/skeleton';
import { NodeStatus } from '@distributed-compute/shared-types';
import type { HostNodeResponse } from '@distributed-compute/shared-types';

// Mock data for now - will be replaced with real API calls
const MOCK_NODES: HostNodeResponse[] = [
    {
        id: '1',
        ownerId: 'user-1',
        specs: {
            gpus: [{ model: 'RTX 4090', vram: 24, tflops: 82.6, count: 2 }],
            cpuModel: 'AMD Ryzen 9 7950X',
            cpuCores: 16,
            ramGb: 128,
            diskGb: 2000,
            networkSpeedMbps: 1000,
        },
        pricingConfig: {
            hourlyRate: 1.2,
            smartPricingEnabled: true,
        },
        status: NodeStatus.ONLINE,
        locationData: { country: 'USA', city: 'San Francisco' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: '2',
        ownerId: 'user-1',
        specs: {
            gpus: [{ model: 'RTX 3080', vram: 10, tflops: 29.8, count: 1 }],
            cpuModel: 'Intel Core i9-13900K',
            cpuCores: 24,
            ramGb: 64,
            diskGb: 1000,
            networkSpeedMbps: 500,
        },
        pricingConfig: {
            hourlyRate: 0.55,
            smartPricingEnabled: false,
        },
        status: NodeStatus.BUSY,
        locationData: { country: 'USA', city: 'New York' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

export default function HostDashboardPage() {
    const [nodes] = useState(MOCK_NODES);
    const [isLoading] = useState(false);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Host Dashboard</h1>
                    <p className="text-muted-foreground">
                        Manage your nodes and track earnings
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline">
                        <Settings2 className="h-4 w-4 mr-2" />
                        Settings
                    </Button>
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Node
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Nodes"
                    value={nodes.length.toString()}
                    change="+1 this month"
                    positive
                />
                <StatCard
                    title="Online"
                    value={nodes.filter((n) => n.status === 'ONLINE').length.toString()}
                    change={`${Math.round((nodes.filter((n) => n.status === 'ONLINE').length / nodes.length) * 100)}% uptime`}
                    positive
                />
                <StatCard
                    title="Earnings (30d)"
                    value="$1,245.80"
                    change="+12.5% vs last month"
                    positive
                />
                <StatCard
                    title="Active Rentals"
                    value={nodes.filter((n) => n.status === 'BUSY').length.toString()}
                    change="2 pending"
                />
            </div>

            {/* Analytics Charts */}
            <AnalyticsCharts />

            {/* Node List */}
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            ) : (
                <NodeList nodes={nodes} />
            )}
        </div>
    );
}

function StatCard({
    title,
    value,
    change,
    positive,
}: {
    title: string;
    value: string;
    change: string;
    positive?: boolean;
}) {
    return (
        <div className="p-6 rounded-xl border border-border bg-card">
            <p className="text-sm text-muted-foreground mb-2">{title}</p>
            <p className="text-3xl font-bold mb-1">{value}</p>
            <p
                className={`text-xs ${positive ? 'text-green-500' : 'text-muted-foreground'}`}
            >
                {change}
            </p>
        </div>
    );
}
