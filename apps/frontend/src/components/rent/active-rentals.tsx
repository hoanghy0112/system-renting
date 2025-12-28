'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Terminal, ExternalLink, Copy, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { RentalResponse } from '@distributed-compute/shared-types';

interface ActiveRentalsProps {
    rentals: RentalResponse[];
}

export function ActiveRentals({ rentals }: ActiveRentalsProps) {
    if (rentals.length === 0) return null;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Active Rentals</h2>
            <div className="grid gap-4">
                {rentals.map((rental) => (
                    <RentalCard key={rental.id} rental={rental} />
                ))}
            </div>
        </div>
    );
}

function RentalCard({ rental }: { rental: RentalResponse }) {
    const [copiedSSH, setCopiedSSH] = useState(false);

    const startTime = new Date(rental.startTime);
    const elapsedHours = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60 * 60));
    const elapsedMinutes = Math.floor(
        ((Date.now() - startTime.getTime()) % (1000 * 60 * 60)) / (1000 * 60)
    );
    const currentCost = rental.costPerHour * (elapsedHours + elapsedMinutes / 60);

    const sshCommand = rental.connectionInfo
        ? `ssh ${rental.connectionInfo.sshUser}@${rental.connectionInfo.sshHost} -p ${rental.connectionInfo.sshPort}`
        : '';

    const handleCopySSH = () => {
        navigator.clipboard.writeText(sshCommand);
        setCopiedSSH(true);
        setTimeout(() => setCopiedSSH(false), 2000);
    };

    return (
        <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">Rental #{rental.id.slice(-6)}</CardTitle>
                        <Badge variant="success">Active</Badge>
                    </div>
                    <Button variant="destructive" size="sm">
                        Stop Rental
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Elapsed Time</p>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                                {elapsedHours}h {elapsedMinutes}m
                            </span>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Rate</p>
                        <span className="font-medium text-green-500">
                            {formatCurrency(rental.costPerHour)}/hr
                        </span>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Current Cost</p>
                        <span className="font-medium">{formatCurrency(currentCost)}</span>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Started</p>
                        <span className="font-medium">
                            {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>

                {/* Connection Info */}
                {rental.connectionInfo && (
                    <div className="pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground mb-2">Connection</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-secondary/50 font-mono text-sm">
                                <Terminal className="h-4 w-4 text-muted-foreground shrink-0" />
                                <code className="truncate">{sshCommand}</code>
                                <Button variant="ghost" size="icon" className="shrink-0" onClick={handleCopySSH}>
                                    {copiedSSH ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            {rental.connectionInfo.jupyterUrl && (
                                <Button variant="outline" asChild>
                                    <a href={rental.connectionInfo.jupyterUrl} target="_blank" rel="noreferrer">
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Open Jupyter
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
