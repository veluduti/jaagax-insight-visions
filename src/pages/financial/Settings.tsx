import { useEffect, useState } from "react";
import FinancialLayout from "@/components/financial/FinancialLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Building2, Users, Trash2, Plus } from "lucide-react";

const ENTITY_TYPES = ["individual", "proprietorship", "partnership", "private_limited"];

export default function FinancialSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [newMember, setNewMember] = useState({ name: "", email: "", role: "rm" });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: p } = await (supabase as any)
      .from("financial_providers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setProvider(p);
    if (p?.id) {
      const { data: t } = await (supabase as any)
        .from("financial_team_members")
        .select("*")
        .eq("provider_id", p.id)
        .order("created_at", { ascending: false });
      setTeam(t || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const saveProfile = async () => {
    if (!provider?.id) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("financial_providers")
      .update({
        company_name: provider.company_name,
        entity_type: provider.entity_type,
        rbi_registration: provider.rbi_registration,
        logo_url: provider.logo_url,
      })
      .eq("id", provider.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  const addMember = async () => {
    if (!provider?.id || !newMember.name || !newMember.email) {
      return toast.error("Name and email required");
    }
    const { error } = await (supabase as any)
      .from("financial_team_members")
      .insert({ provider_id: provider.id, ...newMember });
    if (error) return toast.error(error.message);
    setNewMember({ name: "", email: "", role: "rm" });
    toast.success("Team member added");
    load();
  };

  const removeMember = async (id: string) => {
    const { error } = await (supabase as any)
      .from("financial_team_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  if (loading) {
    return (
      <FinancialLayout title="Settings">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </FinancialLayout>
    );
  }

  if (!provider) {
    return (
      <FinancialLayout title="Settings">
        <Card className="bg-card border-border">
          <CardContent className="py-10 text-center text-muted-foreground">
            No financial provider profile found. Please complete registration first.
          </CardContent>
        </Card>
      </FinancialLayout>
    );
  }

  return (
    <FinancialLayout title="Settings" subtitle="Manage company profile and team">
      {/* Company profile */}
      <Card className="bg-card border-border backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Building2 className="h-5 w-5" /> Company Profile
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-border text-primary">
              KYC: {provider.kyc_status}
            </Badge>
            <Badge variant="outline" className="border-border text-primary">
              Plan: {provider.subscription_status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input
              value={provider.company_name || ""}
              onChange={(e) => setProvider({ ...provider, company_name: e.target.value })}
              className="bg-card border-border"
            />
          </div>
          <div className="space-y-2">
            <Label>Entity Type</Label>
            <select
              value={provider.entity_type || ""}
              onChange={(e) => setProvider({ ...provider, entity_type: e.target.value })}
              className="w-full h-10 rounded-md bg-card border border-border px-3 text-sm"
            >
              <option value="">Select…</option>
              {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>RBI Registration No.</Label>
            <Input
              value={provider.rbi_registration || ""}
              onChange={(e) => setProvider({ ...provider, rbi_registration: e.target.value })}
              className="bg-card border-border"
            />
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input
              value={provider.logo_url || ""}
              onChange={(e) => setProvider({ ...provider, logo_url: e.target.value })}
              className="bg-card border-border"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button
              onClick={saveProfile}
              disabled={saving}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      <Card className="bg-card border-border backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Users className="h-5 w-5" /> Team Members
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-2">
            <Input
              placeholder="Name"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              className="bg-card border-border"
            />
            <Input
              placeholder="Email"
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              className="bg-card border-border"
            />
            <select
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              className="h-10 rounded-md bg-card border border-border px-3 text-sm"
            >
              <option value="rm">Relationship Manager</option>
              <option value="verifier">Verifier</option>
              <option value="admin">Admin</option>
            </select>
            <Button
              onClick={addMember}
              className="bg-primary text-primary-foreground font-semibold"
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          <div className="space-y-2">
            {team.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No team members yet.</p>
            )}
            {team.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
              >
                <div>
                  <div className="font-medium text-foreground">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.email} · {m.role}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeMember(m.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </FinancialLayout>
  );
}
