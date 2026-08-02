import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Star, MapPin, Phone, Users } from "lucide-react";
import AgentContactModal from "@/components/home/AgentContactModal";
import { supabase } from "@/integrations/supabase/client";

interface LiveAgent {
  id: string;
  name: string | null;
  photo_url: string | null;
  avg_rating: number | null;
  total_ratings: number | null;
  trust_score: number | null;
  specializations: any;
  cities_served: any;
  city: string | null;
  district: string | null;
  state: string | null;
}

const asText = (v: any) =>
  Array.isArray(v) ? v.filter(Boolean).join(", ") : (v || "").toString().trim();

const agentLocation = (a: LiveAgent) =>
  asText(a.cities_served) ||
  [a.city, a.district, a.state].filter(Boolean).join(", ") ||
  "Location not set";

const FindMyAgent = () => {
  const navigate = useNavigate();
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<LiveAgent | null>(null);
  const [agents, setAgents] = useState<LiveAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("agents")
        .select(
          "id, name, photo_url, avg_rating, total_ratings, trust_score, specializations, cities_served, city, district, state, created_at",
        )
        .order("trust_score", { ascending: false, nullsFirst: false })
        .limit(4);
      if (cancelled) return;
      setAgents((data as LiveAgent[]) || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleContactAgent = (agent: LiveAgent) => {
    setSelectedAgent(agent);
    setContactModalOpen(true);
  };

  const handleConfirmContact = () => {
    if (selectedAgent) navigate(`/agent/${selectedAgent.id}`);
  };

  return (
    <section className="py-16 relative" id="find-agent">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Find Your Perfect <span className="text-gradient">Agent</span>
          </h2>
          <p className="text-foreground/70 text-lg">
            Connect with top-rated, verified agents in your area
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className="glass-panel border-border/50 h-80 animate-pulse" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <Card className="glass-panel border-border/50 p-10 text-center">
            <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              No verified agents onboarded yet. Check back soon.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="glass-panel border-border/50 overflow-hidden hover:border-primary/50 transition-all duration-300 h-full cursor-pointer flex flex-col"
                  onClick={() => navigate(`/agent/${agent.id}`)}
                >
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/15 to-accent/30 flex items-center justify-center">
                    {agent.photo_url ? (
                      <img
                        src={agent.photo_url}
                        alt={agent.name || "Agent"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                        <AvatarImage src={undefined} />
                        <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                          {(agent.name || "A").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent pointer-events-none" />
                    <Badge className="absolute top-3 right-3 bg-primary/90 text-primary-foreground border-0">
                      Trust {agent.trust_score ?? 75}%
                    </Badge>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-lg mb-2 truncate">{agent.name || "Agent"}</h3>

                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <span className="font-semibold">
                          {agent.avg_rating ? Number(agent.avg_rating).toFixed(1) : "New"}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ({agent.total_ratings || 0} reviews)
                      </span>
                    </div>

                    <Badge variant="outline" className="mb-3 w-fit">
                      {asText(agent.specializations) || "Residential"}
                    </Badge>

                    <div className="flex items-start gap-2 mb-4">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {agentLocation(agent)}
                      </div>
                    </div>

                    <div className="space-y-2 mt-auto">
                      <Button
                        className="w-full glow-effect"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContactAgent(agent);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Chat Now
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-primary/50 hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContactAgent(agent);
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call Agent
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button
            size="lg"
            variant="outline"
            className="border-primary/50 hover:bg-primary/10"
            onClick={() => navigate("/agents")}
          >
            View All Agents
          </Button>
        </motion.div>
      </div>

      <AgentContactModal
        open={contactModalOpen}
        onOpenChange={setContactModalOpen}
        agentName={selectedAgent?.name || undefined}
        onConfirm={handleConfirmContact}
      />
    </section>
  );
};

export default FindMyAgent;
