import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import {
  Trophy,
  Users,
  MapPin,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  Activity,
  BarChart3,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { format } from "date-fns";

interface AgentMetrics {
  id: string;
  name: string;
  photo_url: string | null;
  trust_score: number;
  acceptance_rate: number;
  avg_response_time_seconds: number;
  total_visits: number;
  sales_count: number;
  rent_count: number;
  verified: boolean;
  is_online: boolean;
  cities_served: string[];
  total_earnings?: number;
}

interface AssignmentStats {
  total: number;
  accepted: number;
  rejected: number;
  timeout: number;
  pending: number;
}

interface VerificationStats {
  pending_review: number;
  approved: number;
  rejected: number;
}

const AdminFRMDashboard = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentMetrics[]>([]);
  const [assignmentStats, setAssignmentStats] = useState<AssignmentStats>({
    total: 0,
    accepted: 0,
    rejected: 0,
    timeout: 0,
    pending: 0,
  });
  const [verificationStats, setVerificationStats] = useState<VerificationStats>({
    pending_review: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFRMData();
  }, []);

  const fetchFRMData = async () => {
    setLoading(true);
    try {
      // Fetch agents with metrics
      const { data: agentsData, error: agentsError } = await supabase
        .from("agents")
        .select("*")
        .order("trust_score", { ascending: false });

      if (agentsError) throw agentsError;

      // Fetch agent earnings
      const { data: earningsData } = await supabase
        .from("agent_earnings")
        .select("agent_id, amount")
        .eq("status", "paid");

      // Calculate total earnings per agent
      const earningsMap = (earningsData || []).reduce(
        (acc, e) => {
          acc[e.agent_id] = (acc[e.agent_id] || 0) + Number(e.amount);
          return acc;
        },
        {} as Record<string, number>,
      );

      const agentsWithEarnings = (agentsData || []).map((agent) => ({
        ...agent,
        cities_served: agent.cities_served || [],
        total_earnings: earningsMap[agent.id] || 0,
      }));

      setAgents(agentsWithEarnings);

      // Fetch assignment stats
      const { data: assignments } = await supabase.from("agent_assignment_requests").select("status");

      if (assignments) {
        setAssignmentStats({
          total: assignments.length,
          accepted: assignments.filter((a) => a.status === "accepted").length,
          rejected: assignments.filter((a) => a.status === "rejected").length,
          timeout: assignments.filter((a) => a.status === "timeout").length,
          pending: assignments.filter((a) => a.status === "pending").length,
        });
      }

      // Fetch verification stats
      const { data: verifications } = await supabase.from("property_verifications").select("final_status");

      if (verifications) {
        setVerificationStats({
          pending_review: verifications.filter((v) => v.final_status === "pending_review").length,
          approved: verifications.filter((v) => v.final_status === "approved").length,
          rejected: verifications.filter((v) => v.final_status === "rejected").length,
        });
      }
    } catch (error) {
      console.error("Error fetching FRM data:", error);
      toast.error("Failed to load FRM data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  const formatResponseTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-yellow-500">🥇 #1</Badge>;
    if (index === 1) return <Badge className="bg-gray-400">🥈 #2</Badge>;
    if (index === 2) return <Badge className="bg-amber-600">🥉 #3</Badge>;
    return <Badge variant="outline">#{index + 1}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-2 pb-2">
        <div className="container-padding max-w-7xl 3xl:max-w-[1680px] mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-gradient">Field Relationship Manager</h1>
              <p className="text-muted-foreground">Agent performance tracking, assignments, and earnings analytics</p>
            </div>
            <Button onClick={fetchFRMData} variant="outline">
              <Activity className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Agents</p>
                    <p className="text-3xl font-bold">{agents.length}</p>
                    <p className="text-xs text-green-600">{agents.filter((a) => a.is_online).length} online</p>
                  </div>
                  <Users className="h-10 w-10 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Assignments</p>
                    <p className="text-3xl font-bold">{assignmentStats.total}</p>
                    <p className="text-xs text-green-600">
                      {((assignmentStats.accepted / (assignmentStats.total || 1)) * 100).toFixed(0)}% accepted
                    </p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Verifications</p>
                    <p className="text-3xl font-bold">{verificationStats.pending_review}</p>
                    <p className="text-xs text-yellow-600">pending review</p>
                  </div>
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Earnings</p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(agents.reduce((sum, a) => sum + (a.total_earnings || 0), 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">all time</p>
                  </div>
                  <DollarSign className="h-10 w-10 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="leaderboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="leaderboard">
                <Trophy className="w-4 h-4 mr-2" />
                Leaderboard
              </TabsTrigger>
              <TabsTrigger value="assignments">
                <Activity className="w-4 h-4 mr-2" />
                Assignments
              </TabsTrigger>
              <TabsTrigger value="verifications">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Verifications
              </TabsTrigger>
              <TabsTrigger value="earnings">
                <DollarSign className="w-4 h-4 mr-2" />
                Earnings
              </TabsTrigger>
            </TabsList>

            {/* Leaderboard Tab */}
            <TabsContent value="leaderboard">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Agent Leaderboard
                  </CardTitle>
                  <CardDescription>Ranked by trust score and performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {agents.map((agent, index) => (
                      <div
                        key={agent.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border ${
                          index < 3 ? "bg-primary/5 border-primary/20" : ""
                        }`}
                      >
                        <div className="flex-shrink-0">{getRankBadge(index)}</div>

                        <Avatar className="h-12 w-12">
                          <AvatarImage src={agent.photo_url || undefined} />
                          <AvatarFallback>{agent.name?.charAt(0) || "A"}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{agent.name}</h3>
                            {agent.verified && <CheckCircle2 className="w-4 h-4 text-primary" />}
                            <Badge variant={agent.is_online ? "default" : "secondary"}>
                              {agent.is_online ? "Online" : "Offline"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {agent.cities_served?.join(", ") || "N/A"}
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-6 text-center">
                          <div>
                            <p className="text-2xl font-bold text-primary">{agent.trust_score}</p>
                            <p className="text-xs text-muted-foreground">Trust Score</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{agent.acceptance_rate}%</p>
                            <p className="text-xs text-muted-foreground">Acceptance</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{agent.total_visits}</p>
                            <p className="text-xs text-muted-foreground">Visits</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{agent.sales_count}</p>
                            <p className="text-xs text-muted-foreground">Sales</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Assignment Analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Accepted</span>
                        <span className="font-medium text-green-600">{assignmentStats.accepted}</span>
                      </div>
                      <Progress
                        value={(assignmentStats.accepted / (assignmentStats.total || 1)) * 100}
                        className="h-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Rejected</span>
                        <span className="font-medium text-red-600">{assignmentStats.rejected}</span>
                      </div>
                      <Progress
                        value={(assignmentStats.rejected / (assignmentStats.total || 1)) * 100}
                        className="h-2 [&>div]:bg-red-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Timeout</span>
                        <span className="font-medium text-yellow-600">{assignmentStats.timeout}</span>
                      </div>
                      <Progress
                        value={(assignmentStats.timeout / (assignmentStats.total || 1)) * 100}
                        className="h-2 [&>div]:bg-yellow-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Pending</span>
                        <span className="font-medium text-blue-600">{assignmentStats.pending}</span>
                      </div>
                      <Progress
                        value={(assignmentStats.pending / (assignmentStats.total || 1)) * 100}
                        className="h-2 [&>div]:bg-blue-500"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Response Time Leaders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {agents
                        .filter((a) => a.avg_response_time_seconds > 0)
                        .sort((a, b) => a.avg_response_time_seconds - b.avg_response_time_seconds)
                        .slice(0, 5)
                        .map((agent, idx) => (
                          <div key={agent.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">#{idx + 1}</span>
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={agent.photo_url || undefined} />
                                <AvatarFallback>{agent.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{agent.name}</span>
                            </div>
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatResponseTime(agent.avg_response_time_seconds)}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Verifications Tab */}
            <TabsContent value="verifications">
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="border-yellow-500/50">
                  <CardContent className="p-6 text-center">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                    <p className="text-4xl font-bold">{verificationStats.pending_review}</p>
                    <p className="text-muted-foreground">Pending Review</p>
                    <Button className="mt-4 w-full" variant="outline" onClick={() => navigate("/dashboard/admin")}>
                      Review Now
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-green-500/50">
                  <CardContent className="p-6 text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p className="text-4xl font-bold">{verificationStats.approved}</p>
                    <p className="text-muted-foreground">Approved</p>
                  </CardContent>
                </Card>

                <Card className="border-red-500/50">
                  <CardContent className="p-6 text-center">
                    <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <p className="text-4xl font-bold">{verificationStats.rejected}</p>
                    <p className="text-muted-foreground">Rejected</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Earnings Tab */}
            <TabsContent value="earnings">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                    Agent Earnings Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {agents
                      .sort((a, b) => (b.total_earnings || 0) - (a.total_earnings || 0))
                      .map((agent, index) => (
                        <div key={agent.id} className="flex items-center gap-4 p-4 rounded-lg border">
                          <span className="text-sm text-muted-foreground w-8">#{index + 1}</span>

                          <Avatar className="h-10 w-10">
                            <AvatarImage src={agent.photo_url || undefined} />
                            <AvatarFallback>{agent.name?.charAt(0)}</AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <h3 className="font-semibold">{agent.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {agent.total_visits} visits • {agent.sales_count} sales
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-2xl font-bold text-emerald-600">
                              {formatCurrency(agent.total_earnings || 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">total earnings</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminFRMDashboard;
