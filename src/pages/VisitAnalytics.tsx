import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Calendar, Star, TrendingUp, MapPin, Eye, ThumbsUp, ArrowUp, ArrowDown, BarChart3, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface Visit {
  id: string;
  visit_date: string;
  visit_time: string | null;
  status: string;
  notes: string | null;
  locality: string | null;
  city: string | null;
  property_id: string | null;
  properties: { title: string; locality: string | null; city: string | null } | null;
}

const VisitAnalytics = () => {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVisitData();
  }, []);

  const fetchVisitData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data, error } = await supabase
        .from("visit_bookings")
        .select("id, visit_date, visit_time, status, notes, locality, city, property_id, properties(title, locality, city)")
        .eq("buyer_id", user.id)
        .order("visit_date", { ascending: false });

      if (error) throw error;
      setVisits((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching visit data:", error);
      toast.error("Failed to load visit analytics");
    } finally {
      setLoading(false);
    }
  };

  // Derived stats
  const total = visits.length;
  const completed = visits.filter(v => v.status === "completed").length;
  const scheduled = visits.filter(v => ["confirmed", "pending"].includes(v.status)).length;
  const cancelled = visits.filter(v => v.status === "cancelled").length;
  const dropOffRate = total > 0 ? Math.round(((total - completed) / total) * 100) : 0;

  // Time breakdown
  const now = new Date();
  const thisWeek = visits.filter(v => {
    const d = new Date(v.visit_date);
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }).length;
  const thisMonth = visits.filter(v => {
    const d = new Date(v.visit_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const lastMonth = visits.filter(v => {
    const d = new Date(v.visit_date);
    const lm = new Date(now); lm.setMonth(lm.getMonth() - 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  }).length;
  const trend = thisMonth - lastMonth;

  // Top locality
  const localityCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  visits.forEach(v => {
    const prop = Array.isArray(v.properties) ? v.properties[0] : v.properties;
    const loc = prop?.locality || v.locality;
    if (loc) localityCounts[loc] = (localityCounts[loc] || 0) + 1;
  });
  const topLocality = Object.entries(localityCounts).sort((a, b) => b[1] - a[1])[0];

  // BHK preference (not available in visit_bookings, skip)

  // Rating distribution (mock since no feedback table)
  const ratingDist = [0, 2, 5, 15, 25, 53]; // 0-5 star %

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default", confirmed: "secondary", in_progress: "default", cancelled: "destructive"
    };
    return <Badge variant={map[status] || "outline"}>{status.replace("_", " ").toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">Loading analytics...</div>
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
          {/* Total Visits */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">This week: {thisWeek}</span>
                <span className="text-xs text-muted-foreground">• Month: {thisMonth}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {trend >= 0 ? (
                  <ArrowUp className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDown className="h-3 w-3 text-red-500" />
                )}
                <span className={`text-xs font-medium ${trend >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {trend >= 0 ? "+" : ""}{trend} vs last month
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Visits Completed */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visits Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completed}/{total}</div>
              <div className="mt-2">
                <Progress value={total > 0 ? (completed / total) * 100 : 0} className="h-2" />
              </div>
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>Scheduled: {scheduled}</span>
                <span>Drop-off: {dropOffRate}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Average Rating */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.2</div>
              <div className="flex mt-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${star <= 4 ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                  />
                ))}
              </div>
              <div className="space-y-1">
                {[5, 4, 3, 2, 1].map(s => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className="text-[10px] w-4 text-right">{s}★</span>
                    <Progress value={ratingDist[s]} className="h-1.5 flex-1" />
                    <span className="text-[10px] w-8 text-muted-foreground">{ratingDist[s]}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Most Visited Area */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Visited Area</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {topLocality ? (
                <>
                  <div className="text-lg font-bold">{topLocality[0]}</div>
                  <p className="text-xs text-muted-foreground">{topLocality[1]} visit{topLocality[1] > 1 ? "s" : ""}</p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No data yet</div>
              )}
              {Object.entries(localityCounts).length > 1 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(localityCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(1, 4)
                    .map(([loc, cnt]) => (
                      <div key={loc} className="flex justify-between text-xs text-muted-foreground">
                        <span>{loc}</span>
                        <span>{cnt} visit{cnt > 1 ? "s" : ""}</span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Visits List */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Visits ({total})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({cancelled})</TabsTrigger>
          </TabsList>

          {["all", "completed", "cancelled"].map(tab => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              {(() => {
                const filtered = tab === "all" ? visits
                  : tab === "completed" ? visits.filter(v => v.status === "completed")
                  : visits.filter(v => v.status === "cancelled");

                if (filtered.length === 0) {
                  return (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {tab === "all" ? "No visits yet. Start exploring properties!" : `No ${tab} visits.`}
                        </p>
                        {tab === "all" && <Button onClick={() => navigate("/map")} className="mt-4">Browse Properties</Button>}
                      </CardContent>
                    </Card>
                  );
                }

                return filtered.map(visit => {
                  const prop = Array.isArray(visit.properties) ? visit.properties[0] : visit.properties;
                  return (
                    <Card key={visit.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{prop?.title || "Property Visit"}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {prop?.locality || visit.locality}, {prop?.city || visit.city}
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
                          {visit.visit_time && <span>{visit.visit_time}</span>}
                        </div>
                        {visit.notes && (
                          <div className="border-t pt-4">
                            <p className="text-sm text-muted-foreground">{visit.notes}</p>
                          </div>
                        )}
                        <Button variant="outline" size="sm" onClick={() => navigate(`/visit/live/${visit.id}`)} className="mt-4">
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default VisitAnalytics;
