import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  MessageSquare, 
  MapPin, 
  HandshakeIcon, 
  Trophy,
  Users,
  TrendingUp
} from "lucide-react";

interface EffortSummary {
  total_units: number;
  explanation_count: number;
  visit_count: number;
  negotiation_count: number;
  closure_count: number;
  unique_buyers: number;
}

interface AgentEffortSummaryProps {
  agentId?: number;
}

const AgentEffortSummary = ({ agentId }: AgentEffortSummaryProps) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<EffortSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentAgentId, setCurrentAgentId] = useState<number | null>(agentId || null);

  useEffect(() => {
    if (agentId) {
      setCurrentAgentId(agentId);
    } else if (user) {
      fetchAgentId();
    }
  }, [user, agentId]);

  useEffect(() => {
    if (currentAgentId) {
      fetchEffortSummary();
    }
  }, [currentAgentId]);

  const fetchAgentId = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setCurrentAgentId(data.id);
    } else {
      setLoading(false);
    }
  };

  const fetchEffortSummary = async () => {
    if (!currentAgentId) return;

    try {
      const { data, error } = await supabase.rpc('get_agent_effort_summary', {
        p_agent_id: currentAgentId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setSummary(data[0]);
      } else {
        setSummary({
          total_units: 0,
          explanation_count: 0,
          visit_count: 0,
          negotiation_count: 0,
          closure_count: 0,
          unique_buyers: 0
        });
      }
    } catch (error) {
      console.error('Error fetching effort summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const effortStats = [
    { 
      label: 'Explanations', 
      count: summary.explanation_count, 
      units: Number(summary.explanation_count) * 1,
      icon: MessageSquare, 
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    { 
      label: 'Site Visits', 
      count: summary.visit_count, 
      units: Number(summary.visit_count) * 3,
      icon: MapPin, 
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    { 
      label: 'Negotiations', 
      count: summary.negotiation_count, 
      units: Number(summary.negotiation_count) * 5,
      icon: HandshakeIcon, 
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    },
    { 
      label: 'Closures', 
      count: summary.closure_count, 
      units: Number(summary.closure_count) * 10,
      icon: Trophy, 
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Effort Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Effort Score */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Effort Score</p>
                <p className="text-2xl font-bold">{summary.total_units}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm">{summary.unique_buyers} buyers</span>
              </div>
            </div>
          </div>

          {/* Effort Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            {effortStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  whileHover={{ scale: 1.02 }}
                  className={`p-3 rounded-lg ${stat.bg} border border-transparent hover:border-border transition-all`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                    <span className="text-sm font-medium">{stat.label}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold">{stat.count}</span>
                    <span className="text-xs text-muted-foreground">
                      {stat.units} pts
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Effort Scale Legend */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Effort Scale</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-muted">Explanation = 1pt</span>
              <span className="px-2 py-1 rounded bg-muted">Visit = 3pts</span>
              <span className="px-2 py-1 rounded bg-muted">Negotiation = 5pts</span>
              <span className="px-2 py-1 rounded bg-muted">Closure = 10pts</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AgentEffortSummary;
