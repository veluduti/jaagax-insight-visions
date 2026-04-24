import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Loader2, MapPin, CheckCircle, XCircle, Star, Phone, Briefcase, UserCheck, Clock, Home, IndianRupee, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeTableSubscription } from "@/hooks/useRealtimeTableSubscription";

interface PendingProperty {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  type: string | null;
  price: number;
  area_sqft: number | null;
  bedrooms: number | null;
  images: any;
  listed_by: string | null;
  assigned_agent_id: string | null;
  submitted_by: string | null;
  rejection_reason: string | null;
  created_at: string;
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
}

export default function AssignAgentPanel() {
  const [properties, setProperties] = useState<PendingProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, AgentSuggestion[]>>({});
  const [working, setWorking] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    // Only seller & agent listings need agent assignment.
    // Builder-listed properties are handled in the Verification panel (no agent assignment).
    const { data } = await supabase
      .from("properties")
      .select(
        "id, title, city, locality, type, price, area_sqft, bedrooms, images, listed_by, assigned_agent_id, submitted_by, rejection_reason, created_at"
      )
      .eq("verification_status", "pending")
      .neq("listed_by", "builder")
      .order("created_at", { ascending: false });
    setProperties((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchPending();
  }, [fetchPending]);

  useRealtimeTableSubscription({
    channelName: "admin-assign-agent-panel",
    tables: ["properties"],
    onChange: () => {
      void fetchPending();
    },
  });

  const loadSuggestions = async (property: PendingProperty) => {
    setExpanded(property.id);
    if (suggestions[property.id]) return;

    // Pull verified agents — try to filter by city, then fall back to all
    let agents: any[] = [];
    if (property.city) {
      const { data } = await supabase
        .from("agents")
        .select("id, user_id, name, phone, email, cities_served, localities_served, experience_years, trust_score, avg_rating, photo_url, agency_name")
        .eq("verified", true)
        .ilike("cities_served", `%${property.city}%`)
        .order("trust_score", { ascending: false })
        .limit(15);
      agents = data || [];
    }

    if (agents.length < 5) {
      const { data } = await supabase
        .from("agents")
        .select("id, user_id, name, phone, email, cities_served, localities_served, experience_years, trust_score, avg_rating, photo_url, agency_name")
        .eq("verified", true)
        .order("trust_score", { ascending: false })
        .limit(10);
      const existingIds = new Set(agents.map((a) => a.id));
      (data || []).forEach((a: any) => {
        if (!existingIds.has(a.id)) agents.push(a);
      });
    }

    const ranked: AgentSuggestion[] = agents
      .map((a) => {
        let score = 0;
        if (property.city && a.cities_served?.toLowerCase().includes(property.city.toLowerCase())) score += 50;
        if (property.locality && a.localities_served?.toLowerCase().includes(property.locality.toLowerCase())) score += 30;
        score += Math.min(a.trust_score || 0, 100) * 0.15;
        score += (a.experience_years || 0) * 1.5;
        return { ...a, matchScore: Math.round(score) };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    setSuggestions((prev) => ({ ...prev, [property.id]: ranked }));
  };

  const assignAndApprove = async (property: PendingProperty, agent: AgentSuggestion) => {
    setWorking(property.id);
    try {
      // 1) Update property: assign agent + approve
      const { data: updatedRow, error: updErr } = await supabase
        .from("properties")
        .update({
          assigned_agent_id: agent.id,
          verification_status: "approved",
          verified: true,
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", property.id)
        .select("id")
        .maybeSingle();
      if (updErr) throw updErr;
      if (!updatedRow) throw new Error("Approval was not saved. Please use an admin account.");

      // 2) Notify the seller
      if (property.submitted_by) {
        await supabase.from("notifications").insert({
          user_id: property.submitted_by,
          type: "property_approved",
          title: "Property approved & agent assigned",
          message: `${property.title} is now live. ${agent.name} has been assigned as your dedicated agent.`,
          link: `/property/${property.id}`,
        });
      }

      // 3) Notify the assigned agent
      if (agent.user_id) {
        await supabase.from("notifications").insert({
          user_id: agent.user_id,
          type: "property_assigned",
          title: "New property assigned to you",
          message: `You've been assigned to handle ${property.title} (${property.locality || property.city || ""}). All buyer enquiries and visit requests will come to you.`,
          link: `/property/${property.id}`,
        });
      }

      toast.success(`Approved & assigned to ${agent.name}`);
      setProperties((prev) => prev.filter((p) => p.id !== property.id));
      setExpanded(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to assign agent");
    } finally {
      setWorking(null);
    }
  };

  const reject = async (property: PendingProperty) => {
    const reason = window.prompt("Reason for rejection (visible to seller):", "Listing details need clarification");
    if (!reason) return;
    setWorking(property.id);
    try {
      const { data: updatedRow, error } = await supabase
        .from("properties")
        .update({
          verification_status: "rejected",
          verified: false,
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", property.id)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!updatedRow) throw new Error("Rejection was not saved. Please use an admin account.");

      if (property.submitted_by) {
        await supabase.from("notifications").insert({
          user_id: property.submitted_by,
          type: "property_rejected",
          title: "Property rejected",
          message: `${property.title} was rejected. Reason: ${reason}. You can edit and resubmit.`,
          link: "/dashboard/seller",
        });
      }

      toast.success("Property rejected");
      setProperties((prev) => prev.filter((p) => p.id !== property.id));
    } catch (e: any) {
      toast.error(e.message || "Failed to reject");
    } finally {
      setWorking(null);
    }
  };

  const formatPrice = (n: number) => {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    return `₹${n.toLocaleString("en-IN")}`;
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
          <p className="font-semibold">No properties awaiting verification</p>
          <p className="text-sm text-muted-foreground">All listings are reviewed</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {properties.map((p) => {
        const isAgentListing = p.listed_by === "agent" && p.assigned_agent_id;
        const isExpanded = expanded === p.id;
        const sList = suggestions[p.id] || [];
        const img = (Array.isArray(p.images) && p.images[0]) || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400";

        return (
          <Card key={p.id} className="border-2 overflow-hidden">
            <div className="grid md:grid-cols-[200px_1fr] gap-0">
              <div className="h-40 md:h-auto relative">
                <img src={img} alt={p.title} className="w-full h-full object-cover" />
                <Badge className="absolute top-2 left-2 bg-amber-500">
                  <Clock className="h-3 w-3 mr-1" />Pending
                </Badge>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-lg leading-tight">{p.title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />{p.locality || "N/A"}, {p.city || "N/A"}
                    </p>
                  </div>
                  <Badge variant={isAgentListing ? "default" : "outline"} className="capitalize">
                    Listed by {p.listed_by || "seller"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{formatPrice(p.price)}</span>
                  {p.area_sqft && <span className="flex items-center gap-1"><Home className="h-3 w-3" />{p.area_sqft} sqft</span>}
                  {p.bedrooms != null && <span>{p.bedrooms} BHK</span>}
                  {p.type && <Badge variant="secondary">{p.type}</Badge>}
                </div>

                {isAgentListing ? (
                  <div className="rounded-lg border-2 border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm">
                      <UserCheck className="h-4 w-4 text-emerald-500" />
                      <span>Agent already self-assigned. Just approve to go live.</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          setWorking(p.id);
                          try {
                            const { data: updatedRow, error } = await supabase
                              .from("properties")
                              .update({ verification_status: "approved", verified: true, rejection_reason: null })
                              .eq("id", p.id)
                              .select("id")
                              .maybeSingle();
                            if (error) throw error;
                            if (!updatedRow) throw new Error("Approval was not saved. Please use an admin account.");
                            // Notify agent (they are the submitter)
                            if (p.submitted_by) {
                              await supabase.from("notifications").insert({
                                user_id: p.submitted_by,
                                type: "property_approved",
                                title: "Your listing is live",
                                message: `${p.title} has been approved and is now visible to buyers.`,
                                link: `/property/${p.id}`,
                              });
                            }
                            toast.success("Approved");
                            setProperties((prev) => prev.filter((x) => x.id !== p.id));
                          } catch (e: any) {
                            toast.error(e.message);
                          } finally {
                            setWorking(null);
                          }
                        }}
                        disabled={working === p.id}
                      >
                        {working === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                        Approve & Go Live
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => reject(p)} disabled={working === p.id}>
                        <XCircle className="h-3 w-3 mr-1" />Reject
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => loadSuggestions(p)}
                      disabled={working === p.id}
                    >
                      {isExpanded ? "Hide" : "Find Nearby Agents"}
                      <ChevronRight className={`h-3 w-3 ml-1 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => reject(p)} disabled={working === p.id}>
                      <XCircle className="h-3 w-3 mr-1" />Reject
                    </Button>
                  </div>
                )}

                <AnimatePresence>
                  {isExpanded && !isAgentListing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 space-y-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Top {sList.length} agents nearby — pick one to assign and go live
                        </p>
                        {sList.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-3">No matching agents found.</p>
                        ) : (
                          sList.map((a, idx) => (
                            <div key={a.id} className="rounded-lg border p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={a.photo_url || undefined} />
                                <AvatarFallback>{a.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-sm">{a.name}</p>
                                  {idx === 0 && <Badge className="bg-emerald-500 text-white text-[10px]">Best match</Badge>}
                                  <Badge variant="outline" className="text-[10px]">{a.matchScore} pts</Badge>
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
                              <Button
                                size="sm"
                                onClick={() => assignAndApprove(p, a)}
                                disabled={working === p.id}
                              >
                                {working === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Assign & Approve"}
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
