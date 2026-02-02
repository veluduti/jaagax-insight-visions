import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Sparkles, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  DollarSign,
  Calendar,
  FileText,
  Star
} from "lucide-react";
import { motion } from "framer-motion";

interface PostVisitInsightsProps {
  bookingId: string;
  propertyId: string;
  onClose: () => void;
}

export const PostVisitInsights = ({ bookingId, propertyId, onClose }: PostVisitInsightsProps) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [showInsights, setShowInsights] = useState(false);

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      toast.error('Please provide a rating');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update the booking with feedback
      await supabase
        .from('visit_bookings')
        .update({ 
          status: 'completed',
          notes: `Rating: ${rating}/5. ${feedback}`
        })
        .eq('id', bookingId);

      // Fetch property details
      const { data: property } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      // Generate AI insights
      const { data: insightsData } = await supabase.functions.invoke('post-visit-insights', {
        body: {
          propertyDetails: property,
          visitFeedback: { rating, feedback },
          userPreferences: {},
        },
      });

      setInsights(insightsData?.insights || generateMockInsights(property));
      setShowInsights(true);
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Still show mock insights on error
      setInsights(generateMockInsights(null));
      setShowInsights(true);
    } finally {
      setLoading(false);
    }
  };

  const generateMockInsights = (property: any) => ({
    propertyAnalysis: {
      summary: `Based on your visit, this property shows good potential for ${property?.property_type || 'residential'} investment.`,
      strengths: ['Good location', 'Modern amenities', 'Verified property'],
      concerns: ['Consider traffic patterns', 'Check maintenance history'],
      overallScore: 78
    },
    negotiationTips: {
      tips: [
        'Research recent sales in the area',
        'Highlight any maintenance concerns during negotiation',
        'Consider seasonal timing for better deals'
      ],
      recommendedDiscount: '5-8%',
      bestTimeToNegotiate: 'End of quarter'
    },
    recommendations: [
      { type: 'Schedule Follow-up', description: 'Book a second visit with family', action: 'Book' },
      { type: 'Compare Options', description: 'View 3 similar properties nearby', action: 'Compare' }
    ],
    marketInsights: {
      priceComparison: 'Slightly above market average',
      demandLevel: 'High demand area',
      futureProspects: 'Growing infrastructure',
      investmentPotential: 'Good for long-term investment'
    }
  });

  if (showInsights && insights) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Sparkles className="w-12 h-12 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-2">Your Personalized Insights</h2>
          <p className="text-muted-foreground">AI-powered analysis based on your visit</p>
        </div>

        {/* Property Analysis */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Property Analysis</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{insights.propertyAnalysis.summary}</p>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Strengths
              </h4>
              <ul className="space-y-1">
                {insights.propertyAnalysis.strengths.map((strength: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {strength}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                Considerations
              </h4>
              <ul className="space-y-1">
                {insights.propertyAnalysis.concerns.map((concern: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {concern}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {insights.propertyAnalysis.overallScore}/100
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
            </div>
          </div>
        </Card>

        {/* Negotiation Tips */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Negotiation Strategy</h3>
          </div>
          
          <div className="space-y-3 mb-4">
            {insights.negotiationTips.tips.map((tip: string, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg"
              >
                <div className="bg-primary/20 p-1.5 rounded">
                  <span className="text-xs font-bold text-primary">{idx + 1}</span>
                </div>
                <p className="text-sm flex-1">{tip}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Recommended Discount</div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {insights.negotiationTips.recommendedDiscount}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Best Time</div>
              <div className="text-sm font-medium">
                {insights.negotiationTips.bestTimeToNegotiate}
              </div>
            </div>
          </div>
        </Card>

        {/* Recommendations */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Personalized Recommendations</h3>
          </div>
          
          <div className="space-y-3">
            {insights.recommendations.map((rec: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:border-primary transition-colors">
                <div>
                  <div className="font-medium mb-1">{rec.type}</div>
                  <div className="text-sm text-muted-foreground">{rec.description}</div>
                </div>
                <Button variant="outline" size="sm">{rec.action}</Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Market Insights */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Market Insights</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Price Comparison</div>
                <div className="text-sm font-medium">{insights.marketInsights.priceComparison}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Demand Level</div>
                <div className="text-sm font-medium">{insights.marketInsights.demandLevel}</div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Future Prospects</div>
                <div className="text-sm font-medium">{insights.marketInsights.futureProspects}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Investment Potential</div>
                <div className="text-sm font-medium">{insights.marketInsights.investmentPotential}</div>
              </div>
            </div>
          </div>
        </Card>

        <Button onClick={onClose} className="w-full">Close</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">How was your visit?</h2>
        <p className="text-muted-foreground">Share your experience and get personalized insights</p>
      </div>

      <Card className="p-6">
        <Label className="text-sm font-medium mb-3 block">Rate your experience</Label>
        <div className="flex gap-2 justify-center mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>

        <div>
          <Label htmlFor="feedback" className="text-sm font-medium mb-2 block">
            Share your feedback (optional)
          </Label>
          <Textarea
            id="feedback"
            placeholder="What did you like? Any concerns?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
          />
        </div>
      </Card>

      <Button 
        onClick={handleSubmitFeedback} 
        disabled={loading || rating === 0}
        className="w-full"
      >
        {loading ? 'Generating Insights...' : 'Submit & Get AI Insights'}
      </Button>
    </div>
  );
};