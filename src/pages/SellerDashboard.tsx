import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Plus, Home, BarChart, LogOut, Eye, MessageSquare, TrendingUp, IndianRupee,
  Edit, CheckCircle2, Clock, XCircle, AlertCircle, Sparkles, ArrowUpRight, MapPin, Bed, Bath, Maximize2, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";

interface Property {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  type: string | null;
  images: any;
  verified: boolean | null;
  verification_status: string;
  rejection_reason: string | null;
  is_draft: boolean | null;
  listing_type: string | null;
  created_at: string;
}

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending Approval", color: "bg-amber-500", icon: Clock },
  approved: { label: "Live", color: "bg-emerald-500", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-rose-500", icon: XCircle },
  draft: { label: "Draft", color: "bg-slate-500", icon: Edit },
};

export default function SellerDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) await fetchProperties(user.id);
    setLoading(false);
  };

  const fetchProperties = async (uid: string) => {
    const { data } = await supabase
      .from("properties")
      .select("id, title, city, locality, price, area_sqft, bedrooms, bathrooms, type, images, verified, verification_status, rejection_reason, is_draft, listing_type, created_at")
      .eq("submitted_by", uid)
      .order("created_at", { ascending: false });
    setProperties((data as any) || []);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/");
  };

  const formatPrice = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const counts = {
    all: properties.length,
    pending: properties.filter(p => p.verification_status === "pending" && !p.is_draft).length,
    approved: properties.filter(p => p.verification_status === "approved" || p.verified).length,
    rejected: properties.filter(p => p.verification_status === "rejected").length,
    draft: properties.filter(p => p.is_draft).length,
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" /></div>;
  }

  const PropertyCard = ({ p }: { p: Property }) => {
    const status = p.is_draft ? "draft" : (p.verification_status || "pending");
    const meta = STATUS_META[status] || STATUS_META.pending;
    const StatusIcon = meta.icon;
    const img = (Array.isArray(p.images) && p.images[0]) || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600";

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}>
        <Card className="overflow-hidden border-2 hover:border-emerald-500/40 hover:shadow-xl transition-all group">
          <div className="relative h-44 overflow-hidden">
            <img src={img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <Badge className={`absolute top-3 left-3 ${meta.color} text-white border-0 gap-1`}>
              <StatusIcon className="h-3 w-3" />{meta.label}
            </Badge>
            {p.listing_type && (
              <Badge variant="secondary" className="absolute top-3 right-3 bg-background/90">
                {p.listing_type === "rent" ? "For Rent" : "For Sale"}
              </Badge>
            )}
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="text-white font-semibold line-clamp-1 drop-shadow">{p.title}</h3>
              <p className="text-white/80 text-xs flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" />{p.locality}, {p.city}
              </p>
            </div>
          </div>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold text-emerald-500">{formatPrice(p.price)}</p>
              <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {p.bedrooms != null && <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{p.bedrooms} BHK</span>}
              {p.bathrooms != null && <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{p.bathrooms}</span>}
              {p.area_sqft != null && <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" />{p.area_sqft} sqft</span>}
            </div>
            {status === "rejected" && p.rejection_reason && (
              <div className="p-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400">
                <p className="font-semibold flex items-center gap-1"><AlertCircle className="h-3 w-3" />Reason</p>
                <p className="mt-0.5">{p.rejection_reason}</p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              {(status === "rejected" || status === "draft") && (
                <Button size="sm" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => navigate(`/sell-property?edit=${p.id}`)}>
                  <Edit className="h-3 w-3 mr-1" />{status === "draft" ? "Continue" : "Edit & Resubmit"}
                </Button>
              )}
              {status === "approved" && (
                <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(`/property/${p.id}`, "_blank")}>
                  <ArrowUpRight className="h-3 w-3 mr-1" />View Live
                </Button>
              )}
              {status === "pending" && (
                <Button size="sm" variant="outline" className="flex-1" disabled>
                  <Clock className="h-3 w-3 mr-1" />Awaiting Review
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const filterProperties = (s: string) => {
    if (s === "all") return properties;
    if (s === "approved") return properties.filter(p => p.verification_status === "approved" || p.verified);
    if (s === "pending") return properties.filter(p => p.verification_status === "pending" && !p.is_draft);
    if (s === "rejected") return properties.filter(p => p.verification_status === "rejected");
    if (s === "draft") return properties.filter(p => p.is_draft);
    return properties;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5">
      <Navigation />

      {/* Sticky Header */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-emerald-500" />
              Seller Hub
            </h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user?.email?.split("@")[0]}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/sell-property")} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
              <Plus className="h-4 w-4 mr-1" />Add Property
            </Button>
            <Button variant="outline" size="icon" onClick={() => fetchProperties(user.id)}><RefreshCw className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={handleSignOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Status overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: counts.all, icon: Home, color: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-500" },
            { label: "Live", value: counts.approved, icon: CheckCircle2, color: "from-green-500/20 to-green-500/5", iconColor: "text-green-500" },
            { label: "Pending", value: counts.pending, icon: Clock, color: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-500" },
            { label: "Rejected", value: counts.rejected, icon: XCircle, color: "from-rose-500/20 to-rose-500/5", iconColor: "text-rose-500" },
            { label: "Drafts", value: counts.draft, icon: Edit, color: "from-slate-500/20 to-slate-500/5", iconColor: "text-slate-500" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`bg-gradient-to-br ${s.color} border-2 hover:shadow-lg transition-all`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                      <p className="text-2xl font-bold mt-1">{s.value}</p>
                    </div>
                    <s.icon className={`h-8 w-8 ${s.iconColor}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick action cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent hover:shadow-lg" onClick={() => navigate("/sell-property")}>
              <CardContent className="p-5 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/20"><Plus className="h-6 w-6 text-emerald-500" /></div>
                <div>
                  <h3 className="font-semibold">Add Property</h3>
                  <p className="text-xs text-muted-foreground">List a new home</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer border-2 hover:shadow-lg" onClick={() => navigate("/valuation")}>
              <CardContent className="p-5 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/15"><IndianRupee className="h-6 w-6 text-blue-500" /></div>
                <div>
                  <h3 className="font-semibold">Get Valuation</h3>
                  <p className="text-xs text-muted-foreground">AI price estimate</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer border-2 hover:shadow-lg" onClick={() => navigate("/agents")}>
              <CardContent className="p-5 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/15"><MessageSquare className="h-6 w-6 text-purple-500" /></div>
                <div>
                  <h3 className="font-semibold">Find Agent</h3>
                  <p className="text-xs text-muted-foreground">Get expert help</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer border-2 hover:shadow-lg">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-orange-500/15"><BarChart className="h-6 w-6 text-orange-500" /></div>
                <div>
                  <h3 className="font-semibold">Analytics</h3>
                  <p className="text-xs text-muted-foreground">Track performance</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Listings tabs */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>My Listings</CardTitle>
                <CardDescription>Track verification and manage your properties</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="flex flex-wrap h-auto">
                <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
                <TabsTrigger value="approved">Live ({counts.approved})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
                <TabsTrigger value="draft">Drafts ({counts.draft})</TabsTrigger>
              </TabsList>
              {["all", "pending", "approved", "rejected", "draft"].map((s) => {
                const list = filterProperties(s);
                return (
                  <TabsContent key={s} value={s} className="mt-6">
                    {list.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed rounded-xl">
                        <Home className="h-16 w-16 mx-auto mb-3 text-muted-foreground opacity-40" />
                        <p className="font-semibold mb-1">No properties here</p>
                        <p className="text-sm text-muted-foreground mb-4">Start by listing your first property</p>
                        <Button onClick={() => navigate("/sell-property")} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                          <Plus className="h-4 w-4 mr-1" />Add Property
                        </Button>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {list.map((p) => <PropertyCard key={p.id} p={p} />)}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
