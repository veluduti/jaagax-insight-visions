import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useBuyerContext } from "@/hooks/useBuyerContext";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Brain, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  TrendingUp,
  Clock,
  Home,
  ArrowRight,
  Sparkles,
  Shield
} from "lucide-react";

interface AIDecisionPanelProps {
  propertyId: number;
  propertyData: {
    title: string;
    price: number;
    locality: string;
    city: string;
    type: string | null;
    beds: number;
    area: number | null;
    trust_score: number | null;
  };
}

interface AIDecision {
  match_score: number;
  ai_verdict: 'best_for_you' | 'alternative' | 'risky';
  risk_flags: string[];
  positive_flags: string[];
  reasoning: string;
  alternatives?: Array<{ id: number; title: string; match_score: number }>;
  should_wait?: {
    recommendation: string;
    reasons: string[];
    wait_period?: string;
  };
}

const AIDecisionPanel = ({ propertyId, propertyData }: AIDecisionPanelProps) => {
  const { user, role } = useAuth();
  const { buyerContext, hasBuyerContext } = useBuyerContext();
  const [decision, setDecision] = useState<AIDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && role === 'buyer' && hasBuyerContext) {
      fetchAIDecision();
    } else {
      setLoading(false);
    }
  }, [propertyId, user, role, hasBuyerContext, buyerContext]);

  const fetchAIDecision = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('ai-property-decision', {
        body: {
          properties: [{
            id: propertyId,
            title: propertyData.title,
            price: propertyData.price,
            locality: propertyData.locality,
            city: propertyData.city,
            type: propertyData.type,
            beds: propertyData.beds,
            area: propertyData.area,
            trust_score: propertyData.trust_score
          }],
          buyerContext: {
            life_stage: buyerContext?.life_stage,
            budget_comfort: buyerContext?.budget_comfort,
            primary_fear: buyerContext?.primary_fear,
            decision_mode: buyerContext?.decision_mode,
            confidence_score: buyerContext?.confidence_score
          }
        }
      });

      if (fnError) throw fnError;

      if (data?.decisions && data.decisions.length > 0) {
        setDecision(data.decisions[0]);
      }
    } catch (err: any) {
      console.error('AI Decision error:', err);
      setError('Unable to load AI insights');
    } finally {
      setLoading(false);
    }
  };

  // Don't show for non-buyers or those without context
  if (!user || role !== 'buyer' || !hasBuyerContext) {
    return null;
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
      </motion.div>
    );
  }

  if (error || !decision) {
    return null;
  }

  const getVerdictConfig = () => {
    switch (decision.ai_verdict) {
      case 'best_for_you':
        return {
          icon: CheckCircle2,
          label: 'Best for You',
          color: 'text-green-500',
          bg: 'bg-green-500/10',
          border: 'border-green-500/20'
        };
      case 'alternative':
        return {
          icon: TrendingUp,
          label: 'Worth Considering',
          color: 'text-amber-500',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20'
        };
      case 'risky':
        return {
          icon: AlertTriangle,
          label: 'Not Right for You Now',
          color: 'text-red-500',
          bg: 'bg-red-500/10',
          border: 'border-red-500/20'
        };
    }
  };

  const verdictConfig = getVerdictConfig();
  const VerdictIcon = verdictConfig.icon;

  const getRiskLevel = () => {
    if (decision.risk_flags.length === 0) return { label: 'Low Risk', color: 'text-green-500' };
    if (decision.risk_flags.length <= 2) return { label: 'Medium Risk', color: 'text-amber-500' };
    return { label: 'High Risk', color: 'text-red-500' };
  };

  const riskLevel = getRiskLevel();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel rounded-xl overflow-hidden border ${verdictConfig.border}`}
    >
      {/* Header */}
      <div className={`${verdictConfig.bg} p-4 border-b ${verdictConfig.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${verdictConfig.bg}`}>
              <Brain className={`h-5 w-5 ${verdictConfig.color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                AI Decision Analysis
                <Sparkles className="h-4 w-4 text-primary" />
              </h3>
              <p className="text-sm text-muted-foreground">Personalized for your profile</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">{decision.match_score}%</div>
            <div className="text-xs text-muted-foreground">Match Score</div>
          </div>
        </div>
      </div>

      {/* Verdict Display */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VerdictIcon className={`h-6 w-6 ${verdictConfig.color}`} />
            <div>
              <span className={`font-semibold ${verdictConfig.color}`}>{verdictConfig.label}</span>
              <Badge variant="outline" className={`ml-2 ${riskLevel.color}`}>
                {riskLevel.label}
              </Badge>
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{decision.reasoning}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="fits" className="p-4">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="fits" className="text-xs">Why it fits</TabsTrigger>
          <TabsTrigger value="watch" className="text-xs">Watch out</TabsTrigger>
          <TabsTrigger value="alternatives" className="text-xs">Alternatives</TabsTrigger>
          <TabsTrigger value="wait" className="text-xs">Should wait?</TabsTrigger>
        </TabsList>

        <TabsContent value="fits" className="space-y-3">
          {decision.positive_flags.length > 0 ? (
            decision.positive_flags.map((flag, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{flag}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No specific advantages identified for your profile
            </div>
          )}
        </TabsContent>

        <TabsContent value="watch" className="space-y-3">
          {decision.risk_flags.length > 0 ? (
            decision.risk_flags.map((flag, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{flag}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
              <Shield className="h-5 w-5 text-green-500" />
              <span className="text-sm text-foreground">No significant concerns identified</span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alternatives" className="space-y-3">
          {decision.alternatives && decision.alternatives.length > 0 ? (
            decision.alternatives.map((alt) => (
              <a 
                key={alt.id}
                href={`/property/${alt.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{alt.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{alt.match_score}% match</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </a>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No better alternatives found in your search criteria
            </div>
          )}
        </TabsContent>

        <TabsContent value="wait" className="space-y-3">
          {decision.should_wait ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                decision.should_wait.recommendation === 'wait' 
                  ? 'bg-amber-500/10 border border-amber-500/20' 
                  : 'bg-green-500/10 border border-green-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className={`h-5 w-5 ${
                    decision.should_wait.recommendation === 'wait' ? 'text-amber-500' : 'text-green-500'
                  }`} />
                  <span className="font-semibold">
                    {decision.should_wait.recommendation === 'wait' 
                      ? 'Consider Waiting' 
                      : 'Good Time to Buy'}
                  </span>
                </div>
                {decision.should_wait.wait_period && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Suggested wait: {decision.should_wait.wait_period}
                  </p>
                )}
              </div>
              {decision.should_wait.reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-foreground">{reason}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <span className="font-semibold text-foreground">Good Time to Proceed</span>
                <p className="text-sm text-muted-foreground">Market conditions favor buying now</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default AIDecisionPanel;
