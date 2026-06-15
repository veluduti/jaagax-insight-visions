import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, TrendingUp, FileCheck2, IndianRupee, Sparkles, ShieldCheck, Wallet, Users, BellRing, Crown, ArrowUpRight, Loader2, FilePlus2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

/* ---------- Luxury KPI Card ---------- */
function LuxuryKpi({ icon: Icon, label, value, hint, accent = "amber" }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-zinc-950/80 via-zinc-900/60 to-amber-950/30 p-5 backdrop-blur shadow-[0_0_40px_-12px_rgba(245,158,11,0.35)]"
    >
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl group-hover:bg-amber-400/20 transition-colors" />
      <div className="relative flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400/30 to-yellow-600/20 ring-1 ring-amber-400/40 flex items-center justify-center">
          <Icon className="h-5 w-5 text-amber-200" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-amber-300/60" />
      </div>
      <p className="relative text-[11px] uppercase tracking-widest text-amber-200/70 font-medium">{label}</p>
      <p className="relative text-2xl font-bold tabular-nums bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300 bg-clip-text text-transparent mt-1">
        {value}
      </p>
      {hint && <p className="relative text-xs text-muted-foreground mt-1">{hint}</p>}
    </motion.div>
  );
}

const SERVICES = ["Home Loan", "Mortgage", "NBFC", "Legal Services", "Valuation", "Investment Advisory", "Credit Score"];
const PIE_COLORS = ["#fbbf24", "#f59e0b", "#d97706", "#fde68a", "#fcd34d"];

const monthlyTrend = [
  { m: "Jan", apps: 12 }, { m: "Feb", apps: 18 }, { m: "Mar", apps: 24 },
  { m: "Apr", apps: 32 }, { m: "May", apps: 28 }, { m: "Jun", apps: 41 },
];

