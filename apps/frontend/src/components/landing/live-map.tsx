'use client';

import { useEffect, useState } from 'react';

// Mock data for the live map
const MOCK_NODES = [
    { id: '1', lat: 37.7749, lng: -122.4194, gpu: 'RTX 4090', status: 'online' },
    { id: '2', lat: 51.5074, lng: -0.1278, gpu: 'A100', status: 'busy' },
    { id: '3', lat: 35.6762, lng: 139.6503, gpu: 'RTX 3090', status: 'online' },
    { id: '4', lat: 48.8566, lng: 2.3522, gpu: 'RTX 4080', status: 'online' },
    { id: '5', lat: -33.8688, lng: 151.2093, gpu: 'H100', status: 'busy' },
    { id: '6', lat: 52.52, lng: 13.405, gpu: 'RTX 4090', status: 'online' },
    { id: '7', lat: 40.7128, lng: -74.006, gpu: 'A100', status: 'busy' },
    { id: '8', lat: 1.3521, lng: 103.8198, gpu: 'RTX 3080', status: 'online' },
];

export function LiveMap() {
    const [activeNodes, setActiveNodes] = useState(MOCK_NODES);

    // Simulate live updates
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveNodes((nodes) =>
                nodes.map((node) => ({
                    ...node,
                    status: Math.random() > 0.3 ? 'online' : 'busy',
                }))
            );
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return (
        <section className="py-24 px-4">
            <div className="container mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        <span className="gradient-text">Global GPU Network</span>
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        Live view of active compute nodes worldwide
                    </p>
                </div>

                {/* Map Visualization */}
                <div className="relative max-w-4xl mx-auto aspect-[2/1] bg-secondary/20 rounded-2xl border border-border overflow-hidden">
                    {/* World Map Background (SVG placeholder) */}
                    <div className="absolute inset-0 opacity-30">
                        <svg viewBox="0 0 800 400" className="w-full h-full">
                            <path
                                d="M100,200 Q200,100 300,200 T500,200 T700,200"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="0.5"
                                className="text-muted-foreground"
                            />
                            <path
                                d="M50,250 Q150,150 250,250 T450,250 T650,250"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="0.5"
                                className="text-muted-foreground"
                            />
                        </svg>
                    </div>

                    {/* Node Dots */}
                    {activeNodes.map((node) => {
                        // Convert lat/lng to percentage position
                        const x = ((node.lng + 180) / 360) * 100;
                        const y = ((90 - node.lat) / 180) * 100;

                        return (
                            <div
                                key={node.id}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                                style={{ left: `${x}%`, top: `${y}%` }}
                            >
                                {/* Pulse Ring */}
                                <div
                                    className={`absolute inset-0 rounded-full animate-ping ${node.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                                        } opacity-30`}
                                    style={{ width: '24px', height: '24px', marginLeft: '-8px', marginTop: '-8px' }}
                                />
                                {/* Node Dot */}
                                <div
                                    className={`relative w-3 h-3 rounded-full ${node.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                                        } shadow-lg`}
                                />
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                                        <p className="font-semibold">{node.gpu}</p>
                                        <p className={node.status === 'online' ? 'text-green-400' : 'text-yellow-400'}>
                                            {node.status === 'online' ? 'Available' : 'In Use'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Stats Overlay */}
                    <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg px-4 py-3 border border-border">
                        <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span>{activeNodes.filter((n) => n.status === 'online').length} Available</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                <span>{activeNodes.filter((n) => n.status === 'busy').length} In Use</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
