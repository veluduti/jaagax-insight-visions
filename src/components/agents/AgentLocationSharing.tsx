import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ShareLocationButton from "./ShareLocationButton";
import { Clock, MapPin, User, Home } from "lucide-react";

interface Booking {
  id: string;
  visit_date: string;
  visit_time: string;
  status: string;
  buyer_name?: string | null;
  properties: {
    title: string;
    locality: string | null;
    city: string | null;
  } | null;
}

const AgentLocationSharing = () => {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAgent, setIsAgent] = useState(false);

  useEffect(() => {
    if (!bookingId || !user) return;
    
    fetchBookingAndVerify();
  }, [bookingId, user]);

  const fetchBookingAndVerify = async () => {
    try {
      // Fetch booking with agent info
      const { data: bookingData, error: bookingError } = await supabase
        .from("visit_bookings")
        .select(`
          *,
          properties (title, locality, city),
          agents (user_id)
        `)
        .eq("id", bookingId)
        .single();

      if (bookingError) throw bookingError;

      setBooking({
        ...bookingData,
        properties: bookingData.properties || null
      } as any);

      // Verify if current user is the assigned agent
      const agentUserId = (bookingData as any).agents?.user_id;
      setIsAgent(agentUserId === user?.id);
    } catch (error) {
      console.error("Error fetching booking:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <p className="text-center">Loading...</p>
        </Card>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">Booking not found</p>
        </Card>
      </div>
    );
  }

  if (!isAgent) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <p className="text-center text-destructive">
            You are not authorized to access this page
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card className="p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Location Sharing</h1>
          <Badge variant={booking.status === "in_progress" ? "default" : "secondary"}>
            {booking.status === "in_progress" ? "Visit In Progress" : booking.status}
          </Badge>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <Home className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">{booking.properties?.title}</p>
              <p className="text-sm text-muted-foreground">
                {booking.properties?.locality}, {booking.properties?.city}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm">
                {new Date(booking.visit_date).toLocaleDateString("en-IN")} at {booking.visit_time}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm">Visitor: {booking.buyer_name || 'N/A'}</p>
            </div>
          </div>
        </div>

        <ShareLocationButton bookingId={booking.id} />

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Share your location every few minutes so the customer can track your arrival. 
            Location sharing works best when you enable high-accuracy mode in your device settings.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AgentLocationSharing;
