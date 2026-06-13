import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Member = {
  id: string;
  member_name: string;
  member_phone: string | null;
  member_email: string | null;
  role: string;
  performance_score: number | null;
  assigned_leads: any[];
};

export default function AgentTeamManagement() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", email: "", role: "team_member" });
  const [adding, setAdding] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("agent_team_members")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setMembers((data || []) as Member[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const addMember = async () => {
    if (!user || !form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setAdding(true);
    const { error } = await (supabase as any).from("agent_team_members").insert({
      user_id: user.id,
      member_name: form.name.trim(),
      member_phone: form.phone || null,
      member_email: form.email || null,
      role: form.role,
    });
    setAdding(false);
    if (error) return toast.error(error.message);
    toast.success("Team member added");
    setForm({ name: "", phone: "", email: "", role: "team_member" });
    load();
  };

  const removeMember = async (id: string) => {
    const { error } = await (supabase as any).from("agent_team_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Member removed");
    load();
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  const totalLeads = members.reduce((s, m) => s + (m.assigned_leads?.length || 0), 0);
  const avgScore = members.length ? Math.round(members.reduce((s, m) => s + (m.performance_score || 0), 0) / members.length) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Team Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-muted/30 rounded-md text-center">
            <p className="text-2xl font-bold">{members.length}</p>
            <p className="text-xs text-muted-foreground">Members</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-md text-center">
            <p className="text-2xl font-bold">{totalLeads}</p>
            <p className="text-xs text-muted-foreground">Assigned Leads</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-md text-center">
            <p className="text-2xl font-bold">{avgScore}</p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </div>
        </div>

        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold">Add Team Member</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="senior_agent">Senior Agent</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={addMember} disabled={adding} className="gap-2">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
          </Button>
        </div>

        <div className="space-y-2">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No team members yet.</p>
          ) : members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <p className="font-medium">{m.member_name}</p>
                <p className="text-xs text-muted-foreground">{m.member_email || m.member_phone || "—"} · {m.role}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{m.assigned_leads?.length || 0} leads</Badge>
                <Badge>Score {m.performance_score || 0}</Badge>
                <Button size="icon" variant="ghost" onClick={() => removeMember(m.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
