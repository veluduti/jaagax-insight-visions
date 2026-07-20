/**
 * NLGoals — Onboarding Step 2
 * ---------------------------
 * Route: /natural-living/goals
 * Multi-select up to 3 goals from `nl_goals`. Persists into
 * `nl_user_goals` with replace-set semantics, then routes to the
 * interview placeholder.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Search, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ProfileBootProvider,
  useProfileBoot,
} from "@/features/natural-living/onboarding/ProfileBootProvider";
import RequireNLAuth from "@/features/natural-living/onboarding/RequireNLAuth";
import OnboardingProgress from "@/features/natural-living/onboarding/OnboardingProgress";
import GoalCard from "@/features/natural-living/onboarding/GoalCard";
import { useNLGoals } from "@/features/natural-living/onboarding/useNLGoals";
import * as EventBus from "@/platform/events/EventBus";
import * as Analytics from "@/platform/analytics/analytics";
import "@/features/natural-living/theme.css";

const MAX_SELECT = 3;
const sb = supabase as any;

const CATEGORY_LABEL: Record<string, string> = {
  lifestyle: "Lifestyle",
  investment: "Investment",
  business: "Business",
};
const CATEGORY_ORDER = ["lifestyle", "investment", "business"];

function GoalsInner() {
  const { user, snapshot, refresh } = useProfileBoot();
  const navigate = useNavigate();
  const { goals, selectedIds, setSelectedIds, loading, error, saveSelection } = useNLGoals(user?.id);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const initialSelectionRef = useRef<Set<string> | null>(null);
  const hadPriorSelections = useRef(false);

  useEffect(() => {
    if (!loading && initialSelectionRef.current === null) {
      initialSelectionRef.current = new Set(selectedIds);
      hadPriorSelections.current = selectedIds.length > 0;
    }
  }, [loading, selectedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return goals;
    return goals.filter((g) =>
      [g.title, g.subtitle, g.description, g.category, g.code]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [goals, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((g) => {
      const list = map.get(g.category) || [];
      list.push(g);
      map.set(g.category, list);
    });
    const cats = Array.from(map.keys()).sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return cats.map((cat) => ({ category: cat, items: map.get(cat)! }));
  }, [filtered]);

  function toggle(goalId: string) {
    setSelectedIds((prev) => {
      if (prev.includes(goalId)) return prev.filter((x) => x !== goalId);
      if (prev.length >= MAX_SELECT) return prev;
      const goal = goals.find((g) => g.id === goalId);
      if (user && goal) {
        void EventBus.publish({
          topic: "nl.goal.selected",
          moduleKey: "natural-living",
          actorUserId: user.id,
          payload: { goal_id: goalId, code: goal.code },
        });
        void Analytics.track({
          name: "nl_goal_selected",
          userId: user.id,
          moduleKey: "natural-living",
          props: { goal_id: goalId, code: goal.code },
        });
      }
      return [...prev, goalId];
    });
  }

  async function handleContinue() {
    if (!user || selectedIds.length === 0 || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveSelection(user.id, selectedIds);

      // Advance onboarding state to interview.
      const now = new Date().toISOString();
      const existing = snapshot?.state;
      const patch = {
        user_id: user.id,
        stage: "interview_pending",
        last_step: "goals",
        progress_pct: Math.max(existing?.progress_pct ?? 0, 50),
        updated_at: now,
      };
      const res = existing?.id
        ? await sb.from("nl_onboarding_state").update(patch).eq("id", existing.id)
        : await sb.from("nl_onboarding_state").insert({ ...patch, started_at: now });
      if (res.error) throw res.error;

      const codes = goals.filter((g) => selectedIds.includes(g.id)).map((g) => g.code);
      const topic = hadPriorSelections.current ? "nl.goal.updated" : "nl.goal.selected";
      void EventBus.publish({
        topic,
        moduleKey: "natural-living",
        actorUserId: user.id,
        payload: { goal_ids: selectedIds, codes },
      });
      void Analytics.track({
        name: hadPriorSelections.current ? "nl_goal_updated" : "nl_goal_saved",
        userId: user.id,
        moduleKey: "natural-living",
        props: { count: selectedIds.length, codes },
      });
      void Analytics.track({
        name: "nl_continue_clicked",
        userId: user.id,
        moduleKey: "natural-living",
        props: { from: "goals", count: selectedIds.length },
      });

      await refresh();
      navigate("/natural-living/interview", { replace: true });
    } catch (e: any) {
      setSaveError(e?.message || "Could not save your goals. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const remaining = MAX_SELECT - selectedIds.length;

  return (
    <div
      className="nl-scope min-h-screen flex flex-col"
      style={{ background: "hsl(var(--nl-cream))" }}
    >
      <header className="pt-8 pb-4 px-6">
        <div className="max-w-5xl mx-auto">
          <OnboardingProgress current="goals" />
        </div>
      </header>

      <main className="flex-1 px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="nl-serif text-3xl md:text-5xl leading-tight text-[hsl(var(--nl-ink))]">
              What draws you to natural living?
            </h1>
            <p className="mt-4 text-base md:text-lg text-[hsl(var(--nl-ink)/0.7)]">
              Choose up to {MAX_SELECT}. Your goals guide the questions our AI companion asks next.
            </p>
          </div>

          <div className="mt-8 flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div
              className="relative flex-1 max-w-md"
            >
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: "hsl(var(--nl-ink)/0.5)" }}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search goals — farming, wellness, investment…"
                className="w-full pl-10 pr-10 py-2.5 rounded-full border text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--nl-forest)/0.35)]"
                style={{
                  background: "hsl(var(--nl-cream))",
                  borderColor: "hsl(var(--nl-forest)/0.25)",
                  color: "hsl(var(--nl-ink))",
                }}
                aria-label="Search goals"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[hsl(var(--nl-forest)/0.08)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div
              className="text-sm px-3 py-1.5 rounded-full self-start md:self-auto"
              style={{
                background: "hsl(var(--nl-forest)/0.08)",
                color: "hsl(var(--nl-forest))",
              }}
              aria-live="polite"
            >
              {selectedIds.length} of {MAX_SELECT} selected
              {remaining > 0 && ` · ${remaining} left`}
            </div>
          </div>

          {loading ? (
            <div className="mt-16 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--nl-forest))" }} />
            </div>
          ) : error ? (
            <div className="mt-16 text-center text-sm text-red-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="mt-16 text-center text-[hsl(var(--nl-ink)/0.65)]">
              No goals match “{query}”.
            </div>
          ) : (
            <div className="mt-8 space-y-10">
              {grouped.map((group) => (
                <section key={group.category}>
                  <div className="flex items-baseline gap-3 mb-4">
                    <h2 className="nl-serif text-xl md:text-2xl text-[hsl(var(--nl-ink))]">
                      {CATEGORY_LABEL[group.category] ||
                        group.category.charAt(0).toUpperCase() + group.category.slice(1)}
                    </h2>
                    <span className="text-xs text-[hsl(var(--nl-ink)/0.5)]">
                      {group.items.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.items.map((g) => (
                      <GoalCard
                        key={g.id}
                        goal={g}
                        selected={selectedIds.includes(g.id)}
                        disabled={selectedIds.length >= MAX_SELECT}
                        onToggle={() => toggle(g.id)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {saveError && (
            <div className="mt-6 text-sm text-red-600 text-center" role="alert">
              {saveError}
            </div>
          )}

          <div className="h-32" aria-hidden="true" />
        </div>
      </main>

      {/* Sticky action bar */}
      <div
        className="sticky bottom-0 left-0 right-0 border-t backdrop-blur-md"
        style={{
          background: "hsl(var(--nl-cream)/0.9)",
          borderColor: "hsl(var(--nl-forest)/0.15)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/natural-living/welcome")}
            className="nl-btn nl-btn-outline inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="hidden sm:block text-xs text-[hsl(var(--nl-ink)/0.6)]">
            {selectedIds.length === 0
              ? "Pick at least one goal to continue."
              : `Ready when you are — ${selectedIds.length} selected.`}
          </div>
          <button
            type="button"
            onClick={handleContinue}
            disabled={selectedIds.length === 0 || saving}
            className="nl-btn nl-btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Continue"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NLGoals() {
  return (
    <ProfileBootProvider>
      <RequireNLAuth allowStages={["needs_goal", "needs_interview", "resume_interview"]}>
        <GoalsInner />
      </RequireNLAuth>
    </ProfileBootProvider>
  );
}
