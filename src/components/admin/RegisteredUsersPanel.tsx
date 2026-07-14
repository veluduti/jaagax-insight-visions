import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Eye, Users, Mail, Phone, MapPin, Shield, Calendar, Search, UserCircle, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface SignupRow {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  requested_role: string | null;
  status: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  user_id: string;
  type: string;
  status: string;
  created_at: string;
}

interface UserCardData {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  created_at: string;
  roles: string[]; // unique role types
  profiles: ProfileRow[];
  signup: SignupRow | null;
}

const ROLE_COLORS: Record<string, string> = {
  buyer: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  seller: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  agent: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  builder: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  customer: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  admin: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export default function RegisteredUsersPanel() {
  const [users, setUsers] = useState<UserCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<UserCardData | null>(null);
  const [deleting, setDeleting] = useState<UserCardData | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);
  const [query, setQuery] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-list-users");
      if (error || (data as any)?.error) {
        toast({
          title: "Failed to load users",
          description: (data as any)?.error || error?.message || "Unknown error",
          variant: "destructive",
        });
        setUsers([]);
        return;
      }
      const list = ((data as any)?.users ?? []) as UserCardData[];
      setUsers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ADMIN_ROLES = ["admin", "country_admin", "state_admin", "district_admin"];
  const normalizedUsers = useMemo(() => {
    return users.map((u) => {
      const adminRole = u.roles.find((r) => ADMIN_ROLES.includes(r));
      // Admin users should only display their admin role — hide implicit buyer/customer profiles.
      const roles = adminRole ? [adminRole] : u.roles;
      return { ...u, roles };
    });
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalizedUsers;
    return normalizedUsers.filter((u) =>
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.city ?? "").toLowerCase().includes(q) ||
      u.roles.some((r) => r.toLowerCase().includes(q))
    );
  }, [normalizedUsers, query]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Registered Users ({users.length})
            </CardTitle>
            <CardDescription>All users on the platform with the roles they hold</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, city, role..."
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No users found</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((u) => (
              <motion.div
                key={u.user_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-card/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-5 w-5 text-primary shrink-0" />
                      <div className="font-semibold truncate">
                        {u.full_name || u.email || `User ${u.user_id.slice(0, 8)}`}
                      </div>
                    </div>
                    {u.email && (
                      <div className="text-xs text-muted-foreground mt-1 truncate flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {u.email}
                      </div>
                    )}
                    {u.city && (
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {u.city}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {u.roles.length === 0 ? (
                        u.signup?.requested_role ? (
                          <Badge
                            variant="outline"
                            className={`capitalize text-[10px] ${ROLE_COLORS[u.signup?.requested_role] ?? ""}`}
                          >
                            {u.signup?.requested_role} (pending)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">no role</Badge>
                        )
                      ) : (
                        u.roles.map((r) => (
                          <Badge
                            key={r}
                            variant="outline"
                            className={`capitalize text-[10px] ${ROLE_COLORS[r] ?? ""}`}
                          >
                            {r}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setViewing(u)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive border-destructive/40 hover:bg-destructive/10"
                      onClick={() => setDeleting(u)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Detail Dialog */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              User Details
            </DialogTitle>
            <DialogDescription>Complete profile and role information</DialogDescription>
          </DialogHeader>

          {viewing && (
            <div className="space-y-4">
              {/* Identity */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Identity</div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <Field icon={UserCircle} label="Name" value={viewing.full_name || "—"} />
                  <Field icon={Mail} label="Email" value={viewing.email || "—"} />
                  <Field icon={Phone} label="Phone" value={viewing.phone || "—"} />
                  <Field icon={MapPin} label="City" value={viewing.city || "—"} />
                  <Field
                    icon={Calendar}
                    label="Registered"
                    value={new Date(viewing.created_at).toLocaleString()}
                  />
                  <Field label="User ID" value={viewing.user_id} />
                </div>
              </div>

              {/* Roles */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Roles ({viewing.roles.length})
                </div>
                {viewing.roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No roles assigned yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {viewing.roles.map((r) => (
                      <Badge
                        key={r}
                        variant="outline"
                        className={`capitalize ${ROLE_COLORS[r] ?? ""}`}
                      >
                        {r}
                      </Badge>
                    ))}
                  </div>
                )}
                {viewing.profiles.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {viewing.profiles.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-xs text-muted-foreground"
                      >
                        <span className="capitalize">{p.type}</span>
                        <span>added {new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && !deletingInProgress && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <span className="font-semibold text-foreground">
                {deleting?.full_name || deleting?.email || "this user"}
              </span> and all their roles. They will receive an SMS notifying them their account was deleted by an admin. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingInProgress}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingInProgress}
              onClick={async (e) => {
                e.preventDefault();
                if (!deleting) return;
                setDeletingInProgress(true);
                try {
                  const { data, error } = await supabase.functions.invoke("admin-delete-user", {
                    body: { targetUserId: deleting.user_id },
                  });
                  if (error || (data as any)?.error) {
                    toast({
                      title: "Delete failed",
                      description: (data as any)?.error || error?.message || "Unknown error",
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: "User deleted",
                      description: (data as any)?.smsSent ? "User notified via SMS." : "User removed (SMS not sent — no phone on file).",
                    });
                    setDeleting(null);
                    await load();
                  }
                } finally {
                  setDeletingInProgress(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingInProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function Field({
  icon: Icon, label, value,
}: { icon?: any; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className="text-sm text-foreground font-medium break-words">{value}</div>
    </div>
  );
}
