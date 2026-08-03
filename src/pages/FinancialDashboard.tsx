import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Landmark,
  TrendingUp,
  FileCheck2,
  IndianRupee,
  Sparkles,
  ShieldCheck,
  Wallet,
  Users,
  BellRing,
  Crown,
  Loader2,
  FilePlus2,
  Search,
  CreditCard,
  Megaphone,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const SERVICES = [
  "Home Loan",
  "Mortgage",
  "NBFC",
  "Legal Services",
  "Valuation",
  "Investment Advisory",
  "Credit Score",
];
const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted))",
  "hsl(var(--destructive))",
];

const monthlyTrend = [
  { m: "Jan", apps: 12 },
  { m: "Feb", apps: 18 },
  { m: "Mar", apps: 24 },
  { m: "Apr", apps: 32 },
  { m: "May", apps: 28 },
  { m: "Jun", apps: 41 },
];

function StatCard({ icon: Icon, label, value, hint }: any) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function QuickAction({ to, icon: Icon, label, sub }: any) {
  return (
    <Link to={to}>
      <Card className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer h-full">
        <CardContent className="p-4 text-center">
          <div className="h-10 w-10 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function FinancialDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<any>(null);
  const [stats, setStats] = useState({
    enquiries: 0,
    active: 0,
    approved: 0,
    disbursed: 0,
    conversion: 0,
    revenue: 0,
    wallet: 0,
  });
  const [leadsBreakdown, setLeadsBreakdown] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data: prov } = await supabase
          .from("financial_providers" as any)
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        setProvider(prov);
        if (!prov) {
          setLoading(false);
          return;
        }

        const [{ data: apps }, { data: leads }, { data: wallet }] = await Promise.all([
          supabase
            .from("financial_loan_applications" as any)
            .select("status, loan_amount, disbursed_amount")
            .eq("provider_id", (prov as any).id),
          supabase.from("financial_leads" as any).select("lead_type, is_purchased, purchased_by_provider_id"),
          supabase
            .from("wallets" as any)
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        const appsArr = (apps as any[]) || [];
        const approved = appsArr.filter((a) => a.status === "approved").length;
        const active = appsArr.filter((a) => ["new", "documents_pending", "under_review"].includes(a.status)).length;
        const disbursed = appsArr
          .filter((a) => a.status === "disbursed")
          .reduce((s, a) => s + Number(a.disbursed_amount || 0), 0);
        const revenue = disbursed * 0.01;
        const enquiries = ((leads as any[]) || []).filter(
          (l) => l.purchased_by_provider_id === (prov as any).id,
        ).length;
        const conversion = appsArr.length ? Math.round((approved / appsArr.length) * 100) : 0;

        const groups: Record<string, number> = {};
        ((leads as any[]) || []).forEach((l) => {
          groups[l.lead_type] = (groups[l.lead_type] || 0) + 1;
        });
        setLeadsBreakdown(Object.entries(groups).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })));

        setStats({
          enquiries,
          active,
          approved,
          disbursed,
          conversion,
          revenue,
          wallet: Number((wallet as any)?.balance || 0),
        });
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
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Provider profile created — complete KYC to unlock leads");
    location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Landmark className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Financial Services Portal
              </span>
            </div>
            <h1 className="text-3xl font-bold">{provider?.company_name || "Welcome"}</h1>
            <p className="text-muted-foreground mt-1">Manage loans, leads, and premium placements.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/dashboard/financial/notifications">
              <Button variant="outline" size="sm">
                <BellRing className="h-4 w-4 mr-1" /> Notifications
              </Button>
            </Link>
            <Link to="/dashboard/financial/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" /> Settings
              </Button>
            </Link>
            <Badge variant="secondary">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              KYC: {provider?.kyc_status || "pending"}
            </Badge>
            <Badge variant="secondary">
              <Crown className="h-3.5 w-3.5 mr-1" />
              {provider?.subscription_status || "inactive"}
            </Badge>
          </div>
        </div>

        {!provider && (
          <Card>
            <CardContent className="p-8 text-center">
              <Landmark className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold mb-2">Set up your Financial Provider profile</h2>
              <p className="text-muted-foreground mb-4">Create your profile to start receiving loan enquiries.</p>
              <Button onClick={handleRegister}>
                <FilePlus2 className="h-4 w-4 mr-2" /> Create Provider Profile
              </Button>
            </CardContent>
          </Card>
        )}

        {provider && (
          <>
            {/* Quick actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickAction to="/dashboard/financial/leads" icon={Search} label="Leads" sub="Purchase & Manage" />
              <QuickAction
                to="/dashboard/financial/applications"
                icon={FileCheck2}
                label="Applications"
                sub="Process Loans"
              />
              <QuickAction
                to="/dashboard/financial/promotions"
                icon={Megaphone}
                label="Promotions"
                sub="Premium Visibility"
              />
              <QuickAction to="/dashboard/financial/settings" icon={Users} label="Team" sub="Manage RMs" />
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={BellRing} label="New Enquiries" value={stats.enquiries} hint="this month" />
              <StatCard icon={FileCheck2} label="Active Applications" value={stats.active} />
              <StatCard icon={ShieldCheck} label="Approved Loans" value={stats.approved} />
              <StatCard icon={IndianRupee} label="Disbursed" value={`₹${(stats.disbursed / 100000).toFixed(1)}L`} />
              <StatCard icon={TrendingUp} label="Conversion Rate" value={`${stats.conversion}%`} />
              <StatCard icon={Sparkles} label="Revenue" value={`₹${(stats.revenue / 1000).toFixed(1)}K`} />
              <StatCard
                icon={Crown}
                label="Subscription"
                value={provider?.subscription_status === "active" ? "Active" : "Inactive"}
              />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Monthly Loan Applications</CardTitle>
                  <CardDescription>Last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrend}>
                        <defs>
                          <linearGradient id="primaryFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="apps"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#primaryFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lead Sources</CardTitle>
                  <CardDescription>Distribution by type</CardDescription>
                </CardHeader>
                <CardContent>
                  {leadsBreakdown.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-12">No leads yet</p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={leadsBreakdown}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                          >
                            {leadsBreakdown.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--popover))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 8,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="services" className="w-full">
              <TabsList>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="leads">Leads</TabsTrigger>
                <TabsTrigger value="apps">Applications</TabsTrigger>
                <TabsTrigger value="promo">Premium Promotions</TabsTrigger>
              </TabsList>

              <TabsContent value="services" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Services Offered</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {SERVICES.map((s) => {
                        const enabled = (provider?.services_offered || []).includes(s);
                        return (
                          <Badge key={s} variant={enabled ? "default" : "outline"}>
                            {s}
                          </Badge>
                        );
                      })}
                    </div>
                    <div className="mt-6 pt-4 border-t">
                      <Link to="/dashboard/financial/settings">
                        <Button variant="outline">
                          <Settings className="h-4 w-4 mr-2" /> Edit Services & Profile
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="leads" className="mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" /> Lead Marketplace
                      </CardTitle>
                      <Badge variant={provider?.kyc_status === "verified" ? "default" : "secondary"}>
                        {provider?.kyc_status === "verified" ? "KYC Verified - Ready" : "Verify KYC First"}
                      </Badge>
                    </div>
                    <CardDescription>
                      Browse buyer/investor leads and unlock contact details by purchasing from your wallet.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to="/dashboard/financial/leads">
                      <Button disabled={provider?.kyc_status !== "verified"}>Browse Leads</Button>
                    </Link>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="apps" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileCheck2 className="h-5 w-5" /> Loan Applications
                    </CardTitle>
                    <CardDescription>
                      Active: {stats.active} · Approved: {stats.approved} · Disbursed:{" "}
                      {stats.disbursed > 0 ? `₹${(stats.disbursed / 100000).toFixed(1)}L` : "—"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to="/dashboard/financial/applications">
                      <Button variant="outline">View All Applications</Button>
                    </Link>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="promo" className="mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { name: "Homepage Featured", price: 499, days: 1, badge: "Logo on homepage", icon: Crown },
                    { name: "Top Search Placement", price: 999, days: 7, badge: "First in search", icon: TrendingUp },
                    { name: "Preferred Partner", price: 4999, days: 30, badge: "Preferred badge", icon: ShieldCheck },
                    { name: "Premium Verified", price: 7999, days: 30, badge: "Gold + Verified", icon: Sparkles },
                  ].map((p) => (
                    <Card key={p.name} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <p.icon className="h-5 w-5 text-primary" />
                          </div>
                          <Badge variant="secondary">{p.badge}</Badge>
                        </div>
                        <CardTitle className="text-lg pt-2">{p.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold tabular-nums">
                          ₹{p.price.toLocaleString()}
                          <span className="text-xs font-normal text-muted-foreground"> / {p.days}d</span>
                        </p>
                        <Link to="/dashboard/financial/promotions">
                          <Button className="w-full mt-4">Purchase</Button>
                        </Link>
                      </CardContent>
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
