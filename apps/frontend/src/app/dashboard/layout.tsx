'use client';

// Force dynamic rendering to avoid Clerk errors during build
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Cpu, Server, ShoppingCart, Wallet, Settings, Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
    {
        label: 'Rent GPUs',
        href: '/dashboard/rent',
        icon: ShoppingCart,
    },
    {
        label: 'My Nodes',
        href: '/dashboard/host',
        icon: Server,
    },
    {
        label: 'Billing',
        href: '/dashboard/billing',
        icon: Wallet,
    },
    {
        label: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
    },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background/80 backdrop-blur-lg">
                <div className="flex items-center justify-between h-full px-4">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <Cpu className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-semibold">DistributedCompute</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/settings">
                            <Button variant="ghost" size="icon">
                                <User className="h-5 w-5" />
                            </Button>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed top-0 left-0 z-40 h-full w-64 border-r border-border bg-card transition-transform duration-300 lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-border">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <Cpu className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-semibold">DistributedCompute</span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
                    <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary"
                    >
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-sm font-medium">Account</span>
                    </Link>
                </div>
            </aside>

            {/* Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="lg:ml-64 pt-16 lg:pt-0">
                <div className="container mx-auto p-6">{children}</div>
            </main>
        </div>
    );
}
