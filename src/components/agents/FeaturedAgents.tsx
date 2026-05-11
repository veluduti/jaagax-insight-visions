import { motion } from "framer-motion";
import { Star, Trophy } from "lucide-react";
import AgentCard from "./AgentCard";

interface FeaturedAgentsProps {
  agents: any[];
}

export const getFeaturedAgents = (agents: any[]) =>
  agents
    .filter((agent) => agent?.verified)
    .sort(
      (a, b) =>
        ((b.sales_count || 0) + (b.rent_count || 0)) -
        ((a.sales_count || 0) + (a.rent_count || 0))
    )
    .slice(0, 3);

const FeaturedAgents = ({ agents }: FeaturedAgentsProps) => {
  const featuredAgents = getFeaturedAgents(agents);

  if (featuredAgents.length === 0) return null;

  return (
    <section className="py-12 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">Featured TruBrokers™</span>
          </div>
          <h2 className="text-3xl font-bold">Top Rated Agents</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {featuredAgents.map((agent, idx) => (
            <AgentCard key={agent.id} agent={agent} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedAgents;
