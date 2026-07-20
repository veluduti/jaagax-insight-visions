/**
 * NLWelcome — Onboarding Step 1
 * -----------------------------
 * Route: /natural-living/welcome
 * Premium introduction; on continue, marks welcome complete in
 * `nl_onboarding_state` and routes to /natural-living/goals.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Leaf, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ProfileBootProvider,
  useProfileBoot,
} from "@/features/natural-living/onboarding/ProfileBootProvider";
import RequireNLAuth from "@/features/natural-living/onboarding/RequireNLAuth";
import OnboardingProgress from "@/features/natural-living/onboarding/OnboardingProgress";
import * as EventBus from "@/platform/events/EventBus";
import * as Analytics from "@/platform/analytics/analytics";
import "@/features/natural-living/theme.css";

const sb = supabase as any;

function WelcomeInner() {
  const { user, snapshot, refresh } = useProfileBoot();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewedRef = useRef(false);

  const firstName = useMemo(() => {
    const meta: any = user?.user_metadata || {};
    const raw =
      meta.first_name ||
      meta.full_name ||
      meta.name ||
      (user?.email ? user.email.split("@")[0] : "");
    if (!raw) return "Friend";
    const first = String(raw).trim().split(/\s+/)[0];
    return first.charAt(0).toUpperCase() + first.slice(1);
  }, [user]);

  useEffect(() => {
    if (viewedRef.current || !user) return;
    viewedRef.current = true;
    void EventBus.publish({
      topic: "nl.welcome.viewed",
      moduleKey: "natural-living",
      actorUserId: user.id,
    });
    void Analytics.track({
      name: "nl_welcome_viewed",
      userId: user.id,
      moduleKey: "natural-living",
    });
  }, [user]);

  async function handleBegin() {
    if (!user || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const existing = snapshot?.state;
      const now = new Date().toISOString();
      const patch = {
        user_id: user.id,
        stage: "goals_pending",
        last_step: "welcome",
        progress_pct: Math.max(existing?.progress_pct ?? 0, 25),
        started_at: existing?.id ? undefined : now,
        updated_at: now,
      };
      const res = existing?.id
        ? await sb.from("nl_onboarding_state").update(patch).eq("id", existing.id)
        : await sb.from("nl_onboarding_state").insert(patch);
      if (res.error) throw res.error;

      void EventBus.publish({
        topic: "nl.welcome.completed",
        moduleKey: "natural-living",
        actorUserId: user.id,
      });
      void Analytics.track({
        name: "nl_welcome_completed",
        userId: user.id,
        moduleKey: "natural-living",
      });
      void Analytics.track({
        name: "nl_continue_clicked",
        userId: user.id,
        moduleKey: "natural-living",
        props: { from: "welcome" },
      });

      await refresh();
      navigate("/natural-living/goals", { replace: true });
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="nl-scope min-h-screen flex flex-col"
      style={{ background: "hsl(var(--nl-cream))" }}
    >
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 10%, hsl(var(--nl-forest)/0.10), transparent 55%), radial-gradient(circle at 85% 90%, hsl(var(--nl-forest)/0.08), transparent 55%)",
        }}
      />

      <header className="relative pt-8 pb-4 px-6">
        <div className="max-w-3xl mx-auto">
          <OnboardingProgress current="welcome" />
        </div>
      </header>

      <main className="relative flex-1 flex items-center justify-center px-6 py-8">
        <div className="max-w-3xl w-full text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.2em] mb-6"
            style={{
              background: "hsl(var(--nl-forest)/0.08)",
              color: "hsl(var(--nl-forest))",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Natural Living · Onboarding
          </div>

          <h1
            className="nl-serif text-4xl md:text-6xl leading-[1.05] tracking-tight text-[hsl(var(--nl-ink))]"
          >
            Welcome, {firstName}.
          </h1>
          <p className="mt-5 text-lg md:text-xl text-[hsl(var(--nl-ink)/0.72)] leading-relaxed max-w-2xl mx-auto">
            Natural Living is your quiet path back to the land — a place to grow, invest, retreat,
            or build a life rooted in nature.
          </p>
          <p className="mt-3 text-base md:text-lg text-[hsl(var(--nl-ink)/0.65)] leading-relaxed max-w-2xl mx-auto">
            Before we recommend anything, our AI companion will take a few minutes to truly
            understand your interests, values and pace — so every suggestion feels made for you.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
            {[
              { icon: Leaf, title: "Deeply personal", body: "Guided by your goals, not generic filters." },
              { icon: Compass, title: "AI companion", body: "Learns as you speak — like a trusted advisor." },
              { icon: Sparkles, title: "Made for you", body: "Recommendations that match your rhythm." },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border p-4"
                style={{
                  background: "hsl(var(--nl-cream))",
                  borderColor: "hsl(var(--nl-forest)/0.18)",
                }}
              >
                <c.icon
                  className="h-5 w-5 mb-2"
                  style={{ color: "hsl(var(--nl-forest))" }}
                />
                <div className="text-sm font-medium text-[hsl(var(--nl-ink))]">{c.title}</div>
                <div className="text-xs text-[hsl(var(--nl-ink)/0.65)] mt-1">{c.body}</div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-6 text-sm text-red-600" role="alert">
              {error}
            </div>
          )}

          <div className="mt-10 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleBegin}
              disabled={submitting}
              className="nl-btn nl-btn-primary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "One moment…" : "Begin My Journey"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="text-xs text-[hsl(var(--nl-ink)/0.55)]">
              Takes about 5 minutes · You can pause anytime.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function NLWelcome() {
  return (
    <ProfileBootProvider>
      <RequireNLAuth allowStages={["needs_welcome", "needs_goal"]}>
        <WelcomeInner />
      </RequireNLAuth>
    </ProfileBootProvider>
  );
}
