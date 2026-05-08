import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Sparkles, Zap, Crown, Rocket, CheckCircle2, TrendingUp,
  Eye, MousePointer, Users, Calendar, AlertCircle, CreditCard, Loader2,
  Building2, Home as HomeIcon, BadgeCheck, StopCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  tier: string;
  duration_days: number;
  price: number;
  benefits: string[];
  badge_label: string | null;
  search_boost: number;
  map_highlight: boolean;
  homepage_featured: boolean;
  sort_order: number;
};

type ListingItem = {
  id: string;
  type: "project" | "property";
  name: string;
  location: string;
  image?: string | null;
  isPromoted: boolean;
};

type Promotion = {
  id: string;
  plan_name: string;
  tier: string;
  target_type: string;
  project_id: string | null;
  property_id: string | null;
  start_date: string;
  end_date: string;
  status: string;
  amount_paid: number;
  views_count: number;
  clicks_count: number;
  leads_count: number;
  badge_label: string | null;
};

const tierIcon: Record<string, any> = {
  basic: Zap,
  featured: Rocket,
  premium: Crown,
};
const tierGradient: Record<string, string> = {
  basic: "from-blue-500 to-cyan-500",
  featured: "from-amber-500 to-orange-500",
  premium: "from-purple-500 to-pink-500",
};

const formatINR = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : `₹${n.toLocaleString("en-IN")}`;

