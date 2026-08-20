import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldPlus, ExternalLink, Star, MapPin, Phone, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import LocationMasterSelector from "@/components/location/LocationMasterSelector";
import { emptyMasterLocation, type MasterLocationSelection } from "@/hooks/useLocationMaster";
import { useAdminRole } from "@/hooks/useAdminRole";

type Level = "country_admin" | "state_admin" | "district_admin";

const LEVEL_LABEL: Record<string, string> = {
  global_admin: "Global Admin",
  country_admin: "Country Admin",
  state_admin: "State Admin",
  district_admin: "District Admin",
};

const GRANTABLE: Record<string, Level[]> = {
  global_admin: ["country_admin", "state_admin", "district_admin"],
  country_admin: ["state_admin", "district_admin"],
  state_admin: ["district_admin"],
  district_admin: [],
};

interface RequestRow {
  id: string;
  user_id: string;
  agent_id: string | null;
  requested_role: Level;
  status: string;
  country: string | null;
  state: string | null;
  district: string | null;
  country_id: string | null;
  state_id: string | null;
  district_id: string | null;
  reason: string | null;
  granted_role: string | null;
  review_notes: string | null;
  created_at: string;
}

interface AgentInfo {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  trust_score: number | null;
  verified: boolean | null;
  experience_years: number | null;
  agency_name: string | null;
  user_id: string | null;
}

