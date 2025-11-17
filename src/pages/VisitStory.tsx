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

interface StoryUpdate {
  id: string;
  update_type: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  agents: {
    name: string;
    photo_url: string;
  } | null;
}

interface VisitBooking {
  id: string;
  status: string;
  visit_date: string;
  visit_time: string;
  properties: {
    title: string;
    locality: string;
    city: string;
  } | null;
  agents: {
    name: string;
    photo_url: string;
  } | null;
}

const VisitStory = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<VisitBooking | null>(null);
  const [stories, setStories] = useState<StoryUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) {
      navigate("/");
      return;
    }
    fetchData();
    subscribeToStories();
  }, [bookingId]);

  const fetchData = async () => {
    try {
      // Fetch booking
      const { data: bookingData, error: bookingError } = await supabase
        .from("visit_bookings")
        .select(`
          *,
          properties (title, locality, city),
          agents (name, photo_url)
        `)
        .eq("id", bookingId)
        .single();

      if (bookingError) throw bookingError;
      setBooking(bookingData);

      // Fetch stories
      const { data: storiesData, error: storiesError } = await supabase
        .from("visit_story_updates")
        .select(`
          *,
          agents (name, photo_url)
        `)
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });

      if (storiesError) throw storiesError;
      setStories(storiesData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load visit stories");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToStories = () => {
    const channel = supabase
      .channel('story-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'visit_story_updates',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          console.log('New story update:', payload);
          setStories(prev => [payload.new as StoryUpdate, ...prev]);
          toast.success("New update from your agent!");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: "bg-primary text-primary-foreground",
      in_progress: "bg-blue-500 text-white",
      completed: "bg-green-500 text-white",
    };
    return colors[status] || "bg-muted";
  };

  const formatTime = (date: string) => {
    try {
      return format(new Date(date), "h:mm a");
    } catch {
      return date;
    }
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
          {/* Header */}
          <Button
            variant="ghost"
            onClick={() => navigate(`/visit/live/${bookingId}`)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Live Tracking
          </Button>

          {/* Visit Info Card */}
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
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span className="text-sm">
                    with {booking.agents?.name}
                  </span>
                </div>
              </div>
              <Badge className={getStatusColor(booking.status)}>
                {booking.status.replace(/_/g, " ").toUpperCase()}
              </Badge>
            </div>
          </Card>

          {/* Stories Feed */}
          {stories.length === 0 ? (
            <Card className="glass-card p-12 text-center">
              <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No updates yet</p>
              <p className="text-sm text-muted-foreground">
                Your agent will share photos and updates during the visit
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {stories.map((story) => (
                <Card key={story.id} className="glass-card overflow-hidden">
                  {/* Story Header */}
                  <div className="p-4 flex items-center gap-3 border-b border-border/50">
                    <img
                      src={story.agents?.photo_url || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100"}
                      alt={story.agents?.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{story.agents?.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTime(story.created_at)}
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {story.update_type}
                    </Badge>
                  </div>

                  {/* Story Content */}
                  {story.image_url && (
                    <img
                      src={story.image_url}
                      alt="Visit update"
                      className="w-full max-h-[500px] object-cover"
                    />
                  )}
                  
                  {story.content && (
                    <div className="p-4">
                      <p className="text-foreground">{story.content}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Auto-expire notice */}
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
