import { Card, CardContent } from '@/components/ui/card';
import {
    Cpu,
    Server,
    DollarSign,
    Clock,
    Shield,
    Zap,
    Globe,
    Wallet,
} from 'lucide-react';

export function FeatureGrid() {
    return (
        <section className="py-24 px-4">
            <div className="container mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Built for{' '}
                        <span className="gradient-text">Everyone</span>
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Whether you need GPU power or want to monetize your hardware, we've got you covered
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Renters Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-blue-500/20">
                                <Cpu className="h-6 w-6 text-blue-400" />
                            </div>
                            <h3 className="text-2xl font-semibold">For Renters</h3>
                        </div>
                        <FeatureCard
                            icon={Zap}
                            title="Instant Access"
                            description="Spin up GPU instances in seconds. No setup, no waiting."
                            color="blue"
                        />
                        <FeatureCard
                            icon={DollarSign}
                            title="Pay as You Go"
                            description="Only pay for what you use. Transparent hourly pricing."
                            color="blue"
                        />
                        <FeatureCard
                            icon={Globe}
                            title="Global Network"
                            description="Choose from GPUs worldwide for lowest latency to your data."
                            color="blue"
                        />
                        <FeatureCard
                            icon={Shield}
                            title="Enterprise Security"
                            description="End-to-end encryption. Your data never touches our servers."
                            color="blue"
                        />
                    </div>

                    {/* Hosts Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-purple-500/20">
                                <Server className="h-6 w-6 text-purple-400" />
                            </div>
                            <h3 className="text-2xl font-semibold">For Hosts</h3>
                        </div>
                        <FeatureCard
                            icon={Wallet}
                            title="Passive Income"
                            description="Earn money from your idle GPU. Set your own rates."
                            color="purple"
                        />
                        <FeatureCard
                            icon={Clock}
                            title="Flexible Schedule"
                            description="Choose when to rent out. One-click maintenance mode."
                            color="purple"
                        />
                        <FeatureCard
                            icon={Zap}
                            title="Smart Pricing"
                            description="Auto-adjust prices based on demand to maximize earnings."
                            color="purple"
                        />
                        <FeatureCard
                            icon={Shield}
                            title="Protected Hardware"
                            description="Containers isolate renters. Your system stays secure."
                            color="purple"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

function FeatureCard({
    icon: Icon,
    title,
    description,
    color,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    color: 'blue' | 'purple';
}) {
    const colorClasses = {
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };

    return (
        <Card className={`${colorClasses[color]} border hover:scale-[1.02] transition-transform`}>
            <CardContent className="flex items-start gap-4 p-6">
                <div className={`p-2 rounded-lg ${color === 'blue' ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
                    <Icon className={`h-5 w-5 ${color === 'blue' ? 'text-blue-400' : 'text-purple-400'}`} />
                </div>
                <div>
                    <h4 className="font-semibold mb-1">{title}</h4>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}
