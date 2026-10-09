import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Building2, ShieldCheck, User2, Landmark } from "lucide-react";
import PartnerNav from "@/components/partners/PartnerNav";
import { initSignupOtp } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { HOSPITALITY_CATEGORIES, CATEGORY_BY_KEY } from "@/config/hospitalityCategories";
import { getExistingAccount, GOOGLE_ALREADY_REGISTERED_MESSAGE } from "@/lib/accountExistence";

const steps = [
  { key: "account", label: "Account", icon: User2 },
  { key: "business", label: "Business", icon: Building2 },
  { key: "compliance", label: "Compliance", icon: Landmark },
  { key: "verify", label: "Verify", icon: ShieldCheck },
];

const countries = ["India", "United Arab Emirates", "Sri Lanka", "Nepal", "Bhutan", "Singapore", "Thailand"];

const step1Schema = z.object({
  owner_name: z.string().trim().min(2, "Owner name is required").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,14}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Add at least one uppercase letter")
    .regex(/[a-z]/, "Add at least one lowercase letter")
    .regex(/[0-9]/, "Add at least one number")
    .regex(/[^A-Za-z0-9]/, "Add at least one special character"),
});
const step1SchemaLoggedIn = step1Schema.omit({ password: true });

const step2Schema = z.object({
  hotel_name: z.string().trim().min(2).max(120),
  company_name: z.string().trim().max(150).optional().or(z.literal("")),
  business_types: z.array(z.string()).min(1, "Select at least one business type"),
  country: z.string().min(1),
  state: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
});
const step3Schema = z.object({
  gst_number: z.string().trim().max(20).optional().or(z.literal("")),
  pan_number: z.string().trim().max(10).optional().or(z.literal("")),
  num_hotels: z.coerce.number().int().min(1).max(500),
  num_rooms_total: z.coerce.number().int().min(1).max(10000),
});

type FormData = {
  owner_name: string;
  phone: string;
  email: string;
  password: string;
  hotel_name: string;
  company_name: string;
  business_type: string;
  business_types: string[];
  country: string;
  state: string;
  city: string;
  gst_number: string;
  pan_number: string;
  num_hotels: number;
  num_rooms_total: number;
};

const initialForm: FormData = {
  owner_name: "",
  phone: "+91",
  email: "",
  password: "",
  hotel_name: "",
  company_name: "",
  business_type: "",
  business_types: [],
  country: "India",
  state: "",
  city: "",
  gst_number: "",
  pan_number: "",
  num_hotels: 1,
  num_rooms_total: 10,
};

const GOOGLE_FLOW_KEY = "partner_register_google";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.3 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.4-4.7 7l7.6 5.9c4.4-4.1 6.8-10.1 6.8-17.4z"
      />
      <path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.4 0-11.7-3.8-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

