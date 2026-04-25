import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { User, Building2, Home, Shield, Briefcase, Eye, EyeOff, Loader2, Mail, Lock, MapPin, UserCircle, Phone, Tag } from "lucide-react";
import { useAuth, UserRole } from "@/hooks/useAuth";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";
import { supabase } from "@/integrations/supabase/client";

const roleConfig = {
  buyer: {
    icon: Home,
    title: "Property Buyer",
    description: "Find your dream home with AI-powered recommendations",
    color: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/50",
  },
  agent: {
    icon: User,
    title: "Real Estate Agent",
    description: "Manage listings and connect with buyers",
    color: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/50",
  },
  builder: {
    icon: Building2,
    title: "Property Builder",
    description: "Showcase projects and manage developments",
    color: "from-orange-500/20 to-red-500/20",
    borderColor: "border-orange-500/50",
  },
  seller: {
    icon: Tag,
    title: "Property Seller",
    description: "List your property and reach verified buyers",
    color: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/50",
  },
  admin: {
    icon: Shield,
    title: "Platform Admin",
    description: "Manage platform operations and analytics",
    color: "from-primary/20 to-accent/20",
    borderColor: "border-primary/50",
  },
};

const cities = ["Hyderabad", "Vijayawada", "Bangalore", "Mumbai", "Chennai", "Pune", "Delhi"];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("buyer");
  const [selectedRoles, setSelectedRoles] = useState<Array<"buyer" | "agent" | "builder">>(["buyer"]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, user, role, loading: authLoading, approvalStatus, redirectToDashboard } = useAuth();
  
  const isPasswordReset = searchParams.get("reset") === "true";
  const allowedSignupRoles: UserRole[] = ["buyer", "seller", "agent", "builder"];
  const profileRoles: Array<{ key: "buyer" | "agent" | "builder"; label: string; desc: string }> = [
    { key: "buyer",   label: "Buyer",   desc: "Browse & book" },
    { key: "agent",   label: "Agent",   desc: "List & earn" },
    { key: "builder", label: "Builder", desc: "Showcase projects" },
  ];

  const toggleRole = (r: "buyer" | "agent" | "builder") => {
    setSelectedRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };

  useEffect(() => {
    if (!authLoading && user) {
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
          navigate("/select-profile");
        }
      })();
    }
  }, [user, role, authLoading, redirectToDashboard, navigate]);

  useEffect(() => {
    if (isPasswordReset) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsResettingPassword(true);
        }
      });
    }
  }, [isPasswordReset]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully!");
      setIsResettingPassword(false);
      setNewPassword("");
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!isLogin) {
      if (!name.trim()) { toast.error("Name is required"); return false; }
      if (!city) { toast.error("Please select your city"); return false; }
      if (!phone.trim()) { toast.error("Phone number is required"); return false; }
      if (selectedRoles.length === 0) { toast.error("Please select at least one role"); return false; }
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { toast.error("Please enter a valid email"); return false; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return false; }
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
          const { data: profileRows } = await supabase
            .from("profiles" as any)
            .select("id, type, status")
            .eq("user_id", currentUser.id);
          const profs = (profileRows ?? []) as Array<{ id: string; type: string; status: string }>;
          const active = profs.filter((p) => p.status === "active");
          if (active.length > 1) {
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
          // No profiles? Send to select page (shows add-role).
          navigate("/select-profile");
          return;
        }
        navigate("/dashboard");
        return;
      } else {
        // Sign up using primary role (first selected) for backward compat with signup_requests + auth metadata.
        const primary = selectedRoles[0];
        const primaryAsUserRole: UserRole = primary; // 'buyer' | 'agent' | 'builder' all valid UserRole keys
        const { error } = await signUp(email, password, primaryAsUserRole, city, name, phone);
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

        // Create profile rows for ALL selected roles. Use a brief retry — auth user must exist first.
        const { data: { user: created } } = await supabase.auth.getUser();
        if (created) {
          const rows = selectedRoles.map((t) => ({ user_id: created.id, type: t }));
          const { error: profErr } = await supabase.from("profiles" as any).insert(rows as any);
          if (profErr) console.error("Profile creation error:", profErr);
        }

        const hasBuilder = selectedRoles.includes("builder");
        if (hasBuilder) {
          toast.success("Account created! Verify your email. Builder role requires admin approval.", { duration: 8000 });
        } else {
          toast.success("Account created! Please check your email to verify, then sign in.", { duration: 6000 });
        }
        setIsLogin(true);
        setPassword("");
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
        <button onClick={() => navigate("/")} className="text-3xl font-bold text-gradient hover:opacity-80 transition-opacity">
          JaagaX
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

            <form onSubmit={handleAuth} className="space-y-6">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2"><UserCircle className="h-4 w-4" />Full Name</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city" className="flex items-center gap-2"><MapPin className="h-4 w-4" />City</Label>
                      <Select value={city} onValueChange={setCity}>
                        <SelectTrigger><SelectValue placeholder="Select your city" /></SelectTrigger>
                        <SelectContent>
                          {cities.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="h-4 w-4" />Phone Number</Label>
                      <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <Label>I want to use JAAGA X as</Label>
                        <span className="text-[11px] text-muted-foreground">Pick one or more</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2.5">
                        {profileRoles.map((r) => {
                          const meta = (r.key === "buyer") ? roleConfig.buyer : (r.key === "agent" ? roleConfig.agent : roleConfig.builder);
                          const Icon = meta.icon;
                          const checked = selectedRoles.includes(r.key);
                          return (
                            <button
                              key={r.key}
                              type="button"
                              onClick={() => toggleRole(r.key)}
                              className={`relative p-3.5 rounded-xl border-2 transition-all text-center ${
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
                              <p className="text-[10px] text-muted-foreground mt-0.5">{r.desc}</p>
                            </button>
                          );
                        })}
                      </div>
                      {selectedRoles.includes("builder") && (
                        <p className="text-[11px] text-amber-400 flex items-center gap-1">
                          ⏱ Builder profile requires admin approval after signup.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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
                {!isLogin && <p className="text-xs text-muted-foreground">Minimum 6 characters</p>}
                {isLogin && (
                  <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-primary hover:underline font-medium mt-1">
                    Forgot password?
                  </button>
                )}
              </div>

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

      <AnimatePresence>
        {isResettingPassword && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-panel border-primary/20 p-8 rounded-xl max-w-md w-full">
              <div className="text-center mb-6">
                <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Set New Password</h2>
                <p className="text-muted-foreground mt-2">Enter your new password below</p>
              </div>
              <form onSubmit={handlePasswordUpdate} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="flex items-center gap-2"><Lock className="h-4 w-4" />New Password</Label>
                  <div className="relative">
                    <Input id="new-password" type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="pr-10 h-12" autoFocus />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                </div>
                <Button type="submit" className="w-full h-12" disabled={loading}>
                  {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</>) : "Update Password"}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
