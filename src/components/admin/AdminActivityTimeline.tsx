import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity, Loader2, RefreshCw, MapPin, User, Home, Bell, Search,
  CheckCircle2, XCircle, UserPlus, FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Row {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  country: string | null;
  state: string | null;
  district: string | null;
  metadata: any;
  created_at: string;
}

const ACTION_META: Record<string, { label: string; color: string; icon: any }> = {
  property_submitted:        { label: "Property submitted",      color: "bg-blue-500/10 text-blue-600",     icon: Home },
  property_draft_saved:      { label: "Draft saved",             color: "bg-muted",                          icon: FileText },
  property_pending:          { label: "Marked pending",          color: "bg-amber-500/10 text-amber-600",   icon: Activity },
  property_approved:         { label: "Property approved",       color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 },
  property_rejected:         { label: "Property rejected",       color: "bg-red-500/10 text-red-600",       icon: XCircle },
  property_agent_assigned:   { label: "Agent assigned",          color: "bg-purple-500/10 text-purple-600", icon: UserPlus },
  property_published:        { label: "Property published",      color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 },
  property_sold:             { label: "Property sold",           color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 },
  profile_created:           { label: "Role requested",          color: "bg-blue-500/10 text-blue-600",     icon: User },
  profile_active:            { label: "Role approved",           color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 },
  profile_rejected:          { label: "Role rejected",           color: "bg-red-500/10 text-red-600",       icon: XCircle },
  reminder_sent:             { label: "Reminder sent",           color: "bg-amber-500/10 text-amber-600",   icon: Bell },
};

/**
 * Displays admin activity restricted to the caller's scope (via RLS on
 * admin_activity_log).
 */
export function AdminActivityTimeline() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("admin_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error) setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (!filter.trim()) return true;
    const hay = [
      r.action, r.entity_type, r.country, r.state, r.district,
      r.metadata?.title, r.metadata?.city, r.metadata?.locality, r.metadata?.type,
    ].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(filter.toLowerCase());
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Activity Timeline
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter…"
              className="h-8 pl-7 w-48"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No activity in your scope yet.</p>
        ) : (
          <ol className="relative border-l border-border/50 space-y-4 ml-3">
            {filtered.map((r) => {
              const meta = ACTION_META[r.action] || {
                label: r.action.replace(/_/g, " "),
                color: "bg-muted",
                icon: Activity,
              };
              const Icon = meta.icon;
              const title = r.metadata?.title || r.metadata?.type || r.entity_type;
              const scope = [r.country, r.state, r.district].filter(Boolean).join(" · ");
              return (
                <li key={r.id} className="ml-4">
                  <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-background ring-2 ring-primary/40">
                    <Icon className="h-2.5 w-2.5 text-primary" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">
                    {title || "—"}
                    {r.metadata?.locality && (
                      <span className="text-muted-foreground font-normal"> · {r.metadata.locality}</span>
                    )}
                  </p>
                  {scope && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {scope}
                    </p>
                  )}
                  {r.metadata?.rejection_reason && (
                    <p className="text-xs text-red-500 mt-0.5">
                      Reason: {r.metadata.rejection_reason}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
