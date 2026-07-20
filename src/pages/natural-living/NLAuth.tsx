import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import NLLayout from "@/features/natural-living/NLLayout";
import { useNLAuth, NLRole } from "@/features/natural-living/useNLAuth";
import { Eyebrow, H1, Lede } from "@/features/natural-living/ui";
import { toast } from "sonner";
import { Loader2, Leaf, Sprout, MapPin, User as UserIcon } from "lucide-react";
import * as EventBus from "@/platform/events/EventBus";
import * as Analytics from "@/platform/analytics/analytics";
import { supabase } from "@/integrations/supabase/client";

const ROLE_OPTIONS: { value: NLRole; icon: any; label: string; desc: string }[] = [
  { value: "customer", icon: UserIcon, label: "Customer", desc: "Subscribe to farms, book stays, join events." },
  { value: "farmer", icon: Sprout, label: "Farmer", desc: "Manage crops, receive orders, log harvests." },
  { value: "land_owner", icon: MapPin, label: "Land Owner", desc: "List land, partner on farms, share yield." },
];

const REMEMBER_KEY = "nl_remembered_email";

export default function NLAuth() {
  const [sp] = useSearchParams();
  const initialMode = sp.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(initialMode);
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<NLRole>("customer");
  const [remember, setRemember] = useState(() => !!localStorage.getItem(REMEMBER_KEY));
  const [busy, setBusy] = useState(false);
  const { signIn, signUp, signInWithGoogle, resetPassword } = useNLAuth();
  const navigate = useNavigate();
  const next = sp.get("next") || "/natural-living/start";

  const rememberEmail = (v: string) => {
    if (remember && v) localStorage.setItem(REMEMBER_KEY, v);
    else localStorage.removeItem(REMEMBER_KEY);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        rememberEmail(email);
        void Analytics.track({ name: "nl_auth_login_submitted", props: { provider: "email" } });
        toast.success("Welcome back");
        navigate(next, { replace: true });
      } else if (mode === "signup") {
        const { error } = await signUp(email, password, role);
        if (error) throw error;
        rememberEmail(email);
        void EventBus.publish({
          topic: "nl.auth.signup_submitted",
          moduleKey: "natural-living",
          payload: { role },
        });
        void Analytics.track({
          name: "nl_auth_signup_submitted",
          props: { role, provider: "email" },
        });
        // If auto-confirm is off, no session yet — check.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          toast.success("Account created");
          navigate(next, { replace: true });
        } else {
          toast.success("Check your email to confirm your account.");
          setMode("signin");
        }
      } else if (mode === "forgot") {
        const { error } = await resetPassword(email);
        if (error) throw error;
        void Analytics.track({ name: "nl_auth_password_reset_requested" });
        toast.success("Password reset email sent. Check your inbox.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      void Analytics.track({ name: "nl_auth_login_submitted", props: { provider: "google" } });
      const { error } = await signInWithGoogle(next);
      if (error) throw error;
      // Browser will redirect to Google.
    } catch (err: any) {
      toast.error(err?.message || "Google sign-in unavailable");
      setBusy(false);
    }
  };

  return (
    <NLLayout>
      <section className="py-20 md:py-28" style={{ background: "hsl(var(--nl-cream))" }}>
        <div className="nl-container">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div className="max-w-lg">
              <Eyebrow>
                {mode === "signin" ? "Welcome back" : mode === "signup" ? "Join the movement" : "Recover access"}
              </Eyebrow>
              <H1 className="mt-3">
                {mode === "signin" ? (
                  <>Step back <span style={{ fontStyle: "italic" }}>into the grove.</span></>
                ) : mode === "signup" ? (
                  <>A quieter <span style={{ fontStyle: "italic" }}>way to belong.</span></>
                ) : (
                  <>Reset your <span style={{ fontStyle: "italic" }}>path.</span></>
                )}
              </H1>
              <Lede className="mt-6">
                {mode === "signin"
                  ? "Sign in to reach your farms, subscriptions, orders and community."
                  : mode === "signup"
                  ? "Create an account to subscribe to a farm, list your land, or grow with our farmer network."
                  : "Enter your email and we'll send you a link to set a new password."}
              </Lede>

              <div className="mt-10 space-y-4 text-sm text-[hsl(var(--nl-ink)/0.75)]">
                <div className="flex items-start gap-3">
                  <Leaf className="h-4 w-4 mt-1" style={{ color: "hsl(var(--nl-forest))" }} />
                  <p>Rooted in India · community-owned · pesticide-free.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Sprout className="h-4 w-4 mt-1" style={{ color: "hsl(var(--nl-forest))" }} />
                  <p>Every account supports a farmer and a village directly.</p>
                </div>
              </div>
            </div>

            <div
              className="p-8 md:p-10 border"
              style={{
                background: "hsl(var(--nl-cream-deep))",
                borderColor: "hsl(var(--nl-forest) / 0.2)",
              }}
            >
              {mode !== "forgot" && (
                <div className="flex gap-1 mb-8 text-xs uppercase tracking-[0.24em]">
                  {(["signin", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`px-4 py-2 border transition-colors ${
                        mode === m
                          ? "border-[hsl(var(--nl-forest))] text-[hsl(var(--nl-forest))]"
                          : "border-transparent text-[hsl(var(--nl-ink)/0.5)] hover:text-[hsl(var(--nl-forest))]"
                      }`}
                    >
                      {m === "signin" ? "Sign in" : "Create account"}
                    </button>
                  ))}
                </div>
              )}

              {mode !== "forgot" && (
                <>
                  <button
                    type="button"
                    onClick={onGoogle}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-3 border border-[hsl(var(--nl-forest)/0.3)] py-3 px-4 hover:bg-[hsl(var(--nl-cream))] transition-colors text-sm"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.07H2.18a11 11 0 0 0 0 9.87l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                    </svg>
                    Continue with Google
                  </button>
                  <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--nl-muted))]">
                    <div className="flex-1 h-px bg-[hsl(var(--nl-forest)/0.2)]" />
                    or with email
                    <div className="flex-1 h-px bg-[hsl(var(--nl-forest)/0.2)]" />
                  </div>
                </>
              )}

              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="nl-eyebrow block mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent border-b border-[hsl(var(--nl-forest)/0.4)] py-2 outline-none focus:border-[hsl(var(--nl-forest))]"
                    autoComplete="email"
                  />
                </div>
                {mode !== "forgot" && (
                  <div>
                    <label className="nl-eyebrow block mb-2">Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent border-b border-[hsl(var(--nl-forest)/0.4)] py-2 outline-none focus:border-[hsl(var(--nl-forest))]"
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    />
                  </div>
                )}

                {mode === "signup" && (
                  <div>
                    <label className="nl-eyebrow block mb-3">I am joining as</label>
                    <div className="grid gap-2">
                      {ROLE_OPTIONS.map((r) => {
                        const Icon = r.icon;
                        const active = role === r.value;
                        return (
                          <button
                            type="button"
                            key={r.value}
                            onClick={() => setRole(r.value)}
                            className={`text-left p-4 border transition-colors ${
                              active
                                ? "border-[hsl(var(--nl-forest))] bg-[hsl(var(--nl-cream))]"
                                : "border-[hsl(var(--nl-forest)/0.2)] hover:border-[hsl(var(--nl-forest)/0.5)]"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-4 w-4" style={{ color: "hsl(var(--nl-forest))" }} />
                              <span className="nl-serif text-lg">{r.label}</span>
                            </div>
                            <p className="text-xs text-[hsl(var(--nl-ink)/0.65)] mt-1.5 ml-7">{r.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-[11px] text-[hsl(var(--nl-muted))]">
                      Admin accounts are provisioned by the JAGAA team.
                    </p>
                  </div>
                )}

                {mode === "signin" && (
                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-[hsl(var(--nl-ink)/0.7)]">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="underline text-[hsl(var(--nl-forest))]"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button type="submit" disabled={busy} className="nl-btn nl-btn-primary w-full justify-center mt-4">
                  {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
                </button>

                <div className="text-center text-xs text-[hsl(var(--nl-muted))] pt-2">
                  {mode === "signin" ? (
                    <>New here?{" "}
                      <button type="button" onClick={() => setMode("signup")} className="underline text-[hsl(var(--nl-forest))]">
                        Create an account
                      </button>
                    </>
                  ) : mode === "signup" ? (
                    <>Already with us?{" "}
                      <button type="button" onClick={() => setMode("signin")} className="underline text-[hsl(var(--nl-forest))]">
                        Sign in
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setMode("signin")} className="underline text-[hsl(var(--nl-forest))]">
                      ← Back to sign in
                    </button>
                  )}
                </div>
              </form>

              <div className="nl-rule my-8" />
              <Link to="/natural-living" className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--nl-muted))] hover:text-[hsl(var(--nl-forest))]">
                ← Back to Natural Living
              </Link>
            </div>
          </div>
        </div>
      </section>
    </NLLayout>
  );
}
