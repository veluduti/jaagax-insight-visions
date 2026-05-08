import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  Users, TrendingUp, LogOut, Building2, Home, Phone, Mail, MapPin,
  CheckCircle2, Eye, Calendar, BarChart3, Clock, Bell, Plus,
  PhoneCall, MessageSquare, Briefcase, Target, ListChecks,
  XCircle, Share2, FileText, Sparkles, ArrowRight, IndianRupee,
} from "lucide-react";
import SectionErrorBoundary from "@/components/ui/SectionErrorBoundary";
import { LazyMount, ListSkeleton, CardGridSkeleton } from "@/components/shared";

// Lazy-load heavy panels (Phase 4)
const AssignedPropertiesPanel = lazy(() => import("@/components/agents/AssignedPropertiesPanel"));
const WeekendBookingsList = lazy(() => import("@/components/weekend/WeekendBookingsList"));

/* ============================================================
   Types
   ============================================================ */
interface AgentProfile {
  id: string;
  name: string | null;
  email?: string;
  phone?: string | null;
  photo_url: string | null;
  agency_name: string | null;
  cities_served: string[] | string | null;
  languages: string[] | string | null;
  sales_count: number | null;
  trust_score: number | null;
  verified: boolean | null;
}

interface Property {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  area_sqft: number | null;
  type: string | null;
  bedrooms: number | null;
  images: any;
  verified: boolean | null;
}

interface VisitBooking {
  id: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  property_id: string | null;
  visit_date: string;
  visit_time: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  city?: string | null;
  locality?: string | null;
}

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  property_id: string | null;
  source: string;
  status: "new" | "contacted" | "interested" | "closed";
  notes: string;
  created_at: string;
  visit_id?: string;
}

interface Deal {
  id: string;
  buyer_name: string;
  property_id: string | null;
  property_title: string;
  value: number;
  status: "negotiation" | "closed";
  notes: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  type: "call" | "follow_up" | "visit" | "other";
  due_date: string;
  done: boolean;
  related_lead?: string;
}

/* ============================================================
   LocalStorage CRM Layer (deals + tasks + lead overrides)
   ============================================================ */
