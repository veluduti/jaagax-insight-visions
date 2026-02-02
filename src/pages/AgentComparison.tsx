import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  Star,
  TrendingUp,
  Home,
  MapPin,
  Languages,
  Shield,
  Award,
  Phone,
  MessageSquare,
  CheckCircle2,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";

interface Agent {
  id: string;
  name: string | null;
  photo_url: string | null;
  agency_name: string | null;
  cities_served: string[] | null;
  languages: string[] | null;
  sales_count: number | null;
  rent_count: number | null;
  trust_score: number | null;
  verified: boolean | null;
}

const AgentComparison = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    // Load agents from URL params if provided
    const agentIds = searchParams.get("agents")?.split(",") || [];
    if (agentIds.length > 0 && allAgents.length > 0) {
      const selected = allAgents.filter(a => agentIds.includes(a.id));
      setSelectedAgents(selected.slice(0, 3)); // Max 3 agents
    }
  }, [searchParams, allAgents]);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("verified", true)
        .order("trust_score", { ascending: false })
        .limit(20);

      if (error) throw error;
      setAgents(data || []);
      setAllAgents(data || []);
    } catch (error) {
      toast.error("Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = (agentId: string) => {
    if (selectedAgents.length >= 3) {
      toast.error("You can compare up to 3 agents at a time");
      return;
    }

    const agent = agents.find(a => a.id === agentId);
    if (agent && !selectedAgents.find(a => a.id === agent.id)) {
      setSelectedAgents([...selectedAgents, agent]);
    }
  };

  const handleRemoveAgent = (agentId: string) => {
    setSelectedAgents(selectedAgents.filter(a => a.id !== agentId));
  };

  const ComparisonRow = ({ label, icon: Icon, values }: any) => (
    <div className="grid grid-cols-4 gap-4 py-4 border-b border-border/50">
      <div className="flex items-center gap-2 font-medium">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        {label}
      </div>
      {values.map((value: any, index: number) => (
        <div key={index} className="text-center">
          {value}
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-6 py-24 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/agents")} className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Button>

          <h1 className="text-4xl font-bold mb-2">Compare Agents</h1>
          <p className="text-muted-foreground">
            Select up to 3 agents to compare their experience, ratings, and specializations
          </p>
        </div>

        {/* Agent Selectors */}
        <Card className="glass-panel mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-2">
                  <label className="text-sm font-medium">
                    Agent {index + 1}
                    {index === 0 && <span className="text-destructive"> *</span>}
                  </label>
                  {selectedAgents[index] ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={selectedAgents[index].photo_url} />
                        <AvatarFallback>
                          {selectedAgents[index].name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 font-medium text-sm">
                        {selectedAgents[index].name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAgent(selectedAgents[index].id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Select onValueChange={handleAddAgent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents
                          .filter(a => !selectedAgents.find(sa => sa.id === a.id))
                          .map((agent) => (
                            <SelectItem key={agent.id} value={agent.id.toString()}>
                              {agent.name} - {agent.agency_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comparison Table */}
        {selectedAgents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-panel">
              <CardContent className="p-6">
                {/* Profile Headers */}
                <div className="grid grid-cols-4 gap-4 pb-6 border-b-2 border-border">
                  <div></div>
                  {selectedAgents.map((agent) => (
                    <div key={agent.id} className="text-center space-y-3">
                      <Avatar className="w-24 h-24 mx-auto border-4 border-primary/20">
                        <AvatarImage src={agent.photo_url} />
                        <AvatarFallback className="text-2xl">
                          {agent.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-lg">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground">{agent.agency_name}</p>
                      </div>
                      {agent.verified && (
                        <Badge className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                {/* Comparison Rows */}
                <div className="mt-6">
                  <ComparisonRow
                    label="Trust Score"
                    icon={Shield}
                    values={selectedAgents.map(a => (
                      <Badge variant="outline" className="text-lg font-bold">
                        {a.trust_score}/100
                      </Badge>
                    ))}
                  />

                  <ComparisonRow
                    label="Total Sales"
                    icon={TrendingUp}
                    values={selectedAgents.map(a => (
                      <span className="text-2xl font-bold text-primary">{a.sales_count}</span>
                    ))}
                  />

                  <ComparisonRow
                    label="Total Rentals"
                    icon={Home}
                    values={selectedAgents.map(a => (
                      <span className="text-2xl font-bold text-blue-500">{a.rent_count}</span>
                    ))}
                  />

                  <ComparisonRow
                    label="Total Deals"
                    icon={Award}
                    values={selectedAgents.map(a => (
                      <span className="text-2xl font-bold">{a.sales_count + a.rent_count}</span>
                    ))}
                  />

                  <ComparisonRow
                    label="Service Areas"
                    icon={MapPin}
                    values={selectedAgents.map(a => (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {(a.cities_served || []).slice(0, 2).map(city => (
                          <Badge key={city} variant="secondary" className="text-xs">
                            {city.trim()}
                          </Badge>
                        ))}
                      </div>
                    ))}
                  />

                  <ComparisonRow
                    label="Languages"
                    icon={Languages}
                    values={selectedAgents.map(a => (
                      <div className="text-sm text-muted-foreground">
                        {(a.languages || []).join(", ")}
                      </div>
                    ))}
                  />

                  {/* Action Buttons */}
                  <div className="grid grid-cols-4 gap-4 pt-6 mt-6 border-t-2 border-border">
                    <div></div>
                    {selectedAgents.map((agent) => (
                      <div key={agent.id} className="flex flex-col gap-2">
                        <Button 
                          onClick={() => navigate(`/agents/${agent.id}`)}
                          className="w-full"
                        >
                          View Profile
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full gap-2"
                          onClick={() => window.location.href = `tel:+919876543210`}
                        >
                          <Phone className="h-4 w-4" />
                          Call
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {selectedAgents.length === 0 && (
          <Card className="glass-panel">
            <CardContent className="py-12 text-center">
              <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">Start Comparing</h3>
              <p className="text-muted-foreground">
                Select at least one agent above to begin comparison
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default AgentComparison;