export default function FinancialDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<any>(null);
  const [stats, setStats] = useState({ enquiries: 0, active: 0, approved: 0, disbursed: 0, conversion: 0, revenue: 0, wallet: 0 });
  const [leadsBreakdown, setLeadsBreakdown] = useState<any[]>([]);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data: prov } = await supabase.from("financial_providers" as any).select("*").eq("user_id", user.id).maybeSingle();
        setProvider(prov);
        if (!prov) { setShowRegister(true); setLoading(false); return; }

        const [{ data: apps }, { data: leads }, { data: wallet }] = await Promise.all([
          supabase.from("financial_loan_applications" as any).select("status, loan_amount, disbursed_amount").eq("provider_id", (prov as any).id),
          supabase.from("financial_leads" as any).select("lead_type, is_purchased, purchased_by_provider_id"),
          supabase.from("wallets" as any).select("balance").eq("user_id", user.id).maybeSingle(),
        ]);

        const appsArr = (apps as any[]) || [];
        const approved = appsArr.filter(a => a.status === "approved").length;
        const active = appsArr.filter(a => ["new", "documents_pending", "under_review"].includes(a.status)).length;
        const disbursed = appsArr.filter(a => a.status === "disbursed").reduce((s, a) => s + Number(a.disbursed_amount || 0), 0);
        const revenue = disbursed * 0.01; // 1% commission illustrative
        const enquiries = ((leads as any[]) || []).filter(l => l.purchased_by_provider_id === (prov as any).id).length;
        const conversion = appsArr.length ? Math.round((approved / appsArr.length) * 100) : 0;

        // Lead breakdown by type
        const groups: Record<string, number> = {};
        ((leads as any[]) || []).forEach(l => { groups[l.lead_type] = (groups[l.lead_type] || 0) + 1; });
        setLeadsBreakdown(Object.entries(groups).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })));

        setStats({ enquiries, active, approved, disbursed, conversion, revenue, wallet: Number((wallet as any)?.balance || 0) });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleRegister = async () => {
    if (!user) return;
    const { error } = await supabase.from("financial_providers" as any).insert({
      user_id: user.id,
      company_name: (user.user_metadata as any)?.name || "Financial Provider",
      entity_type: "individual",
      services_offered: ["Home Loan"],
      kyc_status: "pending",
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Provider profile created — complete KYC to unlock leads");
    location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-amber-950/20">
      <Navigation />
      {/* Decorative gold orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-32 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl" />
      </div>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="h-5 w-5 text-amber-300" />
              <span className="text-xs uppercase tracking-[0.3em] text-amber-300/80">Financial Services Portal</span>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent">
              {provider?.company_name || "Welcome"}
            </h1>
            <p className="text-muted-foreground mt-1">Manage loans, leads, and premium placements.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-500/40 text-amber-200 bg-amber-500/5">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              KYC: {provider?.kyc_status || "pending"}
            </Badge>
            <Badge variant="outline" className="border-amber-500/40 text-amber-200 bg-amber-500/5">
              <Crown className="h-3.5 w-3.5 mr-1" />
              Subscription: {provider?.subscription_status || "inactive"}
            </Badge>
          </div>
        </div>

        {!provider && (
          <Card className="border-amber-500/40 bg-gradient-to-br from-amber-950/40 to-zinc-900/40 p-8 text-center">
            <Landmark className="h-12 w-12 text-amber-300 mx-auto mb-3" />
            <h2 className="text-2xl font-bold mb-2">Set up your Financial Provider profile</h2>
            <p className="text-muted-foreground mb-4">Create your profile to start receiving loan enquiries.</p>
            <Button onClick={handleRegister} className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-semibold">
              <FilePlus2 className="h-4 w-4 mr-2" /> Create Provider Profile
            </Button>
          </Card>
        )}

        {provider && (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <LuxuryKpi icon={BellRing} label="New Enquiries" value={stats.enquiries} hint="this month" />
              <LuxuryKpi icon={FileCheck2} label="Active Applications" value={stats.active} />
              <LuxuryKpi icon={ShieldCheck} label="Approved Loans" value={stats.approved} />
              <LuxuryKpi icon={IndianRupee} label="Disbursed" value={`₹${(stats.disbursed / 100000).toFixed(1)}L`} />
              <LuxuryKpi icon={TrendingUp} label="Conversion Rate" value={`${stats.conversion}%`} />
              <LuxuryKpi icon={Sparkles} label="Revenue" value={`₹${(stats.revenue / 1000).toFixed(1)}K`} />
              <LuxuryKpi icon={Wallet} label="Wallet Balance" value={`₹${stats.wallet.toLocaleString()}`} />
              <LuxuryKpi icon={Crown} label="Subscription" value={provider?.subscription_status === "active" ? "Active" : "Inactive"} />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 border-amber-500/20 bg-gradient-to-br from-zinc-950/80 to-zinc-900/40 p-6 backdrop-blur">
                <h3 className="text-sm uppercase tracking-widest text-amber-200/80 mb-4">Monthly Loan Applications</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                      <XAxis dataKey="m" stroke="#a1a1aa" />
                      <YAxis stroke="#a1a1aa" />
                      <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #fbbf24" }} />
                      <Area type="monotone" dataKey="apps" stroke="#fbbf24" strokeWidth={2} fill="url(#goldFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="border-amber-500/20 bg-gradient-to-br from-zinc-950/80 to-zinc-900/40 p-6 backdrop-blur">
                <h3 className="text-sm uppercase tracking-widest text-amber-200/80 mb-4">Lead Sources</h3>
                {leadsBreakdown.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-12">No leads yet</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={leadsBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {leadsBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #fbbf24" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>

            {/* Quick actions */}
            <Tabs defaultValue="services" className="w-full">
              <TabsList className="bg-zinc-900/60 border border-amber-500/20">
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="leads">Leads</TabsTrigger>
                <TabsTrigger value="apps">Applications</TabsTrigger>
                <TabsTrigger value="promo">Premium Promotions</TabsTrigger>
              </TabsList>

              <TabsContent value="services" className="mt-4">
                <Card className="border-amber-500/20 bg-zinc-950/60 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-amber-100">Services Offered</h3>
                  <div className="flex flex-wrap gap-2">
                    {SERVICES.map(s => {
                      const enabled = (provider?.services_offered || []).includes(s);
                      return (
                        <Badge key={s} variant="outline"
                          className={enabled ? "border-amber-400/60 bg-amber-500/15 text-amber-100" : "border-zinc-700 text-muted-foreground"}>
                          {s}
                        </Badge>
                      );
                    })}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="leads" className="mt-4">
                <Card className="border-amber-500/20 bg-zinc-950/60 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-amber-100 flex items-center gap-2"><Users className="h-5 w-5" /> Lead Marketplace</h3>
                    <Badge className="bg-amber-500/15 text-amber-200 border-amber-400/40">{provider?.kyc_status === "verified" ? "Ready" : "Verify KYC first"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Browse buyer/investor leads and unlock contact details by purchasing from your wallet.</p>
                  <Button className="bg-gradient-to-r from-amber-500 to-yellow-600 text-black hover:from-amber-400 hover:to-yellow-500" disabled={provider?.kyc_status !== "verified"}>
                    Browse Leads
                  </Button>
                </Card>
              </TabsContent>

              <TabsContent value="apps" className="mt-4">
                <Card className="border-amber-500/20 bg-zinc-950/60 p-6">
                  <h3 className="text-lg font-semibold mb-2 text-amber-100 flex items-center gap-2"><FileCheck2 className="h-5 w-5" /> Loan Applications</h3>
                  <p className="text-sm text-muted-foreground">Active: {stats.active} · Approved: {stats.approved} · Disbursed: {stats.disbursed > 0 ? `₹${(stats.disbursed/100000).toFixed(1)}L` : "—"}</p>
                </Card>
              </TabsContent>

              <TabsContent value="promo" className="mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { name: "Homepage Featured", price: 499, days: 1, badge: "Logo on homepage" },
                    { name: "Top Search Placement", price: 999, days: 7, badge: "First in search" },
                    { name: "Preferred Partner", price: 4999, days: 30, badge: "Preferred badge" },
                    { name: "Premium Verified", price: 7999, days: 30, badge: "Gold + Verified" },
                  ].map(p => (
                    <Card key={p.name} className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-zinc-950/80 to-zinc-900/40 p-5">
                      <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-amber-400/15 blur-2xl" />
                      <div className="relative flex items-start justify-between mb-3">
                        <Crown className="h-6 w-6 text-amber-300" />
                        <Badge className="bg-amber-500/15 text-amber-200 border-amber-400/40">{p.badge}</Badge>
                      </div>
                      <h4 className="relative text-lg font-semibold text-amber-100">{p.name}</h4>
                      <p className="relative text-3xl font-bold tabular-nums bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent mt-2">
                        ₹{p.price.toLocaleString()}
                        <span className="text-xs font-normal text-muted-foreground"> / {p.days}d</span>
                      </p>
                      <Button className="relative w-full mt-4 bg-gradient-to-r from-amber-500 to-yellow-600 text-black hover:from-amber-400 hover:to-yellow-500">
                        Purchase
                      </Button>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
