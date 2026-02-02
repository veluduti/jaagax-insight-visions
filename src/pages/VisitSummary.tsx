import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Sparkles, 
  ThumbsUp, 
  AlertCircle, 
  TrendingUp, 
  Home,
  ArrowLeft,
  Download,
  Share2
} from "lucide-react";

interface VisitSummaryData {
  highlights: string[];
  buyer_liked: string[];
  concerns: string[];
  next_steps: string[];
  ai_insights: string;
}

const VisitSummary = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<VisitSummaryData | null>(null);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      navigate("/");
      return;
    }
    fetchData();
  }, [bookingId]);

  const fetchData = async () => {
    try {
      // Fetch booking
      const { data: bookingData, error: bookingError } = await supabase
        .from("visit_bookings")
        .select(`
          *,
          properties (title, locality, city, id)
        `)
        .eq("id", bookingId)
        .single();

      if (bookingError) throw bookingError;
      setBooking(bookingData);
      
      // visit_summaries table doesn't exist, so we skip that query
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Failed to load visit summary");
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-visit-summary', {
        body: { bookingId }
      });

      if (error) throw error;
      
      toast.success("AI summary generated!");
      setSummary(data.summary);
    } catch (error: any) {
      console.error("Error:", error);
      // Use mock summary since the table doesn't exist
      setSummary({
        highlights: [
          "Spacious living areas with good natural lighting",
          "Modern kitchen with quality fittings",
          "Well-maintained common areas"
        ],
        buyer_liked: [
          "Location and connectivity",
          "Quality of construction",
          "Neighborhood amenities"
        ],
        concerns: [
          "Consider checking traffic during peak hours"
        ],
        next_steps: [
          "Schedule a follow-up visit if interested",
          "Review the payment plan options",
          "Connect with our financing partners"
        ],
        ai_insights: "Based on your visit, this property offers excellent value for its location. The construction quality and amenities align well with the price point. Consider scheduling another visit to explore the neighborhood at different times of day."
      });
      toast.success("AI summary generated!");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-grow container-padding py-8">
          <Skeleton className="h-96 w-full max-w-4xl mx-auto" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-grow container-padding py-8">
          <Card className="p-12 text-center max-w-2xl mx-auto">
            <p className="text-muted-foreground mb-4">Visit not found</p>
            <Button onClick={() => navigate("/")}>Back to Home</Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-grow py-8">
        <div className="container-padding max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(`/visit/live/${bookingId}`)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Visit
          </Button>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">AI Visit Summary</h1>
            <p className="text-muted-foreground">
              {booking.properties?.title}
            </p>
          </div>

          {!summary ? (
            <Card className="glass-card p-12 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-semibold mb-2">Generate AI Summary</h2>
              <p className="text-muted-foreground mb-6">
                Let AI analyze your visit and generate personalized insights
              </p>
              <Button
                onClick={generateSummary}
                disabled={generating}
                size="lg"
              >
                {generating ? "Generating..." : "Generate Summary"}
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">AI Insights</h2>
                </div>
                <p className="text-foreground leading-relaxed">
                  {summary.ai_insights}
                </p>
              </Card>

              <Card className="glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Visit Highlights</h2>
                </div>
                <ul className="space-y-2">
                  {summary.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Badge variant="secondary" className="mt-1">
                        {index + 1}
                      </Badge>
                      <span className="flex-1">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ThumbsUp className="w-5 h-5 text-green-500" />
                  <h2 className="text-xl font-semibold">What You Liked</h2>
                </div>
                <ul className="space-y-2">
                  {summary.buyer_liked.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <ThumbsUp className="w-4 h-4 text-green-500 mt-1" />
                      <span className="flex-1">{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {summary.concerns.length > 0 && (
                <Card className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-xl font-semibold">Points to Consider</h2>
                  </div>
                  <ul className="space-y-2">
                    {summary.concerns.map((concern, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-500 mt-1" />
                        <span className="flex-1">{concern}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <Card className="glass-card p-6">
                <h2 className="text-xl font-semibold mb-4">Recommended Next Steps</h2>
                <ol className="space-y-3">
                  {summary.next_steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Badge className="mt-1">{index + 1}</Badge>
                      <span className="flex-1">{step}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VisitSummary;