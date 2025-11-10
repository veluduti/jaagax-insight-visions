import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Building2, Home, Shield, Briefcase, Eye, EyeOff, Loader2 } from "lucide-react";

type AppRole = "buyer" | "seller" | "builder" | "agent" | "admin";

const roleIcons: Record<AppRole, any> = {
  buyer: Home,
  seller: Briefcase,
  builder: Building2,
  agent: User,
  admin: Shield,
};

const roleDescriptions: Record<AppRole, string> = {
  buyer: "Discover and favorite properties",
  seller: "List and manage your properties",
  builder: "Showcase projects and verify docs",
  agent: "Connect buyers and sellers",
  admin: "Manage platform and verifications",
};

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("buyer");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    checkIfAlreadyLoggedIn();
  }, []);

  const checkIfAlreadyLoggedIn = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();
      
      const userRole = roleData?.role || "buyer";
      navigate(`/${userRole}-dashboard`, { replace: true });
    }
  };

  const validateForm = () => {
    if (!isLogin) {
      if (!name.trim()) {
        toast({ title: "Error", description: "Name is required", variant: "destructive" });
        return false;
      }
      if (!city.trim()) {
        toast({ title: "Error", description: "City is required", variant: "destructive" });
        return false;
      }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Error", description: "Please enter a valid email", variant: "destructive" });
      return false;
    }
    
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return false;
    }
    
    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Invalid email or password. Please try again.");
          }
          throw error;
        }

        // Fetch user role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .single();

        const userRole = roleData?.role || "buyer";
        toast({ title: "Welcome back!", description: "Signed in successfully" });
        
        const from = (location.state as any)?.from?.pathname || `/${userRole}-dashboard`;
        navigate(from, { replace: true });
      } else {
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("user_id", email)
          .single();
        
        if (existingUser) {
          throw new Error("An account with this email already exists. Please sign in.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name,
              city,
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            throw new Error("This email is already registered. Please sign in instead.");
          }
          throw error;
        }

        // Insert role after signup
        if (data.user) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({ user_id: data.user.id, role: selectedRole });

          if (roleError) throw roleError;

          toast({
            title: "Account created!",
            description: "Welcome to JaagaX! You can now access your dashboard.",
          });
          navigate(`/${selectedRole}-dashboard`, { replace: true });
        }
      }
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-midnight via-midnight-light to-midnight p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-cyan/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float-delayed" />
      </div>

      {/* Logo/Brand */}
      <div className="absolute top-8 left-8 z-20">
        <button 
          onClick={() => navigate("/")}
          className="text-2xl font-bold text-cyan hover:text-cyan/80 transition-colors"
        >
          JaagaX
        </button>
      </div>

      <Card className="w-full max-w-md p-8 glass-panel border-glass relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isLogin ? "Welcome Back" : "Join JaagaX"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin ? "Sign in to continue to your dashboard" : "Create your account to get started"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  placeholder="Hyderabad or Vijayawada"
                />
              </div>

              <div className="space-y-2">
                <Label>Select Your Role</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(["buyer", "seller", "builder", "agent"] as AppRole[]).map((role) => {
                    const Icon = roleIcons[role];
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedRole === role
                            ? "border-cyan bg-cyan/10 shadow-glow-cyan"
                            : "border-glass bg-background/5 hover:border-cyan/50"
                        }`}
                      >
                        <Icon className="w-6 h-6 mx-auto mb-2 text-cyan" />
                        <p className="text-sm font-medium capitalize">{role}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {roleDescriptions[role]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {!isLogin && (
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isLogin ? "Signing in..." : "Creating account..."}
              </>
            ) : (
              isLogin ? "Sign In" : "Create Account"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-cyan hover:underline text-sm"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </Card>
    </div>
  );
}
