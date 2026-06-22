import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Loader2, MapPin, CheckCircle, XCircle, Star, Phone, Briefcase, UserCheck, Clock,
  Home, IndianRupee, User, Eye, Mail, Calendar, Bed, Maximize2, Tag,
} from "lucide-react";
import { useRealtimeTableSubscription } from "@/hooks/useRealtimeTableSubscription";
import AgentEditPropertyDialog from "@/components/agents/AgentEditPropertyDialog";

interface PendingProperty {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  locality: string | null;
  address: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  type: string | null;
  listing_type: string | null;
  price: number;
  price_negotiable: boolean | null;
  maintenance_charges: number | null;
  booking_amount: number | null;
  area_sqft: number | null;
  building_area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  balconies: number | null;
  bhk: number | null;
  furnishing: string | null;
  completion_stage: string | null;
  property_age: string | null;
  floor_number: number | null;
  total_floors: number | null;
  total_parking: number | null;
  building_name: string | null;
  amenities: any;
  rera_id: string | null;
  rera_document_url: string | null;
  images: any;
  video_urls: any;
  listed_by: string | null;
  listed_by_role_snapshot: string | null;
  assigned_agent_id: string | null;
  submitted_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  document_urls: any;
  lifecycle_status: string | null;
  force_verification: boolean | null;
}

interface SellerInfo {
  name: string;
  email: string | null;
  phone: string | null;
}

interface AgentSuggestion {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  cities_served: string | null;
  localities_served: string | null;
  experience_years: number | null;
  trust_score: number | null;
  avg_rating: number | null;
  photo_url: string | null;
  agency_name: string | null;
  matchScore: number;
  activeTasks: number;
}

