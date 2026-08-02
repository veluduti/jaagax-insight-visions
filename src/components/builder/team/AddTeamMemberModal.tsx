import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// FIXED: Default permissions by role
const getDefaultPermissions = (role: TeamRole): Record<string, boolean> => {
  switch (role) {
    case "admin":
      return {
        view_properties: true,
        edit_properties: true,
        view_leads: true,
        manage_leads: true,
        view_analytics: true,
        manage_team: true,
      };
    case "manager":
      return {
        view_properties: true,
        edit_properties: true,
        view_leads: true,
        manage_leads: true,
        view_analytics: true,
        manage_team: false,
      };
    case "sales":
      return {
        view_properties: true,
        edit_properties: false,
        view_leads: true,
        manage_leads: true,
        view_analytics: false,
        manage_team: false,
      };
    case "support":
      return {
        view_properties: true,
        edit_properties: false,
        view_leads: true,
        manage_leads: false,
        view_analytics: false,
        manage_team: false,
      };
    case "viewer":
      return {
        view_properties: true,
        edit_properties: false,
        view_leads: false,
        manage_leads: false,
        view_analytics: false,
        manage_team: false,
      };
    default:
      return {};
  }
};

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

  const reset = () => {
    setEmail("");
    setRole("sales");
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Look up the account via a secure server-side function (auth.users is not
      // reachable from the client).
      const { data: foundUserId, error: userErr } = await (supabase as any).rpc("find_user_id_by_email", {
        _email: email.trim().toLowerCase(),
      });

      if (userErr) throw userErr;
      const userData = foundUserId ? { id: foundUserId as string } : null;
      if (!userData?.id) {
        toast({
          title: "User not found",
          description: "This email isn't registered yet. Ask them to sign up first.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Check if already a member
      const { data: existing, error: existErr } = await supabase
        .from("team_members")
        .select("id")
        .eq("builder_profile_id", builderProfileId)
        .eq("user_id", userData.id)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Already a member",
          description: "This user is already on your team.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("team_members").insert({
        builder_profile_id: builderProfileId,
        user_id: userData.id,
        role,
        status: "active",
        permissions: getDefaultPermissions(role),
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
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md bg-slate-800/40 p-3 text-xs text-slate-400">
            <p className="font-medium text-slate-300 mb-1">Default Permissions:</p>
            <ul className="space-y-0.5">
              {Object.entries(getDefaultPermissions(role)).map(([key, value]) => (
                <li key={key} className={value ? "text-emerald-400" : "text-slate-500"}>
                  {value ? "✓" : "✗"} {key.replace("_", " ")}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
            {saving ? "Adding..." : "Add Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddTeamMemberModal;
