import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Camera, Clock, MapPin, User, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface VisitBooking {
  id: string;
  status: string | null;
  visit_date: string;
  visit_time: string;
  notes: string | null;
  properties: {
    title: string;
    locality: string | null;
    city: string | null;
  } | null;
}

const VisitStory = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<VisitBooking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) {
      navigate("/");
      return;
    }
    fetchData();
  }, [bookingId]);

  const fetchData = async () => {
    try {
      // Fetch booking - visit_story_updates table doesn't exist
      const { data: bookingData, error: bookingError } = await supabase
        .from("visit_bookings")
        .select(`
          id, status, visit_date, visit_time, notes,
          properties (title, locality, city)
        `)
        .eq("id", bookingId)
        .single();

      if (bookingError) throw bookingError;
      setBooking(bookingData);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load visit stories");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    const colors: Record<string, string> = {
      confirmed: "bg-primary text-primary-foreground",
      in_progress: "bg-blue-500 text-white",
      completed: "bg-green-500 text-white",
    };
    return colors[status || "pending"] || "bg-muted";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-grow container-padding py-8">
          <Skeleton className="h-96 w-full max-w-3xl mx-auto" />
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
        <div className="container-padding max-w-3xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(`/visit/live/${bookingId}`)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Live Tracking
          </Button>

          <Card className="glass-card p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">Live Visit Story</h1>
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">
                    {booking.properties?.title}
                  </span>
                </div>
              </div>
              <Badge className={getStatusColor(booking.status)}>
                {(booking.status || "pending").replace(/_/g, " ").toUpperCase()}
              </Badge>
            </div>
          </Card>

          <Card className="glass-card p-12 text-center">
            <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">Visit Story Feature Coming Soon</p>
            <p className="text-sm text-muted-foreground">
              Your agent will share photos and updates during the visit
            </p>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Stories automatically expire after 24 hours
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VisitStory;