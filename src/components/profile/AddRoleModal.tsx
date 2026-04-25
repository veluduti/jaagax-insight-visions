import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Home, Users, Building2, Tag, Loader2, Clock, Sparkles, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useProfile, ProfileType } from "@/contexts/ProfileContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RoleMeta {
  icon: any;
  title: string;
  subtitle: string;
  perks: string[];
  gradient: string;
  iconBg: string;
  iconColor: string;
  glow: string;
  accent: string;
}

const roleMeta: Record<ProfileType, RoleMeta> = {
  buyer: {
    icon: Home, title: "Buyer", subtitle: "Discover dream homes & schedule visits",
    perks: ["AI property matches", "Site-visit booking", "Saved searches"],
    gradient: "from-sky-500/30 via-cyan-500/15 to-transparent",
    iconBg: "bg-gradient-to-br from-sky-500/30 to-cyan-500/20",
    iconColor: "text-sky-200", glow: "shadow-[0_0_40px_-10px_hsl(200_90%_60%/0.45)]", accent: "text-sky-300",
  },
  seller: {
    icon: Tag, title: "Seller", subtitle: "List your property, attract verified buyers",
    perks: ["Verified buyer leads", "Listing analytics", "Premium visibility"],
    gradient: "from-emerald-500/30 via-teal-500/15 to-transparent",
    iconBg: "bg-gradient-to-br from-emerald-500/30 to-teal-500/20",
    iconColor: "text-emerald-200", glow: "shadow-[0_0_40px_-10px_hsl(160_85%_50%/0.45)]", accent: "text-emerald-300",
  },
  agent: {
    icon: Users, title: "Agent", subtitle: "Manage leads, list properties, run visits",
    perks: ["Lead pipeline", "Visit scheduler", "Trust score boosts"],
    gradient: "from-violet-500/30 via-fuchsia-500/15 to-transparent",
    iconBg: "bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20",
    iconColor: "text-violet-200", glow: "shadow-[0_0_40px_-10px_hsl(280_85%_65%/0.45)]", accent: "text-violet-300",
  },
  builder: {
    icon: Building2, title: "Builder", subtitle: "Showcase projects & manage developments",
    perks: ["Project microsite", "Promotions reels", "RERA verified badge"],
    gradient: "from-amber-500/30 via-orange-500/15 to-transparent",
    iconBg: "bg-gradient-to-br from-amber-500/30 to-orange-500/20",
    iconColor: "text-amber-200", glow: "shadow-[0_0_40px_-10px_hsl(35_95%_60%/0.45)]", accent: "text-amber-300",
  },
};

const ROLE_ORDER: ProfileType[] = ["buyer", "seller", "agent", "builder"];

