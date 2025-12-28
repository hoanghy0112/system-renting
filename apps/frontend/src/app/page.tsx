import { HeroSection } from '@/components/landing/hero-section';
import { ROICalculator } from '@/components/landing/roi-calculator';
import { FeatureGrid } from '@/components/landing/feature-grid';
import { LiveMap } from '@/components/landing/live-map';
import { SecuritySection } from '@/components/landing/security-section';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export default function HomePage() {
    return (
        <main className="min-h-screen">
            <Navbar />
            <HeroSection />

            {/* ROI Calculator Section */}
            <section className="py-24 px-4 bg-secondary/10">
                <div className="container mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            Calculate Your{' '}
                            <span className="gradient-text">Potential Earnings</span>
                        </h2>
                        <p className="text-muted-foreground text-lg">
                            See how much you could earn by sharing your GPU
                        </p>
                    </div>
                    <ROICalculator />
                </div>
            </section>

            <LiveMap />
            <FeatureGrid />
            <SecuritySection />
            <Footer />
        </main>
    );
}
