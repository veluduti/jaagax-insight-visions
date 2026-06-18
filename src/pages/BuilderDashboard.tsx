import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  FileCheck,
  Shield,
  LogOut,
  Plus,
  Home,
  Eye,
  TrendingUp,
  CheckCircle,
  Clock,
  MapPin,
  Upload,
  FileText,
  AlertCircle,
  CalendarCheck,
  Wallet,
  Users,
  ClipboardList,
  Bell,
  Award,
  Gift,
  Hotel,
  Banknote,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";
import { LazyMount, ChartSkeleton, ListSkeleton, CardGridSkeleton } from "@/components/shared";
import { Sparkles } from "lucide-react";
import { WalletDashboard } from "@/features/buyer/wallet";
import { useWallet, formatINR } from "@/contexts/WalletContext";

// Lazy-loaded heavy widgets
const PropertyUploadForm = lazy(() => import("@/components/builder/PropertyUploadForm"));
const RERAUploadModal = lazy(() => import("@/components/builder/RERAUploadModal"));
const BuilderRERAStatus = lazy(() => import("@/components/builder/BuilderRERAStatus"));
const DocumentationModal = lazy(() => import("@/components/builder/DocumentationModal"));
const BuilderAnalyticsPanel = lazy(() => import("@/components/builder/BuilderAnalyticsPanel"));
const BuilderMyProfileCard = lazy(() => import("@/components/builder/BuilderMyProfileCard"));
const SamplePropertiesPreviewDialog = lazy(() => import("@/components/builder/SamplePropertiesPreviewDialog"));

interface Project {
  id: string;
  name: string;
  city: string;
  locality: string;
  builder_name: string;
  avg_price: number | null;
  image: string | null;
  verified: boolean | null;
  rera_id: string | null;
  trust_score: number | null;
}

interface Property {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  area_sqft: number | null;
  bhk: number | null;
  type: string | null;
  images: any;
  verified: boolean | null;
  verification_status: string | null;
  created_at: string | null;
}

