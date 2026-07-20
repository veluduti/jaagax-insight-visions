import { lazy, Suspense, useEffect } from "react";
import NLLayout from "@/features/natural-living/NLLayout";
import HeroSection from "@/features/natural-living/landing/HeroSection";
import LandingSEO from "@/features/natural-living/landing/LandingSEO";
import { logLandingSignal } from "@/features/natural-living/landing/useLandingData";

// Lazy-load below-the-fold sections for faster first paint
const StorySection = lazy(() => import("@/features/natural-living/landing/StorySection"));
const SignalsSection = lazy(() => import("@/features/natural-living/landing/SignalsSection"));
const PillarsSection = lazy(() => import("@/features/natural-living/landing/PillarsSection"));
const AICompanionSection = lazy(() => import("@/features/natural-living/landing/AICompanionSection"));
const WhyJaagaXSection = lazy(() => import("@/features/natural-living/landing/WhyJaagaXSection"));
const TestimonialsCarousel = lazy(() => import("@/features/natural-living/landing/TestimonialsCarousel"));
const FAQSection = lazy(() => import("@/features/natural-living/landing/FAQSection"));
const FinalCTASection = lazy(() => import("@/features/natural-living/landing/FinalCTASection"));

function Fallback() {
  return <div className="py-24" aria-hidden />;
}

export default function NLHome() {
  useEffect(() => {
    logLandingSignal("view", { section: "landing" });
  }, []);

  return (
    <NLLayout>
      <LandingSEO />
      <main>
        <HeroSection />
        <Suspense fallback={<Fallback />}>
          <StorySection />
          <SignalsSection />
          <PillarsSection />
          <AICompanionSection />
          <WhyJaagaXSection />
          <TestimonialsCarousel />
          <FAQSection />
          <FinalCTASection />
        </Suspense>
      </main>
    </NLLayout>
  );
}