export default function PartnerRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(() => {
    const returnEmail = (location.state as { email?: string } | null)?.email;
    return returnEmail ? { ...initialForm, email: returnEmail } : initialForm;
  });
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [duplicateEmail, setDuplicateEmail] = useState<string | null>(null);
  const [account, setAccount] = useState<{ id: string; email: string } | null>(null);

  // Adopt an existing JAAGA account (any role) and prefill the first form.
  const adoptUser = async (user: any): Promise<boolean> => {
    const existing = await getExistingAccount(user.id);
    if (existing.roles.includes("hotel_manager") || existing.profileTypes.includes("hotel_manager")) {
      setDuplicateEmail(user.email ?? "");
      return false;
    }
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("full_name, email, phone, city")
      .eq("user_id", user.id)
      .limit(5);
    const pick = (k: string) => (profiles || []).map((p: any) => p?.[k]).find((v: any) => v) || "";
    const meta = (user.user_metadata as any) || {};
    setAccount({ id: user.id, email: user.email ?? "" });
    setForm((f) => ({
      ...f,
      owner_name: f.owner_name || pick("full_name") || meta.full_name || meta.name || "",
      email: user.email || pick("email") || f.email,
      phone: f.phone && f.phone !== "+91" ? f.phone : pick("phone") || meta.phone || user.phone || "+91",
      city: f.city || pick("city") || meta.city || "",
    }));
    return true;
  };

  // If the visitor is already signed in with any JAAGA role, prefill from that account.
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      sessionStorage.removeItem(GOOGLE_FLOW_KEY);
      if (user) await adoptUser(user);
    })();
  }, []);

  const registerWithGoogle = async () => {
    setGoogleBusy(true);
    try {
      sessionStorage.setItem(GOOGLE_FLOW_KEY, "1");
      const result: any = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/partners/register`,
      });
      if (result?.error) {
        sessionStorage.removeItem(GOOGLE_FLOW_KEY);
        toast.error(result.error.message || "Google sign-in failed");
        return;
      }
      if (result?.redirected) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        sessionStorage.removeItem(GOOGLE_FLOW_KEY);
        const existing = await getExistingAccount(user.id);
        if (existing.roles.includes("hotel_manager") || existing.profileTypes.includes("hotel_manager")) {
          setDuplicateEmail(user.email ?? "");
          toast.error(GOOGLE_ALREADY_REGISTERED_MESSAGE);
          return;
        }
        setAccount({ id: user.id, email: user.email ?? "" });
        setForm((f) => ({
          ...f,
          owner_name: f.owner_name || (user.user_metadata as any)?.full_name || "",
          email: user.email || f.email,
        }));
        setStep(1);
      }
    } catch (e: any) {
      sessionStorage.removeItem(GOOGLE_FLOW_KEY);
      toast.error(e?.message || "Google sign-in failed");
    } finally {
      setGoogleBusy(false);
    }
  };

  // Reusing the signed-in account: no new signup, no "already registered" error.
  const usingAccount = !!account && form.email.trim().toLowerCase() === account.email.toLowerCase();

  const set = (k: keyof FormData) => (v: any) => setForm((f) => ({ ...f, [k]: v }));

  const next = () => {
    try {
      if (step === 0 && !usingAccount) {
        const emailLocal = form.email.split("@")[0]?.toLowerCase() || "";
        if (emailLocal && form.password.toLowerCase().includes(emailLocal)) {
          toast.error("Password must not contain your email or name");
          return;
        }
      }
      if (step === 0) (usingAccount ? step1SchemaLoggedIn : step1Schema).parse(form);
      if (step === 1) step2Schema.parse(form);
      if (step === 2) step3Schema.parse(form);
      setStep((s) => Math.min(s + 1, steps.length - 1));
      if (step === 2) submit();
    } catch (e: any) {
      const msg = e?.errors?.[0]?.message ?? "Please review the form";
      toast.error(msg);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      // Persist the form snapshot so KYC step can prefill after login
      sessionStorage.setItem("partner_signup_snapshot", JSON.stringify({
        ...form,
        business_type: form.business_types.map((k) => CATEGORY_BY_KEY[k]?.label ?? k).join(", "),
      }));

      // Existing signed-in user reusing their own email → attach the hotel
      // partner profile to that account instead of creating a new one.
      if (usingAccount && account) {
        try {
          const { data: existing } = await (supabase as any)
            .from("profiles")
            .select("id")
            .eq("user_id", account.id)
            .eq("type", "hotel_manager")
            .maybeSingle();
          if (!existing) {
            await (supabase as any).from("profiles").insert({ user_id: account.id, type: "hotel_manager" });
          }
          await (supabase as any)
            .from("user_roles")
            .upsert({ user_id: account.id, role: "hotel_manager" }, { onConflict: "user_id,role" });
        } catch (e) {
          console.warn("Could not attach hotel manager profile:", e);
        }
        toast.success("Using your JAAGA account — let's finish your hotel listing");
        navigate("/partners/welcome", { replace: true });
        return;
      }

      const { data, error } = await initSignupOtp({
        email: form.email,
        password: form.password,
        selectedRole: "hotel_manager",
        selectedRoles: ["hotel_manager"],
        city: form.city,
        name: form.owner_name,
        phone: form.phone,
      });
      let errMsg: string | null = null;
      if (error) {
        errMsg = error.message || "Signup failed";
        try {
          const ctx: any = (error as any).context;
          if (ctx?.json) {
            const b = await ctx.json();
            if (b?.error) errMsg = b.error;
          } else if (ctx?.body) {
            const b = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
            if (b?.error) errMsg = b.error;
          }
        } catch {}
      } else if ((data as any)?.error) {
        errMsg = (data as any).error;
      }
      if (errMsg) throw new Error(errMsg);
      toast.success("Verification code sent to your email");
      navigate("/partners/verify-otp", { state: { email: form.email } });
    } catch (e: any) {
      const msg = e?.message || "Could not start signup";
      if (/stronger password|weak password/i.test(msg)) {
        toast.error("Your password is too weak. Please set a stronger password.");
        setStep(0);
      } else {
        toast.error(msg);
        setStep(2);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-950/20">
      <PartnerNav />
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/partners"))}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex flex-col items-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              disabled={googleBusy}
              onClick={registerWithGoogle}
            >
              {googleBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              Register with Google
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/partners/login" className="text-emerald-400 hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">List your Hotel on JAAGA X</h1>
          <p className="mt-1 text-muted-foreground">Takes 2 minutes. Live within 24 hours.</p>
        </div>

        {/* stepper */}
        <div className="mb-6">
          <Progress value={progress} className="h-1.5" />
          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
            {steps.map((s, i) => (
              <div key={s.key} className={i <= step ? "text-emerald-400" : "text-muted-foreground"}>
                <s.icon className="mx-auto mb-1 h-4 w-4" />
                {s.label}
              </div>
            ))}
          </div>
        </div>

        <Card className="border border-emerald-500/20 bg-background/70 backdrop-blur">
          <CardContent className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                {step === 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {duplicateEmail && (
                      <div className="sm:col-span-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-4">
                        <p className="text-sm font-medium text-foreground">{GOOGLE_ALREADY_REGISTERED_MESSAGE}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {duplicateEmail} already has a JAAGA X Partner account.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-emerald-500 text-white hover:bg-emerald-600"
                            onClick={() => navigate("/partners/login")}
                          >
                            Sign In
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await supabase.auth.signOut();
                              setDuplicateEmail(null);
                              setAccount(null);
                            }}
                          >
                            Use a different account
                          </Button>
                        </div>
                      </div>
                    )}
                    {account && (
                      <div className="sm:col-span-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
                        {usingAccount ? (
                          <>
                            Continuing with your JAAGA account{" "}
                            <span className="font-medium text-emerald-400">{account.email}</span> — no new password
                            needed. Edit any detail below, or use a different email to register a separate hotel
                            account.
                          </>
                        ) : (
                          <>
                            You're signed in as <span className="font-medium text-emerald-400">{account.email}</span>.
                            You entered a different email, so a separate hotel account will be created.
                          </>
                        )}
                      </div>
                    )}
                    <Field label="Owner name" value={form.owner_name} onChange={set("owner_name")} />
                    <Field label="Mobile" type="tel" value={form.phone} onChange={set("phone")} />
                    <Field label="Email" type="email" value={form.email} onChange={set("email")} />
                    {!usingAccount && (
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Password</Label>
                        <Input
                          type="password"
                          value={form.password}
                          onChange={(e) => set("password")(e.target.value)}
                          autoComplete="new-password"
                        />
                        <PasswordStrengthMeter password={form.password} />
                      </div>
                    )}
                    <div className="sm:col-span-2 space-y-3 pt-2">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="h-px flex-1 bg-border" /> or{" "}
                        {account ? "use another Google account" : "continue with Google"}{" "}
                        <span className="h-px flex-1 bg-border" />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11 gap-2"
                        disabled={googleBusy}
                        onClick={registerWithGoogle}
                      >
                        {googleBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                        {account ? "Continue with a different Google account" : "Register with Google"}
                      </Button>
                      <p className="text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link to="/partners/login" className="text-emerald-400 hover:underline">
                          Log in
                        </Link>
                      </p>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Hotel name" value={form.hotel_name} onChange={set("hotel_name")} />
                    <Field label="Company name (optional)" value={form.company_name} onChange={set("company_name")} />
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Business type <span className="text-xs font-normal text-muted-foreground">(select all that apply)</span></Label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {HOSPITALITY_CATEGORIES.map((c) => {
                          const on = form.business_types.includes(c.key);
                          return (
                            <button
                              key={c.key}
                              type="button"
                              aria-pressed={on}
                              onClick={() =>
                                set("business_types")(on ? form.business_types.filter((k) => k !== c.key) : [...form.business_types, c.key])
                              }
                              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                                on ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border hover:border-primary/50"
                              }`}
                            >
                              <span className="text-lg" aria-hidden>{c.emoji}</span>
                              <span className="flex-1">{c.label}</span>
                              {on && <CheckCircle2 className="h-4 w-4" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Country</Label>
                      <Select value={form.country} onValueChange={set("country")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Field label="State" value={form.state} onChange={set("state")} />
                    <Field label="City" value={form.city} onChange={set("city")} />
                  </div>
                )}

                {step === 2 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="GST number (optional)" value={form.gst_number} onChange={set("gst_number")} />
                    <Field label="PAN number (optional)" value={form.pan_number} onChange={set("pan_number")} />
                    <Field
                      label="Number of hotels"
                      type="number"
                      value={form.num_hotels as any}
                      onChange={(v) => set("num_hotels")(Number(v))}
                    />
                    <Field
                      label="Total number of rooms"
                      type="number"
                      value={form.num_rooms_total as any}
                      onChange={(v) => set("num_rooms_total")(Number(v))}
                    />
                    <p className="sm:col-span-2 rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                      Documents (GST, PAN, trade license, cancelled cheque, etc.) will be requested after email
                      verification.
                    </p>
                  </div>
                )}

                {step === 3 && (
                  <div className="py-10 text-center">
                    {submitting ? (
                      <>
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
                        <p className="mt-3 text-sm text-muted-foreground">Sending verification code…</p>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
                        <p className="mt-3 font-semibold">Almost there!</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Check your email for the verification code.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  if (step > 0) setStep((s) => Math.max(0, s - 1));
                  else if (window.history.length > 1) navigate(-1);
                  else navigate("/partners");
                }}
                disabled={submitting}
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>

              {step < 3 && (
                <Button onClick={next} disabled={submitting} className="bg-emerald-500 text-white hover:bg-emerald-600">
                  {step === 2 ? "Send code" : "Continue"} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PasswordStrengthMeter({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Lowercase letter", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
    { label: "Special character (!@#…)", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const barColors = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"];
  const strengthLabels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  const color = barColors[Math.max(0, passed - 1)];
  const isStrong = passed === checks.length;

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
      <div className="flex gap-1" aria-hidden>
        {checks.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < passed ? color : "bg-border"}`} />
        ))}
      </div>
      <p className={`text-xs font-medium ${isStrong ? "text-emerald-400" : "text-foreground"}`}>
        {isStrong ? (
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Strong password
          </span>
        ) : (
          `Password strength: ${strengthLabels[Math.max(0, passed - 1)]} — use a strong password`
        )}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`inline-flex items-center gap-1 text-xs ${c.ok ? "text-emerald-400" : "text-muted-foreground"}`}
          >
            <CheckCircle2 className={`h-3 w-3 ${c.ok ? "" : "opacity-30"}`} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement> & { onChange: (v: any) => void }) {
  const { onChange, value, ...rest } = props as any;
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
