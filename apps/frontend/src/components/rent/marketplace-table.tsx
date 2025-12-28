'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RentModal } from '@/components/rent/rent-modal';
import { formatCurrency } from '@/lib/utils';
import type { HostNodeResponse } from '@distributed-compute/shared-types';

interface MarketplaceTableProps {
    nodes: HostNodeResponse[];
}

export function MarketplaceTable({ nodes }: MarketplaceTableProps) {
    const [selectedNode, setSelectedNode] = useState<HostNodeResponse | null>(null);

    return (
        <>
            <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-secondary/50">
                                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                                    GPU
                                </th>
                                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                                    VRAM
                                </th>
                                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                                    CPU
                                </th>
                                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                                    RAM
                                </th>
                                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                                    Location
                                </th>
                                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                                    Price
                                </th>
                                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                                    Status
                                </th>
                                <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {nodes.map((node) => {
                                const gpu = node.specs.gpus[0];
                                return (
                                    <tr key={node.id} className="border-t border-border hover:bg-secondary/30">
                                        <td className="px-4 py-4">
                                            <div className="font-medium">
                                                {gpu.model} {gpu.count > 1 && `x${gpu.count}`}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {gpu.tflops} TFLOPS
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm">{gpu.vram}GB</td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm">{node.specs.cpuModel}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {node.specs.cpuCores} cores
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm">{node.specs.ramGb}GB</td>
                                        <td className="px-4 py-4 text-sm">
                                            {node.locationData?.city}, {node.locationData?.country}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-semibold text-green-500">
                                                {formatCurrency(node.pricingConfig.hourlyRate)}/hr
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Badge variant={node.status === 'ONLINE' ? 'success' : 'warning'}>
                                                {node.status === 'ONLINE' ? 'Available' : 'Busy'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <Button
                                                size="sm"
                                                disabled={node.status !== 'ONLINE'}
                                                onClick={() => setSelectedNode(node)}
                                            >
                                                Rent Now
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Rent Modal */}
            <RentModal node={selectedNode} onClose={() => setSelectedNode(null)} />
        </>
    );
}
