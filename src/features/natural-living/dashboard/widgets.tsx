/**
 * Natural Living dashboard widgets — small, self-contained components used
 * both directly by <NLDashboard/> and (optionally) via WidgetRegistry.
 *
 * Each widget pulls its own data from Supabase / hooks and renders a
 * skeleton while loading, so DashboardShell only has to compose them.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Compass,
  GraduationCap,
  Landmark,
  Leaf,
  Loader2,
  Map,
  MessageCircle,
  Play,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useProfileBoot } from "@/features/natural-living/onboarding/ProfileBootProvider";
import { useAIProfile } from "@/features/natural-living/profile/useAIProfile";
import { useRecommendations, type RecCategory, type RecRow } from "@/features/natural-living/profile/useRecommendations";
import * as EventBus from "@/platform/events/EventBus";
import * as Analytics from "@/platform/analytics/analytics";
import { cn } from "@/lib/utils";

const sb = supabase as any;

const categoryMeta: Record<RecCategory, { label: string; icon: any; tint: string }> = {
  land: { label: "Land parcels", icon: Map, tint: "hsl(var(--nl-forest))" },
  weekend_farming: { label: "Weekend farming", icon: Leaf, tint: "hsl(120 45% 35%)" },
  investment: { label: "Investment ideas", icon: Wallet, tint: "hsl(30 55% 40%)" },
  tourism: { label: "Farm tourism", icon: Compass, tint: "hsl(200 45% 40%)" },
  learning: { label: "Learn & upskill", icon: GraduationCap, tint: "hsl(260 40% 45%)" },
  community: { label: "Community", icon: Users, tint: "hsl(340 45% 45%)" },
};

// ---------------- Greeting hero ----------------

export function NLGreetingHero() {
  const { user, snapshot } = useProfileBoot();
  const { profile } = useAIProfile(user?.id);
  const name = useMemo(() => {
    const meta: any = user?.user_metadata || {};
    return (
      profile?.persona ? "" : (meta.first_name || meta.full_name || meta.name || (user?.email ? user.email.split("@")[0] : "")).split(" ")[0]
    );
  }, [profile, user]);
  return (
    <div
      className="rounded-3xl px-6 py-8 md:px-10 md:py-10 border"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--nl-forest)/0.09), hsl(var(--nl-cream)) 60%)",
        borderColor: "hsl(var(--nl-forest)/0.15)",
      }}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--nl-forest))]">Your Natural Living</p>
      <h1 className="mt-2 nl-serif text-3xl md:text-4xl text-[hsl(var(--nl-ink))]">
        {profile?.persona ? (
          <>
            Welcome back — <span className="italic">{profile.persona}</span>.
          </>
        ) : (
          <>Welcome back{name ? `, ${name}` : ""}.</>
        )}
      </h1>
      {profile?.summary && (
        <p className="mt-3 max-w-2xl text-[hsl(var(--nl-ink)/0.75)] leading-relaxed">{profile.summary}</p>
      )}
      {!profile?.summary && snapshot && (
        <p className="mt-3 text-[hsl(var(--nl-ink)/0.7)]">Your AI companion is quietly making sense of your interview.</p>
      )}
    </div>
  );
}

// ---------------- Journey Card ----------------

export function NLJourneyCard() {
  const { user, snapshot } = useProfileBoot();
  const { profile } = useAIProfile(user?.id);
  const [interview, setInterview] = useState<any>(null);
  useEffect(() => {
    if (!user) return;
    void sb
      .from("nl_interview_sessions")
      .select("id,status,progress_pct,completed_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r: any) => setInterview(r.data));
  }, [user]);

  const steps = [
    { key: "welcome", label: "Welcome", done: true },
    { key: "goals", label: "Goals", done: !!snapshot?.hasGoals },
    { key: "interview", label: "Interview", done: interview?.status === "completed" },
    { key: "profile", label: "AI Profile", done: !!profile },
  ];
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);
  const confidence = useMemo(() => {
    if (!profile?.scores) return 0;
    const vals = Object.values(profile.scores).map((s: any) => s?.confidence ?? 0);
    if (!vals.length) return 0;
    return Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 100);
  }, [profile]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[hsl(var(--nl-ink))]">Your Journey</h3>
        <span className="text-xs text-[hsl(var(--nl-ink)/0.55)]">{pct}% complete</span>
      </div>
      <Progress value={pct} className="mt-3 h-1.5" />
      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.key} className="flex items-center justify-between text-sm">
            <span className="text-[hsl(var(--nl-ink)/0.85)]">{s.label}</span>
            {s.done ? (
              <Badge variant="secondary" className="text-[10px]">Completed</Badge>
            ) : (
              <Badge className="text-[10px]" style={{ background: "hsl(var(--nl-forest))" }}>Current</Badge>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between text-xs text-[hsl(var(--nl-ink)/0.65)]">
        <span>AI confidence</span>
        <span className="font-medium text-[hsl(var(--nl-forest))]">{confidence}%</span>
      </div>
      <Link
        to="/natural-living/profile"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--nl-forest))] hover:underline"
      >
        View AI Profile <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ---------------- AI Profile Summary ----------------

export function NLProfileSummaryWidget() {
  const { user } = useProfileBoot();
  const { profile, loading } = useAIProfile(user?.id);
  if (loading) return <Skeleton className="h-40 w-full" />;
  if (!profile) return <p className="text-sm text-[hsl(var(--nl-ink)/0.6)]">No profile yet.</p>;
  const topScores = Object.entries(profile.scores)
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 4);
  return (
    <div>
      <h3 className="text-sm font-medium text-[hsl(var(--nl-ink))]">AI Profile</h3>
      {profile.persona && <p className="mt-1 text-lg font-semibold text-[hsl(var(--nl-forest))] nl-serif">{profile.persona}</p>}
      {profile.summary && <p className="mt-2 text-sm text-[hsl(var(--nl-ink)/0.75)] line-clamp-3">{profile.summary}</p>}
      <div className="mt-4 space-y-2">
        {topScores.map(([code, s]) => (
          <div key={code}>
            <div className="flex items-center justify-between text-xs text-[hsl(var(--nl-ink)/0.7)]">
              <span className="capitalize">{code}</span>
              <span className="font-medium">{s.value}</span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-[hsl(var(--nl-forest)/0.1)]">
              <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: "hsl(var(--nl-forest))" }} />
            </div>
          </div>
        ))}
      </div>
      <Link
        to="/natural-living/profile"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--nl-forest))] hover:underline"
      >
        See full profile <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ---------------- Resume Journey ----------------

export function NLResumeWidget() {
  const { user, snapshot } = useProfileBoot();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<any>(null);
  useEffect(() => {
    if (!user) return;
    void sb
      .from("nl_interview_sessions")
      .select("id,status,progress_pct,current_question_code")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r: any) => setInterview(r.data));
  }, [user]);
  const paused = interview && (interview.status === "paused" || interview.status === "in_progress");
  const next = paused ? "/natural-living/interview" : snapshot?.nextRoute || "/natural-living/start";
  const label = paused ? "Resume Interview" : "Continue your journey";
  return (
    <div>
      <h3 className="text-sm font-medium text-[hsl(var(--nl-ink))]">Pick up where you left off</h3>
      <p className="mt-1 text-sm text-[hsl(var(--nl-ink)/0.65)]">
        {paused
          ? `You paused around ${interview?.progress_pct ?? 0}% through your interview.`
          : "Explore your personalised recommendations."}
      </p>
      <button
        className="nl-btn nl-btn-primary mt-3 text-sm inline-flex items-center gap-2"
        onClick={() => navigate(next)}
      >
        <Play className="h-3.5 w-3.5" /> {label}
      </button>
    </div>
  );
}

// ---------------- Recommendation Cards (Grid) ----------------

export function NLRecommendationsGrid({ maxPerCategory = 2 }: { maxPerCategory?: number }) {
  const { user } = useProfileBoot();
  const { items, loading, busy, refresh, feedback } = useRecommendations(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading && items.length === 0 && !busy) {
      void refresh(false);
    }
  }, [user, loading, items.length, busy, refresh]);

  const grouped = useMemo(() => {
    const g: Record<RecCategory, RecRow[]> = {
      land: [], weekend_farming: [], investment: [], tourism: [], learning: [], community: [],
    };
    for (const it of items) if (g[it.item_type]) g[it.item_type].push(it);
    return g;
  }, [items]);

  if (loading) return <Skeleton className="h-40 w-full" />;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="nl-serif text-xl text-[hsl(var(--nl-ink))]">For you</h2>
        <button
          className="text-xs uppercase tracking-widest text-[hsl(var(--nl-forest))] hover:underline"
          onClick={() => refresh(true)}
          disabled={busy}
        >
          {busy ? "Regenerating…" : "Regenerate"}
        </button>
      </div>
      <div className="space-y-6">
        {(Object.keys(grouped) as RecCategory[]).map((cat) => {
          const list = grouped[cat].slice(0, maxPerCategory);
          if (!list.length) return null;
          const meta = categoryMeta[cat];
          const Icon = meta.icon;
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="h-6 w-6 rounded-full flex items-center justify-center"
                  style={{ background: `${meta.tint}20`, color: meta.tint }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-sm font-medium text-[hsl(var(--nl-ink))]">{meta.label}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map((rec) => (
                  <RecommendationCard
                    key={rec.id}
                    rec={rec}
                    onOpen={() => {
                      void feedback(rec, "clicked");
                      const route = (rec.payload as any)?.route;
                      if (route) navigate(route);
                    }}
                    onDismiss={() => feedback(rec, "dismissed")}
                  />
                ))}
              </div>
            </div>
          );
        })}
        {items.length === 0 && !busy && (
          <p className="text-sm text-[hsl(var(--nl-ink)/0.55)]">
            No recommendations yet. Generate your AI Profile first, then check back.
          </p>
        )}
      </div>
    </section>
  );
}

function RecommendationCard({ rec, onOpen, onDismiss }: { rec: RecRow; onOpen: () => void; onDismiss: () => void }) {
  return (
    <article
      className="rounded-2xl border p-4 hover:shadow-sm transition-shadow"
      style={{ background: "hsl(var(--nl-cream))", borderColor: "hsl(var(--nl-forest)/0.15)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-medium text-[hsl(var(--nl-ink))] truncate">{rec.title}</h4>
          {(rec.payload as any)?.subtitle && (
            <p className="mt-0.5 text-xs text-[hsl(var(--nl-ink)/0.6)] line-clamp-1">{(rec.payload as any).subtitle}</p>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full" style={{ background: "hsl(var(--nl-forest)/0.1)", color: "hsl(var(--nl-forest))" }}>
          Match {rec.score}
        </span>
      </div>
      {rec.reason && (
        <p className="mt-2 text-sm text-[hsl(var(--nl-ink)/0.75)] flex items-start gap-1">
          <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "hsl(var(--nl-forest))" }} />
          <span>{rec.reason}</span>
        </p>
      )}
      {rec.matched_tags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {rec.matched_tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "hsl(var(--nl-forest)/0.08)", color: "hsl(var(--nl-forest))" }}
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button className="nl-btn nl-btn-primary text-xs inline-flex items-center gap-1" onClick={onOpen}>
          {(rec.payload as any)?.cta || "Explore"} <ArrowRight className="h-3 w-3" />
        </button>
        <button
          className="text-xs text-[hsl(var(--nl-ink)/0.5)] hover:text-[hsl(var(--nl-ink))] hover:underline"
          onClick={onDismiss}
        >
          Not for me
        </button>
      </div>
    </article>
  );
}

// ---------------- Timeline ----------------

export function NLTimelineWidget() {
  const { user } = useProfileBoot();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    void sb
      .from("platform_timeline")
      .select("id, action, module_key, meta, created_at")
      .eq("actor_user_id", user.id)
      .eq("module_key", "natural-living")
      .order("created_at", { ascending: false })
      .limit(6)
      .then((r: any) => {
        setRows(r.data || []);
        setLoading(false);
      });
  }, [user]);
  if (loading) return <Skeleton className="h-32 w-full" />;
  return (
    <div>
      <h3 className="text-sm font-medium text-[hsl(var(--nl-ink))]">Your timeline</h3>
      {rows.length === 0 && <p className="mt-2 text-sm text-[hsl(var(--nl-ink)/0.55)]">Nothing yet — start exploring below.</p>}
      <ul className="mt-3 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-[hsl(var(--nl-ink)/0.8)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "hsl(var(--nl-forest))" }} />
            <span className="flex-1">{humaniseAction(r.action)}</span>
            <span className="text-[10px] text-[hsl(var(--nl-ink)/0.5)]">{timeAgo(r.created_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- Notifications ----------------

export function NLNotificationsWidget() {
  const { user } = useProfileBoot();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    void sb
      .from("notifications")
      .select("id, title, body, category, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then((r: any) => {
        setRows(r.data || []);
        setLoading(false);
      });
  }, [user]);
  if (loading) return <Skeleton className="h-24 w-full" />;
  return (
    <div>
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4" style={{ color: "hsl(var(--nl-forest))" }} />
        <h3 className="text-sm font-medium text-[hsl(var(--nl-ink))]">Notifications</h3>
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-[hsl(var(--nl-ink)/0.55)]">You're all caught up.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((n) => (
            <li key={n.id} className="text-sm">
              <div className="font-medium text-[hsl(var(--nl-ink))]">{n.title}</div>
              {n.body && <p className="text-xs text-[hsl(var(--nl-ink)/0.65)] line-clamp-2">{n.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------- Quick actions ----------------

export function NLQuickActions() {
  const actions = [
    { to: "/natural-living/lands", label: "Browse land", icon: Map },
    { to: "/natural-living/list-your-land", label: "List your land", icon: Landmark },
    { to: "/natural-living/profile", label: "AI Profile", icon: Sparkles },
    { to: "/natural-living/goals", label: "Update goals", icon: Compass },
  ];
  return (
    <div>
      <h3 className="text-sm font-medium text-[hsl(var(--nl-ink))]">Quick actions</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            onClick={() =>
              Analytics.track({ name: "nl_dashboard_quick_action", moduleKey: "natural-living", props: { to: a.to } })
            }
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-[hsl(var(--nl-forest)/0.05)] transition-colors",
            )}
            style={{ borderColor: "hsl(var(--nl-forest)/0.2)", color: "hsl(var(--nl-ink))" }}
          >
            <a.icon className="h-3.5 w-3.5" style={{ color: "hsl(var(--nl-forest))" }} />
            <span className="truncate">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------------- AI Assistant placeholder widget ----------------

export function NLAssistantWidget() {
  const navigate = useNavigate();
  return (
    <div>
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4" style={{ color: "hsl(var(--nl-forest))" }} />
        <h3 className="text-sm font-medium text-[hsl(var(--nl-ink))]">Ask your AI companion</h3>
      </div>
      <p className="mt-2 text-sm text-[hsl(var(--nl-ink)/0.7)]">
        Need help deciding next steps? Chat with your Natural Living AI.
      </p>
      <button
        className="nl-btn nl-btn-outline mt-3 text-xs inline-flex items-center gap-1"
        onClick={() => {
          void EventBus.publish({ topic: "nl.assistant.opened", moduleKey: "natural-living" });
          void Analytics.track({ name: "nl_assistant_opened", moduleKey: "natural-living" });
          navigate("/natural-living/interview");
        }}
      >
        Open assistant <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// ---------------- utils ----------------

function humaniseAction(action: string): string {
  const map: Record<string, string> = {
    profile_created: "Your AI Profile was created",
    profile_regenerated: "Your AI Profile was regenerated",
    interview_completed: "You finished the interview",
    goals_selected: "You picked your goals",
  };
  return map[action] || action.replace(/_/g, " ");
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function NLLoading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--nl-forest))" }} />
    </div>
  );
}
