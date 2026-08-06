import React, { useState } from "react";
import { Nav } from "../components/landing/Nav";
import { Hero } from "../components/landing/Hero";
import { DemoSection } from "../components/landing/DemoSection";
import { TrustChips } from "../components/landing/TrustChips";
import { BeforeAfter } from "../components/landing/BeforeAfter";
import { HowItWorks } from "../components/landing/HowItWorks";
import { Stats } from "../components/landing/Stats";
import { BriefFlow } from "../components/landing/BriefFlow";
import { Features } from "../components/landing/Features";
import { Storyboard } from "../components/landing/Storyboard";
import { Gallery } from "../components/landing/Gallery";
import { Pricing } from "../components/landing/Pricing";
import { FAQ } from "../components/landing/FAQ";
import { FinalCTA } from "../components/landing/FinalCTA";
import { Footer } from "../components/landing/Footer";
import { DemoDialog } from "../components/landing/DemoDialog";

export default function Landing() {
  const [demoOpen, setDemoOpen] = useState(false);

  React.useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setDemoOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative bg-[#0C0C0E] min-h-screen">
      <Nav />
      <main>
        <Hero onOpenDemo={() => setDemoOpen(true)} />
        <DemoSection onOpenDemo={() => setDemoOpen(true)} />
        <TrustChips />
        {/* Gallery shown right after hero on mobile */}
        <div className="lg:hidden">
          <Gallery />
        </div>
        <BeforeAfter />
        <HowItWorks />
        <Stats />
        <BriefFlow />
        <Features />
        <Storyboard />
        <div className="hidden lg:block">
          <Gallery />
        </div>
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <DemoDialog open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
