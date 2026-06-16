import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Users, UserCheck, UserX, Trash2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AddTeamMemberModal, type TeamRole } from "./AddTeamMemberModal";

interface TeamMember {
  id: string;
  builder_profile_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  permissions: Record<string, unknown> | null;
  // FIXED: Use user metadata instead of profiles table
  user_metadata?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
  } | null;
}

interface BuilderTeamDashboardProps {
  builderProfileId?: string;
}

// FIXED: Added viewer color
const roleColors: Record<string, string> = {
  admin: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  manager: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  sales: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  support: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  viewer: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
  <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-semibold text-white">{value}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </CardContent>
  </Card>
);

export const BuilderTeamDashboard = ({ builderProfileId }: BuilderTeamDashboardProps) => {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("builder_profile_id", builderProfileId)
        .order("joined_at", { ascending: false });
      if (error) throw error;

      // FIXED: Fetch user metadata directly from auth.users
      const userIds = (rows || []).map((r: any) => r.user_id);
      const membersWithMeta: TeamMember[] = [];

      for (const row of (rows || []) as any[]) {
        const { data: userData } = await supabase
          .from("auth.users")
          .select("email, raw_user_meta_data")
          .eq("id", row.user_id)
          .maybeSingle();

        membersWithMeta.push({
          ...row,
          user_metadata: userData
            ? {
                email: userData.email,
                full_name:
                  userData.raw_user_meta_data?.full_name || userData.raw_user_meta_data?.name || userData.email,
                avatar_url: userData.raw_user_meta_data?.avatar_url,
              }
            : null,
        });
      }

      setMembers(membersWithMeta);
    } catch (e: any) {
      toast({ title: "Failed to load team", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (builderProfileId) load(); /* eslint-disable-next-line */
  }, [builderProfileId]);

  const filtered = useMemo(() => {
    if (!search) return members;
    const s = search.toLowerCase();
    return members.filter((m) =>
      `${m.user_metadata?.full_name ?? ""} ${m.user_metadata?.email ?? ""} ${m.role}`.toLowerCase().includes(s),
    );
  }, [members, search]);

  const stats = useMemo(
    () => ({
      total: members.length,
      active: members.filter((m) => m.status === "active").length,
      inactive: members.filter((m) => m.status !== "active").length,
      admins: members.filter((m) => m.role === "admin").length,
    }),
    [members],
  );

  const updateRole = async (id: string, role: TeamRole) => {
    try {
      const { error } = await supabase.from("team_members").update({ role }).eq("id", id);
      if (error) throw error;
      toast({ title: "Role updated" });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "active" ? "inactive" : "active";
    try {
      const { error } = await supabase.from("team_members").update({ status: next }).eq("id", id);
      if (error) throw error;
      toast({ title: `Member ${next}` });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleRemove = async () => {
    if (!removeId) return;
    try {
      const { error } = await supabase.from("team_members").delete().eq("id", removeId);
      if (error) throw error;
      toast({ title: "Member removed" });
      setRemoveId(null);
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white">Team</h2>
          <p className="text-sm text-slate-400">Manage your team members, roles, and access</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-emerald-500 hover:bg-emerald-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} icon={Users} color="bg-blue-500/20 text-blue-300" />
        <StatCard label="Active" value={stats.active} icon={UserCheck} color="bg-emerald-500/20 text-emerald-300" />
        <StatCard label="Inactive" value={stats.inactive} icon={UserX} color="bg-slate-500/20 text-slate-300" />
        <StatCard label="Admins" value={stats.admins} icon={Shield} color="bg-purple-500/20 text-purple-300" />
      </div>

      <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-white">Members</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="pl-9 bg-slate-800/60 border-white/10 text-white"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-slate-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-slate-400">No team members yet</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-lg border border-white/10 bg-slate-800/40 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-semibold">
                      {(m.user_metadata?.full_name || m.user_metadata?.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">{m.user_metadata?.full_name || "Unnamed"}</div>
                      <div className="text-xs text-slate-400 truncate">{m.user_metadata?.email || m.user_id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={roleColors[m.role] || roleColors.viewer}>
                      {m.role}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        m.status === "active"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-slate-500/20 text-slate-300 border-slate-500/30"
                      }
                    >
                      {m.status}
                    </Badge>
                    <Select value={m.role} onValueChange={(v) => updateRole(m.id, v as TeamRole)}>
                      <SelectTrigger className="h-8 w-32 bg-slate-800/60 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["admin", "manager", "sales", "support", "viewer"].map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(m.id, m.status)}>
                      {m.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="icon" variant="ghost" className="text-red-400" onClick={() => setRemoveId(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddTeamMemberModal open={showAdd} onOpenChange={setShowAdd} builderProfileId={builderProfileId} onAdded={load} />

      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this team member?</AlertDialogTitle>
            <AlertDialogDescription>They will lose access immediately.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-red-500 hover:bg-red-600">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BuilderTeamDashboard;
