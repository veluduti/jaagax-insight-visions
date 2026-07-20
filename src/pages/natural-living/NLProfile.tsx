/**
 * NLProfile — /natural-living/profile
 *
 * Serves two audiences:
 *  1. Stage `needs_profile`: auto-generates the profile on mount, then shows it.
 *  2. Stage `dashboard_ready`: view / regenerate / version history.
 *
 * A user can regenerate the profile any time and inspect previous versions.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { ProfileBootProvider, useProfileBoot } from "@/features/natural-living/onboarding/ProfileBootProvider";
import RequireNLAuth from "@/features/natural-living/onboarding/RequireNLAuth";
import { useAIProfile } from "@/features/natural-living/profile/useAIProfile";
import * as Analytics from "@/platform/analytics/analytics";
import "@/features/natural-living/theme.css";

const DIMENSIONS: { code: string; label: string }[] = [
  { code: "identity", label: "Identity" },
  { code: "lifestyle", label: "Lifestyle" },
  { code: "goals", label: "Goals" },
  { code: "investment", label: "Investment" },
  { code: "experience", label: "Experience" },
  { code: "location", label: "Location" },
  { code: "learning", label: "Learning" },
  { code: "risk", label: "Risk Appetite" },
  { code: "time", label: "Time Availability" },
  { code: "budget", label: "Budget Fit" },
];

function ProfileBody() {
  const { user, snapshot, refresh } = useProfileBoot();
  const { profile, versions, loading, busy, error, generate } = useAIProfile(user?.id);
  const navigate = useNavigate();
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [initialGenerated, setInitialGenerated] = useState(false);

  // Auto-generate if this is the user's first landing here without a profile.
  useEffect(() => {
    if (!loading && !profile && !busy && !initialGenerated && snapshot?.stage === "needs_profile") {
      setInitialGenerated(true);
      void generate("initial").then(() => refresh());
    }
  }, [loading, profile, busy, initialGenerated, snapshot, generate, refresh]);

  useEffect(() => {
    if (user) {
      void Analytics.track({ name: "nl_profile_viewed", userId: user.id, moduleKey: "natural-living" });
    }
  }, [user]);

  const displayed = useMemo(() => {
    if (selectedVersion == null) return profile;
    const v = versions.find((x) => x.version === selectedVersion);
    if (!v) return profile;
    return {
      ...(profile as any),
      ...(v.snapshot || {}),
      version: v.version,
      generated_at: v.created_at,
    };
  }, [profile, versions, selectedVersion]);

  if (loading || (!profile && busy)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--nl-forest))" }} />
        <p className="text-sm text-[hsl(var(--nl-ink)/0.7)]">
          {busy ? "Reading between the lines of your interview…" : "Loading your profile…"}
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-3">
        <p className="text-sm text-[hsl(var(--nl-ink)/0.7)]">
          We couldn't generate a profile yet. Please try again.
        </p>
        {error && <p className="text-xs text-red-600 max-w-md">{error}</p>}
        <button className="nl-btn nl-btn-primary text-sm" onClick={() => generate("initial")} disabled={busy}>
          Generate my AI Profile
        </button>
      </div>
    );
  }

  const scores = (displayed?.scores || {}) as Record<string, { value: number; confidence: number; explanation: string }>;

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--nl-cream))" }}>
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between">
          <button
            className="text-sm inline-flex items-center gap-1 text-[hsl(var(--nl-forest))] hover:underline"
            onClick={() => navigate(snapshot?.stage === "dashboard_ready" ? "/natural-living/dashboard" : "/natural-living")}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex items-center gap-2">
            <button
              className="nl-btn nl-btn-outline text-xs inline-flex items-center gap-1"
              onClick={async () => {
                await generate("regenerate");
                await refresh();
                setSelectedVersion(null);
              }}
              disabled={busy}
            >
              <RefreshCcw className="h-3 w-3" /> {busy ? "Regenerating…" : "Regenerate"}
            </button>
            {snapshot?.stage === "dashboard_ready" && (
              <button
                className="nl-btn nl-btn-primary text-xs inline-flex items-center gap-1"
                onClick={() => navigate("/natural-living/dashboard")}
              >
                Go to dashboard <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <header className="mt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--nl-forest))]">Your AI Profile</p>
          <h1 className="mt-1 nl-serif text-4xl text-[hsl(var(--nl-ink))]">{displayed?.persona}</h1>
          {displayed?.summary && (
            <p className="mt-3 max-w-2xl text-[hsl(var(--nl-ink)/0.8)] leading-relaxed">{displayed.summary}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Stat label="Readiness" value={displayed?.readiness_score} />
            <Stat label="Intent" value={displayed?.intent_score} />
            <Stat label="Risk" value={displayed?.risk_score} />
          </div>
        </header>

        {/* Score cards */}
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-widest text-[hsl(var(--nl-forest))] mb-3">Dimensions</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {DIMENSIONS.map((d) => {
              const s = scores[d.code];
              if (!s) return null;
              return (
                <article
                  key={d.code}
                  className="rounded-2xl border p-4"
                  style={{ background: "hsl(var(--nl-cream))", borderColor: "hsl(var(--nl-forest)/0.15)" }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-[hsl(var(--nl-ink))]">{d.label}</h3>
                    <span className="text-xl font-semibold nl-serif text-[hsl(var(--nl-forest))]">{s.value}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-[hsl(var(--nl-forest)/0.1)]">
                    <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: "hsl(var(--nl-forest))" }} />
                  </div>
                  <p className="mt-2 text-sm text-[hsl(var(--nl-ink)/0.75)]">{s.explanation}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-[hsl(var(--nl-ink)/0.5)]">
                    Confidence {Math.round(s.confidence * 100)}%
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Strengths + risks */}
        <section className="grid md:grid-cols-2 gap-4 mt-8">
          <ListCard title="Strengths" items={displayed?.strengths || []} tint="hsl(140 50% 35%)" />
          <ListCard title="Things to watch" items={displayed?.risks || []} tint="hsl(20 60% 45%)" />
        </section>

        {(displayed?.tags?.length ?? 0) > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-medium uppercase tracking-widest text-[hsl(var(--nl-forest))] mb-3">Signals</h2>
            <div className="flex flex-wrap gap-2">
              {displayed!.tags.map((t: string) => (
                <span
                  key={t}
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ background: "hsl(var(--nl-forest)/0.08)", color: "hsl(var(--nl-forest))" }}
                >
                  #{t}
                </span>
              ))}
            </div>
          </section>
        )}

        {versions.length > 1 && (
          <section className="mt-10">
            <h2 className="text-sm font-medium uppercase tracking-widest text-[hsl(var(--nl-forest))] mb-3">
              Version history
            </h2>
            <ul className="space-y-1">
              {versions.map((v) => {
                const isCurrent = selectedVersion == null ? v.version === profile.version : v.version === selectedVersion;
                return (
                  <li key={v.id}>
                    <button
                      className={`w-full text-left rounded-xl px-3 py-2 text-sm ${
                        isCurrent ? "bg-[hsl(var(--nl-forest)/0.08)] font-medium text-[hsl(var(--nl-forest))]" : "hover:bg-[hsl(var(--nl-forest)/0.04)]"
                      }`}
                      onClick={() => setSelectedVersion(v.version === profile.version ? null : v.version)}
                    >
                      <span className="mr-2">v{v.version}</span>
                      <span className="text-[hsl(var(--nl-ink)/0.7)]">{new Date(v.created_at).toLocaleString()}</span>
                      {v.reason && <span className="ml-2 text-[hsl(var(--nl-ink)/0.5)]">· {v.reason}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            {selectedVersion != null && (
              <p className="mt-2 text-xs text-[hsl(var(--nl-forest))] flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Viewing v{selectedVersion} — click again to return to latest.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div
      className="rounded-full px-3 py-1 text-xs border"
      style={{ borderColor: "hsl(var(--nl-forest)/0.2)", color: "hsl(var(--nl-ink))" }}
    >
      <span className="uppercase tracking-widest text-[10px] text-[hsl(var(--nl-forest))] mr-2">{label}</span>
      <span className="font-semibold">{value ?? "—"}</span>
    </div>
  );
}

function ListCard({ title, items, tint }: { title: string; items: string[]; tint: string }) {
  if (!items || items.length === 0) return null;
  return (
    <article
      className="rounded-2xl border p-4"
      style={{ background: "hsl(var(--nl-cream))", borderColor: "hsl(var(--nl-forest)/0.15)" }}
    >
      <h3 className="text-sm font-medium" style={{ color: tint }}>{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm text-[hsl(var(--nl-ink)/0.8)]">
        {items.map((s) => (
          <li key={s} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: tint }} />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function NLProfile() {
  return (
    <ProfileBootProvider>
      <RequireNLAuth allowStages={["needs_profile", "dashboard_ready"]}>
        <ProfileBody />
      </RequireNLAuth>
    </ProfileBootProvider>
  );
}
