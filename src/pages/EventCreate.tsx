import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, MapPin, Clock, Users, Tag, Construction } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Stub component - community_events table not yet created
export default function EventCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    venue: "",
    venue_address: "",
    city: "",
    locality: "",
    event_date: "",
    event_time: "",
    end_date: "",
    end_time: "",
    organizer: "",
    organizer_email: "",
    organizer_contact: "",
    category: "community" as const,
    max_attendees: "",
    ticket_price: "0",
    tags: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create an event",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    toast({
      title: "Coming Soon",
      description: "Event creation will be available once the community_events table is set up.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto max-w-4xl py-8 px-4 mt-20">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Construction className="h-8 w-8 text-primary" />
              Create Community Event
            </CardTitle>
            <CardDescription>
              This feature is coming soon. The community events system is being set up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Construction className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Feature Under Development</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                The community events system requires database setup. Please check back soon!
              </p>
              <Button onClick={() => navigate("/events")}>
                Back to Events
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
