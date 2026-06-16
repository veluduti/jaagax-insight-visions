import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export type TeamRole = "admin" | "manager" | "sales" | "support" | "viewer";

const ROLES: { value: TeamRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
  { value: "viewer", label: "Viewer" },
];

interface AddTeamMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builderProfileId: string;
  onAdded?: () => void;
}

export const AddTeamMemberModal = ({ open, onOpenChange, builderProfileId, onAdded }: AddTeamMemberModalProps) => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("sales");
  const [saving, setSaving] = useState(false);

  const reset = () => { setEmail(""); setRole("sales"); };

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Resolve user by email via profiles
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, email")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile?.user_id) {
        toast({
          title: "User not found",
          description: "This email isn't registered yet. Ask them to sign up first.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("team_members").insert({
        builder_profile_id: builderProfileId,
        user_id: profile.user_id,
        role,
        status: "active",
        permissions: {},
      });
      if (error) throw error;

      toast({ title: "Team member added" });
      reset();
      onAdded?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Failed to add member", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
            />
            <p className="text-xs text-slate-400 mt-1">User must already have an account.</p>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
            {saving ? "Adding..." : "Add Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddTeamMemberModal;
