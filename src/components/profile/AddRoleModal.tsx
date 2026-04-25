import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Home, Users, Building2, Loader2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useProfile, ProfileType } from "@/contexts/ProfileContext";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleMeta: Record<ProfileType, { icon: any; title: string; subtitle: string; gradient: string; ring: string }> = {
  buyer: {
    icon: Home,
    title: "Buyer",
    subtitle: "Browse, shortlist, and book site visits",
    gradient: "from-blue-500/20 via-cyan-500/10 to-transparent",
    ring: "ring-blue-500/60",
  },
  agent: {
    icon: Users,
    title: "Agent",
    subtitle: "List properties and earn from referrals",
    gradient: "from-purple-500/20 via-pink-500/10 to-transparent",
    ring: "ring-purple-500/60",
  },
  builder: {
    icon: Building2,
    title: "Builder",
    subtitle: "Showcase projects and manage developments",
    gradient: "from-orange-500/20 via-red-500/10 to-transparent",
    ring: "ring-orange-500/60",
  },
};

export default function AddRoleModal({ open, onOpenChange }: Props) {
  const { profiles, addProfile, switchProfile } = useProfile();
  const [step, setStep] = useState<"select" | "form">("select");
  const [chosen, setChosen] = useState<ProfileType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields (used per role)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [extra, setExtra] = useState("");

  const existingTypes = new Set(profiles.map((p) => p.type));
  const availableRoles = (Object.keys(roleMeta) as ProfileType[]).filter((t) => !existingTypes.has(t));

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
      if (chosen === "buyer") {
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

      // Switch to it only if it's not pending (builder will be pending)
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
      <DialogContent className="max-w-2xl glass-panel border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {step === "select" ? "Add another role" : `Set up your ${chosen ? roleMeta[chosen].title : ""} profile`}
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Pick the role you want to add. You can switch between them anytime."
              : "Just a few details to get you started. You can edit these later."}
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <>
            {availableRoles.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                You already have all available roles. Nice!
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 py-4">
                {availableRoles.map((t) => {
                  const meta = roleMeta[t];
                  const Icon = meta.icon;
                  return (
                    <motion.button
                      key={t}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePickRole(t)}
                      className={cn(
                        "relative overflow-hidden rounded-xl border border-border/60 p-5 text-left transition-all",
                        "bg-gradient-to-br hover:border-primary/50 hover:shadow-lg",
                        meta.gradient
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 shrink-0 rounded-lg bg-background/60 backdrop-blur flex items-center justify-center">
                          <Icon className="h-5 w-5 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground">{meta.title}</div>
                          <p className="text-xs text-muted-foreground mt-0.5">{meta.subtitle}</p>
                          {t === "builder" && (
                            <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-amber-500">
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
            <div className="space-y-2">
              <Label htmlFor="fullName">
                {chosen === "builder" ? "Company name" : "Full name"}
              </Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={chosen === "builder" ? "Your company name" : "Your full name"} />
            </div>
            {chosen !== "buyer" && (
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
                {chosen === "buyer" ? "What are you looking for?" : chosen === "agent" ? "Short bio" : "About your company"}
              </Label>
              <Textarea id="extra" value={extra} onChange={(e) => setExtra(e.target.value)} rows={3} placeholder="Optional" />
            </div>
            {chosen === "builder" && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300 flex items-start gap-2">
                <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Builder profiles require admin approval before the builder dashboard activates. We'll notify you.</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "form" && (
            <Button variant="ghost" onClick={() => setStep("select")} disabled={submitting}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Cancel
          </Button>
          {step === "form" && (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create profile
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
