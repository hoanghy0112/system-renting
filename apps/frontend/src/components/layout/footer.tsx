import Link from 'next/link';
import { Cpu, Github, Twitter } from 'lucide-react';

export function Footer() {
    return (
        <footer className="border-t border-border bg-secondary/20">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Cpu className="h-5 w-5 text-primary" />
                            </div>
                            <span className="font-bold">DistributedCompute</span>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                            The marketplace for GPU compute power.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h3 className="font-semibold mb-4">Product</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="/dashboard/rent" className="hover:text-foreground transition-colors">
                                    Rent GPUs
                                </Link>
                            </li>
                            <li>
                                <Link href="/dashboard/host" className="hover:text-foreground transition-colors">
                                    Become a Host
                                </Link>
                            </li>
                            <li>
                                <Link href="/pricing" className="hover:text-foreground transition-colors">
                                    Pricing
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="font-semibold mb-4">Resources</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="/docs" className="hover:text-foreground transition-colors">
                                    Documentation
                                </Link>
                            </li>
                            <li>
                                <Link href="/api" className="hover:text-foreground transition-colors">
                                    API Reference
                                </Link>
                            </li>
                            <li>
                                <Link href="/blog" className="hover:text-foreground transition-colors">
                                    Blog
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="font-semibold mb-4">Legal</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="/privacy" className="hover:text-foreground transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="hover:text-foreground transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="/security" className="hover:text-foreground transition-colors">
                                    Security
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} DistributedCompute. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4">
                        <Link href="https://github.com" className="text-muted-foreground hover:text-foreground">
                            <Github className="h-5 w-5" />
                        </Link>
                        <Link href="https://twitter.com" className="text-muted-foreground hover:text-foreground">
                            <Twitter className="h-5 w-5" />
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
