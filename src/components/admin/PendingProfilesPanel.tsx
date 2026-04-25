import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, Eye, UserPlus, Mail, Phone, MapPin, Clock, Shield } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ProfileRow {
  id: string;
  user_id: string;
  type: string;
  status: string;
  created_at: string;
}

interface DetailBundle {
  profile: ProfileRow;
  email: string | null;
  authMeta: Record<string, any>;
  roleData: Record<string, any> | null;
}

const ROLE_TABLE: Record<string, string> = {
  buyer: "buyer_profiles",
  seller: "buyer_profiles", // sellers reuse buyer_profiles structure
  agent: "agent_profiles",
  builder: "builder_profiles_data",
};

export default function PendingProfilesPanel() {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<DetailBundle | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles" as any)
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as ProfileRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleView = async (p: ProfileRow) => {
    setViewLoading(true);
    setViewing({ profile: p, email: null, authMeta: {}, roleData: null });
    try {
      // Fetch role-specific data
      const table = ROLE_TABLE[p.type];
      let roleData: any = null;
      if (table) {
        const { data } = await supabase.from(table as any).select("*").eq("profile_id", p.id).maybeSingle();
        roleData = data;
      }
      // Try to fetch a recent signup_request as a richer source of contact data
      const { data: sr } = await supabase
        .from("signup_requests" as any)
        .select("email, full_name, phone, city")
        .eq("user_id", p.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setViewing({
        profile: p,
        email: (sr as any)?.email ?? null,
        authMeta: {
          full_name: (sr as any)?.full_name ?? null,
          phone: (sr as any)?.phone ?? null,
          city: (sr as any)?.city ?? null,
        },
        roleData,
      });
    } finally {
      setViewLoading(false);
    }
  };

  const handleDecision = async (p: ProfileRow, decision: "approve" | "reject") => {
    setActingId(p.id);
    try {
      const fn = decision === "approve" ? "approve_profile" : "reject_profile";
      const params: any = decision === "approve"
        ? { _profile_id: p.id }
        : { _profile_id: p.id, _reason: "Not eligible at this time" };
      const { error } = await supabase.rpc(fn as any, params);
      if (error) throw error;
      toast.success(`${p.type} role ${decision === "approve" ? "approved" : "rejected"}`);
      setViewing(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Action failed");
    } finally {
      setActingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Pending Role Approvals ({rows.length})
        </CardTitle>
        <CardDescription>Approve or reject role requests from existing users</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No pending role requests</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((p) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card to-card/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{p.type}</Badge>
                      <Badge variant="secondary" className="text-[10px]"><Clock className="h-3 w-3 mr-1" />pending</Badge>
                    </div>
                    <div className="mt-2 text-sm font-medium truncate">User: {p.user_id.slice(0, 8)}…</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Requested {new Date(p.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleView(p)}>
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                  <Button size="sm" onClick={() => handleDecision(p, "approve")} disabled={actingId === p.id}>
                    {actingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />} Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDecision(p, "reject")} disabled={actingId === p.id}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Review Dialog */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Review {viewing?.profile.type} role request
            </DialogTitle>
            <DialogDescription>Verify the user's details before approving.</DialogDescription>
          </DialogHeader>

          {viewLoading || !viewing ? (
            <div className="py-12 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {/* Identity card */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Identity</div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <DetailRow icon={UserPlus} label="Name" value={viewing.authMeta.full_name || "—"} />
                  <DetailRow icon={Mail} label="Email" value={viewing.email || "—"} />
                  <DetailRow icon={Phone} label="Phone" value={viewing.authMeta.phone || "—"} />
                  <DetailRow icon={MapPin} label="City" value={viewing.authMeta.city || "—"} />
                </div>
              </div>

              {/* Role-specific details */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{viewing.profile.type} details</div>
                {viewing.roleData ? (
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    {Object.entries(viewing.roleData)
                      .filter(([k]) => !["id", "profile_id", "created_at", "updated_at"].includes(k))
                      .map(([k, v]) => (
                        <DetailRow key={k} label={k.replace(/_/g, " ")} value={formatVal(v)} />
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No additional role data submitted.</p>
                )}
              </div>

              <div className="rounded-xl border bg-muted/30 p-4 grid sm:grid-cols-2 gap-3 text-sm">
                <DetailRow label="Requested" value={new Date(viewing.profile.created_at).toLocaleString()} />
                <DetailRow label="User ID" value={viewing.profile.user_id} />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            {viewing && (
              <>
                <Button variant="destructive" onClick={() => handleDecision(viewing.profile, "reject")} disabled={actingId === viewing.profile.id}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button onClick={() => handleDecision(viewing.profile, "approve")} disabled={actingId === viewing.profile.id}>
                  {actingId === viewing.profile.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Approve role
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function formatVal(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function DetailRow({ icon: Icon, label, value }: { icon?: any; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className="text-sm text-foreground font-medium break-words">{value}</div>
    </div>
  );
}
