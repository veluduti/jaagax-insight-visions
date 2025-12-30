import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Award, CheckCircle2, TrendingUp, Clock,
  Building2, Users, Sparkles, AlertTriangle, 
  ThumbsUp, Calendar, Loader2, HelpCircle,
  Gauge, Target, Handshake
} from "lucide-react";

interface Builder {
  id: number;
  name: string;
  city: string;
  trust_score: number;
  verified: boolean;
  construction_progress?: number;
  delivery_confidence_score?: number;
  payment_flexibility_notes?: string;
  trust_partner?: boolean;
  trust_partner_since?: string;
  projects_completed?: number;
  projects_ongoing?: number;
  on_time_delivery_rate?: number;
  customer_satisfaction_score?: number;
}

interface TrustAnalysis {
  trustScore: number;
  grade: string;
  factors: {
    positive: string[];
    concerns: string[];
  };
  recommendations: string[];
  breakdown: Record<string, number>;
}

interface BuilderTrustProgramProps {
  builderId: number;
  builderName?: string;
}

const TRUST_PARTNER_THRESHOLD = 75;

export const BuilderTrustProgram = ({ builderId, builderName }: BuilderTrustProgramProps) => {
  const [builder, setBuilder] = useState<Builder | null>(null);
  const [trustAnalysis, setTrustAnalysis] = useState<TrustAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchBuilderData();
  }, [builderId]);

  const fetchBuilderData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('builders')
        .select('*')
        .eq('id', builderId)
        .single();

      if (error) throw error;
      setBuilder(data as Builder);
    } catch (error) {
      console.error('Error fetching builder:', error);
    } finally {
      setLoading(false);
    }
  };

  const runTrustAnalysis = async () => {
    try {
      setAnalyzing(true);
      const { data, error } = await supabase.functions.invoke('ai-trust-engine', {
        body: { entityType: 'builder', entityId: builderId }
      });

      if (error) throw error;
      setTrustAnalysis(data.analysis);
      toast.success('Trust analysis complete');
      
      // Refresh builder data to get updated trust_score
      fetchBuilderData();
    } catch (error) {
      console.error('Error analyzing trust:', error);
      toast.error('Failed to analyze trust score');
    } finally {
      setAnalyzing(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-500';
    if (grade.startsWith('B')) return 'bg-blue-500';
    if (grade.startsWith('C')) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className="glass-panel">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!builder) {
    return null;
  }

  const isTrustPartner = builder.trust_partner || (builder.trust_score && builder.trust_score >= TRUST_PARTNER_THRESHOLD);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Trust Partner Badge - Only visible if score > threshold */}
      <AnimatePresence>
        {isTrustPartner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Card className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-amber-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg">
                    <Award className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">Trust Partner</h3>
                      <Badge className="bg-amber-500 text-white">Verified</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {builder.name || builderName} is a JaagaX Trust Partner with exceptional track record
                    </p>
                    {builder.trust_partner_since && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Partner since {formatDate(builder.trust_partner_since)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-amber-500">
                      {builder.trust_score}/100
                    </div>
                    <p className="text-xs text-muted-foreground">Trust Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Trust Program Card */}
      <Card className="glass-panel">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Builder Trust Program
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={runTrustAnalysis}
              disabled={analyzing}
              className="gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  AI Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="trust">Why Trust?</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Completed</span>
                  </div>
                  <div className="text-2xl font-bold">{builder.projects_completed || 0}</div>
                  <p className="text-xs text-muted-foreground">Projects</p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Ongoing</span>
                  </div>
                  <div className="text-2xl font-bold">{builder.projects_ongoing || 0}</div>
                  <p className="text-xs text-muted-foreground">Projects</p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">On-Time</span>
                  </div>
                  <div className="text-2xl font-bold">{builder.on_time_delivery_rate || 0}%</div>
                  <p className="text-xs text-muted-foreground">Delivery Rate</p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="h-4 w-4 text-purple-500" />
                    <span className="text-xs text-muted-foreground">Satisfaction</span>
                  </div>
                  <div className="text-2xl font-bold">{builder.customer_satisfaction_score || 0}%</div>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              </div>

              {/* Confidence Meter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    Delivery Confidence
                  </span>
                  <span className={`font-bold ${getConfidenceColor(builder.delivery_confidence_score || 0)}`}>
                    {builder.delivery_confidence_score || 0}%
                  </span>
                </div>
                <Progress 
                  value={builder.delivery_confidence_score || 0} 
                  className="h-3"
                />
                <p className="text-xs text-muted-foreground">
                  AI-calculated confidence based on past performance, current progress, and market conditions
                </p>
              </div>

              {/* Payment Flexibility */}
              {builder.payment_flexibility_notes && (
                <div className="p-4 rounded-xl bg-muted/50 border">
                  <div className="flex items-start gap-3">
                    <Handshake className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">Payment Flexibility</h4>
                      <p className="text-sm text-muted-foreground">
                        {builder.payment_flexibility_notes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-6">
              {/* Construction Progress Timeline */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Construction Progress
                </h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span className="font-bold">{builder.construction_progress || 0}%</span>
                  </div>
                  <Progress value={builder.construction_progress || 0} className="h-4" />
                </div>

                {/* Progress Timeline */}
                <div className="relative pl-6 space-y-6 mt-6">
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-muted" />
                  
                  {[
                    { phase: 'Foundation', status: 'completed', percent: 100 },
                    { phase: 'Structure', status: builder.construction_progress && builder.construction_progress > 40 ? 'completed' : 'in_progress', percent: Math.min(100, (builder.construction_progress || 0) * 2.5) },
                    { phase: 'Finishing', status: builder.construction_progress && builder.construction_progress > 70 ? 'in_progress' : 'pending', percent: Math.max(0, ((builder.construction_progress || 0) - 70) * 3.3) },
                    { phase: 'Handover', status: builder.construction_progress && builder.construction_progress > 95 ? 'in_progress' : 'pending', percent: builder.construction_progress === 100 ? 100 : 0 },
                  ].map((item, idx) => (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-6 w-4 h-4 rounded-full border-2 ${
                        item.status === 'completed' ? 'bg-primary border-primary' :
                        item.status === 'in_progress' ? 'bg-amber-500 border-amber-500 animate-pulse' :
                        'bg-muted border-muted-foreground/30'
                      }`}>
                        {item.status === 'completed' && (
                          <CheckCircle2 className="h-3 w-3 text-white absolute top-0.5 left-0.5" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.phase}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {item.status.replace('_', ' ')}
                          </p>
                        </div>
                        <Badge variant={
                          item.status === 'completed' ? 'default' :
                          item.status === 'in_progress' ? 'secondary' : 'outline'
                        }>
                          {Math.round(item.percent)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Why Trust Tab */}
            <TabsContent value="trust" className="space-y-6">
              <div className="text-center py-4">
                <h4 className="font-semibold text-lg mb-2 flex items-center justify-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Why Trust {builder.name || builderName}?
                </h4>
                <p className="text-sm text-muted-foreground">
                  Here's what makes this builder reliable
                </p>
              </div>

              {/* AI Trust Analysis Results */}
              {trustAnalysis ? (
                <div className="space-y-4">
                  {/* Grade Badge */}
                  <div className="flex items-center justify-center gap-4">
                    <div className={`w-16 h-16 rounded-full ${getGradeColor(trustAnalysis.grade)} flex items-center justify-center`}>
                      <span className="text-2xl font-bold text-white">{trustAnalysis.grade}</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{trustAnalysis.trustScore}/100</p>
                      <p className="text-sm text-muted-foreground">Trust Score</p>
                    </div>
                  </div>

                  {/* Positive Factors */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-green-600 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Positive Factors
                    </h5>
                    <ul className="space-y-1">
                      {trustAnalysis.factors.positive.map((factor, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Concerns */}
                  {trustAnalysis.factors.concerns.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-amber-600 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Areas of Concern
                      </h5>
                      <ul className="space-y-1">
                        {trustAnalysis.factors.concerns.map((concern, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <AlertTriangle className="h-3 w-3 text-amber-500 mt-1 flex-shrink-0" />
                            {concern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Breakdown */}
                  <div className="space-y-3 pt-4 border-t">
                    <h5 className="font-medium">Score Breakdown</h5>
                    {Object.entries(trustAnalysis.breakdown).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                          <span>{value}%</span>
                        </div>
                        <Progress value={value} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Run AI analysis to get detailed trust insights
                  </p>
                  <Button onClick={runTrustAnalysis} disabled={analyzing}>
                    {analyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyze Trust
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Trust Indicators */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                {builder.verified && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Verified Builder</span>
                  </div>
                )}
                {builder.on_time_delivery_rate && builder.on_time_delivery_rate > 90 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">On-Time Expert</span>
                  </div>
                )}
                {builder.projects_completed && builder.projects_completed > 10 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <Building2 className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Experienced</span>
                  </div>
                )}
                {builder.customer_satisfaction_score && builder.customer_satisfaction_score > 90 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <ThumbsUp className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">Highly Rated</span>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
};
