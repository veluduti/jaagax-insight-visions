import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Building2, Home, Shield, Eye, EyeOff, Loader2, Mail, Lock, UserCircle, Phone, Tag, Landmark } from "lucide-react";
import { useAuth, UserRole } from "@/hooks/useAuth";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";
import ResetPasswordModal from "@/components/auth/ResetPasswordModal";
import PasswordResetSuccess from "@/components/auth/PasswordResetSuccess";
import PlacesAutocompleteInput from "@/components/location/PlacesAutocompleteInput";
import type { NormalizedLocation } from "@/lib/googleMaps";
import { supabase } from "@/integrations/supabase/client";
import jaagaxLogo from "@/assets/jaagax-logo.png";

const roleConfig = {
  buyer: {
    icon: Home,
    title: "Buyer",
    description: "Browse & book properties",
    color: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/50",
  },
  seller: {
    icon: Tag,
    title: "Seller",
    description: "List & sell your property",
    color: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/50",
  },
  agent: {
    icon: User,
    title: "Agent",
    description: "List & earn commissions",
    color: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/50",
  },
  builder: {
    icon: Building2,
    title: "Builder",
    description: "Showcase your projects",
    color: "from-orange-500/20 to-red-500/20",
    borderColor: "border-orange-500/50",
  },
  financial: {
    icon: Landmark,
    title: "Financial",
    description: "Loans, legal & valuation services",
    color: "from-yellow-500/20 to-amber-500/20",
    borderColor: "border-amber-500/50",
  },
  admin: {
    icon: Shield,
    title: "Admin",
    description: "Platform operations",
    color: "from-primary/20 to-accent/20",
    borderColor: "border-primary/50",
  },
};


