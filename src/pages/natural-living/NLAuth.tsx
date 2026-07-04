import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import NLLayout from "@/features/natural-living/NLLayout";
import { useNLAuth, NLRole } from "@/features/natural-living/useNLAuth";
import { Eyebrow, H1, Lede } from "@/features/natural-living/ui";
import { toast } from "sonner";
import { Loader2, Leaf, Sprout, MapPin, User as UserIcon } from "lucide-react";

const ROLE_OPTIONS: { value: NLRole; icon: any; label: string; desc: string }[] = [
  { value: "customer", icon: UserIcon, label: "Customer", desc: "Subscribe to farms, book stays, join events." },
  { value: "farmer", icon: Sprout, label: "Farmer", desc: "Manage crops, receive orders, log harvests." },
  { value: "land_owner", icon: MapPin, label: "Land Owner", desc: "List land, partner on farms, share yield." },
];

export default function NLAuth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<NLRole>("customer");
  const [busy, setBusy] = useState(false);
  const { signIn, signUp } = useNLAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get("next") || "/natural-living/onboarding";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Welcome back");
        navigate(next);
      } else {
        const { error } = await signUp(email, password, role);
        if (error) throw error;
        toast.success("Account created. Please check your email if confirmation is required.");
        navigate(next);
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <NLLayout>
      <section className="py-20 md:py-28" style={{ background: "hsl(var(--nl-cream))" }}>
        <div className="nl-container">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div className="max-w-lg">
              <Eyebrow>{mode === "signin" ? "Welcome back" : "Join the movement"}</Eyebrow>
              <H1 className="mt-3">
                {mode === "signin" ? (
                  <>Step back <span style={{ fontStyle: "italic" }}>into the grove.</span></>
                ) : (
                  <>A quieter <span style={{ fontStyle: "italic" }}>way to belong.</span></>
                )}
              </H1>
              <Lede className="mt-6">
                {mode === "signin"
                  ? "Sign in to reach your farms, subscriptions, orders and community."
                  : "Create an account to subscribe to a farm, list your land, or grow with our farmer network."}
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

                <button type="submit" disabled={busy} className="nl-btn nl-btn-primary w-full justify-center mt-4">
                  {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </button>

                <div className="text-center text-xs text-[hsl(var(--nl-muted))] pt-2">
                  {mode === "signin" ? (
                    <>New here?{" "}
                      <button type="button" onClick={() => setMode("signup")} className="underline text-[hsl(var(--nl-forest))]">
                        Create an account
                      </button>
                    </>
                  ) : (
                    <>Already with us?{" "}
                      <button type="button" onClick={() => setMode("signin")} className="underline text-[hsl(var(--nl-forest))]">
                        Sign in
                      </button>
                    </>
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
