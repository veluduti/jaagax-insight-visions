import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Mail, Lock, UserCircle, Phone, Globe2, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import jaagaxLogo from "@/assets/jaagax-logo.png";

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

type Step = "choose" | "email-form" | "google-details" | "otp" | "success";

type Errors = Partial<Record<"fullName" | "country" | "phone" | "password" | "email", string>>;

export default function Register() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("choose");
  const [provider, setProvider] = useState<"email" | "google">("email");

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

        const { data: profiles } = await supabase
          .from("profiles" as any)
          .select("id")
          .eq("user_id", user.id);

        if ((profiles ?? []).length > 0) {
          navigate("/dashboard/buyer", { replace: true });
          return;
        }

        const isGoogle =
          user.app_metadata?.provider === "google" ||
          (user.identities ?? []).some((i: any) => i.provider === "google");
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/register`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        toast.error(error.message || "Google sign-in was cancelled or failed. Please try again.");
        setGoogleLoading(false);
      }
      // On success the browser redirects to Google.
    } catch {
      toast.error("Google sign-in was cancelled or failed. Please try again.");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <button onClick={() => navigate("/")} className="mb-6 mx-auto block" aria-label="JAAGA X home">
          <img src={jaagaxLogo} alt="JAAGA X" className="h-10 w-auto object-contain mx-auto" />
        </button>

        <Card className="p-6 border-border shadow-lg">
          <AnimatePresence mode="wait">
            {checkingSession && step === "choose" ? (
              <motion.div key="loading" className="py-16 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </motion.div>
            ) : step === "choose" ? (
              <motion.div key="choose" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
                <p className="text-sm text-muted-foreground mt-1">Choose how you'd like to register.</p>

                <div className="space-y-3 mt-6">
                  <Button
                    className="w-full h-12"
                    onClick={() => {
                      setProvider("email");
                      setStep("email-form");
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" /> Register with Email
                  </Button>
                  <Button variant="outline" className="w-full h-12" onClick={handleGoogle} disabled={googleLoading}>
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Globe2 className="h-4 w-4 mr-2" />
                    )}
                    Register with Google
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground text-center mt-6">
                  Already have an account?{" "}
                  <button className="text-primary font-medium" onClick={() => navigate("/auth")}>
                    Sign In
                  </button>
                </p>
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
                  <h1 className="text-2xl font-bold text-foreground">
                    {step === "google-details" ? "Almost there" : "Register with Email"}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
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

                <Button type="submit" className="w-full h-11" disabled={loading}>
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
                  <h1 className="text-2xl font-bold text-foreground">Verify your mobile</h1>
                  <p className="text-sm text-muted-foreground mt-1">
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

                <Button type="submit" className="w-full h-11" disabled={loading}>
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
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <h1 className="text-2xl font-bold text-foreground mt-4">Welcome to JAAGA X</h1>
                <p className="text-sm text-muted-foreground mt-1">Taking you to your dashboard...</p>
                <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mt-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}