export default function BuilderDashboard() {
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [activeTab, setActiveTab] = useState("properties");
  const { balance: liveWalletBalance } = useWallet();
  const [reraModalOpen, setReraModalOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [samplePreviewOpen, setSamplePreviewOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState({
    totalProjects: 0,
    verifiedProjects: 0,
    totalUnits: 0,
    totalViews: 0,
    pendingVisits: 0,
  });
  const [performance, setPerformance] = useState({
    totalViews: 0,
    unitsSold: 0,
    avgTrustScore: 0,
    growthRate: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
    fetchProjects();
    fetchProperties();
    fetchPerformanceData();
    fetchPendingVisitsCount();
    fetchWalletBalance();
    fetchUnreadCount();
  }, []);

  const fetchUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUser({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0],
      });
    }
    setLoading(false);
  };

  const fetchPendingVisitsCount = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: submittedProperties } = await supabase
        .from("properties")
        .select("id, builder_id")
        .eq("submitted_by", user.id);

      const builderIds = [...new Set((submittedProperties || []).map((p) => p.builder_id).filter(Boolean))];

      let allPropertyIds = (submittedProperties || []).map((p) => p.id);

      if (builderIds.length > 0) {
        const { data: builderProperties } = await supabase.from("properties").select("id").in("builder_id", builderIds);

        const builderPropIds = (builderProperties || []).map((p) => p.id);
        allPropertyIds = [...new Set([...allPropertyIds, ...builderPropIds])];
      }

      const { data: pendingVisits } = await supabase
        .from("visit_bookings")
        .select("id, property_id")
        .eq("status", "pending_builder");

      const count = (pendingVisits || []).filter((visit) => allPropertyIds.includes(visit.property_id || "")).length;

      setStats((prev) => ({ ...prev, pendingVisits: count }));
    } catch (error) {
      console.error("Error fetching pending visits count:", error);
    }
  };

  const fetchWalletBalance = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle();

      if (wallet) {
        setWalletBalance(wallet.balance);
      }
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
    }
  };

  const fetchUnreadCount = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .eq("is_archived", false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const fetchProjects = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: builderProfile } = await supabase
      .from("builder_profiles")
      .select("builder_name")
      .eq("user_id", user.id)
      .maybeSingle();

    let projectData: any[] = [];
    const filter = builderProfile?.builder_name
      ? `submitted_by.eq.${user.id},builder_name.ilike.%${builderProfile.builder_name}%`
      : `submitted_by.eq.${user.id}`;
    const { data } = await supabase.from("projects").select("*").or(filter).order("created_at", { ascending: false });
    projectData = data || [];

    setProjects(projectData as Project[]);

    if (projectData.length > 0 && !selectedProject) {
      fetchProjectForecast(projectData[0] as Project);
    }
  };

  const fetchProperties = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching properties:", error);
      return;
    }

    const list = (data || []) as Property[];
    setProperties(list);

    const totalUnits = list.reduce((sum, p) => sum + (p.bhk || 0), 0);
    const verifiedCount = list.filter((p) => p.verified).length;

    setStats((prev) => ({
      ...prev,
      totalProjects: list.length,
      verifiedProjects: verifiedCount,
      totalUnits,
    }));
  };

  const fetchPerformanceData = async () => {
    setPerformance({
      totalViews: Math.floor(Math.random() * 10000) + 2000,
      unitsSold: Math.floor(Math.random() * 50) + 10,
      avgTrustScore: Math.round(projects.reduce((acc, p) => acc + (p.trust_score || 0), 0) / (projects.length || 1)),
      growthRate: Math.floor(Math.random() * 20) + 5,
    });
  };

  const fetchProjectForecast = async (project: Project) => {
    setSelectedProject(project);
    setLoadingForecast(true);
    try {
      const { aiService } = await import("@/services/aiService");
      const data: any = await aiService.projectForecast({
        projectId: project.id,
        city: project.city,
        locality: project.locality,
        avgPrice: project.avg_price,
        verified: project.verified,
        reraId: project.rera_id,
      });

      if (data?.forecast) setForecast(data.forecast);
    } catch (error) {
      console.error("Forecast error:", error);
    } finally {
      setLoadingForecast(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />

      {/* Header */}
      <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Welcome, {user?.name || "Builder"}!</h1>
            <p className="text-muted-foreground mt-1">Manage your projects and properties</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setActiveTab("wallet")} className="gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-semibold">{formatINR(liveWalletBalance)}</span>
            </Button>
            <Button variant="outline" onClick={() => setSamplePreviewOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              View Sample Listings
            </Button>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">My Properties</p>
                  <p className="text-2xl font-bold">{stats.totalProjects}</p>
                </div>
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Verified</p>
                  <p className="text-2xl font-bold">{stats.verifiedProjects}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Units (BHK)</p>
                  <p className="text-2xl font-bold">{stats.totalUnits}</p>
                </div>
                <Home className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-bold">{stats.totalViews}</p>
                </div>
                <Eye className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - Consistent Card Sizes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Visit Approvals */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-all border border-border hover:border-orange-500/40 group h-full"
              onClick={() => navigate("/builder-visits")}
            >
              <CardContent className="p-6 text-center flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                    <CalendarCheck className="h-6 w-6 text-orange-500" />
                  </div>
                  {stats.pendingVisits > 0 && (
                    <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center">
                      {stats.pendingVisits}
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-sm">Visit Approvals</h3>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingVisits > 0 ? `${stats.pendingVisits} pending` : "Review pending visits"}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Add Property */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-all border border-border hover:border-primary/40 group h-full"
              onClick={() => setActiveTab("add-property")}
            >
              <CardContent className="p-6 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">Add Property</h3>
                <p className="text-xs text-muted-foreground">List a new property</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Projects */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-all border border-border hover:border-primary/40 group h-full"
              onClick={() => navigate("/builder/projects")}
            >
              <CardContent className="p-6 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">Projects</h3>
                <p className="text-xs text-muted-foreground">Manage your projects</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Wallet */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-all border border-border hover:border-emerald-500/40 group h-full"
              onClick={() => navigate("/builder/wallet")}
            >
              <CardContent className="p-6 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <Wallet className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-sm">Wallet</h3>
                <p className="text-xs text-emerald-600 font-medium dark:text-emerald-400">
                  ₹{walletBalance.toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions - Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* CRM */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-all border border-border hover:border-blue-500/40 group h-full"
              onClick={() => navigate("/builder/crm")}
            >
              <CardContent className="p-6 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <ClipboardList className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="font-semibold text-sm">CRM</h3>
                <p className="text-xs text-muted-foreground">Manage notes & follow-ups</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Team */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-all border border-border hover:border-purple-500/40 group h-full"
              onClick={() => navigate("/builder/team")}
            >
              <CardContent className="p-6 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <Users className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="font-semibold text-sm">Team</h3>
                <p className="text-xs text-muted-foreground">Manage your team</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-all border border-border hover:border-amber-500/40 group h-full relative"
              onClick={() => navigate("/builder/notifications")}
            >
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </Badge>
              )}
              <CardContent className="p-6 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <Bell className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="font-semibold text-sm">Notifications</h3>
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : "No new notifications"}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Builder Profile */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-all border border-border hover:border-primary/40 group h-full"
              onClick={() => setActiveTab("profile")}
            >
              <CardContent className="p-6 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">My Profile</h3>
                <p className="text-xs text-muted-foreground">View & edit profile</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Badges */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-all border border-border hover:border-emerald-500/40 group h-full"
              onClick={() => navigate("/builder/badges")}
            >
              <CardContent className="p-6 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <Award className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-sm">Badges</h3>
                <p className="text-xs text-muted-foreground">Trust & experience level</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Referrals */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-all border border-border hover:border-pink-500/40 group h-full"
              onClick={() => navigate("/builder/referrals")}
            >
              <CardContent className="p-6 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                  <Gift className="h-6 w-6 text-pink-500" />
                </div>
                <h3 className="font-semibold text-sm">Referrals</h3>
                <p className="text-xs text-muted-foreground">Programs & commissions</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Hotels */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-all border border-border hover:border-amber-500/40 group h-full"
              onClick={() => navigate("/builder/hotels")}
            >
              <CardContent className="p-6 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                  <Hotel className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="font-semibold text-sm">Hotels</h3>
                <p className="text-xs text-muted-foreground">Stays for site visits</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Financial */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-all border border-border hover:border-indigo-500/40 group h-full"
              onClick={() => navigate("/builder/financial")}
            >
              <CardContent className="p-6 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                  <Banknote className="h-6 w-6 text-indigo-500" />
                </div>
                <h3 className="font-semibold text-sm">Financial</h3>
                <p className="text-xs text-muted-foreground">Loan enquiries & EMI</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Locations */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-all border border-border hover:border-emerald-500/40 group h-full"
              onClick={() => navigate("/builder/locations")}
            >
              <CardContent className="p-6 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <MapPin className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-sm">Locations</h3>
                <p className="text-xs text-muted-foreground">Preferred & recommended areas</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Success Score */}
          <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
            <Card
              className="cursor-pointer hover:shadow-lg transition-all border border-border hover:border-yellow-500/40 group h-full"
              onClick={() => navigate("/builder/success-score")}
            >
              <CardContent className="p-6 text-center flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                </div>
                <h3 className="font-semibold text-sm">Success Score</h3>
                <p className="text-xs text-muted-foreground">Performance metrics</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile">My Profile</TabsTrigger>
            <TabsTrigger value="properties">My Properties</TabsTrigger>
            <TabsTrigger value="add-property">Add Property</TabsTrigger>
            <TabsTrigger value="projects">My Projects</TabsTrigger>
            <TabsTrigger value="verification">RERA Status</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* My Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Suspense fallback={<ListSkeleton rows={4} />}>
              <BuilderMyProfileCard />
            </Suspense>
          </TabsContent>

          {/* My Properties Tab */}
          <TabsContent value="properties" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Properties</CardTitle>
                <CardDescription>Properties you've submitted for verification</CardDescription>
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <div className="text-center py-12">
                    <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Add your first property or preview sample listings to see the format
                    </p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <Button onClick={() => setActiveTab("add-property")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Property
                      </Button>
                      <Button variant="outline" onClick={() => setSamplePreviewOpen(true)}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        View Sample Listings
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property) => (
                      <motion.div
                        key={property.id}
                        whileHover={{ y: -5 }}
                        className="cursor-pointer"
                        onClick={() => navigate(`/property/${property.id}`)}
                      >
                        <Card className="overflow-hidden h-full hover:shadow-xl transition-all">
                          <div className="relative">
                            {property.images?.[0] ? (
                              <img
                                src={property.images[0]}
                                alt={property.title}
                                className="w-full h-48 object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="w-full h-48 flex flex-col items-center justify-center bg-muted/40 border-b border-dashed">
                                <Building2 className="h-8 w-8 text-muted-foreground/60 mb-1" />
                                <p className="text-xs font-medium text-muted-foreground">No image uploaded</p>
                              </div>
                            )}
                            {property.verification_status === "approved" && property.verified ? (
                              <Badge className="absolute top-2 right-2 bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approved
                              </Badge>
                            ) : property.verification_status === "rejected" ? (
                              <Badge className="absolute top-2 right-2 bg-red-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Rejected
                              </Badge>
                            ) : (
                              <Badge className="absolute top-2 right-2 bg-orange-500">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-lg mb-1 line-clamp-1">{property.title}</h3>
                            <div className="flex items-center text-sm text-muted-foreground mb-2">
                              <MapPin className="h-3 w-3 mr-1" />
                              {property.locality}, {property.city}
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">Price</p>
                                <p className="font-bold text-primary">₹{(property.price / 10000000).toFixed(2)} Cr</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Config</p>
                                <p className="font-semibold">{property.bhk} BHK</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Area</p>
                                <p className="font-semibold">{property.area_sqft} sq.ft</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add Property Tab */}
          <TabsContent value="add-property" className="space-y-6">
            <LazyMount fallback={<ListSkeleton rows={6} />} minHeight={500}>
              <Suspense fallback={<ListSkeleton rows={6} />}>
                <PropertyUploadForm
                  onSuccess={() => {
                    fetchProjects();
                    fetchProperties();
                  }}
                />
              </Suspense>
            </LazyMount>
          </TabsContent>

          {/* Projects */}
          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Projects</CardTitle>
                    <CardDescription>Manage and track your real estate projects</CardDescription>
                  </div>
                  <Button onClick={() => navigate("/builder/add-project")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Project
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Launch your first real estate project — set name, location, units, pricing, RERA & media in one
                      flow.
                    </p>
                    <Button onClick={() => navigate("/builder/add-project")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Project
                    </Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                      <motion.div
                        key={project.id}
                        whileHover={{ y: -5 }}
                        className="cursor-pointer"
                        onClick={() => navigate(`/project/${project.id}`)}
                      >
                        <Card className="overflow-hidden h-full hover:shadow-xl transition-all">
                          <div className="relative">
                            {project.image ? (
                              <img
                                src={project.image}
                                alt={project.name}
                                className="w-full h-48 object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="w-full h-48 flex flex-col items-center justify-center bg-muted/40 border-b border-dashed">
                                <Building2 className="h-8 w-8 text-muted-foreground/60 mb-1" />
                                <p className="text-xs font-medium text-muted-foreground">No image uploaded</p>
                              </div>
                            )}
                            {project.verified ? (
                              <Badge className="absolute top-2 right-2 bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                RERA Verified
                              </Badge>
                            ) : (
                              <Badge className="absolute top-2 right-2 bg-orange-500">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2 flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {project.locality}, {project.city}
                            </p>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">Avg. Price</p>
                                <p className="font-semibold text-primary">{formatPrice(project.avg_price)}</p>
                              </div>
                              {project.rera_id && (
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">RERA ID</p>
                                  <p className="text-xs font-mono">{project.rera_id}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RERA Verification */}
          <TabsContent value="verification">
            <Suspense fallback={<ListSkeleton rows={4} />}>
              <BuilderRERAStatus onUpload={() => setReraModalOpen(true)} />
            </Suspense>
          </TabsContent>

          {/* Inventory */}
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Project Inventory</CardTitle>
                <CardDescription>Manage units across all projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Inventory Management</h3>
                  <p className="text-muted-foreground">Track available units and floor plans</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance */}
          <TabsContent value="performance">
            <LazyMount fallback={<ChartSkeleton />} minHeight={400}>
              <Suspense fallback={<ChartSkeleton />}>
                <BuilderAnalyticsPanel />
              </Suspense>
            </LazyMount>
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      AI Project Forecast
                    </CardTitle>
                    <CardDescription>AI-powered growth predictions for {selectedProject?.name}</CardDescription>
                  </div>
                  {projects.length > 1 && (
                    <select
                      className="border rounded px-3 py-2"
                      onChange={(e) => {
                        const proj = projects.find((p) => p.id === e.target.value);
                        if (proj) fetchProjectForecast(proj);
                      }}
                      value={selectedProject?.id}
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingForecast ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : forecast ? (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Demand Score</p>
                        <p className="text-3xl font-bold text-primary">{forecast.demandScore}/100</p>
                        <Badge
                          className={
                            forecast.riskLevel === "low"
                              ? "bg-green-600 mt-2"
                              : forecast.riskLevel === "medium"
                                ? "bg-orange-500 mt-2"
                                : "bg-red-500 mt-2"
                          }
                        >
                          {forecast.riskLevel} risk
                        </Badge>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Sales Velocity</p>
                        <p className="text-3xl font-bold">{forecast.salesVelocity?.predicted || 0} units/mo</p>
                        <p className="text-sm text-green-600 mt-2">{forecast.salesVelocity?.trend}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">3-Year Appreciation</p>
                        <p className="text-3xl font-bold text-green-600">{forecast.appreciation?.year3 || 0}%</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Y1: {forecast.appreciation?.year1}%, Y2: {forecast.appreciation?.year2}%
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Success Factors
                        </h4>
                        <ul className="space-y-2">
                          {forecast.successFactors?.map((factor: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-green-600">•</span>
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-primary" />
                          AI Recommendations
                        </h4>
                        <ul className="space-y-2">
                          {forecast.recommendations?.map((rec: string, i: number) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-primary">→</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Select a project to see AI forecasts</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        {reraModalOpen && (
          <Suspense fallback={null}>
            <RERAUploadModal
              open={reraModalOpen}
              onOpenChange={setReraModalOpen}
              projects={projects}
              onSuccess={() => {
                fetchProjects();
                toast.success("RERA document submitted for verification");
              }}
            />
          </Suspense>
        )}

        {docsModalOpen && (
          <Suspense fallback={null}>
            <DocumentationModal open={docsModalOpen} onOpenChange={setDocsModalOpen} />
          </Suspense>
        )}

        {samplePreviewOpen && (
          <Suspense fallback={null}>
            <SamplePropertiesPreviewDialog open={samplePreviewOpen} onOpenChange={setSamplePreviewOpen} />
          </Suspense>
        )}
      </div>
    </div>
  );
};




