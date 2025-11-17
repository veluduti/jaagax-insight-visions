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
import { Calendar, MapPin, User, Phone, Clock, Navigation as NavigationIcon } from "lucide-react";
import { format } from "date-fns";

interface VisitBooking {
  id: string;
  visit_date: string;
  visit_time: string;
  status: string;
  user_name: string;
  user_phone: string;
  user_email: string;
  pickup_location: any;
  property_id: number;
  travel_mode: string;
  special_requests: string;
  properties?: {
    title: string;
    locality: string;
    city: string;
  };
}

const AgentVisitsDashboard = () => {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<VisitBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("upcoming");

  useEffect(() => {
    fetchAgentVisits();
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

      if (filter === "upcoming") {
        query = query.in("status", ["confirmed", "agent_pending", "builder_pending"]);
      } else if (filter === "completed") {
        query = query.in("status", ["completed", "cancelled"]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error("Error fetching visits:", error);
      toast.error("Failed to load visits");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: "bg-primary text-primary-foreground",
      agent_pending: "bg-yellow-500 text-white",
      builder_pending: "bg-orange-500 text-white",
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
          <div className="flex gap-3 mb-6">
            <Button
              variant={filter === "upcoming" ? "default" : "outline"}
              onClick={() => setFilter("upcoming")}
            >
              Upcoming Visits
            </Button>
            <Button
              variant={filter === "completed" ? "default" : "outline"}
              onClick={() => setFilter("completed")}
            >
              Completed
            </Button>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              All Visits
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/visit/live/${visit.id}`)}
                      >
                        View Details
                      </Button>
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
                          <div className="text-sm font-medium">{visit.user_name}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" />
                        <div>
                          <div className="text-xs text-muted-foreground">Contact</div>
                          <div className="text-sm font-medium">{visit.user_phone || "N/A"}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <NavigationIcon className="w-4 h-4 text-primary" />
                        <div>
                          <div className="text-xs text-muted-foreground">Travel Mode</div>
                          <div className="text-sm font-medium capitalize">
                            {visit.travel_mode || "Self"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {visit.special_requests && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Special Requests</div>
                        <div className="text-sm">{visit.special_requests}</div>
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