const lsKey = (uid: string, k: string) => `agentcrm:${uid}:${k}`;
const lsGet = <T,>(uid: string, k: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(lsKey(uid, k));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const lsSet = (uid: string, k: string, v: any) => {
  try {
    localStorage.setItem(lsKey(uid, k), JSON.stringify(v));
  } catch {}
};

/* ============================================================
   Component
   ============================================================ */
export default function AgentDashboard() {
  const navigate = useNavigate();
  const { user: authUser, role, loading: authLoading, signOut } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [visits, setVisits] = useState<VisitBooking[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeListings: 0,
    viewsThisMonth: 0,
    savedByUsers: 0,
  });

  // CRM local data
  const [leadOverrides, setLeadOverrides] = useState<Record<string, Partial<Lead>>>({});
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Dialog states
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState<{ title: string; type: Task["type"]; due_date: string }>({
    title: "",
    type: "call",
    due_date: new Date().toISOString().split("T")[0],
  });
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [newDeal, setNewDeal] = useState({ buyer_name: "", property_id: "", value: "", notes: "" });

  const clearSectionError = (key: string) => {
    setSectionErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  /* ---------- Load user + agent ---------- */
  useEffect(() => {
    if (authLoading) return;

    if (!authUser) {
      navigate("/auth");
      return;
    }

    if (role && role !== "agent") {
      setDashboardError("This dashboard is only available for agent accounts.");
      setInitializing(false);
      return;
    }

    void fetchUserAndProfile(authUser);
  }, [authLoading, authUser, role, navigate]);

  // Realtime
  useEffect(() => {
    if (!agentProfile?.id || !user?.id) return;
    const ch = supabase
      .channel(`agent-dashboard-${agentProfile.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "visit_bookings", filter: `agent_id=eq.${agentProfile.id}` },
        () => fetchVisits(agentProfile.id))
      .on("postgres_changes",
        { event: "*", schema: "public", table: "properties" },
        () => fetchAgentProperties(user.id, agentProfile.id))
      .on("postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetchNotifications(user.id))
      .on("postgres_changes",
        { event: "*", schema: "public", table: "agent_tasks", filter: `agent_id=eq.${agentProfile.id}` },
        () => fetchAssignedTasks(agentProfile.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [agentProfile?.id, user?.id]);

  // Persist CRM data
  useEffect(() => {
    if (user?.id) lsSet(user.id, "leadOverrides", leadOverrides);
  }, [leadOverrides, user?.id]);
  useEffect(() => {
    if (user?.id) lsSet(user.id, "deals", deals);
  }, [deals, user?.id]);
  useEffect(() => {
    if (user?.id) lsSet(user.id, "tasks", tasks);
  }, [tasks, user?.id]);

  const fetchUserAndProfile = async (authenticatedUser: NonNullable<typeof authUser>) => {
    setInitializing(true);
    setDashboardError(null);

    try {
      setUser({
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        name: authenticatedUser.user_metadata?.name || authenticatedUser.email?.split("@")[0] || "Agent",
      });

      setLeadOverrides(lsGet(authenticatedUser.id, "leadOverrides", {}));
      setDeals(lsGet(authenticatedUser.id, "deals", []));
      setTasks(lsGet(authenticatedUser.id, "tasks", []));

      const { data: agentData, error: agentError } = await supabase
        .from("agents").select("*").eq("user_id", authenticatedUser.id).maybeSingle();

      if (agentError) {
        throw agentError;
      }

      if (!agentData) {
        setAgentProfile({
          id: authenticatedUser.id,
          name: authenticatedUser.email?.split("@")[0] || "Agent",
          email: authenticatedUser.email,
          photo_url: null,
          agency_name: null,
          cities_served: null,
          languages: null,
          sales_count: 0,
          trust_score: 75,
          verified: true,
        });
        await fetchNotifications(authenticatedUser.id);
        return;
      }

      setAgentProfile(agentData as AgentProfile);
      await Promise.allSettled([
        fetchAgentProperties(authenticatedUser.id, agentData.id),
        fetchVisits(agentData.id),
        fetchAssignedTasks(agentData.id),
        fetchNotifications(authenticatedUser.id),
      ]);
    } catch (error: any) {
      console.error("Error loading agent dashboard:", error);
      setDashboardError(error?.message || "We couldn’t load your dashboard right now.");
      setProperties([]);
      setVisits([]);
      setNotifications([]);
      setStats({ totalProperties: 0, activeListings: 0, viewsThisMonth: 0, savedByUsers: 0 });
    } finally {
      setInitializing(false);
    }
  };

  const fetchVisits = async (agentId: string) => {
    try {
      const { data, error } = await supabase
        .from("visit_bookings").select("*")
        .eq("agent_id", agentId)
        .order("visit_date", { ascending: false });

      if (error) throw error;
      setVisits((data || []) as VisitBooking[]);
      clearSectionError("visits");
    } catch (error: any) {
      console.error("Error loading agent visits:", error);
      setVisits([]);
      setSectionErrors((prev) => ({ ...prev, visits: error?.message || "Unable to load visit data." }));
    }
  };

  const fetchAssignedTasks = async (agentId: string) => {
    try {
      const { data } = await (supabase.from as any)("agent_tasks")
        .select("id, status, property_id, completed_at, metadata, created_at")
        .eq("agent_id", agentId);
      setAssignedTasks((data as any[]) || []);
    } catch (err) {
      console.error("Error loading agent tasks:", err);
      setAssignedTasks([]);
    }
  };

  const fetchAgentProperties = async (userId: string, agentId: string) => {
    try {
      const { data, error } = await supabase
        .from("properties").select("*")
        .or(`submitted_by.eq.${userId},builder_id.eq.${agentId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const safeProperties = (data || []) as Property[];
      setProperties(safeProperties);
      const ids = safeProperties.map((p: any) => p.id);
      let savedCount = 0;
      let viewsCount = 0;

      if (ids.length) {
        const [{ count: f }, { count: v }] = await Promise.all([
          supabase.from("favorites").select("*", { count: "exact", head: true }).in("property_id", ids),
          supabase.from("buyer_journey_events").select("*", { count: "exact", head: true }).in("property_id", ids),
        ]);
        savedCount = f || 0;
        viewsCount = v || 0;
      }

      setStats({
        totalProperties: safeProperties.length,
        activeListings: safeProperties.filter((p: any) => p.verified === true).length,
        viewsThisMonth: viewsCount,
        savedByUsers: savedCount,
      });
      clearSectionError("properties");
    } catch (error: any) {
      console.error("Error loading agent properties:", error);
      setProperties([]);
      setStats({ totalProperties: 0, activeListings: 0, viewsThisMonth: 0, savedByUsers: 0 });
      setSectionErrors((prev) => ({ ...prev, properties: error?.message || "Unable to load properties." }));
    }
  };

  const fetchNotifications = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("notifications").select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(8);

      if (error) throw error;
      setNotifications(data || []);
      clearSectionError("notifications");
    } catch (error: any) {
      console.error("Error loading notifications:", error);
      setNotifications([]);
      setSectionErrors((prev) => ({ ...prev, notifications: error?.message || "Unable to load notifications." }));
    }
  };

  /* ---------- Derived data ---------- */
  // Each visit booking is treated as a Lead
  const leads: Lead[] = useMemo(() => {
    return visits.map((v) => {
      const base: Lead = {
        id: v.id,
        name: v.buyer_name || "Buyer",
        phone: v.buyer_phone,
        email: v.buyer_email,
        property_id: v.property_id,
        source: "Visit Booking",
        status:
          v.status === "completed" ? "closed" :
          v.status === "in_progress" || v.status === "confirmed" ? "interested" :
          v.status === "pending_agent" || v.status === "pending" ? "new" : "contacted",
        notes: v.notes || "",
        created_at: v.created_at,
        visit_id: v.id,
      };
      const ovr = leadOverrides[v.id] || {};
      return { ...base, ...ovr };
    });
  }, [visits, leadOverrides]);

  const propertyTitleById = (id: string | null) =>
    properties.find((p) => p.id === id)?.title || "Property";

  const today = new Date().toISOString().split("T")[0];
  const todaysTasks = tasks.filter((t) => !t.done && t.due_date <= today);
  const todaysVisits = visits.filter((v) => v.visit_date === today);

  // Include admin-assigned property tasks as leads/deals so the dashboard reflects real workload
  const activeAssignedTasks = assignedTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const completedAssignedTasks = assignedTasks.filter((t) => t.status === "completed");
  const scheduledAssignedVisits = assignedTasks.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled" && t?.metadata?.scheduled_visit_at
  );

  const metrics = {
    totalLeads: leads.length + assignedTasks.length,
    upcomingVisits:
      visits.filter((v) =>
        ["confirmed", "pending_builder", "pending_agent", "pending", "in_progress"].includes(v.status)
      ).length + scheduledAssignedVisits.length,
    activeDeals: deals.filter((d) => d.status === "negotiation").length + activeAssignedTasks.length,
    closedDeals: deals.filter((d) => d.status === "closed").length + completedAssignedTasks.length,
  };

  const conversionRate = leads.length
    ? Math.round((leads.filter((l) => l.status === "closed").length / leads.length) * 100)
    : 0;

  /* ---------- Actions ---------- */
  const updateLead = (id: string, patch: Partial<Lead>) =>
    setLeadOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));

  const updateVisitStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("visit_bookings").update({ status }).eq("id", id);
    if (error) return toast.error("Failed to update visit");
    toast.success(`Visit ${status}`);
    if (agentProfile?.id) fetchVisits(agentProfile.id);
  };

  const addTask = () => {
    if (!newTask.title.trim()) return toast.error("Task title required");
    const t: Task = {
      id: `t_${Date.now()}`, title: newTask.title.trim(),
      type: newTask.type, due_date: newTask.due_date, done: false,
    };
    setTasks((prev) => [t, ...prev]);
    setNewTask({ title: "", type: "call", due_date: today });
    setTaskDialogOpen(false);
    toast.success("Task added");
  };

  const toggleTask = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const deleteTask = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const addDeal = () => {
    if (!newDeal.buyer_name || !newDeal.value)
      return toast.error("Buyer name & value required");
    const prop = properties.find((p) => p.id === newDeal.property_id);
    const d: Deal = {
      id: `d_${Date.now()}`,
      buyer_name: newDeal.buyer_name,
      property_id: newDeal.property_id || null,
      property_title: prop?.title || "Custom property",
      value: Number(newDeal.value),
      status: "negotiation", notes: newDeal.notes,
      created_at: new Date().toISOString(),
    };
    setDeals((prev) => [d, ...prev]);
    setNewDeal({ buyer_name: "", property_id: "", value: "", notes: "" });
    setDealDialogOpen(false);
    toast.success("Deal added");
  };

  const updateDealStatus = (id: string, status: Deal["status"]) =>
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));

  const handleSignOut = async () => {
    await signOut();
  };

  const formatPrice = (p: number) =>
    p >= 10000000 ? `₹${(p / 10000000).toFixed(2)} Cr` : `₹${(p / 100000).toFixed(2)} L`;

  if (authLoading || initializing || !user || !agentProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/30 to-background">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading agent dashboard…</p>
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/30 to-background p-4">
        <Card className="w-full max-w-lg border-border/60">
          <CardHeader>
            <CardTitle className="text-xl">Agent dashboard unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{dashboardError}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => authUser && void fetchUserAndProfile(authUser)}>Try again</Button>
              <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cities = Array.isArray(agentProfile.cities_served)
    ? agentProfile.cities_served.join(", ")
    : (agentProfile.cities_served as any) || "—";
  const langs = Array.isArray(agentProfile.languages)
    ? agentProfile.languages.join(", ")
    : (agentProfile.languages as any) || "English";

  /* ============================================================
     Render
     ============================================================ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/30 to-background">
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b">
        <div className="container mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <Home className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg md:text-xl font-bold">Agent CRM</h1>
              <p className="text-xs text-muted-foreground hidden md:block">
                Close more deals, faster
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/sell-property?as=agent")} className="hidden md:inline-flex border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10">
              <Plus className="w-4 h-4 mr-1.5" />Sell Your Property
            </Button>
            <Button size="sm" onClick={() => navigate("/dashboard/agent/add-property")} className="hidden sm:inline-flex">
              <Plus className="w-4 h-4 mr-1.5" />Add Property
            </Button>
            <Button size="icon" onClick={() => navigate("/sell-property?as=agent")} className="sm:hidden bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-12 space-y-6">
        {/* ===== Profile Header ===== */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/40">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="relative">
                  <Avatar className="h-24 w-24 md:h-28 md:w-28 ring-4 ring-primary/30">
                    <AvatarImage src={agentProfile.photo_url || undefined} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {(agentProfile.name || "A").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {agentProfile.verified && (
                    <span className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 ring-2 ring-background">
                      <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h2 className="text-2xl md:text-3xl font-bold truncate">
                      {agentProfile.name}
                    </h2>
                    {agentProfile.verified && (
                      <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Verified
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-primary/30">
                      Trust {agentProfile.trust_score ?? 75}/100
                    </Badge>
                  </div>
                  {agentProfile.agency_name && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                      <Building2 className="h-4 w-4" />{agentProfile.agency_name}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />{cities}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />{langs}
                    </span>
                    {agentProfile.email && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />{agentProfile.email}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => navigate(`/agent/${agentProfile.id}`)} size="sm">
                      <Eye className="h-4 w-4 mr-2" />View Public Profile
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ===== Key Metrics ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: "Total Leads", value: metrics.totalLeads, icon: Users, color: "text-primary", bg: "bg-primary/10" },
            { label: "Upcoming Visits", value: metrics.upcomingVisits, icon: Calendar, color: "text-blue-600", bg: "bg-blue-500/10" },
            { label: "Active Deals", value: metrics.activeDeals, icon: Briefcase, color: "text-orange-600", bg: "bg-orange-500/10" },
            { label: "Closed Deals", value: metrics.closedDeals, icon: Target, color: "text-emerald-600", bg: "bg-emerald-500/10" },
          ].map((m, i) => (
            <motion.div key={m.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}>
              <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all border-border/60">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className={`p-2 rounded-xl ${m.bg}`}>
                      <m.icon className={`h-5 w-5 ${m.color}`} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold tracking-tight">{m.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.label} · this month</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ===== Assigned Properties (admin-assigned, owner chat) ===== */}
        {agentProfile.id && user?.id && (
          <SectionErrorBoundary title="Assigned properties unavailable" description={sectionErrors.properties || "Assigned properties could not be displayed right now."}>
            <LazyMount fallback={<CardGridSkeleton count={3} />} minHeight={300}>
              <Suspense fallback={<CardGridSkeleton count={3} />}>
                <AssignedPropertiesPanel
                  agentId={agentProfile.id}
                  agentUserId={user.id}
                  agentName={agentProfile.name || "Agent"}
                />
              </Suspense>
            </LazyMount>
          </SectionErrorBoundary>
        )}

        {/* ===== Your Properties (added by this agent) ===== */}
        <SectionErrorBoundary title="Your properties unavailable" description={sectionErrors.properties || "Your properties could not be displayed right now."}>
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  Your Properties
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {properties.length} {properties.length === 1 ? "listing" : "listings"} you've added
                </p>
              </div>
              <Button size="sm" onClick={() => navigate("/agent/add-property")}>
                <Plus className="h-4 w-4 mr-1" /> Add Property
              </Button>
            </CardHeader>
            <CardContent>
              {properties.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  You haven't added any properties yet. Click "Add Property" to list your first one.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {properties.slice(0, 6).map((p) => (
                    <Card
                      key={p.id}
                      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => window.open(`/property/${p.id}`, "_blank", "noopener,noreferrer")}
                    >
                      <div className="relative h-32 bg-muted overflow-hidden">
                        <img
                          src={
                            Array.isArray(p.images) && p.images[0]
                              ? p.images[0]
                              : "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600"
                          }
                          alt={p.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600";
                          }}
                        />
                        <Badge
                          variant={p.verified ? "default" : "secondary"}
                          className="absolute top-2 right-2"
                        >
                          {p.verified ? "Verified" : "Pending"}
                        </Badge>
                      </div>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm line-clamp-1">{p.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {p.locality || "—"}, {p.city || "—"}
                        </p>
                        <p className="text-sm font-bold text-primary mt-1">
                          {p.price ? `₹${(p.price / 10000000).toFixed(2)} Cr` : "Price on request"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </SectionErrorBoundary>

        {agentProfile.id && user?.id && (
          <SectionErrorBoundary title="Weekend bookings unavailable" description={sectionErrors.visits || "Weekend booking data could not be loaded right now."}>
            <Card className="border-primary/20">
              <CardContent className="p-4 md:p-5">
                <WeekendBookingsList scope="agent" agentId={agentProfile.id} userId={user.id} kind="weekend" />
              </CardContent>
            </Card>
          </SectionErrorBoundary>
        )}

        {/* Quick Visit section removed from agent dashboard (buyer-facing flow) */}

        {/* ===== Today's Tasks + Notifications strip ===== */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Tasks */}
          <Card className="lg:col-span-2 border-primary/20">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" />
                  Today's Tasks & Follow-ups
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {todaysTasks.length} pending · {todaysVisits.length} visits today
                </p>
              </div>
              <Button size="sm" onClick={() => setTaskDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />Add Task
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {todaysTasks.length === 0 && todaysVisits.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No tasks for today. Add a follow-up to stay on top of leads.
                </p>
              )}
              {todaysVisits.map((v) => (
                <div key={`v-${v.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      Visit with {v.buyer_name || "Buyer"} · {v.visit_time || "TBD"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {propertyTitleById(v.property_id)}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/visit/live/${v.id}`)}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {todaysTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                  <button
                    onClick={() => toggleTask(t.id)}
                    className="h-5 w-5 rounded border-2 border-primary flex items-center justify-center shrink-0 hover:bg-primary/10"
                  >
                    {t.done && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}>
                      {t.title}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {t.type.replace("_", " ")} · due {t.due_date}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteTask(t.id)}>
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[280px] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  You're all caught up.
                </p>
              ) : notifications.map((n) => (
                <div key={n.id} className="p-2.5 rounded-lg border border-border/60 bg-card">
                  <div className="flex items-start gap-2">
                    <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${n.read ? "bg-muted-foreground/40" : "bg-primary"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {n.message && <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ===== Leads Management ===== */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />Leads Pipeline
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {leads.length} total · {leads.filter((l) => l.status === "new").length} new
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="text-center py-10">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No leads yet. Buyers booking visits will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.slice(0, 8).map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-md transition-all bg-gradient-to-r from-card to-accent/20"
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {lead.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{lead.name}</p>
                          <LeadStatusBadge status={lead.status} />
                          <span className="text-xs text-muted-foreground">· {lead.source}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {propertyTitleById(lead.property_id)}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                          {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                          {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {lead.phone && (
                          <Button asChild size="sm" variant="outline" className="h-8">
                            <a href={`tel:${lead.phone}`}><PhoneCall className="h-3.5 w-3.5 mr-1" />Call</a>
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setActiveLead(lead)}>
                          <FileText className="h-3.5 w-3.5 mr-1" />Manage
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== Visit Management Tabs ===== */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />Visit Management
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/agent/visits")}>
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList className="grid grid-cols-4 w-full max-w-xl">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              </TabsList>
              {[
                { key: "pending", filter: (v: VisitBooking) => ["pending", "pending_agent"].includes(v.status) },
                { key: "scheduled", filter: (v: VisitBooking) => ["confirmed", "in_progress", "pending_builder"].includes(v.status) },
                { key: "completed", filter: (v: VisitBooking) => v.status === "completed" },
                { key: "cancelled", filter: (v: VisitBooking) => v.status === "cancelled" },
              ].map(({ key, filter }) => {
                const list = visits.filter(filter);
                return (
                  <TabsContent key={key} value={key} className="mt-4 space-y-2">
                    {list.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No {key} visits</p>
                    ) : list.slice(0, 6).map((v) => (
                      <div key={v.id} className="p-3 rounded-lg border border-border/60 hover:border-primary/40 flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{v.buyer_name || "Buyer"}</p>
                            <Badge variant="outline" className="text-xs">{v.status.replace(/_/g, " ")}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {propertyTitleById(v.property_id)} · {v.visit_date} {v.visit_time && `· ${v.visit_time}`}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {key === "pending" && (
                            <>
                              <Button size="sm" className="h-8" onClick={() => updateVisitStatus(v.id, "confirmed")}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-8" onClick={() => updateVisitStatus(v.id, "cancelled")}>
                                <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                              </Button>
                            </>
                          )}
                          {key === "scheduled" && (
                            <>
                              {v.buyer_phone && (
                                <Button asChild size="sm" variant="outline" className="h-8">
                                  <a href={`tel:${v.buyer_phone}`}><Phone className="h-3.5 w-3.5" /></a>
                                </Button>
                              )}
                              <Button size="sm" className="h-8" onClick={() => updateVisitStatus(v.id, "completed")}>
                                Mark Done
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => navigate(`/visit/live/${v.id}`)}>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>

        {/* ===== Deals & Closures ===== */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />Deals & Closures
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.activeDeals} negotiating · {metrics.closedDeals} closed
              </p>
            </div>
            <Button size="sm" onClick={() => setDealDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />New Deal
            </Button>
          </CardHeader>
          <CardContent>
            {deals.length === 0 ? (
              <div className="text-center py-10">
                <Briefcase className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No deals yet. Add one once a buyer enters negotiation.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deals.map((d) => (
                  <div key={d.id} className="p-3 rounded-lg border border-border/60 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{d.buyer_name}</p>
                        <Badge className={d.status === "closed"
                          ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                          : "bg-orange-500/15 text-orange-700 border-orange-500/30"
                        }>{d.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{d.property_title}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary flex items-center">
                        <IndianRupee className="h-4 w-4" />{(d.value / 100000).toFixed(1)}L
                      </span>
                      <Select value={d.status} onValueChange={(s) => updateDealStatus(d.id, s as Deal["status"])}>
                        <SelectTrigger className="w-[140px] h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="negotiation">Negotiation</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Listings & Performance sections removed — will be re-added later if needed */}
      </div>

      {/* ===== Lead Manage Dialog ===== */}
      <Dialog open={!!activeLead} onOpenChange={(o) => !o && setActiveLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Lead · {activeLead?.name}</DialogTitle>
          </DialogHeader>
          {activeLead && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <Select
                  value={activeLead.status}
                  onValueChange={(s) => {
                    updateLead(activeLead.id, { status: s as Lead["status"] });
                    setActiveLead({ ...activeLead, status: s as Lead["status"] });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <Textarea
                  value={activeLead.notes}
                  rows={3}
                  onChange={(e) => setActiveLead({ ...activeLead, notes: e.target.value })}
                  onBlur={() => updateLead(activeLead.id, { notes: activeLead.notes })}
                  placeholder="Add a note about this lead..."
                />
              </div>
              {activeLead.visit_id && (
                <Button variant="outline" className="w-full" onClick={() => navigate(`/visit/live/${activeLead.visit_id}`)}>
                  <Calendar className="h-4 w-4 mr-2" />View Visit Details
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => { toast.success("Lead updated"); setActiveLead(null); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Add Task Dialog ===== */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="e.g. Call Rajesh about Whitefield property"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
            <Select value={newTask.type} onValueChange={(v) => setNewTask({ ...newTask, type: v as Task["type"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="follow_up">Follow up</SelectItem>
                <SelectItem value="visit">Visit</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={addTask}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Add Deal Dialog ===== */}
      <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Deal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Buyer name" value={newDeal.buyer_name}
              onChange={(e) => setNewDeal({ ...newDeal, buyer_name: e.target.value })} />
            <Select value={newDeal.property_id} onValueChange={(v) => setNewDeal({ ...newDeal, property_id: v })}>
              <SelectTrigger><SelectValue placeholder="Link a property (optional)" /></SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Deal value (₹)" value={newDeal.value}
              onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })} />
            <Textarea rows={3} placeholder="Notes (optional)" value={newDeal.notes}
              onChange={(e) => setNewDeal({ ...newDeal, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDealDialogOpen(false)}>Cancel</Button>
            <Button onClick={addDeal}>Add Deal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   Helpers
   ============================================================ */
function LeadStatusBadge({ status }: { status: Lead["status"] }) {
  const map: Record<Lead["status"], string> = {
    new: "bg-blue-500/15 text-blue-700 border-blue-500/30",
    contacted: "bg-purple-500/15 text-purple-700 border-purple-500/30",
    interested: "bg-orange-500/15 text-orange-700 border-orange-500/30",
    closed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  };
  return <Badge variant="outline" className={`text-xs capitalize ${map[status]}`}>{status}</Badge>;
}

function PerfRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
