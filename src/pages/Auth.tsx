import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { User, Building2, Home, Shield, Briefcase, Eye, EyeOff, Loader2, Mail, Lock, MapPin, UserCircle } from "lucide-react";
import { useAuth, UserRole } from "@/hooks/useAuth";

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
  admin: {
    icon: Shield,
    title: "Platform Admin",
    description: "Manage platform operations and analytics",
    color: "from-primary/20 to-accent/20",
    borderColor: "border-primary/50",
  },
};

const cities = ["Hyderabad", "Vijayawada"];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("buyer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, user, role, loading: authLoading, redirectToDashboard } = useAuth();

  // Only allow buyer, agent, and builder roles for public signup
  const allowedSignupRoles: UserRole[] = ["buyer", "agent", "builder"];

  useEffect(() => {
    // Wait for both user and role to be loaded before redirecting
    if (user && role && !authLoading) {
      redirectToDashboard();
    }
  }, [user, role, authLoading, redirectToDashboard]);

  const validateForm = () => {
    if (!isLogin) {
      if (!name.trim()) {
        toast.error("Name is required");
        return false;
      }
      if (!city) {
        toast.error("Please select your city");
        return false;
      }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email");
      return false;
    }
    
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
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
        const { error } = await signIn(email, password);

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Invalid email or password");
          }
          throw error;
        }

        toast.success("Welcome back!");
        // The useEffect will handle redirect once role is loaded
      } else {
        const { error } = await signUp(email, password, selectedRole, city, name);
        
        if (error) {
          if (error.message.includes("already registered") || error.message.includes("User already registered")) {
            // Automatically switch to login mode
            setIsLogin(true);
            setPassword(""); // Clear password so user enters their actual password
            toast.error("This email is already registered. Please sign in with your password.", {
              duration: 5000,
            });
            setLoading(false);
            return;
          }
          throw error;
        }

        toast.success("Account created! Redirecting...");
        // Longer delay for signup to ensure role and profile are created
        setTimeout(() => {
          redirectToDashboard();
        }, 1500);
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Logo */}
      <div className="absolute top-8 left-8 z-20">
        <button 
          onClick={() => navigate("/")}
          className="text-3xl font-bold text-gradient hover:opacity-80 transition-opacity"
        >
          JaagaX
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl mx-auto relative z-10"
      >
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left Side - Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="hidden md:block"
          >
            <h1 className="text-5xl font-bold mb-6">
              Welcome to <span className="text-gradient">JaagaX</span>
            </h1>
            <p className="text-muted-foreground text-xl mb-8">
              India's most intelligent real estate platform powered by AI
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 glass-panel rounded-lg">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Verified Properties</h3>
                  <p className="text-sm text-muted-foreground">AI-verified listings you can trust</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 glass-panel rounded-lg">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Smart Recommendations</h3>
                  <p className="text-sm text-muted-foreground">Personalized property matches</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 glass-panel rounded-lg">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Market Intelligence</h3>
                  <p className="text-sm text-muted-foreground">AI-powered market insights</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Auth Form */}
          <Card className="glass-panel border-primary/20 p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">
                {isLogin ? "Sign In" : "Create Account"}
              </h2>
              <p className="text-muted-foreground">
                {isLogin ? "Access your personalized dashboard" : "Join thousands of users on JaagaX"}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4" />
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                      />
                    </div>

                    {/* City */}
                    <div className="space-y-2">
                      <Label htmlFor="city" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        City
                      </Label>
                      <Select value={city} onValueChange={setCity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your city" />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-3">
                      <Label>I am a</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {allowedSignupRoles.map((role) => {
                          const config = roleConfig[role];
                          const Icon = config.icon;
                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => setSelectedRole(role)}
                              className={`p-4 rounded-xl border-2 transition-all ${
                                selectedRole === role
                                  ? `${config.borderColor} bg-gradient-to-br ${config.color} glow-effect`
                                  : "border-border bg-muted/20 hover:border-primary/30"
                              }`}
                            >
                              <Icon className={`w-6 h-6 mx-auto mb-2 ${selectedRole === role ? 'text-primary' : 'text-muted-foreground'}`} />
                              <p className="text-sm font-medium">{config.title}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {!isLogin && (
                  <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading} size="lg">
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
                className="text-primary hover:underline text-sm font-medium"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
