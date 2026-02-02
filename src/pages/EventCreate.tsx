import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Clock, Users, Tag, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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
    city: "Hyderabad",
    locality: "",
    event_date: "",
    event_time: "",
    end_date: "",
    end_time: "",
    organizer: "",
    organizer_email: "",
    organizer_contact: "",
    category: "community",
    max_attendees: "",
    ticket_price: "0",
    tags: "",
    image_url: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

    if (!formData.title || !formData.venue || !formData.city || !formData.event_date) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('community_events')
      .insert({
        title: formData.title,
        description: formData.description || null,
        venue: formData.venue,
        venue_address: formData.venue_address || null,
        city: formData.city,
        locality: formData.locality || null,
        event_date: formData.event_date,
        event_time: formData.event_time || null,
        end_date: formData.end_date || null,
        end_time: formData.end_time || null,
        organizer: formData.organizer || user.email,
        organizer_email: formData.organizer_email || user.email,
        organizer_contact: formData.organizer_contact || null,
        organizer_id: user.id,
        category: formData.category,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        ticket_price: parseFloat(formData.ticket_price) || 0,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        image_url: formData.image_url || null,
        published_at: new Date().toISOString(),
        status: 'upcoming',
      });

    setLoading(false);

    if (error) {
      toast({
        title: "Error creating event",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Event created!",
        description: "Your event has been published successfully.",
      });
      navigate("/events");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container mx-auto max-w-4xl py-8 px-4 mt-20">
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-xl font-semibold mb-4">Sign in to create events</h3>
              <Button onClick={() => navigate("/auth")}>Sign In</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto max-w-4xl py-8 px-4 mt-20">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Calendar className="h-8 w-8 text-primary" />
              Create Community Event
            </CardTitle>
            <CardDescription>
              Share your event with the community. All fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Event Details</h3>
                
                <div>
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="e.g., Community Diwali Celebration"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Describe your event..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="festival">Festival</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="image_url">Event Image URL</Label>
                  <Input
                    id="image_url"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => handleChange('image_url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Date & Time
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event_date">Start Date *</Label>
                    <Input
                      id="event_date"
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => handleChange('event_date', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="event_time">Start Time</Label>
                    <Input
                      id="event_time"
                      type="time"
                      value={formData.event_time}
                      onChange={(e) => handleChange('event_time', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleChange('end_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => handleChange('end_time', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Venue */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Venue
                </h3>
                
                <div>
                  <Label htmlFor="venue">Venue Name *</Label>
                  <Input
                    id="venue"
                    value={formData.venue}
                    onChange={(e) => handleChange('venue', e.target.value)}
                    placeholder="e.g., Community Center"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="venue_address">Venue Address</Label>
                  <Input
                    id="venue_address"
                    value={formData.venue_address}
                    onChange={(e) => handleChange('venue_address', e.target.value)}
                    placeholder="Full address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Select value={formData.city} onValueChange={(v) => handleChange('city', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                        <SelectItem value="Vijayawada">Vijayawada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="locality">Locality</Label>
                    <Input
                      id="locality"
                      value={formData.locality}
                      onChange={(e) => handleChange('locality', e.target.value)}
                      placeholder="e.g., Banjara Hills"
                    />
                  </div>
                </div>
              </div>

              {/* Capacity & Pricing */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Capacity & Pricing
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max_attendees">Max Attendees</Label>
                    <Input
                      id="max_attendees"
                      type="number"
                      value={formData.max_attendees}
                      onChange={(e) => handleChange('max_attendees', e.target.value)}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ticket_price">Ticket Price (₹)</Label>
                    <Input
                      id="ticket_price"
                      type="number"
                      value={formData.ticket_price}
                      onChange={(e) => handleChange('ticket_price', e.target.value)}
                      placeholder="0 for free events"
                    />
                  </div>
                </div>
              </div>

              {/* Organizer */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Organizer Info
                </h3>
                
                <div>
                  <Label htmlFor="organizer">Organizer Name</Label>
                  <Input
                    id="organizer"
                    value={formData.organizer}
                    onChange={(e) => handleChange('organizer', e.target.value)}
                    placeholder="Your name or organization"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="organizer_email">Contact Email</Label>
                    <Input
                      id="organizer_email"
                      type="email"
                      value={formData.organizer_email}
                      onChange={(e) => handleChange('organizer_email', e.target.value)}
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="organizer_contact">Contact Phone</Label>
                    <Input
                      id="organizer_contact"
                      value={formData.organizer_contact}
                      onChange={(e) => handleChange('organizer_contact', e.target.value)}
                      placeholder="+91 ..."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    placeholder="e.g., music, outdoor, family"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate("/events")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Event
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
