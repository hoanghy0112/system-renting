import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, Cpu, Terminal, FlaskConical, Gamepad2 } from 'lucide-react';

const TEMPLATES = [
    {
        id: 'pytorch',
        name: 'PyTorch 2.0',
        description: 'CUDA 11.8 + cuDNN 8 runtime',
        icon: Flame,
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
    },
    {
        id: 'tensorflow',
        name: 'TensorFlow',
        description: 'GPU-enabled TensorFlow 2.15',
        icon: Cpu,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
    },
    {
        id: 'jupyter',
        name: 'Jupyter Lab',
        description: 'Interactive notebook environment',
        icon: Terminal,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
    },
    {
        id: 'stable-diffusion',
        name: 'Stable Diffusion',
        description: 'A1111 WebUI pre-installed',
        icon: FlaskConical,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
    },
    {
        id: 'minecraft',
        name: 'Game Server',
        description: 'Minecraft, Valheim, and more',
        icon: Gamepad2,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
    },
];

export function TemplateStore() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Quick Start Templates</h2>
                <Button variant="ghost" size="sm">
                    View All
                </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {TEMPLATES.map((template) => (
                    <Card
                        key={template.id}
                        className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all"
                    >
                        <CardContent className="p-4 text-center">
                            <div
                                className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${template.bgColor} mb-3`}
                            >
                                <template.icon className={`h-6 w-6 ${template.color}`} />
                            </div>
                            <h3 className="font-medium text-sm mb-1">{template.name}</h3>
                            <p className="text-xs text-muted-foreground">{template.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