const BuilderPromotions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadAll();
    // Auto-expire promotions whose end_date has passed
    expireOld();
  }, [user]);

  const expireOld = async () => {
    if (!user) return;
    await (supabase as any)
      .from("promotions")
      .update({ status: "expired" })
      .eq("builder_id", user.id)
      .eq("status", "active")
      .lt("end_date", new Date().toISOString());
  };

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    const [plansRes, projectsRes, propertiesRes, promosRes] = await Promise.all([
      (supabase as any).from("promotion_plans").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("projects").select("id, name, locality, city, image").eq("submitted_by", user.id),
      supabase.from("properties").select("id, title, locality, city, images").eq("submitted_by", user.id),
      (supabase as any).from("promotions").select("*").eq("builder_id", user.id).order("created_at", { ascending: false }),
    ]);

    if (plansRes.data) setPlans(plansRes.data as Plan[]);

    const items: ListingItem[] = [];
    const activePromoIds = new Set<string>(
      (promosRes.data || [])
        .filter((p: any) => p.status === "active" && new Date(p.end_date) > new Date())
        .map((p: any) => p.project_id || p.property_id)
        .filter(Boolean)
    );

    (projectsRes.data || []).forEach((p: any) => {
      items.push({
        id: p.id,
        type: "project",
        name: p.name || "Untitled Project",
        location: [p.locality, p.city].filter(Boolean).join(", "),
        image: p.image,
        isPromoted: activePromoIds.has(p.id),
      });
    });
    (propertiesRes.data || []).forEach((p: any) => {
      items.push({
        id: p.id,
        type: "property",
        name: p.title || "Untitled Property",
        location: [p.locality, p.city].filter(Boolean).join(", "),
        image: p.images?.[0],
        isPromoted: activePromoIds.has(p.id),
      });
    });
    setListings(items);
    setPromotions((promosRes.data || []) as Promotion[]);
    setLoading(false);
  };

  const handleProceedCheckout = (plan: Plan) => {
    if (!selectedListing) {
      toast.error("Please select a project or property to promote");
      return;
    }
    setSelectedPlan(plan);
    setShowCheckout(true);
  };

  const completePayment = async () => {
    if (!user || !selectedListing || !selectedPlan) return;
    setProcessing(true);
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + selectedPlan.duration_days);

      const payload: any = {
        builder_id: user.id,
        plan_id: selectedPlan.id,
        target_type: selectedListing.type,
        plan_name: selectedPlan.name,
        tier: selectedPlan.tier,
        duration_days: selectedPlan.duration_days,
        amount_paid: selectedPlan.price,
        payment_status: "paid",
        payment_reference: `MOCK-${Date.now()}`,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        status: "active",
        search_boost: selectedPlan.search_boost,
        map_highlight: selectedPlan.map_highlight,
        homepage_featured: selectedPlan.homepage_featured,
        badge_label: selectedPlan.badge_label,
      };
      if (selectedListing.type === "project") payload.project_id = selectedListing.id;
      else payload.property_id = selectedListing.id;

      const { error } = await (supabase as any).from("promotions").insert(payload);
      if (error) throw error;

      // Notify the builder
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "promotion",
        title: "🚀 Promotion Activated",
        message: `${selectedPlan.name} is now live for "${selectedListing.name}" until ${end.toLocaleDateString()}.`,
        link: "/builder/promotions",
      });

      toast.success(`${selectedPlan.name} activated! Your listing is now boosted.`);
      setShowCheckout(false);
      setSelectedPlan(null);
      setSelectedListing(null);
      loadAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const stopPromotion = async (id: string) => {
    const { error } = await (supabase as any).from("promotions").update({ status: "stopped" }).eq("id", id);
    if (error) return toast.error("Failed to stop promotion");
    toast.success("Promotion stopped");
    loadAll();
  };

  const activePromos = promotions.filter(
    (p) => p.status === "active" && new Date(p.end_date) > new Date()
  );
  const totalViews = promotions.reduce((s, p) => s + (p.views_count || 0), 0);
  const totalClicks = promotions.reduce((s, p) => s + (p.clicks_count || 0), 0);
  const totalLeads = promotions.reduce((s, p) => s + (p.leads_count || 0), 0);

  const daysLeft = (endIso: string) => {
    const ms = new Date(endIso).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/builder")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Promotions & Boost Listings
              </h1>
              <p className="text-xs text-muted-foreground">Increase visibility and generate more leads</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Sparkles} label="Active Promotions" value={activePromos.length} color="text-primary" />
          <StatCard icon={Eye} label="Total Views" value={totalViews.toLocaleString()} color="text-blue-500" />
          <StatCard icon={MousePointer} label="Total Clicks" value={totalClicks.toLocaleString()} color="text-purple-500" />
          <StatCard icon={Users} label="Total Leads" value={totalLeads.toLocaleString()} color="text-green-500" />
        </div>

        <Tabs defaultValue="buy" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="buy">Buy Promotion</TabsTrigger>
            <TabsTrigger value="active">Active Promotions ({activePromos.length})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* TAB 1: BUY */}
          <TabsContent value="buy" className="space-y-6">
            {/* Step 1: Select listing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
                  Select Project or Property
                </CardTitle>
                <CardDescription>Choose what you want to promote</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : listings.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">You don't have any projects or properties yet.</p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => navigate("/builder/add-project")}>Add Project</Button>
                      <Button variant="outline" onClick={() => navigate("/dashboard/builder")}>Add Property</Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {listings.map((item) => (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => setSelectedListing(item)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                          selectedListing?.id === item.id && selectedListing?.type === item.type
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover"  loading="lazy" decoding="async" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {item.type === "project" ? <Building2 className="h-6 w-6 text-muted-foreground" /> : <HomeIcon className="h-6 w-6 text-muted-foreground" />}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{item.name}</p>
                            {item.isPromoted && (
                              <Badge className="bg-amber-500 text-white border-0 text-[10px] h-5">
                                <BadgeCheck className="h-3 w-3 mr-1" />Promoted
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{item.location || "—"}</p>
                          <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{item.type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Choose plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
                  Choose a Promotion Plan
                </CardTitle>
                <CardDescription>Higher tiers unlock more visibility and features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan) => {
                    const Icon = tierIcon[plan.tier] || Zap;
                    const grad = tierGradient[plan.tier] || "from-primary to-primary";
                    const isPremium = plan.tier === "premium";
                    return (
                      <motion.div
                        key={plan.id}
                        whileHover={{ y: -4 }}
                        className={cn(
                          "relative rounded-2xl border-2 overflow-hidden flex flex-col",
                          isPremium ? "border-primary shadow-xl" : "border-border"
                        )}
                      >
                        {isPremium && (
                          <div className="absolute top-3 right-3 z-10">
                            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 border-0 text-white">Most Popular</Badge>
                          </div>
                        )}
                        <div className={cn("bg-gradient-to-br p-5 text-white", grad)}>
                          <Icon className="h-8 w-8 mb-2" />
                          <h3 className="font-bold text-lg">{plan.name}</h3>
                          <p className="text-white/80 text-sm">{plan.duration_days} days</p>
                        </div>
                        <div className="p-5 flex flex-col flex-1 gap-4">
                          <div>
                            <span className="text-3xl font-bold">{formatINR(plan.price)}</span>
                            <span className="text-muted-foreground text-sm"> / one-time</span>
                          </div>
                          <ul className="space-y-2 flex-1">
                            {plan.benefits.map((b, i) => (
                              <li key={i} className="flex gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                          <Button
                            onClick={() => handleProceedCheckout(plan)}
                            disabled={!selectedListing}
                            className={cn("w-full", isPremium && "bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90")}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Proceed to Payment
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                {!selectedListing && (
                  <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Please select a project or property above first.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: ACTIVE */}
          <TabsContent value="active" className="space-y-4">
            {activePromos.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No active promotions yet. Buy a plan to boost your listings.</p>
              </CardContent></Card>
            ) : (
              activePromos.map((p) => {
                const Icon = tierIcon[p.tier] || Zap;
                const grad = tierGradient[p.tier] || "from-primary to-primary";
                const targetItem = listings.find(
                  (l) => (p.project_id ? l.id === p.project_id && l.type === "project" : l.id === p.property_id && l.type === "property")
                );
                return (
                  <Card key={p.id}>
                    <CardContent className="p-4 flex flex-col md:flex-row gap-4 md:items-center">
                      <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white flex-shrink-0", grad)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{targetItem?.name || `${p.target_type} promotion`}</p>
                          <Badge variant="secondary">{p.plan_name}</Badge>
                          <Badge className="bg-green-500/15 text-green-600 border-0">Active</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(p.start_date).toLocaleDateString()} → {new Date(p.end_date).toLocaleDateString()} • {daysLeft(p.end_date)} days left
                        </p>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="text-center"><p className="font-bold">{p.views_count}</p><p className="text-xs text-muted-foreground">Views</p></div>
                        <div className="text-center"><p className="font-bold">{p.clicks_count}</p><p className="text-xs text-muted-foreground">Clicks</p></div>
                        <div className="text-center"><p className="font-bold">{p.leads_count}</p><p className="text-xs text-muted-foreground">Leads</p></div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => stopPromotion(p.id)}>
                        <StopCircle className="h-4 w-4 mr-1" />Stop
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}

            {/* Expired/stopped */}
            {promotions.filter((p) => p.status !== "active" || new Date(p.end_date) <= new Date()).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mt-6 mb-2">History</h3>
                {promotions.filter((p) => p.status !== "active" || new Date(p.end_date) <= new Date()).map((p) => (
                  <Card key={p.id} className="mb-2 opacity-70">
                    <CardContent className="p-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{p.plan_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Ended {new Date(p.end_date).toLocaleDateString()} • {p.views_count} views, {p.leads_count} leads
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">{new Date(p.end_date) <= new Date() ? "expired" : p.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: ANALYTICS */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Performance Analytics</CardTitle>
                <CardDescription>Impact of all your promotions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <MetricBox label="Avg. CTR" value={totalViews ? `${((totalClicks / totalViews) * 100).toFixed(1)}%` : "—"} />
                  <MetricBox label="Lead Conversion" value={totalClicks ? `${((totalLeads / totalClicks) * 100).toFixed(1)}%` : "—"} />
                  <MetricBox label="Total Spent" value={formatINR(promotions.reduce((s, p) => s + Number(p.amount_paid || 0), 0))} />
                </div>
                <div className="space-y-2">
                  {promotions.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">Run a promotion to see analytics here.</p>
                  ) : promotions.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{p.plan_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{p.target_type} • {new Date(p.start_date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-4 text-xs text-right">
                        <span><Eye className="inline h-3 w-3" /> {p.views_count}</span>
                        <span><MousePointer className="inline h-3 w-3" /> {p.clicks_count}</span>
                        <span><Users className="inline h-3 w-3" /> {p.leads_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm & Pay</DialogTitle>
            <DialogDescription>Review your promotion details before payment</DialogDescription>
          </DialogHeader>
          {selectedPlan && selectedListing && (
            <div className="space-y-4">
              <div className="rounded-xl border p-4 space-y-2">
                <Row label="Listing" value={selectedListing.name} />
                <Row label="Type" value={selectedListing.type} capitalize />
                <Row label="Plan" value={selectedPlan.name} />
                <Row label="Duration" value={`${selectedPlan.duration_days} days`} />
                <Row label="Starts" value="Immediately on payment" />
                <Row label="Ends" value={new Date(Date.now() + selectedPlan.duration_days * 86400000).toLocaleDateString()} />
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total</span><span>{formatINR(selectedPlan.price)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Payment Method (Demo)</Label>
                <RadioGroup defaultValue="card" className="grid grid-cols-2 gap-2">
                  <Label className="flex items-center gap-2 border rounded-lg p-2.5 cursor-pointer">
                    <RadioGroupItem value="card" /><span className="text-sm">Card</span>
                  </Label>
                  <Label className="flex items-center gap-2 border rounded-lg p-2.5 cursor-pointer">
                    <RadioGroupItem value="upi" /><span className="text-sm">UPI</span>
                  </Label>
                </RadioGroup>
                <Input placeholder="Card / UPI ID (demo — any value works)" />
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-500/10 text-xs text-blue-700 dark:text-blue-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                Demo payment — no real charge will be made. Promotion activates instantly.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)} disabled={processing}>Cancel</Button>
            <Button onClick={completePayment} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Pay {selectedPlan && formatINR(selectedPlan.price)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <Card><CardContent className="p-4 flex items-center gap-3">
    <Icon className={cn("h-8 w-8", color)} />
    <div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
  </CardContent></Card>
);

const MetricBox = ({ label, value }: { label: string; value: string }) => (
  <div className="p-4 rounded-xl border text-center">
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{label}</p>
  </div>
);

const Row = ({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn("font-medium", capitalize && "capitalize")}>{value}</span>
  </div>
);

export default BuilderPromotions;
