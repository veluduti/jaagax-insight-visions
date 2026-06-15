import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Users, Building2, Tag, Plus, Loader2, Clock, ArrowRight, Landmark } from "lucide-react";
import { useProfile, ProfileType, Profile } from "@/contexts/ProfileContext";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import AddRoleModal from "@/components/profile/AddRoleModal";
import { cn } from "@/lib/utils";

const roleMeta: Record<ProfileType, { icon: any; label: string; subtitle: string; gradient: string; iconColor: string; ring: string }> = {
  buyer: {
    icon: Home, label: "Buyer",
    subtitle: "Browse properties, schedule visits, get AI recommendations",
    gradient: "from-sky-500/20 via-cyan-500/10 to-transparent",
    iconColor: "text-sky-300",
    ring: "hover:ring-sky-500/50",
  },
  seller: {
    icon: Tag, label: "Seller",
    subtitle: "List your property, attract verified buyers, close deals",
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    iconColor: "text-emerald-300",
    ring: "hover:ring-emerald-500/50",
  },
  agent: {
    icon: Users, label: "Agent",
    subtitle: "List properties, manage leads, run visits",
    gradient: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
    iconColor: "text-violet-300",
    ring: "hover:ring-violet-500/50",
  },
  builder: {
    icon: Building2, label: "Builder",
    subtitle: "Showcase projects, manage units, run promotions",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    iconColor: "text-amber-300",
    ring: "hover:ring-amber-500/50",
  },
  financial: {
    icon: Landmark, label: "Financial",
    subtitle: "Home loans, mortgages, legal & valuation services",
    gradient: "from-yellow-500/25 via-amber-500/15 to-transparent",
    iconColor: "text-amber-300",
    ring: "hover:ring-amber-400/60",
  },
};

export default function SelectProfile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profiles, activeProfile, switchProfile, loading } = useProfile();
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // If only one profile, auto-select it
  useEffect(() => {
    if (!loading && profiles.length === 1 && profiles[0].status === "active") {
      void switchProfile(profiles[0].id).then(() => navigate(`/dashboard/${profiles[0].type}`));
    }
  }, [loading, profiles, switchProfile, navigate]);

  const handlePick = async (p: Profile) => {
    if (p.status !== "active") return;
    await switchProfile(p.id);
    navigate(`/dashboard/${p.type}`);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6 flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-4xl w-full"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3">
            Choose your <span className="text-gradient">profile</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            You have {profiles.length} {profiles.length === 1 ? "profile" : "profiles"}. Pick one to continue.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((p, idx) => {
            const meta = roleMeta[p.type];
            const Icon = meta.icon;
            const isPending = p.status === "pending";
            const isActive = activeProfile?.id === p.id;
            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                whileHover={!isPending ? { y: -4, scale: 1.01 } : undefined}
                whileTap={!isPending ? { scale: 0.99 } : undefined}
                onClick={() => handlePick(p)}
                disabled={isPending}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border/60 p-6 text-left transition-all",
                  "bg-gradient-to-br hover:border-primary/60 ring-1 ring-transparent",
                  meta.gradient,
                  meta.ring,
                  isPending && "opacity-60 cursor-not-allowed",
                  isActive && "ring-2 ring-primary/60"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-14 w-14 rounded-xl bg-background/70 backdrop-blur flex items-center justify-center">
                    <Icon className={cn("h-7 w-7", meta.iconColor)} />
                  </div>
                  {isActive && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/40 text-[10px]">
                      Last used
                    </Badge>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">{meta.label}</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{meta.subtitle}</p>
                {isPending ? (
                  <div className="inline-flex items-center gap-1.5 text-xs text-amber-400">
                    <Clock className="h-3.5 w-3.5" /> Pending admin approval
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-sm text-primary group-hover:gap-2 transition-all">
                    Continue <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </motion.button>
            );
          })}

          {profiles.length < 5 && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: profiles.length * 0.08 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setAddOpen(true)}
              className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-border/60 p-6 text-left transition-all hover:border-primary/60 hover:bg-primary/5"
            >
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Plus className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-1">Add another role</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Become a buyer, agent, or builder — all from one account.
              </p>
            </motion.button>
          )}
        </div>

        {profiles.length === 0 && (
          <Card className="glass-panel border-primary/20 p-8 text-center">
            <p className="text-muted-foreground mb-4">You don't have any profiles yet.</p>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create your first profile
            </Button>
          </Card>
        )}
      </motion.div>

      <AddRoleModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
