import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Building2, Home, Shield, Briefcase } from "lucide-react";

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
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Fetch user role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .single();

        const userRole = roleData?.role || "buyer";
        toast({ title: "Welcome back!", description: "Signed in successfully" });
        navigate(`/${userRole}-dashboard`);
      } else {
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

        if (error) throw error;

        // Insert role after signup
        if (data.user) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({ user_id: data.user.id, role: selectedRole });

          if (roleError) throw roleError;

          toast({
            title: "Account created!",
            description: "Please check your email to confirm your account.",
          });
          navigate(`/${selectedRole}-dashboard`);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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

      <Card className="w-full max-w-md p-8 glass-panel border-glass relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isLogin ? "Welcome Back" : "Join JaagaX"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin ? "Sign in to your account" : "Create your account"}
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
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
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
