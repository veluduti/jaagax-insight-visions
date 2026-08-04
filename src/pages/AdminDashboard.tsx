import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Shield,
  CheckCircle,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Building2,
  Home,
  TrendingUp,
  AlertCircle,
  Eye,
  Star,
  Calendar,
  MessageSquare,
  Activity,
  CalendarCheck,
  MapPin,
  Phone,
  Loader2,
  LayoutDashboard,
  UserPlus,
  Clock,
  Hotel,
  Briefcase,
  FileCheck,
  FileText,
  ClipboardList,
  Filter,
  Search,
  Bell,
  ChevronDown,
  Grid3X3,
  List,
  PlusCircle,
  Download,
  RefreshCw,
  Wrench,
  Zap,
  MapPinned,
  TrendingDown,
  FolderOpen,
  UserCog,
  Building,
  Landmark,
  Edit,
  Trash2,
  Mail,
  Phone as PhoneIcon,
  MoreVertical,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LazyMount, ListSkeleton } from "@/components/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Lazy-loaded heavy panels
const VerificationPanel = lazy(() => import("@/components/admin/VerificationPanel"));
const AgentVerifiedReviewPanel = lazy(() => import("@/components/admin/AgentVerifiedReviewPanel"));
const KYCReviewQueue = lazy(() => import("@/components/admin/KYCReviewQueue"));
const AdminLandRegistrationsPanel = lazy(() => import("@/pages/AdminLandRegistrations"));
const AdminNLKycPanel = lazy(() => import("@/pages/AdminNLKycReview"));