export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Phone OTP login state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [locationMeta, setLocationMeta] = useState<NormalizedLocation | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Array<"buyer" | "seller" | "agent" | "builder" | "financial">>(["buyer"]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [resetLinkValid, setResetLinkValid] = useState<boolean | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, user, role, loading: authLoading, redirectToDashboard } = useAuth();

  const isPasswordReset = searchParams.get("reset") === "true";
  const profileRoles: Array<{ key: "buyer" | "seller" | "agent" | "builder" | "financial"; label: string; desc: string }> = [
    { key: "buyer",     label: "Buyer",     desc: "Browse & book" },
    { key: "seller",    label: "Seller",    desc: "Sell property" },
    { key: "agent",     label: "Agent",     desc: "List & earn" },
    { key: "builder",   label: "Builder",   desc: "Showcase projects" },
    { key: "financial", label: "Financial", desc: "Loans & legal" },
  ];

  const toggleRole = (r: "buyer" | "seller" | "agent" | "builder" | "financial") => {
    setSelectedRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };


  useEffect(() => {
    // Do NOT auto-redirect while in the password-reset flow. The recovery
    // session would otherwise navigate the user to a dashboard before they
    // can set a new password.
    if (isPasswordReset) return;
    if (!authLoading && user) {
      // Admin always goes straight to admin dashboard
      if (role === "admin") {
        navigate("/dashboard/admin");
        return;
      }
      // Decide redirect based on profiles count
      (async () => {
        const { data } = await supabase.from("profiles" as any).select("id, type, status").eq("user_id", user.id);
        const list = ((data ?? []) as Array<{ id: string; type: string; status: string }>).filter((p) => p.status === "active");
        if (list.length === 0) {
          if (role) redirectToDashboard();
        } else if (list.length === 1) {
          localStorage.setItem("jaagax.activeProfileId", list[0].id);
          navigate(`/dashboard/${list[0].type}`);
        } else {
          // Multiple profiles: prefer last-used (stored) to avoid showing the picker every login.
          const storedId = localStorage.getItem("jaagax.activeProfileId");
          const stored = storedId ? list.find((p) => p.id === storedId) : null;
          if (stored) {
            navigate(`/dashboard/${stored.type}`);
          } else {
            navigate("/select-profile");
          }
        }
      })();
    }
  }, [user, role, authLoading, redirectToDashboard, navigate, isPasswordReset]);


  // Handle ?reset=true: parse recovery token (hash OR PKCE ?code=), validate, open modal.
  useEffect(() => {
    if (!isPasswordReset) return;
    setShowResetPassword(true);
    setResetLinkValid(null);

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    const hashError = params.get("error") || params.get("error_description");

    (async () => {
      try {
        if (hashError) { setResetLinkValid(false); return; }

        // PKCE flow: ?code=...
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          setResetLinkValid(!error);
          window.history.replaceState(null, "", `${window.location.pathname}?reset=true`);
          return;
        }

        // Implicit flow: #access_token=...&type=recovery
        if (accessToken) {
          if (type && type !== "recovery") { setResetLinkValid(false); return; }
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken ?? "",
          });
          setResetLinkValid(!error);
          window.history.replaceState(null, "", `${window.location.pathname}?reset=true`);
          return;
        }

        // No token in URL — fall back to existing session (SDK may have auto-applied it).
        const { data: { session } } = await supabase.auth.getSession();
        setResetLinkValid(!!session);
      } catch (e) {
        console.error("Reset link validation failed:", e);
        setResetLinkValid(false);
      }
    })();
  }, [isPasswordReset]);


  // Prevent auto-login right after OTP verification: if newSignup flag was set,
  // sign the user out (defense in depth) and stay on /auth.
  useEffect(() => {
    const flag = sessionStorage.getItem("jaagax.newSignup");
    if (flag) {
      sessionStorage.removeItem("jaagax.newSignup");
      void supabase.auth.signOut();
      navigate("/auth", { replace: true });
    }
  }, [navigate]);


  // Detect if the login identifier is an email or phone number.
  const isEmailIdentifier = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  const isPhoneIdentifier = (val: string) => {
    const digits = val.replace(/\D/g, "");
    return digits.length >= 10 && !val.includes("@");
  };

  const validateForm = () => {
    if (!isLogin) {
      if (!name.trim()) { toast.error("Name is required"); return false; }
      if (!phone.trim() || phone.replace(/\D/g, "").length < 10) { toast.error("Enter a valid phone number"); return false; }
      const pwOk = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\];'`~]/.test(password);
      if (!pwOk) { toast.error("Password must be 8+ chars with upper, lower, number & special character"); return false; }
      if (selectedRoles.length === 0) { toast.error("Pick at least one role"); return false; }
      if (!city.trim()) { toast.error("Please select your city"); return false; }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) { toast.error("Please enter a valid email"); return false; }
    }
    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Email not confirmed")) {
            throw new Error("Please verify your email before signing in. Check your inbox for the confirmation link.");
          }
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Invalid email or password");
          }
          throw error;
        }
        toast.success("Welcome back!");

        // Multi-profile login flow: fetch profiles, decide where to send the user.
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          // Admin shortcut — straight to admin dashboard, never the picker.
          const { data: roleRows } = await supabase
            .from("user_roles" as any)
            .select("role")
            .eq("user_id", currentUser.id);
          const roles = ((roleRows ?? []) as Array<{ role: string }>).map((r) => r.role);
          if (roles.includes("admin")) {
            navigate("/dashboard/admin");
            return;
          }

          const { data: profileRows } = await supabase
            .from("profiles" as any)
            .select("id, type, status")
            .eq("user_id", currentUser.id);
          const profs = (profileRows ?? []) as Array<{ id: string; type: string; status: string }>;
          const active = profs.filter((p) => p.status === "active");
          if (active.length > 1) {
            // Prefer last-used profile so returning users skip the picker.
            const storedId = localStorage.getItem("jaagax.activeProfileId");
            const stored = storedId ? active.find((p) => p.id === storedId) : null;
            if (stored) {
              navigate(`/dashboard/${stored.type}`);
              return;
            }
            navigate("/select-profile");
            return;
          }
          if (active.length === 1) {
            localStorage.setItem("jaagax.activeProfileId", active[0].id);
            void supabase.from("user_settings" as any).upsert({
              user_id: currentUser.id, active_profile_id: active[0].id, updated_at: new Date().toISOString()
            });
            navigate(`/dashboard/${active[0].type}`);
            return;
          }
          // No profiles yet — fall back to role-based dashboard if we have one, else picker.
          if (roles.length > 0) {
            const r = roles[0];
            const target = r === "customer" ? "buyer" : r;
            navigate(`/dashboard/${target}`);
            return;
          }
          navigate("/select-profile");
          return;
        }
        navigate("/dashboard");
        return;
      } else {
        // Sign up using primary role (first selected) for legacy signup_requests + auth metadata.
        const primary = selectedRoles[0];
        const primaryAsUserRole: UserRole = primary;
        const { error } = await signUp(email, password, primaryAsUserRole, city, name, phone, selectedRoles as UserRole[]);
        if (error) {
          if (error.message.includes("already registered") || error.message.includes("User already registered")) {
            setIsLogin(true);
            setPassword("");
            toast.error("This email is already registered. Please sign in.", { duration: 5000 });
            setLoading(false);
            return;
          }
          throw error;
        }

        // Persist email so /verify-otp can read it after navigation.
        sessionStorage.setItem("jaagax.pendingEmail", email);
        sessionStorage.setItem("jaagax.pendingPhone", phone);
        sessionStorage.setItem("jaagax.pendingSignupPassword", password);
        sessionStorage.setItem("jaagax.newSignup", "1");
        if (locationMeta) {
          try {
            localStorage.setItem("jaagax.pendingSignupLocation", JSON.stringify(locationMeta));
          } catch {}
        }
        toast.success(`We sent a 6-digit code to ${email}. It expires in 5 minutes.`, { duration: 5000 });
        navigate("/verify-otp", { state: { email } });
        return;
      }

    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="absolute top-8 left-8 z-20">
        <button
          onClick={() => navigate("/")}
          className="hover:opacity-80 transition-opacity"
          aria-label="JAAGA X - Home"
        >
          <img
            src={jaagaxLogo}
            alt="JAAGA X"
            className="h-10 w-auto object-contain"
           loading="lazy" decoding="async" />
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-6xl mx-auto relative z-10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left Side */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="hidden md:block">
            <h1 className="text-5xl font-bold mb-6">Welcome to <span className="text-gradient">JaagaX</span></h1>
            <p className="text-muted-foreground text-xl mb-8">India's most intelligent real estate platform powered by AI</p>
            <div className="space-y-4">
              {[
                { icon: Shield, title: "Verified Properties", desc: "AI-verified listings you can trust" },
                { icon: Home, title: "Smart Recommendations", desc: "Personalized property matches" },
                { icon: Building2, title: "Market Intelligence", desc: "AI-powered market insights" },
              ].map((item) => (
                <div key={item.title} className="flex items-center gap-4 p-4 glass-panel rounded-lg">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Side - Auth Form */}
          <Card className="glass-panel border-primary/20 p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">{isLogin ? "Sign In" : "Create Account"}</h2>
              <p className="text-muted-foreground">{isLogin ? "Access your personalized dashboard" : "Join thousands of users on JaagaX"}</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              <AnimatePresence mode="wait">
                {!isLogin ? (
                  <motion.div key="signup" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-5">
                    {/* 1. Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2"><UserCircle className="h-4 w-4" />Full Name</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" />
                    </div>

                    {/* 2. Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="h-4 w-4" />Phone Number</Label>
                      <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />
                    </div>

                    {/* 3. Password */}
                    <div className="space-y-2">
                      <Label htmlFor="password-signup" className="flex items-center gap-2"><Lock className="h-4 w-4" />Password</Label>
                      <div className="relative">
                        <Input id="password-signup" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8+ chars, upper, lower, number, special" className="pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* 4. Role Selection */}
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <Label>I want to use JaagaX as</Label>
                        <span className="text-[11px] text-muted-foreground">Pick one or more</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {profileRoles.map((r) => {
                          const meta = roleConfig[r.key as keyof typeof roleConfig] ?? roleConfig.buyer;
                          const Icon = meta.icon;
                          const checked = selectedRoles.includes(r.key);
                          return (
                            <button
                              key={r.key}
                              type="button"
                              onClick={() => toggleRole(r.key)}
                              className={`relative p-3 rounded-xl border-2 transition-all text-center ${
                                checked
                                  ? `${meta.borderColor} bg-gradient-to-br ${meta.color}`
                                  : "border-border bg-muted/20 hover:border-primary/30"
                              }`}
                            >
                              {checked && (
                                <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">✓</span>
                              )}
                              <Icon className={`w-5 h-5 mx-auto mb-1.5 ${checked ? 'text-primary' : 'text-muted-foreground'}`} />
                              <p className="text-xs font-medium leading-tight">{r.label}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{r.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-emerald-500/90 flex items-start gap-1.5 leading-tight">
                        <span>✓</span>
                        <span>Sign up once and start using all selected roles immediately after email verification.</span>
                      </p>
                    </div>

                    {/* 5. City (autocomplete) */}
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <PlacesAutocompleteInput
                        id="city"
                        value={city}
                        onChange={setCity}
                        onSelect={(loc) => {
                          setLocationMeta(loc);
                          setCity(loc.city || loc.locality || loc.formattedAddress);
                        }}
                        placeholder="Search your city, area, or address…"
                        country="IN"
                      />
                    </div>

                    {/* 6. Email (used for verification — required, not optional) */}
                    <div className="space-y-2">
                      <Label htmlFor="email-signup" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />Email
                        <span className="text-[10px] text-muted-foreground font-normal">(for OTP verification)</span>
                      </Label>
                      <Input id="email-signup" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="login" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-4 w-4" />Email</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="flex items-center gap-2"><Lock className="h-4 w-4" />Password</Label>
                      <div className="relative">
                        <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-primary hover:underline font-medium mt-1">
                        Forgot password?
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button type="submit" className="w-full" disabled={loading} size="lg">
                {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isLogin ? "Signing in..." : "Creating account..."}</>) : (isLogin ? "Sign In" : "Create Account")}
              </Button>
            </form>


            <div className="mt-6 text-center">
              <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline text-sm font-medium">
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </Card>
        </div>
      </motion.div>

      <ForgotPasswordModal isOpen={showForgotPassword} onClose={() => setShowForgotPassword(false)} defaultEmail={email} />

      <ResetPasswordModal
        isOpen={showResetPassword}
        isValid={resetLinkValid}
        onClose={() => {
          setShowResetPassword(false);
          navigate("/auth", { replace: true });
        }}
        onSuccess={() => {
          setShowResetPassword(false);
          setShowResetSuccess(true);
        }}
        onRequestNew={() => {
          setShowResetPassword(false);
          navigate("/auth", { replace: true });
          setShowForgotPassword(true);
        }}
      />

      <PasswordResetSuccess
        isOpen={showResetSuccess}
        onClose={() => setShowResetSuccess(false)}
        onGoToLogin={() => {
          setShowResetSuccess(false);
          void supabase.auth.signOut();
          navigate("/auth", { replace: true });
        }}
      />

    </div>
  );
}
