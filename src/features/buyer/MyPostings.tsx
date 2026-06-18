import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Home, Plus, Crown, Star, User, MapPin, Bed, Bath, Maximize,
  Sparkles, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useWallet, formatINR } from "@/contexts/WalletContext";
import { usePropertyManagement } from "@/hooks/usePropertyManagement";
import SubscriptionModal from "./SubscriptionModal";

interface PropertyRow {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  area_sqft: number | null;
  bhk: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  images: any;
  is_live: boolean | null;
  is_sold: boolean | null;
  is_premium?: boolean | null;
  verification_status: string;
  created_at: string;
  submitted_by: string | null;
}

interface AgentInfo {
  agent_id: string;
  name: string;
  avg_rating: number;
}

function formatPrice(n: number): string {
  if (!n) return "₹0";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function getStatus(p: PropertyRow): "active" | "pending" | "sold" {
  if (p.is_sold) return "sold";
  if (p.is_live && p.verification_status === "approved") return "active";
  return "pending";
}

function StatusBadge({ s }: { s: "active" | "pending" | "sold" }) {
  if (s === "active") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>;
  if (s === "pending") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>;
  return <Badge variant="secondary">Sold</Badge>;
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3 w-3 ${i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{value.toFixed(1)}</span>
    </div>
  );
}

const FALLBACK_IMG = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800";

export function MyPostings() {
  const navigate = useNavigate();
  const { balance, debitMoney } = useWallet();
  const mgmt = usePropertyManagement();
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [agents, setAgents] = useState<Record<string, AgentInfo>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "active" | "pending" | "sold">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [subOpen, setSubOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!mgmt.userId) return;
    setLoading(true);
    const { data: props } = await supabase
      .from("properties")
      .select("id,title,city,locality,price,area_sqft,bhk,bedrooms,bathrooms,images,is_live,is_sold,is_premium,verification_status,created_at,submitted_by")
      .eq("submitted_by", mgmt.userId)
      .order("created_at", { ascending: false });
    const rows = (props as PropertyRow[]) ?? [];
    setProperties(rows);

    if (rows.length > 0) {
      const propIds = rows.map((r) => r.id);
      const { data: aa } = await (supabase as any)
        .from("assigned_agents")
        .select("property_id,agent_id")
        .in("property_id", propIds)
        .eq("status", "active");
      const agentIds = Array.from(new Set((aa ?? []).map((a: any) => a.agent_id)));
      const map: Record<string, AgentInfo> = {};
      if (agentIds.length) {
        const { data: agentsData } = await supabase
          .from("agents")
          .select("id,name,avg_rating")
          .in("id", agentIds);
        const aLookup: Record<string, any> = {};
        (agentsData ?? []).forEach((a: any) => (aLookup[a.id] = a));
        (aa ?? []).forEach((row: any) => {
          const a = aLookup[row.agent_id];
          if (a) map[row.property_id] = { agent_id: a.id, name: a.name, avg_rating: Number(a.avg_rating ?? 0) };
        });
      }
      setAgents(map);
    } else {
      setAgents({});
    }
    setLoading(false);
  }, [mgmt.userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!mgmt.userId) return;
    const channel = supabase
      .channel(`mypostings-${mgmt.userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "properties", filter: `submitted_by=eq.${mgmt.userId}` }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [mgmt.userId, fetchData]);

  const counts = useMemo(() => {
    const c = { all: properties.length, active: 0, pending: 0, sold: 0 };
    properties.forEach((p) => { c[getStatus(p)]++; });
    return c;
  }, [properties]);

  const filtered = useMemo(() => {
    if (tab === "all") return properties;
    return properties.filter((p) => getStatus(p) === tab);
  }, [tab, properties]);

  const handlePostNew = async () => {
    if (!mgmt.userId) return navigate("/auth");
    const res = await mgmt.canPostProperty(mgmt.userId);
    if (res.canPost) navigate("/sell");
    else setSubOpen(true);
  };

  const handleMakePremium = async (p: PropertyRow) => {
    if (balance < 500) return toast.error("Insufficient wallet balance");
    setBusyId(p.id);
    try {
      await debitMoney(500, "Premium upgrade");
      await (supabase as any).from("properties").update({ is_premium: true }).eq("id", p.id);
      toast.success("Property upgraded to Premium!");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Upgrade failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkSold = async (p: PropertyRow) => {
    setBusyId(p.id);
    try {
      const { error } = await supabase.rpc("mark_property_sold", { _property_id: p.id });
      if (error) throw error;
      toast.success("Marked as sold");
      fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setBusyId(null);
    }
  };

  const getImage = (p: PropertyRow) => {
    const imgs = Array.isArray(p.images) ? p.images : [];
    return imgs[0] || FALLBACK_IMG;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Home className="h-6 w-6" /> My Postings
          </h2>
          <div className="mt-1">
            {mgmt.isSubscribed ? (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                <Sparkles className="h-3 w-3 mr-1" /> Pro Plan Active
              </Badge>
            ) : (
              <Badge variant="outline">
                {mgmt.freePostsRemaining} Free Post{mgmt.freePostsRemaining === 1 ? "" : "s"} Remaining This Month
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-2">Wallet: {formatINR(balance)}</span>
          </div>
        </div>
        <Button onClick={handlePostNew}>
          <Plus className="h-4 w-4 mr-2" /> Post New Property
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="sold">Sold ({counts.sold})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse h-80 bg-muted/40" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center">
              <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg">No properties listed</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                You haven't posted any properties yet. Start selling your property today!
              </p>
              <Button onClick={handlePostNew}>
                <Plus className="h-4 w-4 mr-2" /> Post New Property
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => {
                const status = getStatus(p);
                const agent = agents[p.id];
                const beds = p.bhk ?? p.bedrooms;
                return (
                  <Card key={p.id} className="overflow-hidden flex flex-col">
                    <div className="relative h-40 bg-muted">
                      <img
                        src={getImage(p)}
                        alt={p.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                      />
                      <div className="absolute top-2 left-2"><StatusBadge s={status} /></div>
                      {p.is_premium && (
                        <Badge className="absolute top-2 right-2 bg-amber-500 text-white hover:bg-amber-500">
                          <Crown className="h-3 w-3 mr-1" /> Premium
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4 flex-1 flex flex-col gap-2">
                      <h3 className="font-semibold line-clamp-1">{p.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {[p.locality, p.city].filter(Boolean).join(", ") || "N/A"}
                      </div>
                      <div className="font-bold text-primary">{formatPrice(Number(p.price))}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {beds != null && <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{beds} BHK</span>}
                        {p.bathrooms != null && <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{p.bathrooms}</span>}
                        {p.area_sqft != null && <span className="flex items-center gap-1"><Maximize className="h-3 w-3" />{p.area_sqft} sqft</span>}
                      </div>

                      {agent && (
                        <div className="border rounded-md p-2 text-xs space-y-1">
                          <div className="flex items-center gap-1 font-medium">
                            <User className="h-3 w-3" /> {agent.name}
                          </div>
                          <StarRating value={agent.avg_rating} />
                          <Button size="sm" variant="outline" className="w-full h-7 text-xs"
                            onClick={() => navigate("/agents")}>
                            Switch Agent
                          </Button>
                        </div>
                      )}

                      <div className="text-[10px] text-muted-foreground">
                        Posted {new Date(p.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>

                      <div className="flex gap-2 mt-auto pt-2">
                        {status !== "sold" && !p.is_premium && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="flex-1" disabled={busyId === p.id || balance < 500}>
                                <Crown className="h-3 w-3 mr-1" /> Premium ₹500
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Upgrade to Premium?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ₹500 will be debited from your wallet to mark "{p.title}" as Premium.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleMakePremium(p)}>Confirm</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {status !== "sold" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="secondary" className="flex-1" disabled={busyId === p.id}>
                                {busyId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Sold"}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Mark as Sold?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove "{p.title}" from active listings.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleMarkSold(p)}>Confirm</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SubscriptionModal
        open={subOpen}
        onOpenChange={setSubOpen}
        userId={mgmt.userId}
        onPaidPerPost={() => { mgmt.refresh(); navigate("/sell"); }}
        onSubscribed={() => { mgmt.refresh(); navigate("/sell"); }}
      />
    </div>
  );
}

export default MyPostings;
