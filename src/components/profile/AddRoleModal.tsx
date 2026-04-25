import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Home, Users, Building2, Tag, Loader2, Clock, Sparkles, ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useProfile, ProfileType } from "@/contexts/ProfileContext";
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
  // Premium look tokens — deep gradient + glowing accent
  gradient: string;
  iconBg: string;
  iconColor: string;
  glow: string;
  accent: string; // text color for accents
}

const roleMeta: Record<ProfileType, RoleMeta> = {
  buyer: {
    icon: Home,
    title: "Buyer",
    subtitle: "Discover dream homes & schedule visits",
    perks: ["AI property matches", "Site-visit booking", "Saved searches"],
    gradient: "from-sky-500/30 via-cyan-500/15 to-transparent",
    iconBg: "bg-gradient-to-br from-sky-500/30 to-cyan-500/20",
    iconColor: "text-sky-200",
    glow: "shadow-[0_0_40px_-10px_hsl(200_90%_60%/0.45)]",
    accent: "text-sky-300",
  },
  seller: {
    icon: Tag,
    title: "Seller",
    subtitle: "List your property, attract verified buyers",
    perks: ["Verified buyer leads", "Listing analytics", "Premium visibility"],
    gradient: "from-emerald-500/30 via-teal-500/15 to-transparent",
    iconBg: "bg-gradient-to-br from-emerald-500/30 to-teal-500/20",
    iconColor: "text-emerald-200",
    glow: "shadow-[0_0_40px_-10px_hsl(160_85%_50%/0.45)]",
    accent: "text-emerald-300",
  },
  agent: {
    icon: Users,
    title: "Agent",
    subtitle: "Manage leads, list properties, run visits",
    perks: ["Lead pipeline", "Visit scheduler", "Trust score boosts"],
    gradient: "from-violet-500/30 via-fuchsia-500/15 to-transparent",
    iconBg: "bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20",
    iconColor: "text-violet-200",
    glow: "shadow-[0_0_40px_-10px_hsl(280_85%_65%/0.45)]",
    accent: "text-violet-300",
  },
  builder: {
    icon: Building2,
    title: "Builder",
    subtitle: "Showcase projects & manage developments",
    perks: ["Project microsite", "Promotions reels", "RERA verified badge"],
    gradient: "from-amber-500/30 via-orange-500/15 to-transparent",
    iconBg: "bg-gradient-to-br from-amber-500/30 to-orange-500/20",
    iconColor: "text-amber-200",
    glow: "shadow-[0_0_40px_-10px_hsl(35_95%_60%/0.45)]",
    accent: "text-amber-300",
  },
};

const ROLE_ORDER: ProfileType[] = ["buyer", "seller", "agent", "builder"];