const formatPrice = (n: number) => {
  if (!n) return "—";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

interface SubmitterAgent {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  verified: boolean;
}

export default function AssignAgentPanel() {
  const [properties, setProperties] = useState<PendingProperty[]>([]);
  const [sellers, setSellers] = useState<Record<string, SellerInfo>>({});
  const [submitterAgents, setSubmitterAgents] = useState<Record<string, SubmitterAgent>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PendingProperty | null>(null);
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [showAgents, setShowAgents] = useState(false);
  const [working, setWorking] = useState(false);

  const submitterAgent = selected?.submitted_by ? submitterAgents[selected.submitted_by] : undefined;
  const selfListedByVerifiedAgent = !!submitterAgent?.verified;

  const fetchPending = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("properties")
      .select(
        "id, title, description, city, locality, address, pincode, latitude, longitude, type, listing_type, price, price_negotiable, maintenance_charges, booking_amount, area_sqft, building_area_sqft, bedrooms, bathrooms, balconies, bhk, furnishing, completion_stage, property_age, floor_number, total_floors, total_parking, building_name, amenities, rera_id, rera_document_url, images, video_urls, listed_by, listed_by_role_snapshot, assigned_agent_id, submitted_by, rejection_reason, created_at, document_urls, lifecycle_status, force_verification"
      )
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false });

    const list = (data as PendingProperty[]) || [];
    setProperties(list);

    // Fetch seller info
    const sellerIds = Array.from(new Set(list.map((p) => p.submitted_by).filter(Boolean))) as string[];
    if (sellerIds.length > 0) {
      const { data: signups } = await supabase
        .from("signup_requests")
        .select("user_id, full_name, email, phone")
        .in("user_id", sellerIds);
      const map: Record<string, SellerInfo> = {};
      (signups || []).forEach((s: any) => {
        map[s.user_id] = { name: s.full_name || "Unknown Seller", email: s.email, phone: s.phone };
      });
      setSellers(map);

      // Detect which submitters are themselves agents (verified or not)
      const { data: subAgents } = await supabase
        .from("agents")
        .select("id, user_id, name, phone, verified")
        .in("user_id", sellerIds);
      const aMap: Record<string, SubmitterAgent> = {};
      (subAgents || []).forEach((a: any) => {
        if (a.user_id) aMap[a.user_id] = a as SubmitterAgent;
      });
      setSubmitterAgents(aMap);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchPending();
  }, [fetchPending]);

  useRealtimeTableSubscription({
    channelName: "admin-pending-props",
    tables: ["properties"],
    onChange: () => void fetchPending(),
  });

  const openDetails = (p: PendingProperty) => {
    setSelected(p);
    setShowAgents(false);
    setSuggestions([]);
  };

  const loadSuggestions = async () => {
    if (!selected) return;
    setLoadingAgents(true);
    setShowAgents(true);

    const cols = "id, user_id, name, phone, email, cities_served, localities_served, experience_years, trust_score, avg_rating, photo_url, agency_name";

    // STRICT: only show agents serving the seller's locality OR city.
    // No agents outside the property's city should appear.
    let agents: any[] = [];
    if (selected.locality) {
      const { data } = await supabase
        .from("agents")
        .select(cols)
        .eq("verified", true)
        .ilike("localities_served", `%${selected.locality}%`)
        .limit(20);
      agents = data || [];
    }

    // Fallback to same-city agents only (still local).
    if (agents.length === 0 && selected.city) {
      const { data } = await supabase
        .from("agents")
        .select(cols)
        .eq("verified", true)
        .ilike("cities_served", `%${selected.city}%`)
        .limit(20);
      agents = data || [];
    }

    if (agents.length === 0) {
      setSuggestions([]);
      setLoadingAgents(false);
      return;
    }

    // 3) Workload: count active tasks (open agent_tasks + active visit bookings + assigned active properties)
    const agentIds = agents.map((a) => a.id);
    const [tasksRes, visitsRes, propsRes] = await Promise.all([
      supabase.from("agent_tasks" as any).select("agent_id").in("agent_id", agentIds).in("status", ["pending", "in_progress"]),
      supabase.from("visit_bookings").select("agent_id").in("agent_id", agentIds).in("status", ["pending", "confirmed", "pending_builder"]),
      supabase.from("properties").select("assigned_agent_id").in("assigned_agent_id", agentIds).eq("verified", true),
    ]);

    const count = (rows: any[] | null, key: string) => {
      const m: Record<string, number> = {};
      (rows || []).forEach((r) => { const id = r[key]; if (id) m[id] = (m[id] || 0) + 1; });
      return m;
    };
    const taskMap = count(tasksRes.data as any, "agent_id");
    const visitMap = count(visitsRes.data as any, "agent_id");
    const propMap = count(propsRes.data as any, "assigned_agent_id");

    const ranked: AgentSuggestion[] = agents
      .map((a) => {
        const localityMatch = selected.locality && a.localities_served?.toLowerCase().includes(selected.locality.toLowerCase());
        const cityMatch = selected.city && a.cities_served?.toLowerCase().includes(selected.city.toLowerCase());
        const workload = (taskMap[a.id] || 0) + (visitMap[a.id] || 0) + (propMap[a.id] || 0);
        // Higher score = better. Locality match dominates, then inverse workload, then trust/experience as tiebreakers.
        let score = 0;
        if (localityMatch) score += 100;
        else if (cityMatch) score += 40;
        score += Math.max(0, 50 - workload * 5); // less work = higher score
        score += Math.min(a.trust_score || 0, 100) * 0.1;
        score += (a.experience_years || 0) * 0.5;
        return { ...a, matchScore: Math.round(score), activeTasks: workload };
      })
      .sort((a, b) => {
        // Primary sort: least active tasks; tiebreak by score
        if (a.activeTasks !== b.activeTasks) return a.activeTasks - b.activeTasks;
        return b.matchScore - a.matchScore;
      })
      .slice(0, 3);

    setSuggestions(ranked);
    setLoadingAgents(false);
  };

  const approveOnly = async () => {
    if (!selected) return;
    setWorking(true);
    try {
      // If a verified agent submitted this listing themselves, they ARE the agent.
      const selfAgent = selected.submitted_by ? submitterAgents[selected.submitted_by] : undefined;
      const isSelfVerifiedAgent = !!selfAgent?.verified;

      const update: any = {
        verification_status: isSelfVerifiedAgent ? "agent_assigned" : "approved",
        verified: true,
        rejection_reason: null,
      };
      if (isSelfVerifiedAgent && selfAgent) update.assigned_agent_id = selfAgent.id;

      const { data: row, error } = await supabase
        .from("properties")
        .update(update)
        .eq("id", selected.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!row) throw new Error("Approval not saved. Use an admin account.");
      if (selected.submitted_by) {
        await supabase.from("notifications").insert({
          user_id: selected.submitted_by,
          type: "property_approved",
          title: "Your listing is live ✅",
          message: `${selected.title} has been approved and is now visible to buyers.`,
          link: `/property/${selected.id}`,
        });
      }
      toast.success(isSelfVerifiedAgent ? "Approved — listing agent kept as handler" : "Property approved");
      setProperties((prev) => prev.filter((x) => x.id !== selected.id));
      setSelected(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to approve");
    } finally {
      setWorking(false);
    }
  };

  const assignAndApprove = async (agent: AgentSuggestion) => {
    if (!selected) return;
    setWorking(true);
    try {
      const { data: row, error } = await supabase
        .from("properties")
        .update({
          assigned_agent_id: agent.id,
          verification_status: "agent_assigned",
          verified: true,
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!row) throw new Error("Assignment not saved. Use an admin account.");

      // Create a task in the agent dashboard
      await supabase.from("agent_tasks" as any).insert({
        agent_id: agent.id,
        agent_user_id: agent.user_id,
        property_id: selected.id,
        task_type: "property_assigned",
        title: `Review newly assigned property: ${selected.title}`,
        description: `You've been assigned to handle ${selected.title} in ${selected.locality || selected.city || "—"}. Review the listing, contact the seller, and prepare for buyer enquiries.`,
        status: "pending",
        priority: "high",
        metadata: {
          property_title: selected.title,
          locality: selected.locality,
          city: selected.city,
          price: selected.price,
          seller_id: selected.submitted_by,
        },
      });

      if (selected.submitted_by) {
        await supabase.from("notifications").insert({
          user_id: selected.submitted_by,
          type: "property_approved",
          title: "Agent assigned to your property",
          message: `${selected.title} has been assigned to ${agent.name}. They'll handle buyer enquiries and visits.`,
          link: `/property/${selected.id}`,
        });
      }
      if (agent.user_id) {
        await supabase.from("notifications").insert({
          user_id: agent.user_id,
          type: "property_assigned",
          title: "New property assigned to you",
          message: `You've been assigned to handle ${selected.title} (${selected.locality || selected.city || ""}). Check your dashboard for the new task.`,
          link: `/dashboard/agent`,
        });
      }
      toast.success(`Assigned to ${agent.name}`, {
        description: "A new task has been created in their dashboard.",
      });
      setProperties((prev) => prev.filter((x) => x.id !== selected.id));
      setSelected(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to assign");
    } finally {
      setWorking(false);
    }
  };

  const rejectProperty = async () => {
    if (!selected) return;
    const reason = window.prompt("Reason for rejection (visible to seller):", "Listing details need clarification");
    if (!reason) return;
    setWorking(true);
    try {
      const { data: row, error } = await supabase
        .from("properties")
        .update({
          verification_status: "rejected",
          verified: false,
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!row) throw new Error("Rejection not saved. Use an admin account.");
      if (selected.submitted_by) {
        await supabase.from("notifications").insert({
          user_id: selected.submitted_by,
          type: "property_rejected",
          title: "Property rejected",
          message: `${selected.title} was rejected. Reason: ${reason}. You can edit and resubmit.`,
          link: "/dashboard/seller",
        });
      }
      toast.success("Property rejected");
      setProperties((prev) => prev.filter((x) => x.id !== selected.id));
      setSelected(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to reject");
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CheckCircle className="h-16 w-16 mx-auto mb-3 text-emerald-500" />
          <p className="font-semibold">No properties awaiting review</p>
          <p className="text-sm text-muted-foreground">All listings are reviewed</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => {
          const seller = (p.submitted_by && sellers[p.submitted_by]) || null;
          const img = (Array.isArray(p.images) && p.images[0]) || "";
          return (
            <Card key={p.id} className="overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <div className="relative h-36">
                <img src={img} alt={p.title} className="w-full h-full object-cover"  loading="lazy" decoding="async" />
                <Badge className="absolute top-2 left-2 bg-amber-500 text-white">
                  <Clock className="h-3 w-3 mr-1" />Pending Review
                </Badge>
                <Badge variant="outline" className="absolute top-2 right-2 capitalize bg-background/80 backdrop-blur">
                  {p.listed_by || "seller"}
                </Badge>
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-base leading-tight line-clamp-1">{p.title}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{p.locality || "—"}, {p.city || "—"}</span>
                  </p>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{seller?.name || "Seller info loading…"}</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-emerald-600">
                    <IndianRupee className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatPrice(p.price)}</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => openDetails(p)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />View Details
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Editable details modal — same form as the Sell Your Property flow / agent verification */}
      {selected && (
        <AgentEditPropertyDialog
          open={!!selected}
          onOpenChange={(o) => { if (!o) { setSelected(null); setShowAgents(false); setSuggestions([]); } }}
          property={selected}
          mode="admin"
          onSubmitted={() => fetchPending()}
          adminFooter={
            <>
              <Button variant="destructive" onClick={rejectProperty} disabled={working}>
                <XCircle className="h-4 w-4 mr-1.5" />Reject
              </Button>
              {!selfListedByVerifiedAgent && (
                <Button variant="outline" onClick={loadSuggestions} disabled={working || loadingAgents}>
                  <UserCheck className="h-4 w-4 mr-1.5" />
                  {showAgents ? "Refresh Agents" : "Assign Agent"}
                </Button>
              )}
              <Button onClick={approveOnly} disabled={working} className="bg-emerald-600 hover:bg-emerald-700">
                {working ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                Approve
              </Button>
            </>
          }
        />
      )}

      {/* Agent suggestions sub-dialog */}
      <Dialog open={showAgents} onOpenChange={(o) => { if (!o) { setShowAgents(false); setSuggestions([]); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suggested Agents</DialogTitle>
            <DialogDescription>
              Top 3 by locality match and lowest active workload.
            </DialogDescription>
          </DialogHeader>
          {submitterAgent && (
            <div className={`rounded-lg border p-3 text-sm ${selfListedByVerifiedAgent ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
              {selfListedByVerifiedAgent ? (
                <>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">Listed by verified agent — {submitterAgent.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">No agent assignment needed.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">Listed by unverified agent — {submitterAgent.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Treat like a seller submission.</p>
                </>
              )}
            </div>
          )}
          {loadingAgents ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">No matching agents found.</p>
          ) : (
            <div className="space-y-2">
              {suggestions.map((a, idx) => (
                <div key={a.id} className="rounded-lg border p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={a.photo_url || undefined} />
                    <AvatarFallback>{a.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{a.name}</p>
                      {idx === 0 && <Badge className="bg-emerald-500 text-white text-[10px]">Best match</Badge>}
                      <Badge variant="outline" className="text-[10px]">{a.activeTasks} active task{a.activeTasks === 1 ? "" : "s"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {a.agency_name || "Independent"} · {a.cities_served || "—"}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-0.5"><Briefcase className="h-3 w-3" />{a.experience_years || 0}y</span>
                      <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-amber-500" />{a.avg_rating || 0}</span>
                      <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{a.phone}</span>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => assignAndApprove(a)} disabled={working}>
                    {working ? <Loader2 className="h-3 w-3 animate-spin" /> : "Assign"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