export default function AddRoleModal({ open, onOpenChange }: Props) {
  const { profiles, addProfile } = useProfile();
  const { user } = useAuth();
  const [chosen, setChosen] = useState<ProfileType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const meta = (user?.user_metadata ?? {}) as Record<string, any>;
  const fullName = meta.name || meta.full_name || user?.email?.split("@")[0] || "User";
  const phone = meta.phone || "";
  const city = meta.city || "";
  const email = user?.email || "";

  const existingTypes = new Set(profiles.map((p) => p.type));
  const availableRoles = ROLE_ORDER.filter((t) => !existingTypes.has(t));

  const reset = () => { setChosen(null); };
  const handleClose = (val: boolean) => { if (!val) reset(); onOpenChange(val); };

  const handleConfirm = async () => {
    if (!chosen) return;
    setSubmitting(true);
    try {
      // Carry over existing user details — no re-entry needed.
      const extraData: Record<string, any> = {};
      if (chosen === "buyer" || chosen === "seller") {
        if (fullName) extraData.full_name = fullName;
        if (city) extraData.preferred_cities = [city];
      } else if (chosen === "agent") {
        if (fullName) extraData.full_name = fullName;
        if (phone) extraData.phone = phone;
        if (city) extraData.cities_served = city;
      } else if (chosen === "builder") {
        if (fullName) extraData.company_name = fullName;
        if (phone) extraData.phone = phone;
        if (city) extraData.city = city;
      }

      const { profile, error } = await addProfile(chosen, extraData);
      if (error || !profile) {
        toast.error(error ?? "Could not request role");
        return;
      }
      toast.success(`${roleMeta[chosen].title} role requested — admin will review your details and approve shortly.`);
      handleClose(false);
    } finally {
      setSubmitting(false);
    }
  };

  const ChosenIcon = chosen ? roleMeta[chosen].icon : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-border/40 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-accent/15 rounded-full blur-3xl" />
        </div>

        <div className="relative px-6 pt-6 pb-2">
          <DialogHeader>
            <div className="inline-flex items-center gap-2 self-start mb-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" />
              {chosen ? "Confirm your request" : "Expand your account"}
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-bold">
              {chosen ? `Request ${roleMeta[chosen].title} role?` : "Add another role"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {chosen
                ? "We'll send your existing profile details to the admin for verification. You'll be notified the moment it's approved."
                : "One account, multiple powers. Pick a role — we already have your details."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="relative px-6 pb-6 max-h-[65vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {!chosen && (
              <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {availableRoles.length === 0 ? (
                  <div className="py-14 text-center">
                    <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3">
                      <Check className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div className="font-semibold text-foreground">You have all available roles.</div>
                    <p className="text-sm text-muted-foreground mt-1">Switch between them from the profile menu.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 py-2">
                    {availableRoles.map((t, idx) => {
                      const m = roleMeta[t];
                      const Icon = m.icon;
                      return (
                        <motion.button
                          key={t}
                          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
                          whileHover={{ y: -3, scale: 1.01 }} whileTap={{ scale: 0.99 }}
                          onClick={() => setChosen(t)}
                          className={cn("group relative overflow-hidden rounded-2xl border border-border/50 p-5 text-left transition-all bg-gradient-to-br hover:border-primary/50", m.gradient)}
                        >
                          <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
                          <div className="relative flex items-start gap-4">
                            <div className={cn("h-12 w-12 shrink-0 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10", m.iconBg)}>
                              <Icon className={cn("h-6 w-6", m.iconColor)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="text-base font-semibold text-foreground">{m.title}</div>
                                <ArrowRight className={cn("h-4 w-4 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0", m.accent)} />
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{m.subtitle}</p>
                              <ul className="mt-3 space-y-1">
                                {m.perks.map((p) => (
                                  <li key={p} className="flex items-center gap-1.5 text-[11px] text-foreground/70">
                                    <Check className={cn("h-3 w-3", m.accent)} />{p}
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-3 inline-flex items-center gap-1 text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                                <Clock className="h-3 w-3" /> Requires admin approval
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {chosen && ChosenIcon && (
              <motion.div key="confirm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 py-2">
                <div className={cn("rounded-2xl border border-border/50 p-5 bg-gradient-to-br", roleMeta[chosen].gradient)}>
                  <div className="flex items-center gap-3">
                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center border border-white/10", roleMeta[chosen].iconBg)}>
                      <ChosenIcon className={cn("h-6 w-6", roleMeta[chosen].iconColor)} />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-foreground">{roleMeta[chosen].title} role</div>
                      <div className="text-xs text-muted-foreground">{roleMeta[chosen].subtitle}</div>
                    </div>
                  </div>
                </div>

                {/* Auto-pulled details summary */}
                <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <div className="text-sm font-medium">These details will be sent to admin:</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Field label="Name" value={fullName} />
                    <Field label="Email" value={email} />
                    <Field label="Phone" value={phone || "—"} />
                    <Field label="City" value={city || "—"} />
                  </div>
                </div>

                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300/90 flex items-start gap-2">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Your request will appear in the admin dashboard for verification. You'll receive a notification once it's approved.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="relative px-6 py-4 border-t border-border/40 bg-background/50 backdrop-blur gap-2">
          {chosen && (
            <Button variant="ghost" onClick={() => setChosen(null)} disabled={submitting}>Back</Button>
          )}
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>Cancel</Button>
          {chosen && (
            <Button onClick={handleConfirm} disabled={submitting} className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-95">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm & request approval
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground font-medium truncate">{value}</div>
    </div>
  );
}
