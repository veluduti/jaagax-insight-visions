import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerSubNav from "@/components/partners/PartnerSubNav";
import { usePartnerHotel } from "@/hooks/usePartnerHotel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

type Staff = {
  id: string; hotel_id: string; user_id: string; role: string;
  invited_email: string | null; is_active: boolean; created_at: string;
};

const ROLES = [
  { value: "manager", label: "Manager (full access)" },
  { value: "front_desk", label: "Front Desk (reservations, guests)" },
  { value: "housekeeping", label: "Housekeeping (rooms only)" },
];

export default function PartnerStaff() {
  const { loading, hotelId, hotelName } = usePartnerHotel();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("front_desk");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!hotelId) return;
    const { data } = await (supabase as any).from("hotel_staff").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false });
    setStaff(data || []);
  };
  useEffect(() => { load(); }, [hotelId]);

  const invite = async () => {
    if (!email || !hotelId) return;
    setBusy(true);
    try {
      // Look up existing user by email in profiles
      const { data: prof } = await (supabase as any).from("profiles").select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
      if (!prof?.id) {
        toast.error("No JAAGA X user found with that email. Ask them to sign up first.");
        return;
      }
      const { error } = await (supabase as any).from("hotel_staff").insert({
        hotel_id: hotelId, user_id: prof.id, role, invited_email: email.trim().toLowerCase(),
      });
      if (error) throw error;
      toast.success("Team member added");
      setEmail("");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to add");
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this team member?")) return;
    await (supabase as any).from("hotel_staff").delete().eq("id", id);
    load();
  };

  if (loading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4"/> Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <PartnerNav />
      <PartnerSubNav />
      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Staff & Roles</h1>
          <p className="text-sm text-muted-foreground">Invite your team to help run {hotelName}. Roles limit what they can see.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Invite team member</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@example.com" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={invite} disabled={busy || !email}>
                {busy ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Team ({staff.length})</CardTitle></CardHeader>
          <CardContent>
            {staff.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team members yet.</p>
            ) : (
              <div className="space-y-2">
                {staff.map(s => (
                  <div key={s.id} className="flex items-center justify-between rounded-md border border-border/60 p-3">
                    <div>
                      <div className="text-sm font-medium">{s.invited_email || s.user_id}</div>
                      <div className="mt-1 flex gap-2">
                        <Badge variant="secondary">{s.role}</Badge>
                        {s.is_active ? <Badge className="bg-emerald-500/15 text-emerald-400">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
