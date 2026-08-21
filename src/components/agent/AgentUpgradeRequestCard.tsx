import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldPlus, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import LocationMasterSelector from "@/components/location/LocationMasterSelector";
import { emptyMasterLocation, type MasterLocationSelection } from "@/hooks/useLocationMaster";

type Level = "district_admin" | "state_admin" | "country_admin";

const LEVEL_LABEL: Record<Level, string> = {
  district_admin: "District Admin",
  state_admin: "State Admin",
  country_admin: "Country Admin",
};

interface RequestRow {
  id: string;
  requested_role: Level;
  granted_role: string | null;
  status: string;
  country: string | null;
  state: string | null;
  district: string | null;
  review_notes: string | null;
  created_at: string;
}

interface Props {
  agentId?: string | null;
}

export default function AgentUpgradeRequestCard({ agentId }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<RequestRow | null>(null);
  const [scopes, setScopes] = useState<Array<{ role: string; country: string | null; state: string | null; district: string | null }>>([]);
  const [reason, setReason] = useState("");
  const [loc, setLoc] = useState<MasterLocationSelection>(emptyMasterLocation);

  const derivedLevel = useMemo<Level | null>(() => {
    if (loc.district) return "district_admin";
    if (loc.state) return "state_admin";
    if (loc.country) return "country_admin";
    return null;
  }, [loc.country, loc.state, loc.district]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: reqs }, { data: sc }] = await Promise.all([
      (supabase as any)
        .from("agent_admin_upgrade_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
      (supabase as any).from("admin_scopes").select("role,country,state,district").eq("user_id", user.id).eq("is_active", true),
    ]);
    setRequest((reqs?.[0] as RequestRow) ?? null);
    setScopes((sc ?? []) as any[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user?.id]);

  const submit = async () => {
    if (!user) return;
    const country = loc.country ?? null;
    const state = loc.state ?? null;
    const district = loc.district ?? null;
    const level = derivedLevel;

    if (!level) return toast({ title: "Select an area", description: "Choose at least a country to request an admin level.", variant: "destructive" });
    if (level === "country_admin" && !country) return toast({ title: "Select a country", variant: "destructive" });
    if (level === "state_admin" && (!country || !state)) return toast({ title: "Select country and state", variant: "destructive" });
    if (level === "district_admin" && (!country || !state || !district)) return toast({ title: "Select country, state and district", variant: "destructive" });

    setSubmitting(true);
    const { error } = await (supabase as any).from("agent_admin_upgrade_requests").insert({
      user_id: user.id,
      agent_id: agentId ?? null,
      requested_role: level,
      country, state, district,
      country_id: loc.country_id, state_id: loc.state_id, district_id: loc.district_id,
      reason: reason || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not send request", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Upgrade request sent", description: "An admin will review your profile shortly." });
    setReason("");
    setLoc(emptyMasterLocation);
    void load();
  };

  if (loading) {
    return (
      <Card><CardContent className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></CardContent></Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldPlus className="w-5 h-5 text-primary" /> Upgrade Your Level
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {scopes.length > 0 && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 text-primary" /> You are Agent + Admin
            </div>
            <div className="flex flex-wrap gap-2">
              {scopes.map((s, i) => (
                <Badge key={i} variant="secondary">
                  {LEVEL_LABEL[s.role as Level] ?? s.role}
                  {s.district ? ` · ${s.district}` : s.state ? ` · ${s.state}` : s.country ? ` · ${s.country}` : ""}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Your agent tools stay active — switch to the admin dashboard from your profile menu.
            </p>
          </div>
        )}

        {request?.status === "pending" ? (
          <div className="rounded-lg border p-4 text-sm space-y-2">
            <div className="flex items-center gap-2 font-medium"><Clock className="w-4 h-4 text-yellow-500" /> Request under review</div>
            <div className="flex flex-wrap gap-2">
              <Badge>{LEVEL_LABEL[request.requested_role]}</Badge>
              {request.country && <Badge variant="secondary">{request.country}</Badge>}
              {request.state && <Badge variant="secondary">{request.state}</Badge>}
              {request.district && <Badge variant="secondary">{request.district}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">Sent {new Date(request.created_at).toLocaleString()}</p>
          </div>
        ) : (
          <>
            {request?.status === "rejected" && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium"><XCircle className="w-4 h-4 text-destructive" /> Last request declined</div>
                {request.review_notes && <p className="text-xs text-muted-foreground mt-1">{request.review_notes}</p>}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Request admin powers for your area. Once approved you keep every agent feature and also get an admin
              dashboard for your Country, State or District.
            </p>
            <div>
              <Label>Level you want</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="district_admin">District Admin</SelectItem>
                  <SelectItem value="state_admin">State Admin</SelectItem>
                  <SelectItem value="country_admin">Country Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Area you want to manage</Label>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <LocationMasterSelector value={loc} onChange={setLoc} showLocality={false} />
              </div>
            </div>
            <div>
              <Label>Why should you be upgraded?</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Experience, verifications completed, local coverage…" />
            </div>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Request Upgrade
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
