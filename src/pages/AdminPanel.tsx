import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Shield, CheckCircle, LogOut, Users, Building2, Home, AlertCircle,
  CalendarCheck, MapPin, Phone, Loader2, XCircle, Eye, BarChart3,
  Sparkles, RefreshCw, Mail
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
import { motion } from "framer-motion";
import { useRealtimeTableSubscription } from "@/hooks/useRealtimeTableSubscription";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [activeTab, setActiveTab] = useState("signups");

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
    const { data } = await supabase
      .from("signup_requests")
      .select("*")
      .order("created_at", { ascending: false });
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
    const { data } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });
    setAgents(data || []);
  };

  const fetchProperties = async () => {
    const { data } = await supabase
      .from("properties")
      .select("id, title, city, locality, price, verified, type, created_at, verification_status, rera_id, rera_document_url, submitted_by, bhk, area_sqft, document_urls, listing_type, images")
      .order("created_at", { ascending: false })
      .limit(200);
    setProperties(data || []);
  };

  const handleReviewProperty = async (propertyId: string, decision: "approved" | "rejected") => {
    let reason: string | null = null;
    if (decision === "rejected") {
      const raw = window.prompt("Reason for rejection (mandatory, visible to submitter):", "Listing details need clarification");
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
        // On approval: flip listing live and stamp publish time so it appears in search/feeds
        ...(decision === "approved"
          ? { is_live: true, published_at: nowIso }
          : { is_live: false }),
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

      // Optimistic local update so the row instantly reflects the new status
      setProperties((prev) =>
        prev.map((p) => (p.id === propertyId ? { ...p, ...data[0] } : p))
      );

      // Notify the builder who submitted
      const prop = properties.find((p) => p.id === propertyId);
      if (prop?.submitted_by) {
        await supabase.from("notifications").insert({
          user_id: prop.submitted_by,
          type: decision === "approved" ? "property_approved" : "property_rejected",
          title: decision === "approved" ? "Property Verified ✅" : "Property Rejected",
          message: decision === "approved"
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

  const fetchBuilders = async () => {
    const { data } = await supabase
      .from("builder_profiles")
      .select("id, builder_name, type, phone, email, operating_cities, created_at")
      .order("created_at", { ascending: false });
    setBuilders(data || []);
  };

  const handleReviewSignup = async (requestId: string, decision: "approved" | "rejected", reason?: string) => {
    setReviewingId(requestId);
    try {
      const request = signupRequests.find(r => r.id === requestId);
      if (!request) throw new Error("Request not found");

      // Update the signup request status
      const { error: updateError } = await supabase
        .from("signup_requests")
        .update({
          status: decision,
          rejection_reason: decision === "rejected" ? (reason || null) : null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      if (updateError) throw updateError;

      // If approved, assign the user role
      if (decision === "approved") {
        const roleToAssign = request.requested_role === "buyer" ? "customer" : request.requested_role;
        const { error: roleError } = await supabase.rpc("assign_user_role", {
          _user_id: request.user_id,
          _role: roleToAssign,
        });
        if (roleError && !roleError.message?.includes("duplicate")) throw roleError;

        // Auto-create agent profile if role is agent
        if (request.requested_role === "agent") {
          await supabase.from("agents").upsert({
            user_id: request.user_id,
            name: request.full_name || "Agent",
            email: request.email,
            phone: request.phone || "0000000000",
            cities_served: request.city || "Hyderabad",
            verified: true,
            trust_score: 75,
          }, { onConflict: "user_id" });
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

  const pendingRequests = signupRequests.filter(r => r.status === "pending");
  const approvedRequests = signupRequests.filter(r => r.status === "approved");
  const rejectedRequests = signupRequests.filter(r => r.status === "rejected");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />

      {/* Sticky Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Admin Control Panel
            </h1>
            <p className="text-sm text-muted-foreground">Manage users, properties, agents & platform</p>
          </div>
          <div className="flex items-center gap-2">
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
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Properties", value: stats.totalProperties, icon: Home, color: "text-blue-500" },
            { label: "Projects", value: stats.totalProjects, icon: Building2, color: "text-green-500" },
            { label: "Agents", value: stats.totalAgents, icon: Users, color: "text-primary" },
            { label: "Builders", value: stats.totalBuilders, icon: Building2, color: "text-purple-500" },
            { label: "Registered Users", value: signupRequests.length, icon: Users, color: "text-orange-500" },
            { label: "Pending Visits", value: stats.pendingVisits, icon: CalendarCheck, color: "text-amber-500" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="signups">Registered Users</TabsTrigger>
            <TabsTrigger value="visits">Visits</TabsTrigger>
            <TabsTrigger value="bookings">Hotel Bookings</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="agent-verified" className="relative">
              Agent-Verified
            </TabsTrigger>
            <TabsTrigger value="properties" className="relative">
              Properties
              {stats.pendingProperties > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5">{stats.pendingProperties}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="builders">Builders</TabsTrigger>
            <TabsTrigger value="projects-review">Projects</TabsTrigger>
            <TabsTrigger value="hotel-partners">Hotel Partners</TabsTrigger>
            <TabsTrigger value="weekend">Weekend Explorer</TabsTrigger>
            <TabsTrigger value="quick-visits">Quick Visits</TabsTrigger>
            <TabsTrigger value="rera">RERA Verifications</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="all-listings">All Listings</TabsTrigger>
            <TabsTrigger value="kyc">KYC</TabsTrigger>
          </TabsList>

          <TabsContent value="kyc" className="mt-4">
            <KYCReviewQueue />
          </TabsContent>

          <TabsContent value="agent-verified" className="mt-4">
            <AgentVerifiedReviewPanel />
          </TabsContent>

          <TabsContent value="all-listings" className="mt-4">
            <AllListingsPanel />
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <ReportedListingsPanel />
          </TabsContent>

          <TabsContent value="projects-review" className="mt-4">
            <VerificationPanel />
          </TabsContent>

          <TabsContent value="rera">
            <RERAVerificationPanel />
          </TabsContent>

          <TabsContent value="documents">
            <PropertyDocumentsPanel />
          </TabsContent>

          <TabsContent value="hotel-partners">
            <HotelPartnersPanel />
          </TabsContent>

          <TabsContent value="weekend">
            <Card>
              <CardContent className="p-4 md:p-6">
                <WeekendBookingsList scope="admin" kind="weekend" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quick-visits">
            <Card>
              <CardContent className="p-4 md:p-6">
                <WeekendBookingsList scope="admin" kind="quick_visit" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* === REGISTERED USERS === */}
          <TabsContent value="signups" className="space-y-4">
            <RegisteredUsersPanel />
          </TabsContent>

          {/* === VISIT BOOKINGS === */}
          <TabsContent value="visits">
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
                        const isApproved = b.agent_id && ["confirmed", "pending_builder", "completed"].includes(b.status);
                        return (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium">{b.buyer_name || "N/A"}</TableCell>
                            <TableCell>{b.buyer_phone || "N/A"}</TableCell>
                            <TableCell>{b.city || ""}{b.locality ? `, ${b.locality}` : ""}</TableCell>
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
                              <Badge variant={b.status === "confirmed" ? "default" : b.status === "pending" ? "secondary" : "destructive"}>
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

          {/* === HOTEL BOOKINGS === */}
          <TabsContent value="bookings">
            <BookingsPanel />
          </TabsContent>

          {/* === AGENTS === */}
          <TabsContent value="agents">
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
                          <TableCell>{typeof a.cities_served === "string" ? a.cities_served : Array.isArray(a.cities_served) ? a.cities_served.join(", ") : "N/A"}</TableCell>
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

          {/* === PROPERTIES === */}
          <TabsContent value="properties" className="space-y-4">
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
                        Seller listings → pick a nearby agent to assign + approve. Agent listings → just approve (the listing agent is already assigned).
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AssignAgentPanel />
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

          {/* === BUILDERS === */}
          <TabsContent value="builders">
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
                          <TableCell><Badge variant="outline">{b.type}</Badge></TableCell>
                          <TableCell>{b.phone}</TableCell>
                          <TableCell>{b.email || "N/A"}</TableCell>
                          <TableCell>{Array.isArray(b.operating_cities) ? b.operating_cities.join(", ") : "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
