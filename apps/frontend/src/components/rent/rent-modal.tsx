'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import type { HostNodeResponse } from '@distributed-compute/shared-types';

interface RentModalProps {
    node: HostNodeResponse | null;
    onClose: () => void;
}

const TEMPLATES = [
    { id: 'pytorch', name: 'PyTorch 2.0', image: 'pytorch/pytorch:2.0.1-cuda11.7-cudnn8-runtime' },
    { id: 'tensorflow', name: 'TensorFlow 2.15', image: 'tensorflow/tensorflow:2.15.0-gpu' },
    { id: 'jupyter', name: 'Jupyter Lab', image: 'jupyter/tensorflow-notebook:latest' },
    { id: 'sd', name: 'Stable Diffusion', image: 'sd/automatic1111:latest' },
    { id: 'custom', name: 'Custom Image', image: '' },
];

export function RentModal({ node, onClose }: RentModalProps) {
    const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
    const [customImage, setCustomImage] = useState('');
    const [estimatedHours, setEstimatedHours] = useState(4);

    if (!node) return null;

    const gpu = node.specs.gpus[0];
    const selectedImage =
        selectedTemplate === 'custom'
            ? customImage
            : TEMPLATES.find((t) => t.id === selectedTemplate)?.image || '';
    const estimatedCost = node.pricingConfig.hourlyRate * estimatedHours;

    const handleRent = () => {
        // This would call the API in production
        console.log('Renting node:', {
            nodeId: node.id,
            image: selectedImage,
            estimatedHours,
        });
        onClose();
    };

    return (
        <Dialog open={!!node} onOpenChange={() => onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Rent GPU Instance</DialogTitle>
                    <DialogDescription>
                        Configure your rental for {gpu.model} {gpu.count > 1 && `x${gpu.count}`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Node Summary */}
                    <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">GPU</span>
                            <span className="font-medium">{gpu.model} ({gpu.vram}GB VRAM)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">CPU</span>
                            <span className="font-medium">{node.specs.cpuCores} cores</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">RAM</span>
                            <span className="font-medium">{node.specs.ramGb}GB</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Location</span>
                            <span className="font-medium">{node.locationData?.city}, {node.locationData?.country}</span>
                        </div>
                    </div>

                    {/* Template Selection */}
                    <div className="space-y-3">
                        <Label>Select Template</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {TEMPLATES.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template.id)}
                                    className={`p-3 rounded-lg border text-sm font-medium transition-all text-left ${selectedTemplate === template.id
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-secondary/50 border-border hover:bg-secondary'
                                        }`}
                                >
                                    {template.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Image Input */}
                    {selectedTemplate === 'custom' && (
                        <div className="space-y-2">
                            <Label htmlFor="custom-image">Docker Image</Label>
                            <Input
                                id="custom-image"
                                placeholder="e.g., nvidia/cuda:12.0-base"
                                value={customImage}
                                onChange={(e) => setCustomImage(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Estimated Duration */}
                    <div className="space-y-2">
                        <Label htmlFor="duration">Estimated Duration (hours)</Label>
                        <Input
                            id="duration"
                            type="number"
                            min={1}
                            max={720}
                            value={estimatedHours}
                            onChange={(e) => setEstimatedHours(parseInt(e.target.value) || 1)}
                        />
                    </div>

                    {/* Cost Summary */}
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatCurrency(node.pricingConfig.hourlyRate)}/hr × {estimatedHours}h
                                </p>
                            </div>
                            <p className="text-2xl font-bold text-primary">
                                {formatCurrency(estimatedCost)}
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleRent} disabled={selectedTemplate === 'custom' && !customImage}>
                        Start Rental
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