export default function AddRoleModal({ open, onOpenChange }: Props) {
  const { profiles, addProfile, switchProfile } = useProfile();
  const [step, setStep] = useState<"select" | "form">("select");
  const [chosen, setChosen] = useState<ProfileType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [extra, setExtra] = useState("");

  const existingTypes = new Set(profiles.map((p) => p.type));
  const availableRoles = ROLE_ORDER.filter((t) => !existingTypes.has(t));

  const reset = () => {
    setStep("select"); setChosen(null);
    setFullName(""); setPhone(""); setCity(""); setExtra("");
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handlePickRole = (type: ProfileType) => {
    setChosen(type);
    setStep("form");
  };

  const handleSubmit = async () => {
    if (!chosen) return;
    setSubmitting(true);
    try {
      const extraData: Record<string, any> = {};
      if (chosen === "buyer" || chosen === "seller") {
        if (fullName) extraData.full_name = fullName;
        if (city) extraData.preferred_cities = [city];
        if (extra) extraData.notes = extra;
      } else if (chosen === "agent") {
        if (fullName) extraData.full_name = fullName;
        if (phone) extraData.phone = phone;
        if (city) extraData.cities_served = city;
        if (extra) extraData.bio = extra;
      } else if (chosen === "builder") {
        if (fullName) extraData.company_name = fullName;
        if (phone) extraData.phone = phone;
        if (city) extraData.city = city;
        if (extra) extraData.description = extra;
      }

      const { profile, error } = await addProfile(chosen, extraData);
      if (error || !profile) {
        toast.error(error ?? "Could not create profile");
        return;
      }

      if (profile.status === "active") {
        await switchProfile(profile.id);
        toast.success(`Welcome, ${roleMeta[chosen].title}! Profile activated.`);
      } else {
        toast.success(`${roleMeta[chosen].title} profile submitted — awaiting admin approval.`);
      }
      handleClose(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-border/40 bg-gradient-to-br from-background via-background to-primary/5">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-accent/15 rounded-full blur-3xl" />
        </div>

        <div className="relative px-6 pt-6 pb-2">
          <DialogHeader>
            <div className="inline-flex items-center gap-2 self-start mb-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" />
              {step === "select" ? "Expand your account" : "One more step"}
            </div>
            <DialogTitle className="text-2xl sm:text-3xl font-bold">
              {step === "select"
                ? "Add another role"
                : `Set up your ${chosen ? roleMeta[chosen].title : ""} profile`}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {step === "select"
                ? "One account, multiple powers. Switch between roles anytime — no logout needed."
                : "A few quick details to personalize your experience. You can edit later."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="relative px-6 pb-6 max-h-[65vh] overflow-y-auto">
          {step === "select" && (
            <>
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
                    const meta = roleMeta[t];
                    const Icon = meta.icon;
                    const requiresApproval = true; // all roles require approval per current system
                    return (
                      <motion.button
                        key={t}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        whileHover={{ y: -3, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handlePickRole(t)}
                        className={cn(
                          "group relative overflow-hidden rounded-2xl border border-border/50 p-5 text-left transition-all",
                          "bg-gradient-to-br hover:border-primary/50",
                          meta.gradient,
                          "hover:" + meta.glow
                        )}
                      >
                        {/* subtle inner ring */}
                        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />

                        <div className="relative flex items-start gap-4">
                          <div className={cn(
                            "h-12 w-12 shrink-0 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10",
                            meta.iconBg
                          )}>
                            <Icon className={cn("h-6 w-6", meta.iconColor)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-base font-semibold text-foreground">{meta.title}</div>
                              <ArrowRight className={cn(
                                "h-4 w-4 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0",
                                meta.accent
                              )} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{meta.subtitle}</p>

                            <ul className="mt-3 space-y-1">
                              {meta.perks.map((p) => (
                                <li key={p} className="flex items-center gap-1.5 text-[11px] text-foreground/70">
                                  <Check className={cn("h-3 w-3", meta.accent)} />
                                  {p}
                                </li>
                              ))}
                            </ul>

                            {requiresApproval && (
                              <div className="mt-3 inline-flex items-center gap-1 text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                                <Clock className="h-3 w-3" /> Requires admin approval
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {step === "form" && chosen && (
            <div className="space-y-4 py-2">
              <div className={cn(
                "rounded-xl border border-border/50 p-3 flex items-center gap-3 bg-gradient-to-br",
                roleMeta[chosen].gradient
              )}>
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center border border-white/10", roleMeta[chosen].iconBg)}>
                  {(() => { const I = roleMeta[chosen].icon; return <I className={cn("h-5 w-5", roleMeta[chosen].iconColor)} />; })()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{roleMeta[chosen].title} profile</div>
                  <div className="text-[11px] text-muted-foreground">{roleMeta[chosen].subtitle}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">
                  {chosen === "builder" ? "Company name" : "Full name"}
                </Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={chosen === "builder" ? "Your company name" : "Your full name"} />
              </div>
              {chosen !== "buyer" && chosen !== "seller" && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="city">{chosen === "agent" ? "Cities served" : "Primary city"}</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Hyderabad" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="extra">
                  {chosen === "buyer"
                    ? "What are you looking for?"
                    : chosen === "seller"
                    ? "Tell us about your property"
                    : chosen === "agent"
                    ? "Short bio"
                    : "About your company"}
                </Label>
                <Textarea id="extra" value={extra} onChange={(e) => setExtra(e.target.value)} rows={3} placeholder="Optional" />
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300/90 flex items-start gap-2">
                <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                <span>This role requires admin approval before it activates. We'll notify you the moment it's ready.</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="relative px-6 py-4 border-t border-border/40 bg-background/50 backdrop-blur gap-2">
          {step === "form" && (
            <Button variant="ghost" onClick={() => setStep("select")} disabled={submitting}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Cancel
          </Button>
          {step === "form" && (
            <Button onClick={handleSubmit} disabled={submitting} className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-95">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit for approval
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
