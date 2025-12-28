import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import './globals.css';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

export const metadata: Metadata = {
    title: 'DistributedCompute - GPU Rental Marketplace',
    description:
        'Rent or lease GPU compute power from a global network of providers. Access RTX 4090, A100, H100 and more at competitive rates.',
    keywords: ['GPU rental', 'cloud compute', 'AI training', 'machine learning', 'deep learning'],
    openGraph: {
        title: 'DistributedCompute - GPU Rental Marketplace',
        description: 'Access powerful GPUs on demand from our global network',
        type: 'website',
    },
};

// Check if Clerk key is valid (starts with pk_)
const hasValidClerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_');

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const content = (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} font-sans antialiased`}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <QueryProvider>{children}</QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    );

    // Only wrap with ClerkProvider if we have a valid key
    if (hasValidClerkKey) {
        return (
            <ClerkProvider
                appearance={{
                    variables: {
                        colorPrimary: '#3b82f6',
                    },
                }}
            >
                {content}
            </ClerkProvider>
        );
    }

    // Return without Clerk for builds without credentials
    return content;
}
