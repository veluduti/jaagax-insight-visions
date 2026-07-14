import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import AdminHierarchyPanel from "@/components/admin/AdminHierarchyPanel";
import {
  Shield,
  CheckCircle,
  LogOut,
  Users,
  Building2,
  Home,
  AlertCircle,
  CalendarCheck,
  MapPin,
  Phone,
  Loader2,
  XCircle,
  Eye,
  BarChart3,
  Sparkles,
  RefreshCw,
  Mail,
  LayoutDashboard,
  Briefcase,
  Hotel,
  FileText,
  Clock,
  TrendingDown,
  FileCheck,
  List,
  Filter,
  ChevronDown,
  Wrench,
  Zap,
  MapPinned,
  FolderOpen,
  UserPlus,
  Activity,
  BellRing,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import BookingsPanel from "@/components/admin/BookingsPanel";
import HotelPartnersPanel from "@/components/admin/HotelPartnersPanel";
import AssignAgentPanel from "@/components/admin/AssignAgentPanel";
import WeekendBookingsList from "@/components/weekend/WeekendBookingsList";
import RERAVerificationPanel from "@/components/admin/RERAVerificationPanel";
import PropertyDocumentsPanel from "@/components/admin/PropertyDocumentsPanel";
import VerificationPanel from "@/components/admin/VerificationPanel";
import AgentVerifiedReviewPanel from "@/components/admin/AgentVerifiedReviewPanel";
import RegisteredUsersPanel from "@/components/admin/RegisteredUsersPanel";
import ReportedListingsPanel from "@/components/admin/ReportedListingsPanel";
import AllListingsPanel from "@/components/admin/AllListingsPanel";
import KYCReviewQueue from "@/components/admin/KYCReviewQueue";
import PriceDropQueue from "@/components/admin/PriceDropQueue";
import { RemindAdminDialog } from "@/components/admin/RemindAdminDialog";
import { AdminActivityTimeline } from "@/components/admin/AdminActivityTimeline";
import AdminScopeFilterBar from "@/components/admin/AdminScopeFilterBar";
import {
  AdminScopeFilterProvider,
  useAdminScopeFilter,
  applyAdminScope,
} from "@/contexts/AdminScopeFilterContext";
import { motion } from "framer-motion";
import { useRealtimeTableSubscription } from "@/hooks/useRealtimeTableSubscription";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// FILTER CHIP COMPONENT
// ============================================================================
const FilterChip = ({ label, icon: Icon, active, onClick, count }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
      active ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted hover:bg-muted/80 text-muted-foreground"
    }`}
  >
    {Icon && <Icon className="h-3 w-3" />}
    {label}
    {count !== undefined && count > 0 && (
      <Badge variant={active ? "secondary" : "outline"} className="h-4 px-1 text-[9px]">
        {count}
      </Badge>
    )}
  </button>
);

export default function AdminPanel({ title, subtitle, readOnly = false }: { title?: string; subtitle?: string; readOnly?: boolean } = {}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("signups");
  const [activeFilter, setActiveFilter] = useState("all");
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalProjects: 0,
    totalAgents: 0,
    pendingVisits: 0,
    pendingSignups: 0,
    pendingProperties: 0,
    totalBuilders: 0,
  });
  const [signupRequests, setSignupRequests] = useState<any[]>([]);
  const [visitBookings, setVisitBookings] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [builders, setBuilders] = useState<any[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [remindOpen, setRemindOpen] = useState(false);

  // ============================================================================
  // NAVIGATION GROUPS - DROPDOWN BASED
  // ============================================================================
  const NAV_GROUPS = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      items: [
        { value: "signups", label: "Registered Users", icon: Users },
        { value: "visits", label: "Visits", icon: CalendarCheck },
        { value: "bookings", label: "Hotel Bookings", icon: Hotel },
      ],
    },
    {
      label: "Real Estate",
      icon: Home,
      items: [
        { value: "properties", label: "Properties", icon: Home },
        { value: "projects-review", label: "Projects", icon: Building2 },
        { value: "agents", label: "Agents", icon: Briefcase },
        { value: "builders", label: "Builders", icon: Building2 },
        { value: "agent-verified", label: "Agent-Verified", icon: CheckCircle },
        { value: "hotel-partners", label: "Hotel Partners", icon: Hotel },
      ],
    },
    {
      label: "Verification",
      icon: Shield,
      items: [
        { value: "rera", label: "RERA Verifications", icon: Shield },
        { value: "documents", label: "Documents", icon: FileText },
        { value: "kyc", label: "KYC", icon: FileCheck },
        { value: "price-drops", label: "Price Drops", icon: TrendingDown },
      ],
    },
    {
      label: "Listings",
      icon: List,
      items: [
        { value: "all-listings", label: "All Listings", icon: List },
        { value: "reports", label: "Reports", icon: FileText },
      ],
    },
    {
      label: "Features",
      icon: Sparkles,
      items: [
        { value: "weekend", label: "Weekend Explorer", icon: MapPinned },
        { value: "quick-visits", label: "Quick Visits", icon: Zap },
      ],
    },
    {
      label: "Admins",
      icon: Shield,
      items: [
        { value: "admin-hierarchy", label: "Admin Hierarchy", icon: Shield },
        { value: "activity", label: "Activity Timeline", icon: Activity },
      ],
    },
  ];

  // ============================================================================
  // FILTER OPTIONS
  // ============================================================================
  const FILTER_OPTIONS = [
    { value: "all", label: "All", icon: Filter },
    { value: "pending", label: "Pending", icon: Clock },
    { value: "approved", label: "Approved", icon: CheckCircle },
    { value: "rejected", label: "Rejected", icon: XCircle },
  ];

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  useRealtimeTableSubscription({
    channelName: "admin-panel-live-updates",
    tables: ["properties", "projects", "signup_requests", "visit_bookings", "agents", "builder_profiles"],
    onChange: () => {
      void loadAllData();
    },
    enabled: isAdmin,
  });

  const checkAdminAndLoad = async () => {
    try {
      setIsAdmin(true);
      await loadAllData();
    } catch (err) {
      console.error("Failed to load admin data:", err);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      fetchStats(),
      fetchSignupRequests(),
      fetchVisitBookings(),
      fetchAgents(),
      fetchProperties(),
      fetchBuilders(),
    ]);
  };

  const fetchStats = async () => {
    const [
      { count: propertiesCount },
      { count: projectsCount },
      { count: agentsCount },
      { count: pendingVisitsCount },
      { count: pendingSignupsCount },
      { count: buildersCount },
      { count: pendingPropertiesCount },
    ] = await Promise.all([
      supabase.from("properties").select("*", { count: "exact", head: true }),
      supabase.from("projects").select("*", { count: "exact", head: true }),
      supabase.from("agents").select("*", { count: "exact", head: true }),
      supabase.from("visit_bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("signup_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("builder_profiles").select("*", { count: "exact", head: true }),
      supabase.from("properties").select("*", { count: "exact", head: true }).eq("verification_status", "pending"),
    ]);
    setStats({
      totalProperties: propertiesCount || 0,
      totalProjects: projectsCount || 0,
      totalAgents: agentsCount || 0,
      pendingVisits: pendingVisitsCount || 0,
      pendingSignups: pendingSignupsCount || 0,
      pendingProperties: pendingPropertiesCount || 0,
      totalBuilders: buildersCount || 0,
    });
  };

  const fetchSignupRequests = async () => {
    const { data } = await supabase.from("signup_requests").select("*").order("created_at", { ascending: false });
    setSignupRequests(data || []);
  };

  const fetchVisitBookings = async () => {
    const { data } = await supabase
      .from("visit_bookings")
      .select("*, agents(name, phone)")
      .order("created_at", { ascending: false })
      .limit(100);
    setVisitBookings(data || []);
  };

  const fetchAgents = async () => {
    const { data } = await supabase.from("agents").select("*").order("created_at", { ascending: false });
    setAgents(data || []);
  };

  const fetchProperties = async () => {
    const { data } = await supabase
      .from("properties")
      .select(
        "id, title, city, locality, price, verified, type, created_at, verification_status, rera_id, rera_document_url, submitted_by, bhk, area_sqft, document_urls, listing_type, images",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    setProperties(data || []);
  };

  const fetchBuilders = async () => {
    const { data } = await supabase
      .from("builder_profiles")
      .select("id, builder_name, type, phone, email, operating_cities, created_at")
      .order("created_at", { ascending: false });
    setBuilders(data || []);
  };

  const handleReviewProperty = async (propertyId: string, decision: "approved" | "rejected") => {
    let reason: string | null = null;
    if (decision === "rejected") {
      const raw = window.prompt(
        "Reason for rejection (mandatory, visible to submitter):",
        "Listing details need clarification",
      );
      reason = (raw || "").trim() || null;
      if (!reason) {
        toast.error("Rejection reason is required");
        return;
      }
    }
    setReviewingId(propertyId);
    try {
      const nowIso = new Date().toISOString();
      const update: any = {
        verification_status: decision,
        verified: decision === "approved",
        rejection_reason: decision === "rejected" ? reason : null,
        is_draft: false,
        updated_at: nowIso,
        ...(decision === "approved" ? { is_live: true, published_at: nowIso } : { is_live: false }),
      };
      const { data, error } = await supabase
        .from("properties")
        .update(update)
        .eq("id", propertyId)
        .select("id, verification_status, verified, is_live, published_at");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Update blocked — you may not have permission. Please log in as admin.");
      }

      setProperties((prev) => prev.map((p) => (p.id === propertyId ? { ...p, ...data[0] } : p)));

      const prop = properties.find((p) => p.id === propertyId);
      if (prop?.submitted_by) {
        await supabase.from("notifications").insert({
          user_id: prop.submitted_by,
          type: decision === "approved" ? "property_approved" : "property_rejected",
          title: decision === "approved" ? "Property Verified ✅" : "Property Rejected",
          message:
            decision === "approved"
              ? `Your property "${prop.title}" has been verified and is now live.`
              : `Your property "${prop.title}" was rejected. Please review and resubmit.`,
          link: "/dashboard/builder",
        });
      }

      toast.success(`Property ${decision} successfully`);
      await fetchStats();
    } catch (err: any) {
      toast.error(err.message || "Failed to review property");
    } finally {
      setReviewingId(null);
    }
  };

  const handleReviewSignup = async (requestId: string, decision: "approved" | "rejected", reason?: string) => {
    setReviewingId(requestId);
    try {
      const request = signupRequests.find((r) => r.id === requestId);
      if (!request) throw new Error("Request not found");

      const { error: updateError } = await supabase
        .from("signup_requests")
        .update({
          status: decision,
          rejection_reason: decision === "rejected" ? reason || null : null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      if (updateError) throw updateError;

      if (decision === "approved") {
        const roleToAssign = request.requested_role === "buyer" ? "customer" : request.requested_role;
        const { error: roleError } = await supabase.rpc("assign_user_role", {
          _user_id: request.user_id,
          _role: roleToAssign,
        });
        if (roleError && !roleError.message?.includes("duplicate")) throw roleError;

        if (request.requested_role === "agent") {
          await supabase.from("agents").upsert(
            {
              user_id: request.user_id,
              name: request.full_name || "Agent",
              email: request.email,
              phone: request.phone || "0000000000",
              cities_served: request.city || "Hyderabad",
              verified: true,
              trust_score: 75,
            },
            { onConflict: "user_id" },
          );
        }
      }

      toast.success(`Request ${decision} successfully`);
      await Promise.all([fetchSignupRequests(), fetchStats()]);
    } catch (err: any) {
      toast.error(err.message || "Failed to review request");
    } finally {
      setReviewingId(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const pendingRequests = signupRequests.filter((r) => r.status === "pending");
  const approvedRequests = signupRequests.filter((r) => r.status === "approved");
  const rejectedRequests = signupRequests.filter((r) => r.status === "rejected");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />

      {/* Sticky Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              {title || "Admin Control Panel"}
            </h1>
            <p className="text-sm text-muted-foreground">{subtitle || "Manage users, properties, agents & platform"}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setRemindOpen(true)}>
              <BellRing className="h-4 w-4 mr-1" /> Remind Admin
            </Button>
            <Button size="sm" variant="outline" onClick={() => loadAllData()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {readOnly && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-4 text-sm flex items-start gap-3">
              <Eye className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Monitor-only mode</p>
                <p className="text-muted-foreground">
                  You have <strong>view, reports and monitoring</strong> access for your scope. All operational actions —
                  Assign Agent, Approve, Reject, Verify — are performed by the responsible <strong>District Admin</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid - 3x2 or 6 columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Properties", value: stats.totalProperties, icon: Home, color: "text-blue-500" },
            { label: "Projects", value: stats.totalProjects, icon: Building2, color: "text-green-500" },
            { label: "Agents", value: stats.totalAgents, icon: Users, color: "text-purple-500" },
            { label: "Builders", value: stats.totalBuilders, icon: Building2, color: "text-orange-500" },
            { label: "Registered Users", value: signupRequests.length, icon: UserPlus, color: "text-cyan-500" },
            { label: "Pending Visits", value: stats.pendingVisits, icon: CalendarCheck, color: "text-amber-500" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <s.icon className={`h-6 w-6 ${s.color}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ================================================================ */}
        {/* MAIN TABS - FIXED WITH DROPDOWN NAVIGATION */}
        {/* ================================================================ */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* ROW 1: DROPDOWN NAVIGATION */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-card rounded-lg border shadow-sm mb-4">
            {NAV_GROUPS.map((group, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium h-9 ${
                        group.items.some((item: any) => item.value === activeTab)
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <group.icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{group.label}</span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuLabel className="flex items-center gap-2">
                      <group.icon className="h-4 w-4" />
                      {group.label}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {group.items.map((item: any) => {
                      const Icon = item.icon;
                      const count =
                        item.value === "properties"
                          ? stats.pendingProperties
                          : item.value === "signups"
                            ? stats.pendingSignups
                            : null;
                      return (
                        <DropdownMenuItem
                          key={item.value}
                          onClick={() => setActiveTab(item.value)}
                          className={`flex items-center gap-2 cursor-pointer ${
                            activeTab === item.value ? "bg-primary/10 text-primary" : ""
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                          {count !== null && count > 0 && (
                            <Badge variant="secondary" className="ml-auto text-[10px]">
                              {count}
                            </Badge>
                          )}
                          {activeTab === item.value && <CheckCircle className="h-3 w-3 ml-auto text-primary" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                {idx < NAV_GROUPS.length - 1 && <div className="w-px h-6 bg-border mx-0.5" />}
              </div>
            ))}
          </div>

          {/* ROW 2: FILTER OPTIONS */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-muted/30 rounded-lg border mb-4">
            <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Filters:
            </span>
            {FILTER_OPTIONS.map((filter) => (
              <FilterChip
                key={filter.value}
                label={filter.label}
                icon={filter.icon}
                active={activeFilter === filter.value}
                onClick={() => setActiveFilter(filter.value)}
                count={filter.value === "pending" ? stats.pendingProperties : undefined}
              />
            ))}
          </div>

          {/* ================================================================ */}
          {/* TAB CONTENTS */}
          {/* ================================================================ */}

          {/* KYC */}
          <TabsContent value="kyc" className="mt-4">
            <KYCReviewQueue />
          </TabsContent>

          {/* Price Drops */}
          <TabsContent value="price-drops" className="mt-4">
            <PriceDropQueue />
          </TabsContent>

          {/* Agent Verified */}
          <TabsContent value="agent-verified" className="mt-4">
            <AgentVerifiedReviewPanel readOnly />
          </TabsContent>

          {/* All Listings */}
          <TabsContent value="all-listings" className="mt-4">
            <AllListingsPanel />
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports" className="mt-4">
            <ReportedListingsPanel />
          </TabsContent>

          {/* Projects Review */}
          <TabsContent value="projects-review" className="mt-4">
            <VerificationPanel readOnly />
          </TabsContent>

          {/* RERA */}
          <TabsContent value="rera" className="mt-4">
            <RERAVerificationPanel />
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents" className="mt-4">
            <PropertyDocumentsPanel />
          </TabsContent>

          {/* Hotel Partners */}
          <TabsContent value="hotel-partners" className="mt-4">
            <HotelPartnersPanel />
          </TabsContent>

          {/* Weekend Explorer */}
          <TabsContent value="weekend" className="mt-4">
            <Card>
              <CardContent className="p-4 md:p-6">
                <WeekendBookingsList scope="admin" kind="weekend" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quick Visits */}
          <TabsContent value="quick-visits" className="mt-4">
            <Card>
              <CardContent className="p-4 md:p-6">
                <WeekendBookingsList scope="admin" kind="quick_visit" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* REGISTERED USERS */}
          <TabsContent value="signups" className="mt-4">
            <RegisteredUsersPanel />
          </TabsContent>

          {/* VISIT BOOKINGS */}
          <TabsContent value="visits" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                  Visit Bookings ({visitBookings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {visitBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No visit bookings</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Approved Agent</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visitBookings.map((b) => {
                        const agentName = b.agents?.name;
                        const isApproved =
                          b.agent_id && ["confirmed", "pending_builder", "completed"].includes(b.status);
                        return (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium">{b.buyer_name || "N/A"}</TableCell>
                            <TableCell>{b.buyer_phone || "N/A"}</TableCell>
                            <TableCell>
                              {b.city || ""}
                              {b.locality ? `, ${b.locality}` : ""}
                            </TableCell>
                            <TableCell>
                              {isApproved && agentName ? (
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                  <span className="font-medium text-sm">{agentName}</span>
                                </div>
                              ) : agentName ? (
                                <span className="text-xs text-muted-foreground">{agentName} (assigned)</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">— Unassigned —</span>
                              )}
                            </TableCell>
                            <TableCell>{b.visit_date}</TableCell>
                            <TableCell>{b.visit_time || "TBD"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  b.status === "confirmed"
                                    ? "default"
                                    : b.status === "pending"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {b.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* HOTEL BOOKINGS */}
          <TabsContent value="bookings" className="mt-4">
            <BookingsPanel />
          </TabsContent>

          {/* AGENTS */}
          <TabsContent value="agents" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Agents ({agents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No agents registered</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Cities</TableHead>
                        <TableHead>Trust</TableHead>
                        <TableHead>Verified</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agents.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.name}</TableCell>
                          <TableCell>{a.email || "N/A"}</TableCell>
                          <TableCell>{a.phone}</TableCell>
                          <TableCell>
                            {typeof a.cities_served === "string"
                              ? a.cities_served
                              : Array.isArray(a.cities_served)
                                ? a.cities_served.join(", ")
                                : "N/A"}
                          </TableCell>
                          <TableCell>{a.trust_score || 0}</TableCell>
                          <TableCell>
                            <Badge variant={a.verified ? "default" : "secondary"}>{a.verified ? "Yes" : "No"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROPERTIES */}
          <TabsContent value="properties" className="mt-4 space-y-4">
            {(() => {
              const pendingProps = properties.filter((p) => (p.verification_status || "pending") === "pending");
              const reviewedProps = properties.filter((p) => (p.verification_status || "pending") !== "pending");
              return (
                <>
                  <Card className="border-orange-500/40">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-500">
                        <AlertCircle className="h-5 w-5" />
                        Pending Property Verifications ({pendingProps.length})
                      </CardTitle>
                      <CardDescription>
                        Seller listings → pick a nearby agent to assign + approve. Agent listings → just approve (the
                        listing agent is already assigned).
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AssignAgentPanel readOnly />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-blue-500" />
                        All Reviewed Properties ({reviewedProps.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {reviewedProps.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">No reviewed properties yet</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Title</TableHead>
                              <TableHead>City</TableHead>
                              <TableHead>Locality</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reviewedProps.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                                <TableCell>{p.city}</TableCell>
                                <TableCell>{p.locality}</TableCell>
                                <TableCell>₹{Number(p.price).toLocaleString("en-IN")}</TableCell>
                                <TableCell>
                                  <Badge variant={p.verification_status === "approved" ? "default" : "destructive"}>
                                    {p.verification_status || (p.verified ? "approved" : "pending")}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </TabsContent>

          {/* BUILDERS */}
          <TabsContent value="builders" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-500" />
                  Builder Profiles ({builders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {builders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No builder profiles</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Cities</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {builders.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.builder_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{b.type}</Badge>
                          </TableCell>
                          <TableCell>{b.phone}</TableCell>
                          <TableCell>{b.email || "N/A"}</TableCell>
                          <TableCell>
                            {Array.isArray(b.operating_cities) ? b.operating_cities.join(", ") : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ADMIN HIERARCHY */}
          <TabsContent value="admin-hierarchy" className="mt-4">
            <AdminHierarchyPanel />
          </TabsContent>

          {/* ACTIVITY TIMELINE */}
          <TabsContent value="activity" className="mt-4">
            <AdminActivityTimeline />
          </TabsContent>
        </Tabs>
      </div>

      <RemindAdminDialog open={remindOpen} onOpenChange={setRemindOpen} />
    </div>
  );
}