const DataImportPanel = lazy(() =>
  import("@/components/admin/DataImportPanel").then((m) => ({ default: m.DataImportPanel })),
);
const FakeListingManager = lazy(() =>
  import("@/components/admin/FakeListingManager").then((m) => ({ default: m.FakeListingManager })),
);
const DatabaseCleanup = lazy(() =>
  import("@/components/admin/DatabaseCleanup").then((m) => ({ default: m.DatabaseCleanup })),
);
const EnrichProjectsPanel = lazy(() =>
  import("@/components/admin/EnrichProjectsPanel").then((m) => ({ default: m.EnrichProjectsPanel })),
);
const LeadsCRMPanel = lazy(() =>
  import("@/components/admin/LeadsCRMPanel").then((m) => ({ default: m.LeadsCRMPanel })),
);
const EventModerationPanel = lazy(() =>
  import("@/components/admin/EventModerationPanel").then((m) => ({ default: m.EventModerationPanel })),
);
const FetchCommunityEvents = lazy(() =>
  import("@/components/admin/FetchCommunityEvents").then((m) => ({ default: m.FetchCommunityEvents })),
);
const WhatsAppLogsPanel = lazy(() =>
  import("@/components/admin/WhatsAppLogsPanel").then((m) => ({ default: m.WhatsAppLogsPanel })),
);
const RegisteredUsersPanel = lazy(() => import("@/components/admin/RegisteredUsersPanel"));

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================
const StatCard = ({ title, value, icon: Icon, color, trend, trendLabel, onClick, loading }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.2 }}
  >
    <Card
      className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 ${color} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs md:text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <div className="h-6 md:h-8 w-12 md:w-16 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-xl md:text-2xl font-bold tracking-tight">{value}</p>
            )}
            {trend !== undefined && (
              <div
                className={`flex items-center gap-1 text-[10px] md:text-xs font-medium ${
                  trend >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
                <span className="text-muted-foreground font-normal">{trendLabel}</span>
              </div>
            )}
          </div>
          <div className={`p-2 md:p-3 rounded-full ${color.replace("border-", "bg-").replace("/60", "")}/10`}>
            <Icon className={`h-4 w-4 md:h-6 md:w-6 ${color.replace("border-", "text-")}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// ============================================================================
// QUICK ACTION CARD
// ============================================================================
const QuickActionCard = ({ title, description, icon: Icon, onClick, color = "primary" }: any) => (
  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-300" onClick={onClick}>
      <CardContent className="p-4 md:p-6 text-center">
        <div className={`p-2 md:p-3 rounded-full bg-${color}/10 w-fit mx-auto mb-2 md:mb-3`}>
          <Icon className={`h-5 w-5 md:h-6 md:w-6 text-${color}`} />
        </div>
        <h3 className="font-semibold text-xs md:text-sm">{title}</h3>
        <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">{description}</p>
      </CardContent>
    </Card>
  </motion.div>
);

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

// ============================================================================
// USER TABLE COMPONENT - NEW
// ============================================================================
const UserTable = ({ users, loading, onView, onDelete }: any) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredUsers = users?.filter((user: any) => {
    const search = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search) ||
      user.city?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil((filteredUsers?.length || 0) / itemsPerPage);
  const paginatedUsers = filteredUsers?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getRoleBadge = (role: string) => {
    const variants: any = {
      admin: { color: "bg-purple-500", label: "Admin" },
      agent: { color: "bg-blue-500", label: "Agent" },
      builder: { color: "bg-orange-500", label: "Builder" },
      buyer: { color: "bg-green-500", label: "Customer" },
      seller: { color: "bg-pink-500", label: "Seller" },
    };
    const v = variants[role?.toLowerCase()] || { color: "bg-gray-500", label: role || "User" };
    return <Badge className={`${v.color} text-white`}>{v.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      active: { color: "bg-green-500", label: "Active" },
      pending: { color: "bg-yellow-500", label: "Pending" },
      inactive: { color: "bg-red-500", label: "Inactive" },
      verified: { color: "bg-blue-500", label: "Verified" },
    };
    const v = variants[status?.toLowerCase()] || { color: "bg-gray-500", label: status || "Unknown" };
    return <Badge className={`${v.color} text-white`}>{v.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Registered Users ({users?.length || 0})
            </CardTitle>
            <CardDescription>All users on the platform with the roles they hold</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, city, role..."
                className="pl-9 w-full"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : paginatedUsers?.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No users found</p>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers?.map((user: any, index: number) => (
                    <TableRow key={user.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {user.name?.charAt(0)?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{user.name || "Unknown User"}</p>
                            <p className="text-xs text-muted-foreground block md:hidden">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{user.email}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{user.phone || "—"}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => onView(user)} className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(user)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <PhoneIcon className="h-4 w-4 mr-2" />
                                Call User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-500">
                                <UserX className="h-4 w-4 mr-2" />
                                Suspend User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredUsers?.length || 0)} of {filteredUsers?.length || 0}{" "}
                  users
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 3 + i;
                    }
                    if (pageNum > totalPages) return null;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-9"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "overview");
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && t !== activeTab) setActiveTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const handleTabChange = (v: string) => {
    setActiveTab(v);
    const next = new URLSearchParams(searchParams);
    if (v === "overview") next.delete("tab"); else next.set("tab", v);
    setSearchParams(next, { replace: true });
  };

  const [activeFilter, setActiveFilter] = useState("all");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProperties: 0,
    totalProjects: 0,
    verificationsPending: 0,
    totalAgents: 0,
    pendingVisits: 0,
    pendingSignups: 0,
    totalBuilders: 0,
    totalHotelPartners: 0,
    reraVerifications: 0,
    agentVerified: 0,
    priceDropsPending: 0,
  });
  const [visitBookings, setVisitBookings] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [trustAnalysis, setTrustAnalysis] = useState<any>(null);
  const [loadingTrust, setLoadingTrust] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const navigate = useNavigate();

  // ============================================================================
  // NAVIGATION GROUPS - DROPDOWN BASED
  // ============================================================================
  const NAV_GROUPS = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      items: [
        { value: "overview", label: "Overview", icon: LayoutDashboard },
        { value: "analytics", label: "Analytics", icon: BarChart3 },
        { value: "reports", label: "Reports", icon: FileText },
      ],
    },
    {
      label: "Users",
      icon: Users,
      items: [
        { value: "users", label: "Registered Users", icon: Users },
        { value: "agents", label: "Agents", icon: Briefcase },
        { value: "builders", label: "Builders", icon: Building2 },
        { value: "hotels", label: "Hotel Partners", icon: Hotel },
      ],
    },
    {
      label: "Properties",
      icon: Home,
      items: [
        { value: "properties", label: "All Properties", icon: Home },
        { value: "verification", label: "Pending Verification", icon: Shield },
        { value: "agent-verified", label: "Agent Verified", icon: CheckCircle },
      ],
    },
    {
      label: "Projects",
      icon: Building,
      items: [
        { value: "projects", label: "All Projects", icon: Building },
        { value: "rera-verifications", label: "RERA Verifications", icon: Shield },
        { value: "documents", label: "Documents", icon: FileText },
      ],
    },
    {
      label: "Operations",
      icon: Activity,
      items: [
        { value: "visits", label: "Visit Bookings", icon: CalendarCheck },
        { value: "frm", label: "FRM Dashboard", icon: ClipboardList },
        { value: "events", label: "Events", icon: Calendar },
        { value: "whatsapp", label: "WhatsApp Logs", icon: MessageSquare },
        { value: "nl-land", label: "Land Registrations", icon: MapPinned },
        { value: "nl-kyc", label: "Natural Living KYC", icon: FileCheck },
      ],
    },
    {
      label: "Tools",
      icon: Wrench,
      items: [
        { value: "trust", label: "Trust Engine", icon: Shield },
        { value: "kyc", label: "KYC", icon: FileCheck },
        { value: "settings", label: "Settings", icon: Settings },
        { value: "price-drops", label: "Price Drops", icon: TrendingDown },
      ],
    },
  ];


  // ============================================================================
  // FILTER OPTIONS - SEPARATE FROM NAVIGATION
  // ============================================================================
  const FILTER_OPTIONS = [
    { value: "all", label: "All", icon: Grid3X3 },
    { value: "registered-users", label: "Registered Users", icon: Users },
    { value: "visits", label: "Visits", icon: CalendarCheck },
    { value: "hotel-bookings", label: "Hotel Bookings", icon: Hotel },
    { value: "agents", label: "Agents", icon: Briefcase },
    { value: "agent-verified", label: "Agent-Verified", icon: CheckCircle },
    { value: "properties", label: "Properties", icon: Home },
    { value: "builders", label: "Builders", icon: Building2 },
    { value: "projects", label: "Projects", icon: Building },
    { value: "hotel-partners", label: "Hotel Partners", icon: Hotel },
    { value: "weekend-explorer", label: "Weekend Explorer", icon: MapPinned },
    { value: "quick-visits", label: "Quick Visits", icon: Zap },
    { value: "rera-verifications", label: "RERA Verifications", icon: Shield },
  ];

  // ============================================================================
  // ACTION OPTIONS - SEPARATE FROM NAVIGATION
  // ============================================================================
  const ACTION_OPTIONS = [
    { value: "documents", label: "Documents", icon: FileText },
    { value: "renovations", label: "Renovations", icon: Wrench },
    { value: "all-listings", label: "All Listings", icon: List },
    { value: "kyc", label: "KYC", icon: FileCheck },
    { value: "price-drops", label: "Price Drops", icon: TrendingDown },
  ];

  // ============================================================================
  // FETCH FUNCTIONS
  // ============================================================================
  useEffect(() => {
    fetchUser();
    fetchStats();
    fetchUsers();
    fetchVisitBookings();
  }, []);

  const fetchUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [
        { data: profileUserRows },
        { count: propertiesCount },
        { count: projectsCount },
        { count: agentsCount },
        { count: pendingVisitsCount },
        { count: pendingSignupsCount },
        { count: agentVerifiedPendingCount },
        { count: buildersCount },
        { count: hotelPartnersCount },
        { count: reraCount },
        { count: agentVerifiedCount },
        { count: priceDropsCount },
      ] = await Promise.all([
        supabase.from("profiles").select("user_id"),
        supabase.from("properties").select("*", { count: "exact", head: true }),
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("agents").select("*", { count: "exact", head: true }),
        supabase.from("visit_bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("signup_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("properties")
          .select("*", { count: "exact", head: true })
          .eq("verification_status", "agent_verified_pending"),
        supabase.from("builders").select("*", { count: "exact", head: true }),
        supabase.from("hotel_partners").select("*", { count: "exact", head: true }),
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("rera_verified", true),
        supabase
          .from("properties")
          .select("*", { count: "exact", head: true })
          .eq("verification_status", "agent_verified"),
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("price_drop_pending", true),
      ]);
      // Source of truth for "Registered Users" is the auth users list (same as
      // the Registered Users panel below). Falls back to distinct profile user_ids.
      let usersCount = new Set((profileUserRows ?? []).map((r: any) => r.user_id)).size;
      try {
        const { data: authList } = await supabase.functions.invoke("admin-list-users");
        const listed = (authList as any)?.users?.length;
        if (typeof listed === "number") usersCount = listed;
      } catch (_) { /* keep fallback */ }


      setStats({
        totalUsers: usersCount || 0,
        totalProperties: propertiesCount || 0,
        totalProjects: projectsCount || 0,
        verificationsPending: agentVerifiedPendingCount || 0,
        totalAgents: agentsCount || 0,
        pendingVisits: pendingVisitsCount || 0,
        pendingSignups: pendingSignupsCount || 0,
        totalBuilders: buildersCount || 0,
        totalHotelPartners: hotelPartnersCount || 0,
        reraVerifications: reraCount || 0,
        agentVerified: agentVerifiedCount || 0,
        priceDropsPending: priceDropsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchVisitBookings = async () => {
    const { data } = await supabase
      .from("visit_bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setVisitBookings(data || []);
  };

  const handleViewUser = (user: any) => {
    navigate(`/dashboard/admin/users/${user.id}`);
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Are you sure you want to delete ${user.name || "this user"}?`)) return;

    try {
      const { error } = await supabase.from("profiles").delete().eq("id", user.id);

      if (error) throw error;

      toast.success("User deleted successfully");
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const runTrustAnalysis = async (entityType: string, entityId: number) => {
    setLoadingTrust(true);
    try {
      const { aiService } = await import("@/services/aiService");
      const data: any = await aiService.trustEngine({ entityType, entityId });

      if (data?.analysis) {
        setTrustAnalysis(data.analysis);
        toast.success("Trust analysis complete");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze trust score");
    } finally {
      setLoadingTrust(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-primary/5">
      <Navigation />

      {/* HEADER */}
      <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Admin Control Panel
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Platform intelligence & management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                3
              </span>
            </Button>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            title="Properties"
            value={stats.totalProperties}
            icon={Home}
            color="border-blue-500"
            trend={12}
            trendLabel="this month"
            onClick={() => setActiveTab("properties")}
            loading={loadingStats}
          />
          <StatCard
            title="Projects"
            value={stats.totalProjects}
            icon={Building2}
            color="border-green-500"
            trend={8}
            trendLabel="this month"
            onClick={() => setActiveTab("projects")}
            loading={loadingStats}
          />
          <StatCard
            title="Agents"
            value={stats.totalAgents}
            icon={Users}
            color="border-purple-500"
            trend={5}
            trendLabel="this month"
            onClick={() => setActiveTab("agents")}
            loading={loadingStats}
          />
          <StatCard
            title="Agents Verified"
            value={stats.agentVerified}
            icon={CheckCircle}
            color="border-teal-500"
            trend={3}
            trendLabel="this month"
            onClick={() => setActiveTab("agent-verified")}
            loading={loadingStats}
          />
          <StatCard
            title="Builders"
            value={stats.totalBuilders}
            icon={Building2}
            color="border-indigo-500"
            loading={loadingStats}
          />
          <StatCard
            title="Registered Users"
            value={stats.totalUsers}
            icon={UserPlus}
            color="border-cyan-500"
            trend={3}
            trendLabel="this month"
            loading={loadingStats}
          />
          <StatCard
            title="Pending Signups"
            value={stats.pendingSignups}
            icon={Clock}
            color="border-yellow-500"
            loading={loadingStats}
          />
          <StatCard
            title="Pending Visits"
            value={stats.pendingVisits}
            icon={CalendarCheck}
            color="border-amber-500"
            onClick={() => setActiveTab("visits")}
            loading={loadingStats}
          />
        </div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
          <QuickActionCard
            title="Add Property"
            description="New listing"
            icon={PlusCircle}
            color="blue"
            onClick={() => navigate("/properties/new")}
          />
          <QuickActionCard
            title="Verify KYC"
            description="Pending approvals"
            icon={FileCheck}
            color="green"
            onClick={() => setActiveTab("kyc")}
          />
          <QuickActionCard
            title="View Reports"
            description="Analytics"
            icon={FileText}
            color="purple"
            onClick={() => setActiveTab("reports")}
          />
          <QuickActionCard title="Export Data" description="Download" icon={Download} color="orange" />
          <QuickActionCard
            title="Refresh"
            description="Update stats"
            icon={RefreshCw}
            color="gray"
            onClick={() => {
              fetchStats();
              fetchUsers();
            }}
          />
          <QuickActionCard
            title="Price Drops"
            description={`${stats.priceDropsPending} pending`}
            icon={TrendingDown}
            color="rose"
            onClick={() => setActiveTab("price-drops")}
          />
        </div>

        {/* ====================================================================== */}
        {/* MAIN TABS */}
        {/* ====================================================================== */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* ================================================================== */}
          {/* SECTION 1: DROPDOWN NAVIGATION */}
          {/* ================================================================== */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-card rounded-lg border shadow-sm">
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
                        item.value === "verification"
                          ? stats.verificationsPending
                          : item.value === "agent-verified"
                            ? stats.agentVerified
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

          {/* ================================================================== */}
          {/* SECTION 2: FILTER OPTIONS - SEPARATE ROW */}
          {/* ================================================================== */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-muted/30 rounded-lg border">
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
              />
            ))}
          </div>

          {/* ================================================================== */}
          {/* SECTION 3: ACTION OPTIONS - SEPARATE ROW */}
          {/* ================================================================== */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-muted/20 rounded-lg border">
            <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              Actions:
            </span>
            {ACTION_OPTIONS.map((action) => (
              <Button
                key={action.value}
                variant="ghost"
                size="sm"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs h-8 ${
                  activeTab === action.value ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
                onClick={() => setActiveTab(action.value)}
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            ))}
          </div>

          {/* ================================================================== */}
          {/* TAB CONTENTS */}
          {/* ================================================================== */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <TabsContent value="overview" className="space-y-6 mt-6">
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card
                      className="cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => setActiveTab("verification")}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-3">
                          <CheckCircle className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold">Verify Properties</h3>
                        <p className="text-sm text-muted-foreground mt-1">Review pending listings</p>
                        {stats.verificationsPending > 0 && (
                          <Badge className="mt-2 bg-orange-500">{stats.verificationsPending} Pending</Badge>
                        )}
                      </CardContent>
                    </Card>

                    <Card
                      className="cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => setActiveTab("rera-verifications")}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="p-3 rounded-full bg-green-500/10 w-fit mx-auto mb-3">
                          <Shield className="h-6 w-6 text-green-500" />
                        </div>
                        <h3 className="font-semibold">RERA Control</h3>
                        <p className="text-sm text-muted-foreground mt-1">Approve builder docs</p>
                      </CardContent>
                    </Card>

                    <Card
                      className="cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => navigate("/transactions")}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="p-3 rounded-full bg-purple-500/10 w-fit mx-auto mb-3">
                          <BarChart3 className="h-6 w-6 text-purple-500" />
                        </div>
                        <h3 className="font-semibold">Market Trends</h3>
                        <p className="text-sm text-muted-foreground mt-1">View analytics</p>
                      </CardContent>
                    </Card>

                    <Card
                      className="cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => setActiveTab("settings")}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="p-3 rounded-full bg-gray-500/10 w-fit mx-auto mb-3">
                          <Settings className="h-6 w-6 text-gray-500" />
                        </div>
                        <h3 className="font-semibold">Settings</h3>
                        <p className="text-sm text-muted-foreground mt-1">Configure platform</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>Latest actions across the platform</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          {
                            user: "Ramesh Kumar",
                            action: "added a new property",
                            time: "2 mins ago",
                            type: "property",
                          },
                          {
                            user: "Priya Patel",
                            action: "completed verification",
                            time: "15 mins ago",
                            type: "verification",
                          },
                          { user: "Raj Singh", action: "rejected a listing", time: "1 hour ago", type: "rejection" },
                          { user: "Admin", action: "updated KYC settings", time: "2 hours ago", type: "settings" },
                        ].map((activity, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  activity.type === "property"
                                    ? "bg-green-500"
                                    : activity.type === "verification"
                                      ? "bg-blue-500"
                                      : activity.type === "rejection"
                                        ? "bg-red-500"
                                        : "bg-gray-500"
                                }`}
                              />
                              <div>
                                <p className="font-medium text-sm">{activity.user}</p>
                                <p className="text-sm text-muted-foreground">{activity.action}</p>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">{activity.time}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* USERS TAB - WITH TABLE */}
              {activeTab === "users" && (
                <TabsContent value="users" className="space-y-6 mt-6">
                  <UserTable users={users} loading={loadingUsers} onView={handleViewUser} onDelete={handleDeleteUser} />
                </TabsContent>
              )}

              {/* PROPERTIES TAB */}
              {activeTab === "properties" && (
                <TabsContent value="properties" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-primary" />
                        Property Management
                      </CardTitle>
                      <CardDescription>Manage all properties across the platform</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold">{stats.totalProperties}</p>
                          <p className="text-sm text-muted-foreground">Total Properties</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold text-amber-600">{stats.verificationsPending}</p>
                          <p className="text-sm text-muted-foreground">Pending Verification</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">{stats.reraVerifications}</p>
                          <p className="text-sm text-muted-foreground">RERA Verified</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">
                          All Listings ({stats.totalProperties})
                        </Badge>
                        <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">
                          Pending Review ({stats.verificationsPending})
                        </Badge>
                        <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">
                          Price Drops ({stats.priceDropsPending})
                        </Badge>
                        <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted">
                          Agent Verified ({stats.agentVerified})
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* PROJECTS TAB */}
              {activeTab === "projects" && (
                <TabsContent value="projects" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Project Management
                      </CardTitle>
                      <CardDescription>Manage all projects</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold">{stats.totalProjects}</p>
                          <p className="text-sm text-muted-foreground">Total Projects</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">8</p>
                          <p className="text-sm text-muted-foreground">Active</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold text-amber-600">4</p>
                          <p className="text-sm text-muted-foreground">Pending Review</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* AGENTS TAB */}
              {activeTab === "agents" && (
                <TabsContent value="agents" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Agent Management
                      </CardTitle>
                      <CardDescription>Manage all agents and their performance</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold">{stats.totalAgents}</p>
                          <p className="text-sm text-muted-foreground">Total Agents</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">8</p>
                          <p className="text-sm text-muted-foreground">Active</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold text-amber-600">3</p>
                          <p className="text-sm text-muted-foreground">Pending Approval</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold text-blue-600">{stats.agentVerified}</p>
                          <p className="text-sm text-muted-foreground">Verified Properties</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* BUILDERS TAB */}
              {activeTab === "builders" && (
                <TabsContent value="builders" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Builder Management
                      </CardTitle>
                      <CardDescription>Manage all builders and their RERA status</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold">{stats.totalBuilders}</p>
                          <p className="text-sm text-muted-foreground">Total Builders</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">2</p>
                          <p className="text-sm text-muted-foreground">RERA Verified</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold text-amber-600">1</p>
                          <p className="text-sm text-muted-foreground">Pending Verification</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* HOTELS TAB */}
              {activeTab === "hotels" && (
                <TabsContent value="hotels" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Hotel className="h-5 w-5 text-primary" />
                        Hotel Partners
                      </CardTitle>
                      <CardDescription>Manage all hotel partners</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold">{stats.totalHotelPartners}</p>
                          <p className="text-sm text-muted-foreground">Total Partners</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">2</p>
                          <p className="text-sm text-muted-foreground">Active</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* VERIFICATION TAB */}
              {activeTab === "verification" && (
                <TabsContent value="verification" id="admin-verifications" className="space-y-6 mt-6 scroll-mt-24">
                  <Suspense fallback={<ListSkeleton rows={4} />}>
                    <AgentVerifiedReviewPanel />
                    <VerificationPanel />
                  </Suspense>
                  <LazyMount fallback={<ListSkeleton rows={3} />} minHeight={300}>
                    <Suspense fallback={<ListSkeleton rows={3} />}>
                      <FetchCommunityEvents />
                      <LeadsCRMPanel />
                      <EnrichProjectsPanel />
                      <DataImportPanel />
                      <DatabaseCleanup />
                      <FakeListingManager />
                    </Suspense>
                  </LazyMount>
                </TabsContent>
              )}

              {/* AGENT VERIFIED TAB */}
              {activeTab === "agent-verified" && (
                <TabsContent value="agent-verified" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        Agent Verified Properties ({stats.agentVerified})
                      </CardTitle>
                      <CardDescription>Properties verified by agents</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-center text-muted-foreground py-8">
                        {stats.agentVerified === 0
                          ? "No agent verified properties yet"
                          : `${stats.agentVerified} properties have been verified by agents`}
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* RERA VERIFICATIONS TAB */}
              {activeTab === "rera-verifications" && (
                <TabsContent value="rera-verifications" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        RERA Verifications
                      </CardTitle>
                      <CardDescription>RERA verified projects and properties</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold">{stats.reraVerifications}</p>
                          <p className="text-sm text-muted-foreground">RERA Verified</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <p className="text-2xl font-bold text-amber-600">3</p>
                          <p className="text-sm text-muted-foreground">Pending Verification</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* VISITS TAB */}
              {activeTab === "visits" && (
                <TabsContent value="visits" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarCheck className="h-5 w-5 text-primary" />
                        Visit Bookings ({visitBookings.length})
                      </CardTitle>
                      <CardDescription>All property visit requests across the platform</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {visitBookings.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No visit bookings yet</p>
                      ) : (
                        <div className="space-y-3">
                          {visitBookings.slice(0, 10).map((booking) => (
                            <div
                              key={booking.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="space-y-1">
                                <p className="font-medium">{booking.buyer_name || "Unknown Buyer"}</p>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {booking.buyer_phone || "N/A"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {booking.city || "N/A"}, {booking.locality || ""}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  📅 {booking.visit_date} • 🕒 {booking.visit_time || "TBD"}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  booking.status === "confirmed"
                                    ? "default"
                                    : booking.status === "pending"
                                      ? "secondary"
                                      : booking.status === "completed"
                                        ? "outline"
                                        : "destructive"
                                }
                              >
                                {booking.status}
                              </Badge>
                            </div>
                          ))}
                          {visitBookings.length > 10 && (
                            <p className="text-center text-sm text-muted-foreground">
                              + {visitBookings.length - 10} more bookings
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* FRM TAB */}
              {activeTab === "frm" && (
                <TabsContent value="frm" className="space-y-6 mt-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Field Relationship Manager
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Agent performance tracking, assignments, and earnings analytics
                          </p>
                        </div>
                        <Button onClick={() => navigate("/dashboard/admin/frm")}>Open Full Dashboard</Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* EVENTS TAB */}
              {activeTab === "events" && (
                <TabsContent value="events" className="space-y-6 mt-6">
                  <LazyMount fallback={<ListSkeleton rows={5} />} minHeight={400}>
                    <Suspense fallback={<ListSkeleton rows={5} />}>
                      <EventModerationPanel />
                    </Suspense>
                  </LazyMount>
                </TabsContent>
              )}

              {/* WHATSAPP TAB */}
              {activeTab === "whatsapp" && (
                <TabsContent value="whatsapp" className="space-y-6 mt-6">
                  <LazyMount fallback={<ListSkeleton rows={5} />} minHeight={400}>
                    <Suspense fallback={<ListSkeleton rows={5} />}>
                      <WhatsAppLogsPanel />
                    </Suspense>
                  </LazyMount>
                </TabsContent>
              )}

              {/* TRUST ENGINE TAB */}
              {activeTab === "trust" && (
                <TabsContent value="trust" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-primary" />
                        AI Trust Engine
                      </CardTitle>
                      <CardDescription>Analyze and recalculate trust scores for entities</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-4">
                          <select
                            className="border rounded-lg px-4 py-2 flex-1 min-w-[200px]"
                            onChange={(e) => setSelectedEntity(JSON.parse(e.target.value))}
                          >
                            <option value="">Select entity type</option>
                            <option value='{"type":"property","id":1}'>Property #1</option>
                            <option value='{"type":"project","id":1}'>Project #1</option>
                            <option value='{"type":"agent","id":1}'>Agent #1</option>
                          </select>
                          <Button
                            onClick={() => selectedEntity && runTrustAnalysis(selectedEntity.type, selectedEntity.id)}
                            disabled={!selectedEntity || loadingTrust}
                          >
                            {loadingTrust ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-2" />
                                Run Analysis
                              </>
                            )}
                          </Button>
                        </div>

                        {trustAnalysis && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border rounded-lg p-6 space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Trust Score</p>
                                <p className="text-4xl font-bold text-primary">{trustAnalysis.trustScore}/100</p>
                              </div>
                              <Badge
                                className={
                                  trustAnalysis.grade?.startsWith("A")
                                    ? "bg-green-600"
                                    : trustAnalysis.grade?.startsWith("B")
                                      ? "bg-blue-500"
                                      : "bg-orange-500"
                                }
                              >
                                Grade: {trustAnalysis.grade}
                              </Badge>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold mb-2 text-green-600">Positive Factors</h4>
                                <ul className="space-y-1">
                                  {trustAnalysis.factors?.positive?.map((f: string, i: number) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                      <span className="text-green-600">✓</span>
                                      <span>{f}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2 text-orange-500">Concerns</h4>
                                <ul className="space-y-1">
                                  {trustAnalysis.factors?.concerns?.map((f: string, i: number) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                      <span className="text-orange-500">!</span>
                                      <span>{f}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">Recommendations</h4>
                              <ul className="space-y-1">
                                {trustAnalysis.recommendations?.map((r: string, i: number) => (
                                  <li key={i} className="text-sm flex items-start gap-2">
                                    <span className="text-primary">→</span>
                                    <span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* ANALYTICS TAB */}
              {activeTab === "analytics" && (
                <TabsContent value="analytics" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Platform Analytics</CardTitle>
                      <CardDescription>Comprehensive insights and metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="p-6 bg-primary/10 rounded-lg">
                          <Eye className="h-8 w-8 text-primary mb-2" />
                          <p className="text-sm text-muted-foreground">Total Page Views</p>
                          <p className="text-3xl font-bold">124,567</p>
                          <p className="text-sm text-green-600 mt-2">↑ 18% this month</p>
                        </div>

                        <div className="p-6 bg-green-500/10 rounded-lg">
                          <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
                          <p className="text-sm text-muted-foreground">Active Listings</p>
                          <p className="text-3xl font-bold">{stats.totalProperties}</p>
                          <p className="text-sm text-green-600 mt-2">↑ 12% this month</p>
                        </div>

                        <div className="p-6 bg-blue-500/10 rounded-lg">
                          <Users className="h-8 w-8 text-blue-500 mb-2" />
                          <p className="text-sm text-muted-foreground">Active Users</p>
                          <p className="text-3xl font-bold">{stats.totalUsers || 0}</p>
                          <p className="text-sm text-blue-600 mt-2">Last 30 days</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* REPORTS TAB */}
              {activeTab === "reports" && (
                <TabsContent value="reports" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Reports & Documents
                      </CardTitle>
                      <CardDescription>Generate and manage reports</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg text-center cursor-pointer hover:bg-muted transition-colors">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                          <p className="font-medium">Property Report</p>
                          <p className="text-sm text-muted-foreground">Last generated: Today</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center cursor-pointer hover:bg-muted transition-colors">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p className="font-medium">Agent Performance</p>
                          <p className="text-sm text-muted-foreground">Last generated: Yesterday</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center cursor-pointer hover:bg-muted transition-colors">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                          <p className="font-medium">Financial Summary</p>
                          <p className="text-sm text-muted-foreground">Last generated: 3 days ago</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* KYC TAB (seller identity) */}
              {activeTab === "kyc" && (
                <TabsContent value="kyc" className="space-y-6 mt-6">
                  <Suspense fallback={<ListSkeleton />}>
                    <KYCReviewQueue />
                  </Suspense>
                </TabsContent>
              )}

              {/* NATURAL LIVING — LAND REGISTRATIONS */}
              {activeTab === "nl-land" && (
                <TabsContent value="nl-land" className="space-y-6 mt-6">
                  <Suspense fallback={<ListSkeleton />}>
                    <AdminLandRegistrationsPanel />
                  </Suspense>
                </TabsContent>
              )}

              {/* NATURAL LIVING — KYC */}
              {activeTab === "nl-kyc" && (
                <TabsContent value="nl-kyc" className="space-y-6 mt-6">
                  <Suspense fallback={<ListSkeleton />}>
                    <AdminNLKycPanel />
                  </Suspense>
                </TabsContent>
              )}


              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <TabsContent value="settings" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Platform Settings
                      </CardTitle>
                      <CardDescription>Configure platform-wide settings</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Verification Timeout</p>
                            <p className="text-sm text-muted-foreground">Days before agent reassignment</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">3 days</span>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Listing Expiry</p>
                            <p className="text-sm text-muted-foreground">Default listing duration</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">90 days</span>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Premium Pricing</p>
                            <p className="text-sm text-muted-foreground">Configure premium listing fees</p>
                          </div>
                          <Button variant="outline" size="sm">
                            Configure
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* PRICE DROPS TAB */}
              {activeTab === "price-drops" && (
                <TabsContent value="price-drops" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-primary" />
                        Price Drop Approvals
                      </CardTitle>
                      <CardDescription>Review and approve price drop requests</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {stats.priceDropsPending === 0 ? (
                        <div className="text-center py-12">
                          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                          <p className="text-lg font-medium">No pending price drops</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            All price drop requests have been processed
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-muted-foreground">
                            {stats.priceDropsPending} price drops pending approval
                          </p>
                          {/* Price drop list would go here */}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* DOCUMENTS TAB */}
              {activeTab === "documents" && (
                <TabsContent value="documents" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Documents
                      </CardTitle>
                      <CardDescription>Manage all documents</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg text-center cursor-pointer hover:bg-muted transition-colors">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                          <p className="font-medium">Property Documents</p>
                          <p className="text-sm text-muted-foreground">12 documents</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center cursor-pointer hover:bg-muted transition-colors">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p className="font-medium">Project Documents</p>
                          <p className="text-sm text-muted-foreground">8 documents</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center cursor-pointer hover:bg-muted transition-colors">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                          <p className="font-medium">Legal Documents</p>
                          <p className="text-sm text-muted-foreground">5 documents</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* RENOVATIONS TAB */}
              {activeTab === "renovations" && (
                <TabsContent value="renovations" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-primary" />
                        Renovations
                      </CardTitle>
                      <CardDescription>Manage renovation projects</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-center text-muted-foreground py-8">Renovation management coming soon</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* ALL LISTINGS TAB */}
              {activeTab === "all-listings" && (
                <TabsContent value="all-listings" className="space-y-6 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <List className="h-5 w-5 text-primary" />
                        All Listings
                      </CardTitle>
                      <CardDescription>View all properties across the platform</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-center text-muted-foreground py-8">Full listing management coming soon</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* DEFAULT FALLBACK */}
              {![
                "overview",
                "users",
                "properties",
                "projects",
                "agents",
                "builders",
                "hotels",
                "visits",
                "frm",
                "verification",
                "agent-verified",
                "events",
                "whatsapp",
                "trust",
                "analytics",
                "reports",
                "kyc",
                "settings",
                "price-drops",
                "all-listings",
                "documents",
                "renovations",
                "rera-verifications",
              ].includes(activeTab) && (
                <TabsContent value={activeTab} className="space-y-6 mt-6">
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">Content for "{activeTab}" coming soon</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
}
