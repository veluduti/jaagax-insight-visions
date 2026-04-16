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
import { motion } from "framer-motion";

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

  const checkAdminAndLoad = async () => {
    try {
      // Skip auth check - allow direct access to admin dashboard
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
    ] = await Promise.all([
      supabase.from("properties").select("*", { count: "exact", head: true }),
      supabase.from("projects").select("*", { count: "exact", head: true }),
      supabase.from("agents").select("*", { count: "exact", head: true }),
      supabase.from("visit_bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("signup_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("builder_profiles").select("*", { count: "exact", head: true }),
    ]);
    setStats({
      totalProperties: propertiesCount || 0,
      totalProjects: projectsCount || 0,
      totalAgents: agentsCount || 0,
      pendingVisits: pendingVisitsCount || 0,
      pendingSignups: pendingSignupsCount || 0,
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
      .select("*")
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
      .select("id, title, city, locality, price, verified, type, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setProperties(data || []);
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
            { label: "Pending Signups", value: stats.pendingSignups, icon: AlertCircle, color: "text-orange-500" },
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
            <TabsTrigger value="signups" className="relative">
              Signup Requests
              {stats.pendingSignups > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5">{stats.pendingSignups}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="visits">Visits</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="builders">Builders</TabsTrigger>
          </TabsList>

          {/* === SIGNUP REQUESTS === */}
          <TabsContent value="signups" className="space-y-4">
            {/* Pending */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-500">
                  <AlertCircle className="h-5 w-5" />
                  Pending Requests ({pendingRequests.length})
                </CardTitle>
                <CardDescription>Approve or reject new user registrations</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No pending requests 🎉</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.full_name || "N/A"}</TableCell>
                          <TableCell>{req.email}</TableCell>
                          <TableCell>{req.phone || "N/A"}</TableCell>
                          <TableCell><Badge variant="outline">{req.requested_role}</Badge></TableCell>
                          <TableCell>{req.city || "N/A"}</TableCell>
                          <TableCell className="text-xs">{new Date(req.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleReviewSignup(req.id, "approved")}
                                disabled={reviewingId === req.id}
                              >
                                {reviewingId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReviewSignup(req.id, "rejected", "Not eligible")}
                                disabled={reviewingId === req.id}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Approved & Rejected */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-500 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Approved ({approvedRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-60 overflow-auto">
                  {approvedRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">None yet</p>
                  ) : (
                    <div className="space-y-2">
                      {approvedRequests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-2 border rounded text-sm">
                          <div>
                            <p className="font-medium">{req.full_name || req.email}</p>
                            <p className="text-xs text-muted-foreground">{req.requested_role} • {req.city || "N/A"}</p>
                          </div>
                          <Badge variant="default">Approved</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Rejected ({rejectedRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-60 overflow-auto">
                  {rejectedRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">None yet</p>
                  ) : (
                    <div className="space-y-2">
                      {rejectedRequests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-2 border rounded text-sm">
                          <div>
                            <p className="font-medium">{req.full_name || req.email}</p>
                            <p className="text-xs text-muted-foreground">{req.rejection_reason}</p>
                          </div>
                          <Badge variant="destructive">Rejected</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visitBookings.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.buyer_name || "N/A"}</TableCell>
                          <TableCell>{b.buyer_phone || "N/A"}</TableCell>
                          <TableCell>{b.city || ""}{b.locality ? `, ${b.locality}` : ""}</TableCell>
                          <TableCell>{b.visit_date}</TableCell>
                          <TableCell>{b.visit_time || "TBD"}</TableCell>
                          <TableCell>
                            <Badge variant={b.status === "confirmed" ? "default" : b.status === "pending" ? "secondary" : "destructive"}>
                              {b.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
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
          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-blue-500" />
                  Properties ({properties.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {properties.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No properties</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Locality</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Verified</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {properties.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                          <TableCell>{p.city}</TableCell>
                          <TableCell>{p.locality}</TableCell>
                          <TableCell>₹{Number(p.price).toLocaleString("en-IN")}</TableCell>
                          <TableCell>{p.type || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={p.verified ? "default" : "secondary"}>{p.verified ? "Yes" : "No"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
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
