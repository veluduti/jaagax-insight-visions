import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Home, Users, Building2, Tag, Plus, Check, Clock, ChevronDown, LogOut, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useProfile, ProfileType, Profile } from "@/contexts/ProfileContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AddRoleModal from "./AddRoleModal";
import { cn } from "@/lib/utils";

const roleMeta: Record<ProfileType, { icon: any; label: string; gradient: string; iconColor: string }> = {
  buyer:   { icon: Home,       label: "Buyer",   gradient: "from-sky-500/20 to-cyan-400/10",     iconColor: "text-sky-300" },
  seller:  { icon: Tag,        label: "Seller",  gradient: "from-emerald-500/20 to-teal-400/10", iconColor: "text-emerald-300" },
  agent:   { icon: Users,      label: "Agent",   gradient: "from-violet-500/20 to-fuchsia-500/10", iconColor: "text-violet-300" },
  builder: { icon: Building2,  label: "Builder", gradient: "from-amber-500/20 to-orange-500/10", iconColor: "text-amber-300" },
};

const dashboardRoute = (type: ProfileType) => `/dashboard/${type}`;

export default function ProfileSwitcher() {
  const navigate = useNavigate();
  const { profiles, activeProfile, switchProfile, removeProfile, loading } = useProfile();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [removingProfile, setRemovingProfile] = useState<Profile | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  if (loading || !user || !activeProfile) return null;

  const handleSwitch = async (p: Profile) => {
    if (p.id === activeProfile.id) { setOpen(false); return; }
    if (p.status !== "active") return; // Don't switch to pending profiles
    await switchProfile(p.id);
    setOpen(false);
    navigate(dashboardRoute(p.type));
  };

  const activeMeta = roleMeta[activeProfile.type];
  const ActiveIcon = activeMeta.icon;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "relative h-9 gap-2 pr-2 pl-2 rounded-full border border-border/60 bg-gradient-to-br backdrop-blur",
              activeMeta.gradient
            )}
          >
            <span className="h-6 w-6 rounded-full bg-background/70 flex items-center justify-center">
              <ActiveIcon className={cn("h-3.5 w-3.5", activeMeta.iconColor)} />
            </span>
            <span className="text-xs font-medium hidden sm:inline">{activeMeta.label}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-80 p-0 glass-panel border-primary/20" sideOffset={8}>
          {/* Active profile header */}
          <div className={cn(
            "p-4 rounded-t-md bg-gradient-to-br border-b border-border/40",
            activeMeta.gradient
          )}>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-background/70 backdrop-blur flex items-center justify-center ring-2 ring-primary/40">
                <ActiveIcon className={cn("h-5 w-5", activeMeta.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Current profile</div>
                <div className="font-semibold text-foreground truncate">{activeMeta.label}</div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/40 text-[10px]">
                Active
              </Badge>
            </div>
          </div>

          {/* Switch list */}
          <div className="p-2">
            <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Switch profile
            </div>
            <div className="space-y-1">
              {profiles.map((p) => {
                const meta = roleMeta[p.type];
                const Icon = meta.icon;
                const isActive = p.id === activeProfile.id;
                const isPending = p.status === "pending";
                return (
                  <motion.button
                    key={p.id}
                    whileHover={!isPending ? { scale: 1.01 } : undefined}
                    whileTap={!isPending ? { scale: 0.99 } : undefined}
                    onClick={() => handleSwitch(p)}
                    disabled={isPending}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      isActive ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-accent",
                      isPending && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className={cn("h-8 w-8 rounded-md bg-gradient-to-br flex items-center justify-center", meta.gradient)}>
                      <Icon className={cn("h-4 w-4", meta.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground flex items-center gap-2">
                        {meta.label}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                            <Clock className="h-3 w-3" /> Pending approval
                          </span>
                        )}
                      </div>
                    </div>
                    {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </motion.button>
                );
              })}
            </div>

            {/* Add another role */}
            {profiles.length < 4 && (
              <button
                onClick={() => { setOpen(false); setAddOpen(true); }}
                className="mt-2 w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left border border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Add another role</div>
                  <div className="text-[11px] text-muted-foreground">Expand what you can do on JAAGA X</div>
                </div>
              </button>
            )}

            <div className="my-2 h-px bg-border/60" />

            <button
              onClick={() => { setOpen(false); void signOut(); }}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <AddRoleModal open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
