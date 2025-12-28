'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts';

// Mock chart data
const utilizationData = [
    { time: '00:00', gpu: 65, cpu: 45 },
    { time: '04:00', gpu: 80, cpu: 55 },
    { time: '08:00', gpu: 90, cpu: 70 },
    { time: '12:00', gpu: 75, cpu: 60 },
    { time: '16:00', gpu: 95, cpu: 85 },
    { time: '20:00', gpu: 85, cpu: 65 },
    { time: '24:00', gpu: 70, cpu: 50 },
];

const revenueData = [
    { day: 'Mon', revenue: 45 },
    { day: 'Tue', revenue: 52 },
    { day: 'Wed', revenue: 48 },
    { day: 'Thu', revenue: 61 },
    { day: 'Fri', revenue: 55 },
    { day: 'Sat', revenue: 67 },
    { day: 'Sun', revenue: 72 },
];

export function AnalyticsCharts() {
    return (
        <div className="grid lg:grid-cols-2 gap-6">
            {/* GPU/CPU Utilization Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Resource Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={utilizationData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="time"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickFormatter={(value) => `${value}%`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px',
                                    }}
                                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="gpu"
                                    stroke="hsl(var(--chart-1))"
                                    strokeWidth={2}
                                    dot={false}
                                    name="GPU"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="cpu"
                                    stroke="hsl(var(--chart-2))"
                                    strokeWidth={2}
                                    dot={false}
                                    name="CPU"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-1))]" />
                            <span className="text-sm text-muted-foreground">GPU</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[hsl(var(--chart-2))]" />
                            <span className="text-sm text-muted-foreground">CPU</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Revenue Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Weekly Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="day"
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke="hsl(var(--muted-foreground))"
                                    fontSize={12}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px',
                                    }}
                                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                                    formatter={(value: number) => [`$${value}`, 'Revenue']}
                                />
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="hsl(var(--chart-2))"
                                    strokeWidth={2}
                                    fill="url(#revenueGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
