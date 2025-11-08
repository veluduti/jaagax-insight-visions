import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Sparkles, 
  Menu, 
  X, 
  TrendingUp, 
  BookOpen, 
  Home as HomeIcon, 
  Calendar, 
  Globe, 
  DollarSign, 
  Ruler 
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

const NavItem = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <motion.a
    href={href}
    className="text-foreground hover:text-primary transition-colors font-medium relative group"
    whileHover={{ y: -2 }}
  >
    {children}
    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
  </motion.a>
);

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [preferences, setPreferences] = useState({
    language: 'English',
    currency: 'INR',
    areaUnit: 'Sq.ft'
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Check auth state
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchPreferences(user.id);
      }
    });
  }, []);

  const fetchPreferences = async (userId: string) => {
    const { data } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data) {
      setPreferences({
        language: data.language || 'English',
        currency: data.currency || 'INR',
        areaUnit: data.area_unit || 'Sq.ft'
      });
    }
  };

  const updatePreference = async (field: string, value: string) => {
    if (!user) return;

    const updates = {
      user_id: user.id,
      [field === 'areaUnit' ? 'area_unit' : field]: value
    };

    const { error } = await supabase
      .from('user_preferences')
      .upsert(updates);

    if (!error) {
      setPreferences(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "glass-panel shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.a
            href="/"
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center glow-effect">
              <span className="text-2xl font-bold text-primary-foreground">J</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient">JaagaX</h1>
              <p className="text-xs text-muted-foreground">Intelligent Realty</p>
            </div>
          </motion.a>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-6">
            <NavItem href="/agents">Find My Agent</NavItem>
            <NavItem href="/seller-dashboard">Sell My Property</NavItem>
            <NavItem href="/trustscore">TrustScore™</NavItem>
            <NavItem href="/transactions">Transactions</NavItem>
            <NavItem href="/projects">New Projects</NavItem>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="hidden md:flex border-primary/50 hover:bg-primary/10 glow-effect"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Try JaagaXGPT
            </Button>
            
            {user ? (
              <Button 
                variant="default" 
                onClick={() => window.location.href = '/buyer-dashboard'}
              >
                <User className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            ) : (
              <Button 
                variant="default" 
                className="glow-effect"
                onClick={() => window.location.href = '/auth'}
              >
                <User className="h-4 w-4 mr-2" />
                Sign up / Log in
              </Button>
            )}

            {/* Hamburger Menu */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-16 right-0 h-[calc(100vh-4rem)] w-80 glass-panel border-l border-border/50 shadow-2xl overflow-y-auto z-40"
          >
            <div className="p-6 space-y-6">
              {/* Navigation Links */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Explore
                </h3>
                
                <a
                  href="/valuation"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="font-medium group-hover:text-primary">TruValue™</span>
                </a>

                <a
                  href="/communities"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  <HomeIcon className="h-5 w-5 text-primary" />
                  <span className="font-medium group-hover:text-primary">Communities</span>
                </a>

                <a
                  href="/guides"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="font-medium group-hover:text-primary">Guides & Blogs</span>
                </a>

                <a
                  href="/events"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium group-hover:text-primary">Events</span>
                </a>

                <a
                  href="/agent-dashboard"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  <User className="h-5 w-5 text-primary" />
                  <span className="font-medium group-hover:text-primary">Agent Portal</span>
                </a>
              </div>

              {/* Divider */}
              <div className="border-t border-border/50" />

              {/* Site Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Site Settings
                </h3>

                {/* Language */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <span>Language</span>
                  </div>
                  <Select 
                    value={preferences.language} 
                    onValueChange={(value) => updatePreference('language', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Hindi">हिन्दी (Hindi)</SelectItem>
                      <SelectItem value="Telugu">తెలుగు (Telugu)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Currency */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Currency</span>
                  </div>
                  <Select 
                    value={preferences.currency} 
                    onValueChange={(value) => updatePreference('currency', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">₹ INR (Indian Rupee)</SelectItem>
                      <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Area Unit */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Ruler className="h-4 w-4" />
                    <span>Area Unit</span>
                  </div>
                  <Select 
                    value={preferences.areaUnit} 
                    onValueChange={(value) => updatePreference('areaUnit', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sq.ft">Sq.ft (Square Feet)</SelectItem>
                      <SelectItem value="Sq.m">Sq.m (Square Meters)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navigation;
