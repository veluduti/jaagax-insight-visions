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

type Task = {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  type: "follow_up" | "call" | "document_verification" | "meeting" | "bank_visit" | "signature";
  assigned_to: string;
  customer_id: string | null;
  customer_name: string | null;
  created_at: string;
};

type Meeting = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  type: "customer_visit" | "document_collection" | "bank_appointment" | "disbursement" | "review" | "other";
  status: "scheduled" | "completed" | "cancelled";
  customer_name: string;
  customer_phone: string;
  location: string;
  notes: string;
};

type Activity = {
  id: string;
  type:
    | "loan_approved"
    | "new_application"
    | "document_uploaded"
    | "disbursed"
    | "status_changed"
    | "payment_received"
    | "lead_purchased"
    | "meeting_scheduled";
  message: string;
  created_at: string;
  user_name: string; // Changed from 'user' to 'user_name'
  metadata: any;
};

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  applications_count: number;
  approvals_count: number;
  revenue: number;
  pending_count: number;
  avatar: string | null;
};

type WalletTransaction = {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  category: "lead_purchase" | "promotion" | "recharge" | "commission" | "refund" | "other";
  created_at: string;
  balance: number;
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

const TASK_PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-500/20 text-blue-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  high: "bg-orange-500/20 text-orange-400",
  urgent: "bg-red-500/20 text-red-400",
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
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        {trend && (
          <div
            className={`flex items-center gap-1 mt-1 text-xs ${trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"}`}
          >
            {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
            {trend === "down" && <ArrowDownRight className="h-3 w-3" />}
            {trend === "neutral" && <Minus className="h-3 w-3" />}
            {trendValue}
          </div>
        )}
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

function PriorityBadge({ priority }: { priority: string }) {
  const color = TASK_PRIORITY_COLORS[priority] || "bg-gray-500/20 text-gray-400";
  return <Badge className={`${color} capitalize text-xs`}>{priority}</Badge>;
}

function TaskItem({ task, onComplete }: { task: Task; onComplete?: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-border/40 hover:bg-muted/20 transition-colors">
      <div className="flex items-start gap-3 flex-1">
        <div className="mt-1">
          <input
            type="checkbox"
            checked={task.status === "completed"}
            onChange={() => onComplete?.(task.id)}
            className="h-4 w-4 rounded border-border text-primary"
          />
        </div>
        <div className="flex-1">
          <p className={`text-sm ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <PriorityBadge priority={task.priority} />
            <span className="text-xs text-muted-foreground">{task.customer_name}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );
}

function MeetingItem({ meeting }: { meeting: Meeting }) {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-border/40 hover:bg-muted/20 transition-colors">
      <div className="w-12 text-center">
        <div className="text-sm font-semibold">{new Date(meeting.date).getDate()}</div>
        <div className="text-xs text-muted-foreground">
          {new Date(meeting.date).toLocaleString("default", { month: "short" })}
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{meeting.title}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Clock className="h-3 w-3" />
          {meeting.time} • {meeting.customer_name}
        </p>
      </div>
      <Badge variant="outline" className="text-xs">
        {meeting.status}
      </Badge>
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const icons: Record<string, any> = {
    loan_approved: CheckCircle2,
    new_application: FilePlus2,
    document_uploaded: FileText,
    disbursed: DollarSign,
    status_changed: RefreshCw,
    payment_received: CreditCard,
    lead_purchased: Users,
    meeting_scheduled: Calendar,
  };
  const Icon = icons[activity.type] || Activity;

  return (
    <div className="flex items-start gap-3 p-3 border-b border-border/40 hover:bg-muted/20 transition-colors">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm">{activity.message}</p>
        <p className="text-xs text-muted-foreground">
          {activity.user_name && `By ${activity.user_name} • `}
          {new Date(activity.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function FinancialDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<any>(null);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
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
    wallet: 0,
    pendingDocuments: 0,
    urgentTasks: 0,
    todayMeetings: 0,
  });
  const [leadsBreakdown, setLeadsBreakdown] = useState<any[]>([]);
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

      // Load tasks
      const { data: tasksData } = await supabase
        .from("financial_tasks" as any)
        .select("*")
        .eq("provider_id", prov.id)
        .order("due_date", { ascending: true })
        .limit(20);

      setTasks((tasksData || []) as Task[]);

      // Load meetings
      const { data: meetingsData } = await supabase
        .from("financial_meetings" as any)
        .select("*")
        .eq("provider_id", prov.id)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(10);

      setMeetings((meetingsData || []) as Meeting[]);

      // Load activities
      const { data: activitiesData } = await supabase
        .from("financial_activities" as any)
        .select("*")
        .eq("provider_id", prov.id)
        .order("created_at", { ascending: false })
        .limit(20);

      // Map the data to ensure user_name is set
      setActivities(
        (activitiesData || []).map((act: any) => ({
          ...act,
          user_name: act.user_name || act.user || "System",
        })) as Activity[],
      );

      // Load team members
      const { data: teamData } = await supabase
        .from("financial_team_members" as any)
        .select("*")
        .eq("provider_id", prov.id)
        .eq("is_active", true);

      setTeamMembers((teamData || []) as TeamMember[]);

      // Load wallet
      const { data: wallet } = await supabase
        .from("wallet_transactions" as any)
        .select("balance")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const balance = Number(wallet?.balance || 0);
      setWalletBalance(balance);

      // Load wallet transactions
      const { data: transactions } = await supabase
        .from("wallet_transactions" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setWalletTransactions((transactions || []) as WalletTransaction[]);

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
      const urgentTasks = (tasksData || []).filter(
        (t: any) => t.priority === "urgent" && t.status !== "completed",
      ).length;
      const todayMeetings = (meetingsData || []).filter(
        (m: any) => m.date === new Date().toISOString().split("T")[0] && m.status === "scheduled",
      ).length;

      setStats({
        enquiries,
        active,
        approved,
        disbursed,
        conversion,
        revenue,
        wallet: balance,
        pendingDocuments,
        urgentTasks,
        todayMeetings,
      });

      // Lead breakdown
      const { data: leads } = await supabase
        .from("financial_leads" as any)
        .select("lead_type")
        .eq("purchased_by_provider_id", prov.id);

      const groups: Record<string, number> = {};
      ((leads as any[]) || []).forEach((l) => {
        groups[l.lead_type] = (groups[l.lead_type] || 0) + 1;
      });
      setLeadsBreakdown(
        Object.entries(groups).map(([name, value]) => ({
          name: name.replace(/_/g, " "),
          value,
        })),
      );

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

  const handleTaskComplete = async (taskId: string) => {
    const { error } = await supabase
      .from("financial_tasks" as any)
      .update({ status: "completed" })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update task");
      return;
    }

    toast.success("Task completed!");
    loadDashboard();
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

  const urgentNotifications = notifications.filter((n) => !n.read && n.type === "urgent").slice(0, 5);

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
            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <QuickAction
                to="/dashboard/financial/leads"
                icon={Users}
                label="Leads"
                sub="Purchase & Manage"
                badge={stats.enquiries}
              />
              <QuickAction
                to="/dashboard/financial/applications"
                icon={FileCheck2}
                label="Applications"
                sub="Process Loans"
                badge={stats.active}
              />
              <QuickAction to="/dashboard/financial/customers" icon={User} label="Customers" sub="Manage Clients" />
              <QuickAction to="/dashboard/financial/reports" icon={BarChart3} label="Reports" sub="View Analytics" />
              <QuickAction
                to="/dashboard/financial/wallet"
                icon={Wallet}
                label="Wallet"
                sub={`₹${walletBalance.toFixed(0)}`}
              />
              <QuickAction
                to="/dashboard/financial/calendar"
                icon={Calendar}
                label="Calendar"
                sub={stats.todayMeetings > 0 ? `${stats.todayMeetings} meetings today` : "Schedule"}
              />
            </div>

            {/* Today's Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              <StatCard
                icon={IndianRupee}
                label="Revenue"
                value={`₹${(stats.revenue / 1000).toFixed(1)}K`}
                hint="Commission earned"
                trend="up"
                trendValue="+5% vs last month"
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

            {/* Search and Recent Applications */}
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Recent Applications
                    </CardTitle>
                    <Link to="/dashboard/financial/applications">
                      <Button variant="ghost" size="sm">
                        View all
                      </Button>
                    </Link>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, ID, phone, email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="all">All Status</option>
                      {LOAN_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
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
                            <tr key={app.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
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
                </CardContent>
              </Card>

              {/* Today's Tasks */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Today's Tasks
                    </CardTitle>
                    <Badge variant="destructive" className="text-xs">
                      {tasks.filter((t) => t.status === "pending" && t.priority === "urgent").length} urgent
                    </Badge>
                  </div>
                  <CardDescription>Priority tasks for today</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {tasks
                      .filter((t) => t.status !== "completed")
                      .slice(0, 10)
                      .map((task) => (
                        <TaskItem key={task.id} task={task} onComplete={handleTaskComplete} />
                      ))}
                    {tasks.filter((t) => t.status !== "completed").length === 0 && (
                      <div className="py-8 text-center text-muted-foreground text-sm">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                        All tasks completed! 🎉
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Second Row */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Meetings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Upcoming Meetings
                    </CardTitle>
                    <Link to="/dashboard/financial/calendar">
                      <Button variant="ghost" size="sm">
                        Calendar
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {meetings.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-sm">No upcoming meetings</div>
                    ) : (
                      meetings.map((meeting) => <MeetingItem key={meeting.id} meeting={meeting} />)
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Recent Activities */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Recent Activity
                    </CardTitle>
                    <Link to="/dashboard/financial/activities">
                      <Button variant="ghost" size="sm">
                        View all
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {activities.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-sm">No recent activity</div>
                    ) : (
                      activities.map((activity) => <ActivityItem key={activity.id} activity={activity} />)
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Charts */}
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
            </div>

            {/* Third Row - Team Performance & Wallet */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Team Performance */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UsersIcon className="h-5 w-5 text-primary" />
                      Team Performance
                    </CardTitle>
                    <Link to="/dashboard/financial/team">
                      <Button variant="ghost" size="sm">
                        Manage
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {teamMembers.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">No team members added yet</div>
                  ) : (
                    <div className="space-y-3">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 border border-border/40 rounded-lg hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div>
                              <p className="text-muted-foreground">Applications</p>
                              <p className="font-semibold">{member.applications_count}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Approved</p>
                              <p className="font-semibold">{member.approvals_count}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Revenue</p>
                              <p className="font-semibold">₹{(member.revenue / 1000).toFixed(1)}K</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Wallet */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      Wallet
                    </CardTitle>
                    <Link to="/dashboard/financial/wallet">
                      <Button variant="ghost" size="sm">
                        Manage
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-primary/5 rounded-lg p-4 mb-4">
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-3xl font-bold">₹{walletBalance.toLocaleString()}</p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1">
                        <CreditCard className="h-4 w-4 mr-1" /> Add Funds
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <TrendingUp className="h-4 w-4 mr-1" /> History
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    <p className="text-xs font-semibold text-muted-foreground">Recent Transactions</p>
                    {walletTransactions.slice(0, 5).map((txn) => (
                      <div key={txn.id} className="flex items-center justify-between p-2 border-b border-border/40">
                        <div className="flex items-center gap-2">
                          {txn.type === "credit" ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <p className="text-xs font-medium">{txn.description}</p>
                            <p className="text-xs text-muted-foreground">{txn.category}</p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-semibold ${txn.type === "credit" ? "text-emerald-500" : "text-red-500"}`}
                        >
                          {txn.type === "credit" ? "+" : "-"}₹{txn.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for detailed views */}
            <Tabs defaultValue="services" className="w-full">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="leads">Leads</TabsTrigger>
                <TabsTrigger value="apps">Applications</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
                <TabsTrigger value="customers">Customers</TabsTrigger>
              </TabsList>

              <TabsContent value="services" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Services Offered</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Home Loan",
                        "Mortgage",
                        "NBFC",
                        "Legal Services",
                        "Valuation",
                        "Investment Advisory",
                        "Credit Score",
                      ].map((s) => {
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
