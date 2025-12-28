'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Cpu, HardDrive, MemoryStick, Wifi, Settings, Wrench } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { HostNodeResponse } from '@distributed-compute/shared-types';

interface NodeListProps {
    nodes: HostNodeResponse[];
}

export function NodeList({ nodes }: NodeListProps) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Your Nodes</h2>
            <div className="grid gap-4">
                {nodes.map((node) => (
                    <NodeCard key={node.id} node={node} />
                ))}
            </div>
        </div>
    );
}

function NodeCard({ node }: { node: HostNodeResponse }) {
    const statusVariant = {
        ONLINE: 'success',
        BUSY: 'warning',
        MAINTENANCE: 'info',
        OFFLINE: 'destructive',
    }[node.status] as 'success' | 'warning' | 'info' | 'destructive';

    const gpuInfo = node.specs.gpus[0];

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Cpu className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">
                                {gpuInfo.model} x{gpuInfo.count}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {node.locationData?.city}, {node.locationData?.country}
                            </p>
                        </div>
                    </div>
                    <Badge variant={statusVariant}>{node.status}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                {/* Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <SpecItem
                        icon={Cpu}
                        label="GPU VRAM"
                        value={`${gpuInfo.vram}GB`}
                    />
                    <SpecItem
                        icon={MemoryStick}
                        label="RAM"
                        value={`${node.specs.ramGb}GB`}
                    />
                    <SpecItem
                        icon={HardDrive}
                        label="Storage"
                        value={`${node.specs.diskGb}GB`}
                    />
                    <SpecItem
                        icon={Wifi}
                        label="Network"
                        value={`${node.specs.networkSpeedMbps}Mbps`}
                    />
                </div>

                {/* Pricing & Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-6">
                        <div>
                            <p className="text-sm text-muted-foreground">Hourly Rate</p>
                            <p className="text-lg font-semibold text-green-500">
                                {formatCurrency(node.pricingConfig.hourlyRate)}/hr
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                checked={node.pricingConfig.smartPricingEnabled}
                                id={`smart-pricing-${node.id}`}
                            />
                            <label
                                htmlFor={`smart-pricing-${node.id}`}
                                className="text-sm font-medium cursor-pointer"
                            >
                                Smart Pricing
                            </label>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <Wrench className="h-4 w-4 mr-2" />
                            Maintenance
                        </Button>
                        <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function SpecItem({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium">{value}</p>
            </div>
        </div>
    );
}
