import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, MapPin, Clock, Users, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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

    setLoading(true);

    try {
      const tagsArray = formData.tags.split(",").map(tag => tag.trim()).filter(Boolean);
      
      const { data, error } = await supabase
        .from("community_events")
        .insert([
          {
            title: formData.title,
            description: formData.description,
            venue: formData.venue,
            venue_address: formData.venue_address,
            city: formData.city,
            locality: formData.locality || null,
            event_date: formData.event_date,
            event_time: formData.event_time || null,
            end_date: formData.end_date || null,
            end_time: formData.end_time || null,
            organizer: formData.organizer,
            organizer_email: formData.organizer_email,
            organizer_contact: formData.organizer_contact || null,
            category: formData.category,
            max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
            ticket_price: parseFloat(formData.ticket_price),
            tags: tagsArray.length > 0 ? tagsArray : null,
            created_by: user.id,
            published_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Event created!",
        description: "Your event has been successfully created and published.",
      });

      navigate(`/events/${data.id}`);
    } catch (error: any) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto max-w-4xl py-8 px-4 mt-20">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-3xl">Create Community Event</CardTitle>
            <CardDescription>
              Share your event with the community and connect with local residents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Event Details
                </h3>
                
                <div>
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Summer Music Festival 2025"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your event, activities, and what attendees can expect..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    >
                      <option value="community">Community</option>
                      <option value="cultural">Cultural</option>
                      <option value="sports">Sports</option>
                      <option value="education">Education</option>
                      <option value="networking">Networking</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="music, outdoor, family-friendly"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Location
                </h3>

                <div>
                  <Label htmlFor="venue">Venue Name *</Label>
                  <Input
                    id="venue"
                    required
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="Central Park Amphitheater"
                  />
                </div>

                <div>
                  <Label htmlFor="venue_address">Venue Address</Label>
                  <Input
                    id="venue_address"
                    value={formData.venue_address}
                    onChange={(e) => setFormData({ ...formData, venue_address: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Hyderabad"
                    />
                  </div>

                  <div>
                    <Label htmlFor="locality">Locality</Label>
                    <Input
                      id="locality"
                      value={formData.locality}
                      onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                      placeholder="Banjara Hills"
                    />
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Schedule
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event_date">Start Date *</Label>
                    <Input
                      id="event_date"
                      type="date"
                      required
                      value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="event_time">Start Time</Label>
                    <Input
                      id="event_time"
                      type="time"
                      value={formData.event_time}
                      onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Organizer Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Organizer Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="organizer">Organizer Name *</Label>
                    <Input
                      id="organizer"
                      required
                      value={formData.organizer}
                      onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <Label htmlFor="organizer_email">Organizer Email *</Label>
                    <Input
                      id="organizer_email"
                      type="email"
                      required
                      value={formData.organizer_email}
                      onChange={(e) => setFormData({ ...formData, organizer_email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="organizer_contact">Contact Number</Label>
                    <Input
                      id="organizer_contact"
                      type="tel"
                      value={formData.organizer_contact}
                      onChange={(e) => setFormData({ ...formData, organizer_contact: e.target.value })}
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>
              </div>

              {/* Ticketing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Ticketing & Capacity</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max_attendees">Maximum Attendees</Label>
                    <Input
                      id="max_attendees"
                      type="number"
                      min="0"
                      value={formData.max_attendees}
                      onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value })}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ticket_price">Ticket Price (₹)</Label>
                    <Input
                      id="ticket_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.ticket_price}
                      onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
                      placeholder="0 for free events"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Creating..." : "Create Event"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/events")}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
