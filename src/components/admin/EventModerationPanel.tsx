import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, MapPin, Calendar, Users } from "lucide-react";

export function EventModerationPanel() {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const fetchPendingItems = async () => {
    try {
      // Fetch unverified events
      const { data: eventsData } = await supabase
        .from('community_events')
        .select('*')
        .eq('verified', false)
        .is('published_at', null)
        .order('created_at', { ascending: false });

      // Fetch pending vendors
      const { data: vendorsData } = await supabase
        .from('event_vendors')
        .select(`
          *,
          community_events (title)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setEvents(eventsData || []);
      setVendors(vendorsData || []);
    } catch (error) {
      console.error('Error fetching moderation items:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('community_events')
        .update({ 
          verified: true,
          published_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Event Approved",
        description: "The event has been verified and published."
      });

      fetchPendingItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const rejectEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('community_events')
        .update({ cancelled: true, cancellation_reason: 'Rejected by moderator' })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Event Rejected",
        description: "The event has been rejected."
      });

      fetchPendingItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateVendorStatus = async (vendorId: string, status: 'approved' | 'rejected' | 'active') => {
    try {
      const { error } = await supabase
        .from('event_vendors')
        .update({ 
          status,
          ...(status === 'approved' && { approved_at: new Date().toISOString() })
        })
        .eq('id', vendorId);

      if (error) throw error;

      toast({
        title: `Vendor ${status}`,
        description: `The vendor application has been ${status}.`
      });

      fetchPendingItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div>Loading moderation queue...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Pending Events */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Pending Events ({events.length})</h2>
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle>{event.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(event.event_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.city}, {event.locality}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {event.organizer}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Pending Review
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{event.description?.slice(0, 200)}...</p>
                <div className="flex gap-2">
                  <Button onClick={() => approveEvent(event.id)} className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Approve & Publish
                  </Button>
                  <Button onClick={() => rejectEvent(event.id)} variant="destructive" className="gap-2">
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {events.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending events to review
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Pending Vendors */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Pending Vendor Applications ({vendors.length})</h2>
        <div className="space-y-4">
          {vendors.map((vendor: any) => (
            <Card key={vendor.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{vendor.vendor_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {vendor.vendor_type} • {vendor.community_events?.title}
                    </p>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">{vendor.description}</p>
                <p className="text-sm mb-4">
                  Contact: {vendor.contact_name} ({vendor.contact_email})
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => updateVendorStatus(vendor.id, 'approved')} className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button onClick={() => updateVendorStatus(vendor.id, 'rejected')} variant="outline" className="gap-2">
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {vendors.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending vendor applications
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
