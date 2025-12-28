import Link from 'next/link';
import { ArrowRight, Cpu, Zap, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroSection() {
    return (
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 py-20">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                        <Zap className="h-4 w-4" />
                        <span>GPU Compute on Demand</span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                        <span className="gradient-text">Unlimited GPU Power</span>
                        <br />
                        <span className="text-foreground">at Your Fingertips</span>
                    </h1>

                    {/* Subheading */}
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Access a global network of high-performance GPUs for AI training,
                        rendering, and compute workloads. Or monetize your idle hardware
                        by becoming a host.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Link href="/dashboard/rent">
                            <Button variant="gradient" size="xl" className="group">
                                Start Renting
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        <Link href="/dashboard/host">
                            <Button variant="outline" size="xl">
                                Become a Host
                            </Button>
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-12 max-w-3xl mx-auto">
                        <StatItem icon={Cpu} value="500+" label="Active GPUs" />
                        <StatItem icon={Globe} value="30+" label="Countries" />
                        <StatItem icon={Zap} value="99.9%" label="Uptime" />
                        <StatItem icon={Shield} value="256-bit" label="Encryption" />
                    </div>
                </div>
            </div>
        </section>
    );
}

function StatItem({
    icon: Icon,
    value,
    label,
}: {
    icon: React.ElementType;
    value: string;
    label: string;
}) {
    return (
        <div className="text-center">
            <div className="flex items-center justify-center mb-2">
                <Icon className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
        </div>
    );
}
