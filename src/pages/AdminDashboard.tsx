import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  Shield, CheckCircle, BarChart3, Settings, LogOut, Users,
  Building2, Home, TrendingUp, AlertCircle, Eye, Star, Calendar, MessageSquare,
  Activity, CalendarCheck, MapPin, Phone, Loader2
} from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";
import VerificationPanel from "@/components/admin/VerificationPanel";
import { DataImportPanel } from "@/components/admin/DataImportPanel";
import { FakeListingManager } from "@/components/admin/FakeListingManager";
import { DatabaseCleanup } from "@/components/admin/DatabaseCleanup";
import { EnrichProjectsPanel } from "@/components/admin/EnrichProjectsPanel";
import { LeadsCRMPanel } from "@/components/admin/LeadsCRMPanel";
import { EventModerationPanel } from "@/components/admin/EventModerationPanel";
import { FetchCommunityEvents } from "@/components/admin/FetchCommunityEvents";
import { WhatsAppLogsPanel } from "@/components/admin/WhatsAppLogsPanel";
import RegisteredUsersPanel from "@/components/admin/RegisteredUsersPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProperties: 0,
    totalProjects: 0,
    verificationsPending: 0,
    totalAgents: 0,
    pendingVisits: 0,
    pendingSignups: 0,
  });
  const [visitBookings, setVisitBookings] = useState<any[]>([]);
  const [signupRequests, setSignupRequests] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [trustAnalysis, setTrustAnalysis] = useState<any>(null);
  const [loadingTrust, setLoadingTrust] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [viewingSignup, setViewingSignup] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
    fetchStats();
    fetchVisitBookings();
    fetchSignupRequests();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchStats = async () => {
    const [
      { count: propertiesCount },
      { count: projectsCount },
      { count: agentsCount },
      { count: pendingVisitsCount },
      { count: pendingSignupsCount }
    ] = await Promise.all([
      supabase.from("properties").select("*", { count: 'exact', head: true }),
      supabase.from("projects").select("*", { count: 'exact', head: true }),
      supabase.from("agents").select("*", { count: 'exact', head: true }),
      supabase.from("visit_bookings").select("*", { count: 'exact', head: true }).eq("status", "pending"),
      supabase.from("signup_requests").select("*", { count: 'exact', head: true }).eq("status", "pending")
    ]);

    setStats({
      totalUsers: 0,
      totalProperties: propertiesCount || 0,
      totalProjects: projectsCount || 0,
      verificationsPending: 0,
      totalAgents: agentsCount || 0,
      pendingVisits: pendingVisitsCount || 0,
      pendingSignups: pendingSignupsCount || 0,
    });
  };

  const fetchSignupRequests = async () => {
    const { data } = await supabase
      .from("signup_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setSignupRequests(data || []);
  };

  const handleReviewSignup = async (requestId: string, decision: "approved" | "rejected", reason?: string) => {
    setReviewingId(requestId);
    try {
      const { error } = await supabase.rpc("review_signup_request", {
        _request_id: requestId,
        _decision: decision,
        _rejection_reason: reason || null,
      });
      if (error) throw error;
      toast.success(`Signup request ${decision}`);
      fetchSignupRequests();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || "Failed to review request");
    } finally {
      setReviewingId(null);
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

  const runTrustAnalysis = async (entityType: string, entityId: number) => {
    setLoadingTrust(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-trust-engine', {
        body: { entityType, entityId }
      });

      if (error) throw error;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Control Panel</h1>
              <p className="text-muted-foreground">Platform intelligence & management</p>
            </div>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Properties</p>
                    <p className="text-2xl font-bold">{stats.totalProperties}</p>
                  </div>
                  <Home className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Projects</p>
                    <p className="text-2xl font-bold">{stats.totalProjects}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{stats.verificationsPending}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
          {/* Agent & Visit Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Agents</p>
                    <p className="text-2xl font-bold">{stats.totalAgents}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Visits</p>
                    <p className="text-2xl font-bold">{stats.pendingVisits}</p>
                  </div>
                  <CalendarCheck className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex flex-wrap w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Registered Users</TabsTrigger>
            <TabsTrigger value="visits">Visit Bookings</TabsTrigger>
            <TabsTrigger value="frm">FRM</TabsTrigger>
            <TabsTrigger value="verification">Verifications</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="trust">Trust Engine</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate("/agents")}>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold">Verify Properties</h3>
                  <p className="text-sm text-muted-foreground mt-1">Review pending listings</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-all">
                <CardContent className="p-6 text-center">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold">RERA Control</h3>
                  <p className="text-sm text-muted-foreground mt-1">Approve builder docs</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate("/transactions")}>
                <CardContent className="p-6 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold">Market Trends</h3>
                  <p className="text-sm text-muted-foreground mt-1">View analytics</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-all">
                <CardContent className="p-6 text-center">
                  <Settings className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold">Settings</h3>
                  <p className="text-sm text-muted-foreground mt-1">Configure platform</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Registered Users (replaces Signup Requests + Role Approvals) */}
          <TabsContent value="users" className="space-y-6">
            <RegisteredUsersPanel />
          </TabsContent>

          <TabsContent value="visits" className="space-y-6">
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
                    {visitBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium">{booking.buyer_name || 'Unknown Buyer'}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{booking.buyer_phone || 'N/A'}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{booking.city || 'N/A'}, {booking.locality || ''}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            📅 {booking.visit_date} • 🕒 {booking.visit_time || 'TBD'}
                          </p>
                        </div>
                        <Badge variant={
                          booking.status === 'confirmed' ? 'default' :
                          booking.status === 'pending' ? 'secondary' :
                          booking.status === 'completed' ? 'outline' : 'destructive'
                        }>
                          {booking.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="frm" className="space-y-6">
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
                  <Button onClick={() => navigate("/dashboard/admin/frm")}>
                    Open Full Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verifications */}
          <TabsContent value="verification" className="space-y-6">
            <FetchCommunityEvents />
            <LeadsCRMPanel />
            <EnrichProjectsPanel />
            <DataImportPanel />
            <DatabaseCleanup />
            <FakeListingManager />
            <VerificationPanel />
          </TabsContent>

          {/* Events Moderation */}
          <TabsContent value="events" className="space-y-6">
            <EventModerationPanel />
          </TabsContent>

          {/* WhatsApp Logs */}
          <TabsContent value="whatsapp" className="space-y-6">
            <WhatsAppLogsPanel />
          </TabsContent>

          {/* AI Trust Engine */}
          <TabsContent value="trust">
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
                  <div className="flex gap-4">
                    <select className="border rounded px-3 py-2 flex-1" onChange={(e) => setSelectedEntity(JSON.parse(e.target.value))}>
                      <option value="">Select entity type</option>
                      <option value='{"type":"property","id":1}'>Property #1</option>
                      <option value='{"type":"project","id":1}'>Project #1</option>
                      <option value='{"type":"agent","id":1}'>Agent #1</option>
                    </select>
                    <Button 
                      onClick={() => selectedEntity && runTrustAnalysis(selectedEntity.type, selectedEntity.id)}
                      disabled={!selectedEntity || loadingTrust}
                    >
                      {loadingTrust ? "Analyzing..." : "Run Analysis"}
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
                        <Badge className={
                          trustAnalysis.grade?.startsWith('A') ? 'bg-green-600' :
                          trustAnalysis.grade?.startsWith('B') ? 'bg-blue-500' : 'bg-orange-500'
                        }>
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

          {/* Analytics */}
          <TabsContent value="analytics">
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
                    <p className="text-sm text-green-600 mt-2">+18% this month</p>
                  </div>

                  <div className="p-6 bg-green-500/10 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
                    <p className="text-sm text-muted-foreground">Active Listings</p>
                    <p className="text-3xl font-bold">{stats.totalProperties}</p>
                    <p className="text-sm text-green-600 mt-2">Growing</p>
                  </div>

                  <div className="p-6 bg-blue-500/10 rounded-lg">
                    <Users className="h-8 w-8 text-blue-500 mb-2" />
                    <p className="text-sm text-muted-foreground">Active Users</p>
                    <p className="text-3xl font-bold">{stats.totalUsers}</p>
                    <p className="text-sm text-blue-600 mt-2">Last 30 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}

