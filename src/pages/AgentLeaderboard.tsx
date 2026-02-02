import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Star, TrendingUp, Award, Medal } from "lucide-react";
import { motion } from "framer-motion";

interface Agent {
  id: string;
  name: string | null;
  photo_url: string | null;
  agency_name: string | null;
  cities_served: string[] | null;
  sales_count: number | null;
  rent_count: number | null;
  trust_score: number | null;
  verified: boolean | null;
}

const AgentLeaderboard = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "sales" | "trust">("all");

  useEffect(() => {
    fetchAgents();
  }, [filter]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("agents")
        .select("*")
        .eq("verified", true);

      // Sort based on filter
      if (filter === "sales") {
        query = query.order("sales_count", { ascending: false });
      } else if (filter === "trust") {
        query = query.order("trust_score", { ascending: false });
      } else {
        // All: Combined score
        query = query.order("trust_score", { ascending: false });
      }

      const { data, error } = await query.limit(50);
      
      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
    if (index === 1) return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
    if (index === 2) return "bg-gradient-to-r from-amber-400 to-amber-600 text-white";
    return "bg-muted";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-16">
        <div className="container-padding max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4 text-gradient">
              Agent Leaderboard
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Top-performing real estate agents ranked by sales, trust score, and customer satisfaction
            </p>
          </motion.div>

          {/* Filters */}
          <div className="flex justify-center gap-3 mb-8">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              <Award className="w-4 h-4 mr-2" />
              Overall
            </Button>
            <Button
              variant={filter === "sales" ? "default" : "outline"}
              onClick={() => setFilter("sales")}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Top Sales
            </Button>
            <Button
              variant={filter === "trust" ? "default" : "outline"}
              onClick={() => setFilter("trust")}
            >
              <Star className="w-4 h-4 mr-2" />
              Trust Score
            </Button>
          </div>

          {/* Leaderboard */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-1/3" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {agents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`glass-card hover:scale-[1.01] transition-all cursor-pointer ${
                      index < 3 ? "border-2 border-primary/20" : ""
                    }`}
                    onClick={() => navigate(`/agent/${agent.id}`)}
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-6">
                        {/* Rank */}
                        <div className={`flex items-center justify-center w-16 h-16 rounded-full ${getRankBadge(index)}`}>
                          {getRankIcon(index)}
                        </div>

                        {/* Avatar */}
                        <Avatar className="w-16 h-16 border-2 border-border">
                          <AvatarImage src={agent.photo_url} alt={agent.name} />
                          <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold truncate">
                              {agent.name}
                            </h3>
                            {agent.verified && (
                              <Badge variant="default" className="shrink-0">
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {agent.agency_name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {agent.cities_served}
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-6 items-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {agent.sales_count}
                            </div>
                            <div className="text-xs text-muted-foreground">Sales</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                              <Star className="w-5 h-5 text-primary fill-primary" />
                              {agent.trust_score}
                            </div>
                            <div className="text-xs text-muted-foreground">Trust Score</div>
                          </div>
                        </div>

                        {/* Action */}
                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AgentLeaderboard;
