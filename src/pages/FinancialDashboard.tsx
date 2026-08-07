import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Landmark,
  RefreshCw,
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
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Download,
  Eye,
  MoreHorizontal,
  ChevronRight,
  DollarSign,
  PieChart,
  BarChart3,
  Activity,
  UserPlus,
  Briefcase,
  Home,
  Building,
  UserCheck,
  UserX,
  Clock as ClockIcon,
  CalendarDays,
  Users as UsersIcon,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Zap,
  Star,
  TrendingDown,
  Gift,
  Award,
  Target,
  Flag,
  AlertTriangle,
  Check,
  FolderOpen,
  FileArchive,
  User,
  PhoneCall,
  CalendarCheck,
  FileSpreadsheet,
  Printer,
  Send,
  Link as LinkIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";

// Types
type LoanApplication = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  loan_amount: number;
  loan_type: string;
  status:
    | "new"
    | "documents_pending"
    | "documents_received"
    | "under_verification"
    | "credit_check"
    | "bank_review"
    | "sanctioned"
    | "approved"
    | "rejected"
    | "disbursed"
    | "closed";
  created_at: string;
  updated_at: string;
  disbursed_amount: number | null;
  documents: any[];
  notes: string | null;
  assigned_rm: string | null;
  priority: "low" | "medium" | "high" | "urgent";
};

type Notification = {
  id: string;
  type: "urgent" | "approval" | "document" | "payment" | "lead" | "promotion" | "system";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link: string | null;
};

// Constants
const LOAN_STATUSES = [
  { value: "new", label: "New", color: "bg-blue-500", icon: FilePlus2 },
  { value: "documents_pending", label: "Documents Pending", color: "bg-yellow-500", icon: FileText },
  { value: "documents_received", label: "Documents Received", color: "bg-blue-400", icon: FileCheck2 },
  { value: "under_verification", label: "Under Verification", color: "bg-purple-500", icon: ShieldCheck },
  { value: "credit_check", label: "Credit Check", color: "bg-indigo-500", icon: CreditCard },
  { value: "bank_review", label: "Bank Review", color: "bg-cyan-500", icon: Building },
  { value: "sanctioned", label: "Sanctioned", color: "bg-emerald-500", icon: CheckCircle2 },
  { value: "approved", label: "Approved", color: "bg-emerald-600", icon: Check },
  { value: "rejected", label: "Rejected", color: "bg-red-500", icon: XCircle },
  { value: "disbursed", label: "Disbursed", color: "bg-green-600", icon: DollarSign },
  { value: "closed", label: "Closed", color: "bg-gray-500", icon: FolderOpen },
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400",
  documents_pending: "bg-yellow-500/20 text-yellow-400",
  documents_received: "bg-blue-400/20 text-blue-400",
  under_verification: "bg-purple-500/20 text-purple-400",
  credit_check: "bg-indigo-500/20 text-indigo-400",
  bank_review: "bg-cyan-500/20 text-cyan-400",
  sanctioned: "bg-emerald-500/20 text-emerald-400",
  approved: "bg-emerald-600/20 text-emerald-500",
  rejected: "bg-red-500/20 text-red-400",
  disbursed: "bg-green-600/20 text-green-400",
  closed: "bg-gray-500/20 text-gray-400",
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted))",
  "hsl(var(--destructive))",
  "hsl(200, 70%, 50%)",
  "hsl(340, 70%, 50%)",
];

