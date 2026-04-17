import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Calendar, MapPin, User, Phone, Clock, Navigation as NavigationIcon, CheckCircle, XCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

interface VisitBooking {
  id: string;
  visit_date: string;
  visit_time: string;
  status: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  notes: string | null;
  property_id: string | null;
  properties?: {
    title: string;
    locality: string | null;
    city: string | null;
  } | null;
}

const AgentVisitsDashboard = () => {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<VisitBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "upcoming" | "completed">("pending");
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchAgentVisits();
    
    // Subscribe to real-time updates for agent visits
    const channel = supabase
      .channel('agent-visit-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visit_bookings'
        },
        (payload) => {
          console.log('Agent visit updated:', payload);
          toast.info('Visit schedule updated');
          fetchAgentVisits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const fetchAgentVisits = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get agent ID from agents table
      const { data: agentData } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!agentData) {
        toast.error("Agent profile not found");
        return;
      }

      let query = supabase
        .from("visit_bookings")
        .select(`
          *,
          properties (
            title,
            locality,
            city
          )
        `)
        .eq("agent_id", agentData.id)
        .order("visit_date", { ascending: true })
        .order("visit_time", { ascending: true });

      if (filter === "pending") {
        query = query.eq("status", "pending_agent");
      } else if (filter === "upcoming") {
        query = query.in("status", ["confirmed", "pending_builder", "in_progress"]);
      } else if (filter === "completed") {
        query = query.in("status", ["completed", "cancelled"]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVisits((data || []) as VisitBooking[]);
    } catch (error) {
      console.error("Error fetching visits:", error);
      toast.error("Failed to load visits");
    } finally {
      setLoading(false);
    }
  };

  const handleAgentDecision = async (bookingId: string, approved: boolean) => {
    if (!approved && !rejectReason.trim()) {
      toast.error("Please provide a reason for declining");
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke("agent-confirm-visit", {
        body: { bookingId, approved, notes: actionNotes, rejectionReason: rejectReason },
      });
      if (error) throw error;
      toast.success(approved ? "Visit confirmed! Buyer & builder notified." : "Visit declined. Buyer notified.");
      setActionId(null);
      setActionNotes("");
      setRejectReason("");
      fetchAgentVisits();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update visit");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: "bg-primary text-primary-foreground",
      pending_agent: "bg-yellow-500 text-white",
      pending_builder: "bg-orange-500 text-white",
      in_progress: "bg-blue-500 text-white",
      completed: "bg-green-500 text-white",
      cancelled: "bg-destructive text-destructive-foreground",
    };
    return colors[status] || "bg-muted";
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "MMM dd, yyyy");
    } catch {
      return date;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-24 pb-16">
        <div className="container-padding max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4 text-gradient">My Visit Schedule</h1>
            <p className="text-muted-foreground">
              Manage your assigned property visits and track progress
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
              Pending My Confirmation
            </Button>
            <Button variant={filter === "upcoming" ? "default" : "outline"} onClick={() => setFilter("upcoming")}>
              Upcoming
            </Button>
            <Button variant={filter === "completed" ? "default" : "outline"} onClick={() => setFilter("completed")}>
              Completed
            </Button>
            <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
              All
            </Button>
          </div>

          {/* Visits List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : visits.length === 0 ? (
            <Card className="glass-card p-12 text-center">
              <p className="text-muted-foreground mb-4">No visits found</p>
              <Button onClick={() => navigate("/dashboard/agent")}>
                Back to Dashboard
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {visits.map((visit) => (
                <Card key={visit.id} className="glass-card hover:scale-[1.01] transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {visit.properties?.title || "Property Visit"}
                          <Badge className={getStatusColor(visit.status)}>
                            {visit.status.replace(/_/g, " ").toUpperCase()}
                          </Badge>
                        </CardTitle>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                          <MapPin className="w-4 h-4" />
                          {visit.properties?.locality}, {visit.properties?.city}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/visit/live/${visit.id}`)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/visit/live/${visit.id}`);
                            toast.success("Tracking link copied!");
                          }}
                        >
                          Copy Link
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <div>
                          <div className="text-xs text-muted-foreground">Date & Time</div>
                          <div className="text-sm font-medium">
                            {formatDate(visit.visit_date)} at {visit.visit_time}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <div>
                          <div className="text-xs text-muted-foreground">Client</div>
                          <div className="text-sm font-medium">{visit.buyer_name || "N/A"}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" />
                        <div>
                          <div className="text-xs text-muted-foreground">Contact</div>
                          <div className="text-sm font-medium">{visit.buyer_phone || "N/A"}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <NavigationIcon className="w-4 h-4 text-primary" />
                        <div>
                          <div className="text-xs text-muted-foreground">Email</div>
                          <div className="text-sm font-medium">
                            {visit.buyer_email || "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {visit.notes && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Notes</div>
                        <div className="text-sm">{visit.notes}</div>
                      </div>
                    )}

                    {visit.status === "confirmed" && (
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="default"
                          className="flex-1"
                          onClick={() => navigate(`/agent/location/${visit.id}`)}
                        >
                          Start Visit
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/visit/live/${visit.id}`)}
                        >
                          Track Live
                        </Button>
                      </div>
                    )}

                    {visit.status === "in_progress" && (
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="default"
                          className="flex-1"
                          onClick={() => navigate(`/agent/visit/story/${visit.id}`)}
                        >
                          📸 Share Story
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/visit/live/${visit.id}`)}
                        >
                          View Live
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AgentVisitsDashboard;
