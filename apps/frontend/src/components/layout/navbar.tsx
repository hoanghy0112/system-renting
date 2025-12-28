'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Cpu, Menu, X, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Conditionally import Clerk components only if available
const hasClerk = typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_');

// Import Clerk components dynamically for client-side only
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

function AuthSection() {
    // Try to render Clerk components, fallback to simple auth buttons if Clerk isn't configured
    try {
        return (
            <>
                <SignedOut>
                    <Link href="/sign-in">
                        <Button variant="ghost" size="sm">
                            Sign In
                        </Button>
                    </Link>
                    <Link href="/sign-up">
                        <Button size="sm">Get Started</Button>
                    </Link>
                </SignedOut>
                <SignedIn>
                    <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                            elements: {
                                avatarBox: 'w-9 h-9',
                            },
                        }}
                    />
                </SignedIn>
            </>
        );
    } catch {
        // Fallback when Clerk is not available
        return (
            <>
                <Link href="/sign-in">
                    <Button variant="ghost" size="sm">
                        Sign In
                    </Button>
                </Link>
                <Link href="/sign-up">
                    <Button size="sm">Get Started</Button>
                </Link>
            </>
        );
    }
}

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const { theme, setTheme } = useTheme();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Cpu className="h-6 w-6 text-primary" />
                        </div>
                        <span className="text-xl font-bold">DistributedCompute</span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link
                            href="/dashboard/rent"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Rent GPUs
                        </Link>
                        <Link
                            href="/dashboard/host"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Become a Host
                        </Link>
                        <Link
                            href="/docs"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Docs
                        </Link>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-3">
                        {/* Theme Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        >
                            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Toggle theme</span>
                        </Button>

                        {/* Auth - Show simple buttons when Clerk is not configured */}
                        <Link href="/sign-in">
                            <Button variant="ghost" size="sm">
                                Sign In
                            </Button>
                        </Link>
                        <Link href="/sign-up">
                            <Button size="sm">Get Started</Button>
                        </Link>

                        {/* Mobile Menu Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setIsOpen(!isOpen)}
                        >
                            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden py-4 border-t border-border">
                        <div className="flex flex-col gap-2">
                            <Link
                                href="/dashboard/rent"
                                className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg"
                                onClick={() => setIsOpen(false)}
                            >
                                Rent GPUs
                            </Link>
                            <Link
                                href="/dashboard/host"
                                className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg"
                                onClick={() => setIsOpen(false)}
                            >
                                Become a Host
                            </Link>
                            <Link
                                href="/docs"
                                className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg"
                                onClick={() => setIsOpen(false)}
                            >
                                Docs
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
