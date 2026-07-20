/**
 * OnboardingProgress
 * ------------------
 * Shared 4-step onboarding progress bar for Natural Living.
 * Steps: Welcome → Goals → Interview → Profile.
 */
import { Check } from "lucide-react";

export type OnboardingStepKey = "welcome" | "goals" | "interview" | "profile";

const STEPS: Array<{ key: OnboardingStepKey; label: string }> = [
  { key: "welcome", label: "Welcome" },
  { key: "goals", label: "Goals" },
  { key: "interview", label: "Interview" },
  { key: "profile", label: "Profile" },
];

export default function OnboardingProgress({ current }: { current: OnboardingStepKey }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--nl-ink)/0.6)]">
        <span>
          Step {currentIdx + 1} of {STEPS.length}
        </span>
        <span>{STEPS[currentIdx]?.label}</span>
      </div>
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={s.key} className="flex-1 flex items-center gap-2">
              <div
                className="flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-semibold shrink-0 transition-colors"
                style={{
                  background:
                    done || active ? "hsl(var(--nl-forest))" : "hsl(var(--nl-forest)/0.15)",
                  color: done || active ? "hsl(var(--nl-cream))" : "hsl(var(--nl-ink)/0.6)",
                }}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="h-[2px] flex-1 rounded-full transition-colors"
                  style={{
                    background: done ? "hsl(var(--nl-forest))" : "hsl(var(--nl-forest)/0.15)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="hidden sm:flex mt-2 text-[11px] text-[hsl(var(--nl-ink)/0.55)]">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex-1">
            <span className={i === currentIdx ? "text-[hsl(var(--nl-forest))] font-medium" : ""}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