export default function AgentUpgradeRequestsPanel() {
  const { role } = useAdminRole();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [agents, setAgents] = useState<Record<string, AgentInfo>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, { level: Level; loc: MasterLocationSelection; notes: string }>>({});

  const grantable = useMemo(() => GRANTABLE[role ?? ""] ?? [], [role]);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("agent_admin_upgrade_requests")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as RequestRow[];
    setRows(list);

    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    if (userIds.length) {
      const { data: agentRows } = await (supabase as any)
        .from("agents")
        .select("id,name,email,phone,city,district,state,country,trust_score,verified,experience_years,agency_name,user_id")
        .in("user_id", userIds);
      const map: Record<string, AgentInfo> = {};
      (agentRows ?? []).forEach((a: AgentInfo) => { if (a.user_id) map[a.user_id] = a; });
      setAgents(map);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const getDraft = (r: RequestRow) =>
    draft[r.id] ?? {
      level: (grantable.includes(r.requested_role) ? r.requested_role : grantable[0]) as Level,
      loc: {
        ...emptyMasterLocation,
        country: r.country, state: r.state, district: r.district,
        country_id: r.country_id, state_id: r.state_id, district_id: r.district_id,
      } as MasterLocationSelection,
      notes: "",
    };

  const setDraftFor = (id: string, patch: Partial<{ level: Level; loc: MasterLocationSelection; notes: string }>, base: any) =>
    setDraft((d) => ({ ...d, [id]: { ...base, ...patch } }));

  const approve = async (r: RequestRow) => {
    const d = getDraft(r);
    if (!d.level) return toast({ title: "You cannot grant any admin level", variant: "destructive" });
    const country = d.loc.country ?? r.country;
    const state = d.loc.state ?? r.state;
    const district = d.loc.district ?? r.district;
    setBusyId(r.id);
    const { error } = await (supabase as any).rpc("approve_agent_admin_upgrade", {
      _request_id: r.id,
      _role: d.level,
      _country: country,
      _state: state,
      _district: district,
      _country_id: d.loc.country_id ?? r.country_id,
      _state_id: d.loc.state_id ?? r.state_id,
      _district_id: d.loc.district_id ?? r.district_id,
      _notes: d.notes || null,
    });
    setBusyId(null);
    if (error) return toast({ title: "Approval failed", description: error.message, variant: "destructive" });
    toast({ title: "Agent upgraded", description: `${LEVEL_LABEL[d.level]} role attached to this agent profile.` });
    void load();
  };

  const reject = async (r: RequestRow) => {
    const d = getDraft(r);
    setBusyId(r.id);
    const { error } = await (supabase as any).rpc("reject_agent_admin_upgrade", { _request_id: r.id, _notes: d.notes || null });
    setBusyId(null);
    if (error) return toast({ title: "Could not reject", description: error.message, variant: "destructive" });
    toast({ title: "Request rejected" });
    void load();
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const pending = rows.filter((r) => r.status === "pending");
  const history = rows.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldPlus className="w-5 h-5 text-primary" /> Agent Upgrade Requests
            <Badge variant="secondary">{pending.length} pending</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {pending.length === 0 && <p className="text-sm text-muted-foreground">No pending upgrade requests.</p>}

          {pending.map((r) => {
            const a = agents[r.user_id];
            const d = getDraft(r);
            return (
              <div key={r.id} className="rounded-xl border p-4 space-y-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-[220px] flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{a?.name ?? "Agent"}</span>
                      {a?.verified && <Badge variant="secondary">Verified</Badge>}
                      {a?.trust_score != null && (
                        <Badge className="gap-1"><Star className="w-3 h-3" /> {a.trust_score}</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {a?.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{a.phone}</span>}
                      {a?.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{a.email}</span>}
                      {(a?.district || a?.city) && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a?.district ?? a?.city}{a?.state ? `, ${a.state}` : ""}</span>
                      )}
                      {a?.experience_years != null && <span>{a.experience_years} yrs exp</span>}
                      {a?.agency_name && <span>{a.agency_name}</span>}
                    </div>
                  </div>
                  {a?.id && (
                    <Button variant="outline" size="sm" onClick={() => window.open(`/agent/${a.id}`, "_blank")}>
                      <ExternalLink className="w-4 h-4 mr-2" /> View Agent Profile
                    </Button>
                  )}
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Requested: </span>
                  <Badge>{LEVEL_LABEL[r.requested_role]}</Badge>{" "}
                  {[r.district, r.state, r.country].filter(Boolean).join(", ")}
                </div>
                {r.reason && <p className="text-sm text-muted-foreground italic">"{r.reason}"</p>}

                {grantable.length === 0 ? (
                  <p className="text-sm text-destructive">Your admin level cannot grant admin roles.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Assign role</Label>
                      <Select value={d.level} onValueChange={(v) => setDraftFor(r.id, { level: v as Level }, d)}>
                        <SelectTrigger><SelectValue placeholder="Select admin level" /></SelectTrigger>
                        <SelectContent>
                          {grantable.map((lvl) => (
                            <SelectItem key={lvl} value={lvl}>{LEVEL_LABEL[lvl]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Approving keeps all agent features and adds the admin dashboard for the selected area.
                      </p>
                    </div>
                    <div>
                      <Label className="mb-2 block">Assign area</Label>
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                        <LocationMasterSelector
                          value={d.loc}
                          onChange={(loc) => setDraftFor(r.id, { loc }, d)}
                          showLocality={false}
                          fixedCountry={role !== "global_admin"}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Review note (optional)</Label>
                      <Textarea rows={2} value={d.notes} onChange={(e) => setDraftFor(r.id, { notes: e.target.value }, d)} />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <Button onClick={() => approve(r)} disabled={busyId === r.id}>
                        {busyId === r.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Approve & Assign Role
                      </Button>
                      <Button variant="outline" onClick={() => reject(r)} disabled={busyId === r.id}>Reject</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Reviewed requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {history.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
                <span className="font-medium">{agents[r.user_id]?.name ?? "Agent"}</span>
                <Badge variant={r.status === "approved" ? "default" : "outline"}>{r.status}</Badge>
                {r.granted_role && <Badge variant="secondary">{LEVEL_LABEL[r.granted_role]}</Badge>}
                {[r.district, r.state, r.country].filter(Boolean).map((v) => (
                  <Badge key={v as string} variant="secondary">{v}</Badge>
                ))}
                <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
