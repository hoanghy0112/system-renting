import Link from 'next/link';
import { Shield, Lock, Eye, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SecuritySection() {
    return (
        <section className="py-24 px-4 bg-gradient-to-b from-background to-secondary/20">
            <div className="container mx-auto">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-6">
                        <Shield className="h-4 w-4" />
                        <span>Enterprise-Grade Security</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                        Your Data Stays{' '}
                        <span className="text-green-400">Yours</span>
                    </h2>

                    <p className="text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
                        We take security seriously. Your workloads run in isolated containers
                        with end-to-end encryption. Even we can't see your data.
                    </p>

                    <div className="grid sm:grid-cols-3 gap-8 mb-12">
                        <SecurityItem
                            icon={Lock}
                            title="End-to-End Encryption"
                            description="256-bit AES encryption for all connections"
                        />
                        <SecurityItem
                            icon={Server}
                            title="Container Isolation"
                            description="Each rental runs in a secure, sandboxed container"
                        />
                        <SecurityItem
                            icon={Eye}
                            title="Zero Knowledge"
                            description="We never access or store your data"
                        />
                    </div>

                    <Link href="/security">
                        <Button variant="outline" size="lg">
                            Learn More About Our Security
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}

function SecurityItem({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
}) {
    return (
        <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-4">
                <Icon className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    );
}
