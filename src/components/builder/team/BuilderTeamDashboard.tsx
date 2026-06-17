import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Search, Users, UserCheck, UserX, Trash2, Shield, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
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
  user_metadata?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
  } | null;
}

interface BuilderTeamDashboardProps {
  builderProfileId?: string;
}

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  sales: "bg-emerald-100 text-emerald-700 border-emerald-200",
  support: "bg-amber-100 text-amber-700 border-amber-200",
  viewer: "bg-slate-100 text-slate-700 border-slate-200",
};

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
  <Card className="border-border shadow-sm">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </CardContent>
  </Card>
);

export const BuilderTeamDashboard = ({ builderProfileId }: BuilderTeamDashboardProps) => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(builderProfileId || null);

  // If builderProfileId is not provided, fetch it
  useEffect(() => {
    if (!builderProfileId) {
      const fetchProfile = async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            toast.error("Please sign in");
            navigate("/auth");
            return;
          }

          const { data: profile, error } = await supabase
            .from("builder_profiles")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (error) throw error;

          if (!profile) {
            toast.error("Builder profile not found. Please create one first.");
            navigate("/add-builder-profile");
            return;
          }

          setProfileId(profile.id);
        } catch (e: any) {
          toast.error("Failed to load profile", { description: e.message });
        }
      };
      fetchProfile();
    }
  }, [builderProfileId, navigate]);

  const load = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("builder_profile_id", profileId)
        .order("joined_at", { ascending: false });
      if (error) throw error;

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
      toast.error("Failed to load team", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileId) load();
  }, [profileId]);

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
      toast.success("Role updated");
      load();
    } catch (e: any) {
      toast.error("Failed", { description: e.message });
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "active" ? "inactive" : "active";
    try {
      const { error } = await supabase.from("team_members").update({ status: next }).eq("id", id);
      if (error) throw error;
      toast.success(`Member ${next}`);
      load();
    } catch (e: any) {
      toast.error("Failed", { description: e.message });
    }
  };

  const handleRemove = async () => {
    if (!removeId) return;
    try {
      const { error } = await supabase.from("team_members").delete().eq("id", removeId);
      if (error) throw error;
      toast.success("Member removed");
      setRemoveId(null);
      load();
    } catch (e: any) {
      toast.error("Failed", { description: e.message });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 md:pt-12">
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!profileId) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20">
          <Card className="max-w-md mx-auto p-8 text-center shadow-sm border-border">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">Builder Profile Required</h2>
            <p className="text-muted-foreground mb-6">
              You need to create a builder profile before managing your team.
            </p>
            <Button
              onClick={() => navigate("/add-builder-profile")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Create Builder Profile
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-12 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Team</h1>
            <p className="text-sm text-muted-foreground">Manage your team members, roles, and access</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} icon={Users} color="bg-blue-100 text-blue-600" />
          <StatCard label="Active" value={stats.active} icon={UserCheck} color="bg-emerald-100 text-emerald-600" />
          <StatCard label="Inactive" value={stats.inactive} icon={UserX} color="bg-slate-100 text-slate-600" />
          <StatCard label="Admins" value={stats.admins} icon={Shield} color="bg-purple-100 text-purple-600" />
        </div>

        {/* Members List */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-foreground">Members</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members..."
                className="pl-9 bg-background border-border"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                No team members yet
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((m) => (
                  <div key={m.id} className="p-4 rounded-lg border border-border bg-white hover:bg-muted/30 transition">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                          {(m.user_metadata?.full_name || m.user_metadata?.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {m.user_metadata?.full_name || "Unnamed"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {m.user_metadata?.email || m.user_id}
                          </div>
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
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }
                        >
                          {m.status}
                        </Badge>
                        <Select value={m.role} onValueChange={(v) => updateRole(m.id, v as TeamRole)}>
                          <SelectTrigger className="h-8 w-32 bg-background border-border">
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
                        <Button size="icon" variant="ghost" className="text-rose-600" onClick={() => setRemoveId(m.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Member Modal */}
        {profileId && (
          <AddTeamMemberModal open={showAdd} onOpenChange={setShowAdd} builderProfileId={profileId} onAdded={load} />
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this team member?</AlertDialogTitle>
              <AlertDialogDescription>They will lose access immediately.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemove} className="bg-rose-500 hover:bg-rose-600 text-white">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default BuilderTeamDashboard;
