/**
 * NLInterviewPlaceholder — Phase 1D placeholder
 * ---------------------------------------------
 * Route: /natural-living/interview
 * The real AI Interview lands in Phase 1E. This screen confirms
 * the funnel handoff and keeps the onboarding progress consistent.
 */
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import {
  ProfileBootProvider,
} from "@/features/natural-living/onboarding/ProfileBootProvider";
import RequireNLAuth from "@/features/natural-living/onboarding/RequireNLAuth";
import OnboardingProgress from "@/features/natural-living/onboarding/OnboardingProgress";
import "@/features/natural-living/theme.css";

function InterviewInner() {
  return (
    <div
      className="nl-scope min-h-screen flex flex-col"
      style={{ background: "hsl(var(--nl-cream))" }}
    >
      <header className="pt-8 pb-4 px-6">
        <div className="max-w-3xl mx-auto">
          <OnboardingProgress current="interview" />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="max-w-xl text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.2em] mb-5"
            style={{
              background: "hsl(var(--nl-forest)/0.08)",
              color: "hsl(var(--nl-forest))",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Coming next
          </div>
          <h1 className="nl-serif text-3xl md:text-5xl leading-tight text-[hsl(var(--nl-ink))]">
            Your AI companion is warming up.
          </h1>
          <p className="mt-4 text-[hsl(var(--nl-ink)/0.7)]">
            You've completed the first two steps. The AI Interview arrives in the next release —
            we'll invite you the moment it's ready.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/natural-living/goals" className="nl-btn nl-btn-outline">
              Review goals
            </Link>
            <Link to="/natural-living" className="nl-btn nl-btn-primary">
              Back to Natural Living
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NLInterviewPlaceholder() {
  return (
    <ProfileBootProvider>
      <RequireNLAuth>
        <InterviewInner />
      </RequireNLAuth>
    </ProfileBootProvider>
  );
}
