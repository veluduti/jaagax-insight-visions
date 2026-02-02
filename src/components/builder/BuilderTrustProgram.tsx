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
  ThumbsUp, Loader2, HelpCircle,
  Gauge, Target, Handshake
} from "lucide-react";

interface BuilderTrustProgramProps {
  builderId: string;
  builderName?: string;
}

const TRUST_PARTNER_THRESHOLD = 75;

export const BuilderTrustProgram = ({ builderId, builderName }: BuilderTrustProgramProps) => {
  const [builder, setBuilder] = useState<any>(null);
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
      setBuilder(data);
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
      toast.success('Trust analysis complete');
      fetchBuilderData();
    } catch (error) {
      console.error('Error analyzing trust:', error);
      toast.error('Failed to analyze trust score');
    } finally {
      setAnalyzing(false);
    }
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

  const isTrustPartner = builder.verified;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Trust Partner Badge */}
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
                      {builder.company_name || builderName} is a JaagaX Trust Partner
                    </p>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Status</span>
                  </div>
                  <div className="text-lg font-bold">{builder.verified ? 'Verified' : 'Pending'}</div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Joined</span>
                  </div>
                  <div className="text-lg font-bold">
                    {new Date(builder.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">RERA</span>
                  </div>
                  <div className="text-lg font-bold">{builder.rera_id ? 'Registered' : 'N/A'}</div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <ThumbsUp className="h-4 w-4 text-purple-500" />
                    <span className="text-xs text-muted-foreground">Company</span>
                  </div>
                  <div className="text-lg font-bold truncate">{builder.company_name}</div>
                </div>
              </div>
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-6">
              <div className="text-center py-8">
                <Gauge className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Construction progress tracking will be available once projects are added.
                </p>
              </div>
            </TabsContent>

            {/* Why Trust Tab */}
            <TabsContent value="trust" className="space-y-6">
              <div className="text-center py-4">
                <h4 className="font-semibold text-lg mb-2 flex items-center justify-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Why Trust {builder.company_name || builderName}?
                </h4>
                <p className="text-sm text-muted-foreground">
                  Run AI Analysis to get detailed trust insights
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h5 className="font-medium text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Verified Information
                  </h5>
                  <ul className="space-y-1">
                    {builder.verified && (
                      <li className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                        Builder identity verified
                      </li>
                    )}
                    {builder.rera_id && (
                      <li className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                        RERA registered: {builder.rera_id}
                      </li>
                    )}
                    <li className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                      Company: {builder.company_name}
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
};
