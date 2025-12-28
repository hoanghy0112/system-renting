'use client';

import { useState, useMemo } from 'react';
import { Calculator, Zap, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { calculateHourlyEarnings, formatCurrency } from '@/lib/utils';

const GPU_OPTIONS = [
    { value: 'RTX 4090', label: 'NVIDIA RTX 4090' },
    { value: 'RTX 4080', label: 'NVIDIA RTX 4080' },
    { value: 'RTX 4070 Ti', label: 'NVIDIA RTX 4070 Ti' },
    { value: 'RTX 3090', label: 'NVIDIA RTX 3090' },
    { value: 'RTX 3080', label: 'NVIDIA RTX 3080' },
    { value: 'A100', label: 'NVIDIA A100 (80GB)' },
    { value: 'H100', label: 'NVIDIA H100' },
];

export function ROICalculator() {
    const [selectedGpu, setSelectedGpu] = useState('RTX 4090');
    const [electricityCost, setElectricityCost] = useState([0.12]);
    const [hoursPerDay, setHoursPerDay] = useState([20]);
    const [gpuCount, setGpuCount] = useState([1]);

    const earnings = useMemo(() => {
        const hourly = calculateHourlyEarnings(selectedGpu, electricityCost[0]);
        const dailyHours = hoursPerDay[0];
        const numGpus = gpuCount[0];

        return {
            hourlyGross: hourly.gross * numGpus,
            hourlyNet: hourly.net * numGpus,
            dailyNet: hourly.net * dailyHours * numGpus,
            monthlyNet: hourly.net * dailyHours * 30 * numGpus,
            yearlyNet: hourly.net * dailyHours * 365 * numGpus,
            powerConsumption: hourly.powerConsumption * numGpus,
        };
    }, [selectedGpu, electricityCost, hoursPerDay, gpuCount]);

    return (
        <Card className="w-full max-w-2xl mx-auto glass-dark border-white/10">
            <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Calculator className="h-6 w-6 text-primary" />
                    <CardTitle className="text-2xl">ROI Calculator</CardTitle>
                </div>
                <p className="text-muted-foreground">
                    Estimate your potential earnings as a host
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* GPU Selection */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium">Select GPU Model</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {GPU_OPTIONS.map((gpu) => (
                            <button
                                key={gpu.value}
                                onClick={() => setSelectedGpu(gpu.value)}
                                className={`p-3 rounded-lg border text-sm font-medium transition-all ${selectedGpu === gpu.value
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-secondary/50 border-border hover:bg-secondary'
                                    }`}
                            >
                                {gpu.value}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sliders */}
                <div className="space-y-6">
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <Label>Electricity Cost</Label>
                            <span className="text-sm text-muted-foreground">
                                ${electricityCost[0].toFixed(2)}/kWh
                            </span>
                        </div>
                        <Slider
                            value={electricityCost}
                            onValueChange={setElectricityCost}
                            min={0.05}
                            max={0.40}
                            step={0.01}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <Label>Hours Online Per Day</Label>
                            <span className="text-sm text-muted-foreground">
                                {hoursPerDay[0]} hours
                            </span>
                        </div>
                        <Slider
                            value={hoursPerDay}
                            onValueChange={setHoursPerDay}
                            min={1}
                            max={24}
                            step={1}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <Label>Number of GPUs</Label>
                            <span className="text-sm text-muted-foreground">
                                {gpuCount[0]} GPU{gpuCount[0] > 1 ? 's' : ''}
                            </span>
                        </div>
                        <Slider
                            value={gpuCount}
                            onValueChange={setGpuCount}
                            min={1}
                            max={8}
                            step={1}
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div className="text-center p-4 rounded-lg bg-secondary/30">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <Zap className="h-4 w-4" />
                            <span className="text-xs">Hourly Rate</span>
                        </div>
                        <p className="text-xl font-bold text-green-400">
                            {formatCurrency(earnings.hourlyNet)}
                        </p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-secondary/30">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                            <DollarSign className="h-4 w-4" />
                            <span className="text-xs">Daily Earnings</span>
                        </div>
                        <p className="text-xl font-bold text-green-400">
                            {formatCurrency(earnings.dailyNet)}
                        </p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-primary/20 col-span-2">
                        <div className="flex items-center justify-center gap-1 text-primary mb-1">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-sm font-medium">Monthly Potential</span>
                        </div>
                        <p className="text-3xl font-bold gradient-text">
                            {formatCurrency(earnings.monthlyNet)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {formatCurrency(earnings.yearlyNet)} / year
                        </p>
                    </div>
                </div>

                <Button variant="gradient" size="xl" className="w-full">
                    Start Earning Today
                </Button>
            </CardContent>
        </Card>
    );
}
