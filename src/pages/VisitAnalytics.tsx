import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Star, 
  TrendingUp, 
  MapPin, 
  Users,
  Eye,
  ThumbsUp,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";

interface VisitStats {
  total: number;
  completed: number;
  avgRating: number;
  topProperty: string | null;
}

interface Visit {
  id: string;
  visit_date: string;
  visit_time: string;
  status: string;
  completed_at: string | null;
  properties: {
    title: string;
    locality: string;
    city: string;
  } | null;
  visit_feedback: {
    rating: number;
    property_rating: number;
    agent_rating: number;
    service_rating: number;
    feedback: string;
    photo_urls: string[];
  }[];
}

const VisitAnalytics = () => {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [stats, setStats] = useState<VisitStats>({
    total: 0,
    completed: 0,
    avgRating: 0,
    topProperty: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVisitData();
  }, []);

  const fetchVisitData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch all visits with feedback
      const { data, error } = await supabase
        .from("visit_bookings")
        .select(`
          *,
          properties (title, locality, city),
          visit_feedback (rating, property_rating, agent_rating, service_rating, feedback, photo_urls)
        `)
        .eq("user_id", user.id)
        .order("visit_date", { ascending: false });

      if (error) throw error;

      setVisits(data || []);

      // Calculate stats
      const completed = data?.filter(v => v.status === 'completed').length || 0;
      const withFeedback = data?.filter(v => v.visit_feedback && v.visit_feedback.length > 0) || [];
      const avgRating = withFeedback.length > 0
        ? withFeedback.reduce((sum, v) => sum + (v.visit_feedback[0]?.rating || 0), 0) / withFeedback.length
        : 0;

      // Find most visited property
      const propertyCounts: Record<string, number> = {};
      data?.forEach(v => {
        if (v.properties?.title) {
          propertyCounts[v.properties.title] = (propertyCounts[v.properties.title] || 0) + 1;
        }
      });
      const topProperty = Object.keys(propertyCounts).reduce((a, b) => 
        propertyCounts[a] > propertyCounts[b] ? a : b, 
        null as string | null
      );

      setStats({
        total: data?.length || 0,
        completed,
        avgRating,
        topProperty
      });

    } catch (error: any) {
      console.error("Error fetching visit data:", error);
      toast.error("Failed to load visit analytics");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      in_progress: "default",
      confirmed: "secondary",
      cancelled: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status.replace('_', ' ').toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading analytics...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Visit Analytics</h1>
          <p className="text-muted-foreground">Track your property visit history and insights</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <ThumbsUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
              <div className="flex mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= Math.round(stats.avgRating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Interest</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold line-clamp-2">{stats.topProperty || "N/A"}</div>
              <p className="text-xs text-muted-foreground">Most visited property</p>
            </CardContent>
          </Card>
        </div>

        {/* Visits List */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Visits ({visits.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
            <TabsTrigger value="with-feedback">With Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {visits.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No visits yet. Start exploring properties!</p>
                  <Button onClick={() => navigate("/map")} className="mt-4">Browse Properties</Button>
                </CardContent>
              </Card>
            ) : (
              visits.map((visit) => (
                <Card key={visit.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{visit.properties?.title || "Property"}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {visit.properties?.locality}, {visit.properties?.city}
                        </CardDescription>
                      </div>
                      {getStatusBadge(visit.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(visit.visit_date).toLocaleDateString()}
                      </span>
                      <span>{visit.visit_time}</span>
                      {visit.completed_at && (
                        <span className="text-green-600">
                          Completed {new Date(visit.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {visit.visit_feedback && visit.visit_feedback.length > 0 && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{visit.visit_feedback[0].rating}/5</span>
                        </div>
                        {visit.visit_feedback[0].feedback && (
                          <p className="text-sm text-muted-foreground mb-3">{visit.visit_feedback[0].feedback}</p>
                        )}
                        {visit.visit_feedback[0].photo_urls && visit.visit_feedback[0].photo_urls.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto">
                            {visit.visit_feedback[0].photo_urls.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Visit photo ${idx + 1}`}
                                className="w-20 h-20 object-cover rounded"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/visit/live/${visit.id}`)}
                      className="mt-4"
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {visits.filter(v => v.status === 'completed').map((visit) => (
              <Card key={visit.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{visit.properties?.title || "Property"}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {visit.properties?.locality}, {visit.properties?.city}
                      </CardDescription>
                    </div>
                    {getStatusBadge(visit.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(visit.visit_date).toLocaleDateString()}
                    </span>
                    {visit.completed_at && (
                      <span className="text-green-600">
                        Completed {new Date(visit.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {visit.visit_feedback && visit.visit_feedback.length > 0 && (
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{visit.visit_feedback[0].rating}/5</span>
                      </div>
                      {visit.visit_feedback[0].feedback && (
                        <p className="text-sm text-muted-foreground">{visit.visit_feedback[0].feedback}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="with-feedback" className="space-y-4">
            {visits.filter(v => v.visit_feedback && v.visit_feedback.length > 0).map((visit) => (
              <Card key={visit.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{visit.properties?.title || "Property"}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {visit.properties?.locality}, {visit.properties?.city}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {visit.visit_feedback && visit.visit_feedback.length > 0 && (
                    <div>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Property:</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= visit.visit_feedback[0].property_rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Agent:</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= visit.visit_feedback[0].agent_rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {visit.visit_feedback[0].feedback && (
                        <p className="text-sm text-muted-foreground mb-3">{visit.visit_feedback[0].feedback}</p>
                      )}
                      {visit.visit_feedback[0].photo_urls && visit.visit_feedback[0].photo_urls.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto">
                          {visit.visit_feedback[0].photo_urls.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Visit photo ${idx + 1}`}
                              className="w-24 h-24 object-cover rounded"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default VisitAnalytics;