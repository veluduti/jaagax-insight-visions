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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Loader2,
  Trash2,
  UserPlus,
  Users,
  Shield,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  UserCog,
  UserCheck,
  Key,
  Building2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Staff = {
  id: string;
  hotel_id: string;
  user_id: string;
  role: string;
  invited_email: string | null;
  is_active: boolean;
  created_at: string;
  user_profile?: {
    full_name?: string;
    avatar_url?: string;
  };
};

type StaffRole = {
  value: string;
  label: string;
  description: string;
  icon: any;
  permissions: string[];
  color: string;
};

const ROLES: StaffRole[] = [
  {
    value: "manager",
    label: "Manager",
    description: "Full access to all features",
    icon: Shield,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    permissions: ["Full Access", "Manage Staff", "All Settings"],
  },
  {
    value: "front_desk",
    label: "Front Desk",
    description: "Reservations and guest management",
    icon: UserCheck,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    permissions: ["View Bookings", "Manage Guests", "Check-in/out"],
  },
  {
    value: "housekeeping",
    label: "Housekeeping",
    description: "Room status and maintenance",
    icon: Key,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    permissions: ["View Rooms", "Update Room Status", "Maintenance"],
  },
  {
    value: "accountant",
    label: "Accountant",
    description: "Financial and reporting access",
    icon: Building2,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    permissions: ["View Reports", "Financial Data", "Invoices"],
  },
];

const ROLE_COLORS: Record<string, string> = {
  manager: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  front_desk: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  housekeeping: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  accountant: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

export default function PartnerStaff() {
  const { loading, hotelId, hotelName } = usePartnerHotel();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("front_desk");
  const [busy, setBusy] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const load = async () => {
    if (!hotelId) return;
    try {
      const { data, error } = await supabase
        .from("hotel_staff")
        .select("*")
        .eq("hotel_id", hotelId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles for staff members
      if (data && data.length > 0) {
        const userIds = data.map((s) => s.user_id).filter(Boolean);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", userIds);

          const profileMap = new Map(
            (profiles || []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]),
          );

          setStaff(
            data.map((s) => ({
              ...s,
              user_profile: profileMap.get(s.user_id) || undefined,
            })),
          );
        } else {
          setStaff(data);
        }
      } else {
        setStaff(data || []);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load staff");
    }
  };

  useEffect(() => {
    load();
  }, [hotelId]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const invite = async () => {
    if (!email || !hotelId) {
      toast.error("Please enter an email address");
      return;
    }

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Check if email already added
    if (staff.some((s) => s.invited_email?.toLowerCase() === email.toLowerCase())) {
      toast.error("This user is already a team member");
      return;
    }

    setBusy(true);
    try {
      // Look up existing user by email in profiles
      const { data: prof, error: profError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (profError) throw profError;

      if (!prof?.id) {
        toast.error("No JAAGA X user found with this email. Ask them to sign up first.");
        return;
      }

      const { error } = await supabase.from("hotel_staff").insert({
        hotel_id: hotelId,
        user_id: prof.id,
        role,
        invited_email: email.trim().toLowerCase(),
        is_active: true,
      });

      if (error) throw error;

      toast.success(`${prof.full_name || "Team member"} added successfully`);
      setEmail("");
      setIsInviteDialogOpen(false);
      await load();
    } catch (e: any) {
      if (e.code === "23505") {
        toast.error("This user is already a team member");
      } else {
        toast.error(e.message || "Failed to add team member");
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setRemovingId(id);
    try {
      const { error } = await supabase.from("hotel_staff").delete().eq("id", id);

      if (error) throw error;

      toast.success("Team member removed");
      setShowRemoveDialog(false);
      setSelectedStaff(null);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove team member");
    } finally {
      setRemovingId(null);
    }
  };

  const toggleActive = async (staffMember: Staff) => {
    try {
      const { error } = await supabase
        .from("hotel_staff")
        .update({ is_active: !staffMember.is_active })
        .eq("id", staffMember.id);

      if (error) throw error;

      toast.success(`Staff ${staffMember.is_active ? "deactivated" : "activated"}`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

  const getRoleDetails = (roleValue: string) => {
    return ROLES.find((r) => r.value === roleValue) || ROLES[0];
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <PartnerNav />
        <PartnerSubNav />
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-sm text-muted-foreground">Loading team members...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <PartnerNav />
      <PartnerSubNav />

      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-emerald-400">Team Management</p>
              <h1 className="text-3xl font-bold tracking-tight">Staff & Roles</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your team members and their access permissions for {hotelName}
              </p>
            </div>
            <Button
              onClick={() => setIsInviteDialogOpen(true)}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Team Member
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Total Staff</p>
              <p className="text-2xl font-bold">{staff.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">{staff.filter((s) => s.is_active).length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Front Desk</p>
              <p className="text-2xl font-bold">{staff.filter((s) => s.role === "front_desk").length}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground">Managers</p>
              <p className="text-2xl font-bold">{staff.filter((s) => s.role === "manager").length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Team Members Grid */}
        {staff.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                Start building your team by inviting staff members to help manage your hotel
              </p>
              <Button
                onClick={() => setIsInviteDialogOpen(true)}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite First Team Member
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {staff.map((member) => {
              const roleDetails = getRoleDetails(member.role);
              const RoleIcon = roleDetails.icon;
              const displayName = member.user_profile?.full_name || member.invited_email || member.user_id;
              const initials = getInitials(displayName);

              return (
                <Card
                  key={member.id}
                  className={cn(
                    "group relative overflow-hidden transition-all hover:shadow-lg border",
                    !member.is_active && "opacity-60",
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div
                            className={cn(
                              "h-12 w-12 rounded-full flex items-center justify-center text-sm font-semibold",
                              member.is_active
                                ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 text-emerald-400"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {initials}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold truncate">{displayName}</h4>
                            <div
                              className={cn(
                                "h-2 w-2 rounded-full flex-shrink-0",
                                member.is_active ? "bg-emerald-500" : "bg-muted-foreground",
                              )}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{member.invited_email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Badge className={cn("border", ROLE_COLORS[member.role] || "bg-muted text-muted-foreground")}>
                        <RoleIcon className="h-3 w-3 mr-1.5" />
                        {roleDetails.label}
                      </Badge>
                      {member.is_active ? (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {roleDetails.permissions.slice(0, 2).map((perm, idx) => (
                          <span key={idx} className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                            {perm}
                          </span>
                        ))}
                        {roleDetails.permissions.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{roleDetails.permissions.length - 2}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleActive(member)}
                          title={member.is_active ? "Deactivate" : "Activate"}
                        >
                          {member.is_active ? (
                            <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground hover:text-emerald-500" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedStaff(member);
                            setShowRemoveDialog(true);
                          }}
                          disabled={removingId === member.id}
                        >
                          {removingId === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Invite Team Member</DialogTitle>
            <DialogDescription>
              Add a new staff member to help manage your hotel. They need to have a JAAGA X account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  className="pl-9"
                  placeholder="teammate@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The user must have a registered JAAGA X account with this email
              </p>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    return (
                      <SelectItem key={r.value} value={r.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <div>
                            <p className="font-medium">{r.label}</p>
                            <p className="text-xs text-muted-foreground">{r.description}</p>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {role && (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-sm font-medium mb-2">Permissions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.find((r) => r.value === role)?.permissions.map((perm, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={invite}
              disabled={busy || !email}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Team Member
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold">
                {selectedStaff?.user_profile?.full_name || selectedStaff?.invited_email}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedStaff && remove(selectedStaff.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              {removingId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
