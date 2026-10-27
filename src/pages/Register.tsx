import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  Lock,
  UserCircle,
  Phone,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Headset,
  Globe,
  ChevronDown,
  Home,
  BedDouble,
  TrendingUp,
  Info,
  UserRound,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { getExistingAccount, isGoogleIdentity, GOOGLE_ALREADY_REGISTERED_MESSAGE } from "@/lib/accountExistence";

import jaagaxLogo from "@/assets/jaagax-logo.png";
import authScenery from "@/assets/auth-villa-skyline.jpg";
import "@/components/auth/auth-page.css";

const COUNTRIES = [
  { name: "India", dial: "+91" },
  { name: "United States", dial: "+1" },
  { name: "United Kingdom", dial: "+44" },
  { name: "United Arab Emirates", dial: "+971" },
  { name: "Singapore", dial: "+65" },
  { name: "Australia", dial: "+61" },
  { name: "Canada", dial: "+1" },
  { name: "Germany", dial: "+49" },
  { name: "Saudi Arabia", dial: "+966" },
  { name: "Qatar", dial: "+974" },
  { name: "Malaysia", dial: "+60" },
  { name: "New Zealand", dial: "+64" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = "choose" | "email-form" | "google-details" | "otp" | "success" | "already-registered";

type Errors = Partial<Record<"fullName" | "country" | "phone" | "password" | "email", string>>;

const GoogleMark = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
  </svg>
);

export default function Register() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("choose");
  const [provider, setProvider] = useState<"email" | "google">("email");
  const [roleChoice, setRoleChoice] = useState<"customer" | "professional">("customer");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("India");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const [otp, setOtp] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [existingEmail, setExistingEmail] = useState("");

  const dial = useMemo(() => COUNTRIES.find((c) => c.name === country)?.dial ?? "+91", [country]);

  // Returning from the Google redirect: pull name/email from the session and
  // continue with the missing details only.
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return;

        const isGoogle = isGoogleIdentity(user);
        const existing = await getExistingAccount(user.id);

        // Already-registered identity: never create a second account.
        if (existing.exists) {
          if (isGoogle) {
            setExistingEmail(user.email || "");
            setStep("already-registered");
            return;
          }
          navigate("/dashboard/buyer", { replace: true });
          return;
        }

        if (!isGoogle) return;

        setProvider("google");
        setFullName(user.user_metadata?.full_name || user.user_metadata?.name || "");
        setEmail(user.email || "");
        setStep("google-details");
      } finally {
        setCheckingSession(false);
      }
    })();
  }, [navigate]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [resendIn]);

  const validate = (mode: "email" | "google"): boolean => {
    const next: Errors = {};
    if (mode === "email") {
      if (!fullName.trim()) next.fullName = "Full name is required";
      if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address";
      if (password.length < 8) next.password = "Password must be at least 8 characters";
    }
    if (!country) next.country = "Country is required";
    const digits = phone.replace(/\D/g, "");
    if (!digits) next.phone = "Phone number is required";
    else if (digits.length < 8 || digits.length > 15) next.phone = "Enter a valid phone number";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const fullPhone = () => {
    const raw = phone.trim();
    return raw.startsWith("+") ? raw.replace(/\s/g, "") : `${dial}${raw.replace(/\D/g, "")}`;
  };

  /** Edge functions return JSON errors with non-2xx codes; supabase-js hides the body in error.context. */
  const readFnError = async (data: any, error: any): Promise<string | null> => {
    if (data?.error) return String(data.error);
    if (!error) return null;
    try {
      const res = (error as any)?.context;
      if (res && typeof res.json === "function") {
        const body = await res.clone().json();
        if (body?.error) return String(body.error);
      }
    } catch {
      /* fall through to generic message */
    }
    return error?.message || "Something went wrong. Please try again.";
  };

  const sendOtp = async (mode: "email" | "google", action: "send" | "resend" = "send") => {
    if (action === "send" && !validate(mode)) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-otp", {
        body: {
          action,
          provider: mode,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          country,
          phone: fullPhone(),
          password: mode === "email" ? password : undefined,
        },
      });
      const errMsg = await readFnError(data, error);
      if (errMsg) {
        toast.error(errMsg);
        setErrors((p) => ({ ...p, phone: errMsg }));
        if (/mobile number is already registered/i.test(errMsg)) {
          setErrors((p) => ({ ...p, phone: "This mobile number is already registered." }));
        } else if (/email is already registered/i.test(errMsg)) {
          setErrors((p) => ({ ...p, email: "This email is already registered." }));
        }
        return;
      }

      setOtpPhone((data as any)?.phone || fullPhone());
      setResendIn(30);
      setStep("otp");
      toast.success(`We sent a 6-digit code to ${(data as any)?.phone || fullPhone()}`);
    } catch (e: any) {
      toast.error(e?.message || "Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/register`,
      });
      if ((result as any)?.error) {
        toast.error("Google sign-in was cancelled or failed. Please try again.");
        return;
      }
      if ((result as any)?.redirected) return;

      // Popup flow: the session is already set — check for an existing account
      // before letting the signup wizard continue.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const existing = await getExistingAccount(user.id);
        if (existing.exists) {
          setExistingEmail(user.email || "");
          setStep("already-registered");
          toast.error(GOOGLE_ALREADY_REGISTERED_MESSAGE);
          return;
        }
        setProvider("google");
        setFullName(user.user_metadata?.full_name || user.user_metadata?.name || "");
        setEmail(user.email || "");
        setStep("google-details");
        return;
      }
      window.location.href = "/register";
    } catch {
      toast.error("Google sign-in was cancelled or failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-otp", {
        body: { action: "verify", provider, phone: otpPhone, otp },
      });
      const errMsg = await readFnError(data, error);
      if (errMsg) {
        toast.error(errMsg);
        return;
      }

      const tokenHash = (data as any)?.token_hash;
      if (tokenHash) {
        const { error: sErr } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash } as any);
        if (sErr) {
          toast.success("Account created! Please sign in to continue.");
          navigate("/auth");
          return;
        }
      }

      setStep("success");
      toast.success("Welcome to JAAGA X!");
      setTimeout(() => navigate("/dashboard/buyer?welcome=1", { replace: true }), 1200);
    } catch (e: any) {
      toast.error(e?.message || "Network error while creating your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key: keyof Errors) =>
    errors[key] ? <p className="text-xs text-destructive mt-1">{errors[key]}</p> : null;

  const roleCards: Array<{ key: "customer" | "professional"; icon: typeof UserRound; title: string; desc: string }> = [
    { key: "customer", icon: UserRound, title: "Customer", desc: "Buy, rent, book stays, plan travel and invest" },
    { key: "professional", icon: Briefcase, title: "Property Professional", desc: "List properties, manage leads and grow business" },
  ];

  return (
    <div className="auth-page">
      <div className="auth-scenery" aria-hidden="true">
        <img src={authScenery} alt="" width={1536} height={1024} />
      </div>

      <header className="auth-header">
        <Link to="/" className="shrink-0 hover:opacity-80 transition-opacity" aria-label="JAAGA X - Home">
          <img src={jaagaxLogo} alt="JAAGA X" className="h-9 w-auto object-contain" width={145} height={40} />
        </Link>
        <nav aria-label="Register help" className="gap-5">
          <Link to="/help" className="flex items-center gap-2 border-0 pl-0 hover:text-primary">
            <Headset className="h-4 w-4" />
            Need help?
            <ChevronDown className="h-3.5 w-3.5" />
          </Link>
          <button type="button" className="flex items-center gap-2 border-0 pl-0 hover:text-primary">
            <Globe className="h-4 w-4" />
            English
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </nav>
      </header>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="auth-content">
        <div className="auth-grid">
          {/* Left intro */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="auth-intro"
          >
            <p className="auth-eyebrow">REAL ESTATE · STAYS · TRAVEL · INVESTMENT</p>
            <h1 className="auth-title">
              Find your place.
              <br />
              <span className="text-primary">Build your future.</span>
            </h1>
            <p className="auth-description">One account for property, stays, travel and investment on JaagaX</p>
            <div className="register-benefits">
              {[
                { icon: Home, title: "Explore verified properties", desc: "Homes, plots, commercial spaces and more." },
                { icon: BedDouble, title: "Book stays and plan trips", desc: "Hotels, resorts, service apartments and travel experiences." },
                { icon: TrendingUp, title: "Manage listings and investments", desc: "List properties, manage bookings and grow your portfolio." },
              ].map((item) => (
                <div key={item.title} className="register-benefit">
                  <div className="register-benefit-icon">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right card */}
          <Card className="register-card">
            <AnimatePresence mode="wait">
              {checkingSession && step === "choose" ? (
                <motion.div key="loading" className="py-16 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </motion.div>
              ) : step === "already-registered" ? (
                <motion.div key="already" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center py-4">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="register-title">Account already exists</h1>
                  <p className="register-sub mt-2">{GOOGLE_ALREADY_REGISTERED_MESSAGE}</p>
                  {existingEmail && <p className="text-sm font-medium mt-2">{existingEmail}</p>}
                  <div className="mt-6 space-y-3">
                    <Button className="w-full h-12" onClick={() => navigate("/auth")}>
                      Sign In
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-12"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setExistingEmail("");
                        setStep("choose");
                      }}
                    >
                      Use a different account
                    </Button>
                  </div>
                </motion.div>
              ) : step === "choose" ? (
                <motion.div key="choose" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="text-center">
                    <img src={jaagaxLogo} alt="JAAGA X" className="h-9 w-auto object-contain mx-auto" width={145} height={40} />
                    <h1 className="register-title mt-5">Create your account</h1>
                    <p className="register-sub mt-1">Choose how you'd like to get started.</p>
                  </div>

                  <div className="space-y-3 mt-7">
                    <Button
                      className="w-full register-cta"
                      onClick={() => {
                        setProvider("email");
                        setStep("email-form");
                      }}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Register with Email
                      <ArrowRight className="h-4 w-4 register-cta-arrow" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full register-cta border-input"
                      onClick={handleGoogle}
                      disabled={googleLoading}
                    >
                      {googleLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <span className="mr-2 inline-flex">
                          <GoogleMark />
                        </span>
                      )}
                      Continue with Google
                      <ArrowRight className="h-4 w-4 register-cta-arrow" />
                    </Button>
                  </div>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-card px-4 text-[11px] font-semibold tracking-widest text-muted-foreground">OR</span>
                    </div>
                  </div>

                  <p className="text-sm font-bold mb-3">Register as</p>
                  <div className="grid grid-cols-2 gap-3">
                    {roleCards.map((r) => {
                      const Icon = r.icon;
                      const selected = roleChoice === r.key;
                      return (
                        <button
                          key={r.key}
                          type="button"
                          data-selected={selected}
                          className="register-choice"
                          onClick={() => setRoleChoice(r.key)}
                        >
                          {selected && <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />}
                          <span className="register-choice-icon">
                            <Icon className="h-5 w-5" />
                          </span>
                          <h3>{r.title}</h3>
                          <p>{r.desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="register-note mt-4">
                    <Info className="h-4 w-4" />
                    <span>You can change or extend your role later from your account settings.</span>
                  </div>

                  <div className="border-t border-border mt-6 pt-5 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button className="text-primary font-bold" onClick={() => navigate("/auth")}>
                      Sign in
                    </button>
                  </div>
                </motion.div>
              ) : step === "email-form" || step === "google-details" ? (
                <motion.form
                  key={step}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendOtp(step === "google-details" ? "google" : "email");
                  }}
                  className="space-y-4"
                >
                  <button
                    type="button"
                    onClick={() => setStep("choose")}
                    className="text-xs text-muted-foreground flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>

                  <div>
                    <h1 className="register-title">
                      {step === "google-details" ? "Almost there" : "Register with Email"}
                    </h1>
                    <p className="register-sub mt-1">
                      {step === "google-details"
                        ? `Signed in as ${email}. Just add your country and mobile number.`
                        : "We'll verify your mobile number before creating the account."}
                    </p>
                  </div>

                  {step === "google-details" && (
                    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{fullName || "Google account"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {email}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Provided by Google</p>
                    </div>
                  )}

                  {step === "email-form" && (
                    <>
                      <div>
                        <Label htmlFor="fullName">Full Name</Label>
                        <div className="relative mt-1">
                          <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="fullName"
                            className="pl-9"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your full name"
                          />
                        </div>
                        {fieldError("fullName")}
                      </div>

                      <div>
                        <Label htmlFor="email">Email</Label>
                        <div className="relative mt-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            className="pl-9"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                          />
                        </div>
                        {fieldError("email")}
                      </div>
                    </>
                  )}

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger id="country" className="mt-1">
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.name} value={c.name}>
                            {c.name} ({c.dial})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldError("country")}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative mt-1 flex gap-2">
                      <span className="inline-flex items-center px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground">
                        {dial}
                      </span>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          inputMode="tel"
                          className="pl-9"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="9876543210"
                        />
                      </div>
                    </div>
                    {fieldError("phone")}
                  </div>

                  {step === "email-form" && (
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          className="pl-9"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 8 characters"
                        />
                      </div>
                      {fieldError("password")}
                    </div>
                  )}

                  <Button type="submit" className="w-full register-cta" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                </motion.form>
              ) : step === "otp" ? (
                <motion.form
                  key="otp"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onSubmit={verifyOtp}
                  className="space-y-4"
                >
                  <button
                    type="button"
                    onClick={() => setStep(provider === "google" ? "google-details" : "email-form")}
                    className="text-xs text-muted-foreground flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Change number
                  </button>

                  <div>
                    <h1 className="register-title">Verify your mobile</h1>
                    <p className="register-sub mt-1">
                      Enter the 6-digit code sent to <span className="font-medium text-foreground">{otpPhone}</span>. Your
                      account is created only after verification.
                    </p>
                  </div>

                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="______"
                    className="text-center text-2xl tracking-[0.6em] h-14"
                  />

                  <Button type="submit" className="w-full register-cta" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {loading ? "Creating your account..." : "Verify & Create Account"}
                  </Button>

                  <button
                    type="button"
                    disabled={resendIn > 0 || loading}
                    onClick={() => void sendOtp(provider, "resend")}
                    className="w-full text-sm text-muted-foreground disabled:opacity-50"
                  >
                    {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
                  </button>
                </motion.form>
              ) : (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-10 text-center">
                  <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                  <h1 className="register-title mt-4">Welcome to JAAGA X</h1>
                  <p className="register-sub mt-1">Taking you to your dashboard...</p>
                  <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mt-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </motion.div>

      <footer className="auth-footer">
        <p>© {new Date().getFullYear()} JaagaX. All rights reserved.</p>
        <nav aria-label="Legal and help">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/help">Help Center</Link>
        </nav>
      </footer>
    </div>
  );
}