// Components
function StatCard({ icon: Icon, label, value, hint, trend, trendValue }: any) {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 border border-border/50 overflow-hidden group">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
          </div>
          {trend && (
            <div
              className={`flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                trend === "up"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : trend === "down"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-gray-500/10 text-muted-foreground"
              }`}
            >
              {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
              {trend === "down" && <ArrowDownRight className="h-3 w-3" />}
              {trend === "neutral" && <Minus className="h-3 w-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold tracking-tight">{value}</div>
            {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ to, icon: Icon, label, sub, badge }: any) {
  return (
    <Link to={to}>
      <Card className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer h-full">
        <CardContent className="p-4 text-center">
          <div className="h-10 w-10 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center relative">
            <Icon className="h-5 w-5 text-primary" />
            {badge && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive text-white">
                {badge}
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusObj = LOAN_STATUSES.find((s) => s.value === status);
  const colorClass = STATUS_COLORS[status] || "bg-gray-500/20 text-gray-400";
  return <Badge className={`${colorClass} capitalize`}>{statusObj?.label || status.replace(/_/g, " ")}</Badge>;
}

export default function FinancialDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<any>(null);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [stats, setStats] = useState({
    enquiries: 0,
    active: 0,
    approved: 0,
    disbursed: 0,
    conversion: 0,
    revenue: 0,
    pendingDocuments: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
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

      // Load applications
      const { data: apps } = await supabase
        .from("financial_loan_applications" as any)
        .select("*")
        .eq("provider_id", prov.id)
        .order("created_at", { ascending: false });

      const appsArr = (apps as any[]) || [];
      setApplications(appsArr as LoanApplication[]);

      // Load notifications
      const { data: notifs } = await supabase
        .from("financial_notifications" as any)
        .select("*")
        .eq("provider_id", prov.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setNotifications((notifs || []) as Notification[]);

      // Calculate stats
      const approved = appsArr.filter((a: any) => a.status === "approved").length;
      const active = appsArr.filter((a: any) =>
        [
          "new",
          "documents_pending",
          "documents_received",
          "under_verification",
          "credit_check",
          "bank_review",
        ].includes(a.status),
      ).length;
      const disbursed = appsArr
        .filter((a: any) => a.status === "disbursed")
        .reduce((s: number, a: any) => s + Number(a.disbursed_amount || 0), 0);
      const revenue = disbursed * 0.01;
      const enquiries = appsArr.length;
      const conversion = appsArr.length ? Math.round((approved / appsArr.length) * 100) : 0;
      const pendingDocuments = appsArr.filter((a: any) => a.status === "documents_pending").length;

      setStats({
        enquiries,
        active,
        approved,
        disbursed,
        conversion,
        revenue,
        pendingDocuments,
      });

      // Monthly trend
      const monthlyData = appsArr.reduce((acc: any, app: any) => {
        const month = new Date(app.created_at).toLocaleString("default", { month: "short" });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});

      const sortedMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const trendData = sortedMonths
        .map((m) => ({
          m,
          apps: monthlyData[m] || 0,
        }))
        .filter(
          (d) =>
            d.apps > 0 ||
            sortedMonths.indexOf(d.m) >
              sortedMonths.indexOf(new Date().toLocaleString("default", { month: "short" })) - 6,
        );

      setMonthlyTrend(trendData.slice(-6));
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

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

  const handleMarkNotificationRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("financial_notifications" as any)
      .update({ read: true })
      .eq("id", notificationId);

    if (!error) {
      loadDashboard();
    }
  };

  const filteredApplications = useMemo(() => {
    let filtered = applications;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.customer_name.toLowerCase().includes(query) ||
          app.customer_email.toLowerCase().includes(query) ||
          app.customer_phone.includes(query) ||
          app.id.toLowerCase().includes(query) ||
          app.loan_type.toLowerCase().includes(query),
      );
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((app) => app.status === selectedStatus);
    }

    return filtered.slice(0, 10);
  }, [applications, searchQuery, selectedStatus]);

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <BellRing className="h-4 w-4 mr-1" />
                  Notifications
                  {notifications.filter((n) => !n.read).length > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive text-white">
                      {notifications.filter((n) => !n.read).length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.slice(0, 10).map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className="flex flex-col items-start gap-1 cursor-pointer"
                    onClick={() => handleMarkNotificationRead(n.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Badge variant="outline" className="text-xs">
                        {n.type}
                      </Badge>
                      {!n.read && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                  </DropdownMenuItem>
                ))}
                {notifications.length === 0 && <DropdownMenuItem>No notifications</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/financial/notifications" className="w-full text-center text-primary">
                    View all
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/dashboard/financial/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" /> Settings
              </Button>
            </Link>

            <Badge variant="secondary">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              KYC: {provider?.kyc_status || "pending"}
            </Badge>
            <Badge variant={provider?.subscription_status === "active" ? "default" : "secondary"}>
              <Crown className="h-3.5 w-3.5 mr-1" />
              {provider?.subscription_status === "active" ? "Active" : "Inactive"}
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
            {/* Quick Actions - Removed Leads, Wallet, Calendar */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <QuickAction
                to="/dashboard/financial/applications"
                icon={FileCheck2}
                label="Applications"
                sub="Process Loans"
                badge={stats.active}
              />
              <QuickAction to="/dashboard/financial/customers" icon={User} label="Customers" sub="Manage Clients" />
              <QuickAction to="/dashboard/financial/reports" icon={BarChart3} label="Reports" sub="View Analytics" />
            </div>

            {/* Today's Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard
                icon={FilePlus2}
                label="New Applications"
                value={applications.filter((a) => a.status === "new").length}
                hint="Requires review"
                trend="up"
                trendValue="+12% vs last week"
              />
              <StatCard
                icon={FileText}
                label="Pending Documents"
                value={stats.pendingDocuments}
                hint="Waiting for customer"
                trend={stats.pendingDocuments > 0 ? "down" : "neutral"}
                trendValue={stats.pendingDocuments > 0 ? `${stats.pendingDocuments} pending` : "All clear"}
              />
              <StatCard
                icon={ShieldCheck}
                label="Under Verification"
                value={applications.filter((a) => ["under_verification", "credit_check"].includes(a.status)).length}
                hint="In progress"
              />
              <StatCard
                icon={CheckCircle2}
                label="Approved"
                value={stats.approved}
                hint="Ready for disbursement"
                trend="up"
                trendValue="+8% vs last month"
              />
              <StatCard
                icon={DollarSign}
                label="Disbursed"
                value={`₹${(stats.disbursed / 100000).toFixed(1)}L`}
                hint="Total loans disbursed"
              />
            </div>

            {/* Loan Pipeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Loan Pipeline
                </CardTitle>
                <CardDescription>Track applications through each stage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  {["new", "documents_pending", "under_verification", "credit_check", "approved", "disbursed"].map(
                    (status, index) => {
                      const count = applications.filter((a) => a.status === status).length;
                      const statusObj = LOAN_STATUSES.find((s) => s.value === status);
                      const isActive = count > 0;
                      return (
                        <div key={status} className="flex items-center gap-2 w-full md:w-auto">
                          <div
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isActive ? "border-primary/40 bg-primary/5" : "border-border/40"}`}
                          >
                            <div className={`h-2 w-2 rounded-full ${statusObj?.color || "bg-gray-400"}`} />
                            <span className="text-xs font-medium">{statusObj?.label || status}</span>
                            <Badge variant={isActive ? "default" : "outline"} className="text-xs">
                              {count}
                            </Badge>
                          </div>
                          {index < 5 && <ChevronRight className="h-4 w-4 text-muted-foreground hidden md:block" />}
                        </div>
                      );
                    },
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Applications Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Monthly Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="primaryFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
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

            {/* Tabs for detailed views - Removed Services, Leads tabs */}
            <Tabs defaultValue="apps" className="w-full">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="apps">Applications</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
                <TabsTrigger value="customers">Customers</TabsTrigger>
              </TabsList>

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
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                            <th className="pb-2 font-medium">Application ID</th>
                            <th className="pb-2 font-medium">Customer</th>
                            <th className="pb-2 font-medium">Amount</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium">Last Updated</th>
                            <th className="pb-2 font-medium text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredApplications.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                No applications found
                              </td>
                            </tr>
                          ) : (
                            filteredApplications.map((app) => (
                              <tr
                                key={app.id}
                                className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                              >
                                <td className="py-3 font-medium text-primary">
                                  <Link to={`/dashboard/financial/applications/${app.id}`}>
                                    {app.id.slice(0, 8).toUpperCase()}
                                  </Link>
                                </td>
                                <td className="py-3">
                                  <div>
                                    <p className="font-medium">{app.customer_name}</p>
                                    <p className="text-xs text-muted-foreground">{app.customer_phone}</p>
                                  </div>
                                </td>
                                <td className="py-3 font-medium">₹{app.loan_amount.toLocaleString()}</td>
                                <td className="py-3">
                                  <StatusBadge status={app.status} />
                                </td>
                                <td className="py-3 text-xs text-muted-foreground">
                                  {new Date(app.updated_at).toLocaleString()}
                                </td>
                                <td className="py-3 text-right">
                                  <Link to={`/dashboard/financial/applications/${app.id}`}>
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4">
                      <Link to="/dashboard/financial/applications">
                        <Button variant="outline">View All Applications</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reports" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" /> Reports
                    </CardTitle>
                    <CardDescription>
                      Loan reports, revenue reports, commission reports, lead reports, performance reports
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <Link to="/dashboard/financial/reports/loans">
                        <Button variant="outline" className="w-full">
                          Loan Reports
                        </Button>
                      </Link>
                      <Link to="/dashboard/financial/reports/revenue">
                        <Button variant="outline" className="w-full">
                          Revenue Reports
                        </Button>
                      </Link>
                      <Link to="/dashboard/financial/reports/commission">
                        <Button variant="outline" className="w-full">
                          Commission Reports
                        </Button>
                      </Link>
                      <Link to="/dashboard/financial/reports/leads">
                        <Button variant="outline" className="w-full">
                          Lead Reports
                        </Button>
                      </Link>
                      <Link to="/dashboard/financial/reports/performance">
                        <Button variant="outline" className="w-full">
                          Performance Reports
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="customers" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" /> Customers
                    </CardTitle>
                    <CardDescription>Manage customer relationships and communication</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Link to="/dashboard/financial/customers">
                        <Button variant="outline" className="w-full">
                          All Customers
                        </Button>
                      </Link>
                      <Link to="/dashboard/financial/customers/communication">
                        <Button variant="outline" className="w-full">
                          Communication
                        </Button>
                      </Link>
                      <Link to="/dashboard/financial/customers/documents">
                        <Button variant="outline" className="w-full">
                          Documents
                        </Button>
                      </Link>
                      <Link to="/dashboard/financial/customers/kyc">
                        <Button variant="outline" className="w-full">
                          KYC
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
