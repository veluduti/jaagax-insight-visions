import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface EventRSVPModalProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EventRSVPModal({ event, open, onOpenChange, onSuccess }: EventRSVPModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tickets_count: 1,
    attendee_name: "",
    attendee_email: user?.email || "",
    attendee_phone: "",
    special_requests: ""
  });

  const totalAmount = event.ticket_price * formData.tickets_count;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to RSVP for events.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Check if user already has an RSVP
      const { data: existingRSVP } = await supabase
        .from('event_rsvps')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .single();

      if (existingRSVP) {
        toast({
          title: "Already Registered",
          description: "You have already RSVP'd for this event.",
          variant: "destructive"
        });
        return;
      }

      // Create RSVP
      const { error: rsvpError } = await supabase
        .from('event_rsvps')
        .insert({
          event_id: event.id,
          user_id: user.id,
          status: event.ticket_price === 0 ? 'confirmed' : 'pending',
          tickets_count: formData.tickets_count,
          total_amount: totalAmount,
          attendee_name: formData.attendee_name,
          attendee_email: formData.attendee_email,
          attendee_phone: formData.attendee_phone,
          special_requests: formData.special_requests,
          payment_status: event.ticket_price === 0 ? 'completed' : 'pending'
        });

      if (rsvpError) throw rsvpError;

      // Log the event
      await supabase.from('event_logs').insert({
        event_id: event.id,
        action: 'rsvp_created',
        user_id: user.id,
        metadata: { tickets_count: formData.tickets_count, total_amount: totalAmount }
      });

      toast({
        title: "RSVP Confirmed!",
        description: event.ticket_price === 0 
          ? "You're registered for this event. Check your email for details."
          : "Please complete payment to confirm your registration."
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('RSVP error:', error);
      toast({
        title: "RSVP Failed",
        description: error.message || "Failed to register for event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>RSVP for {event.title}</DialogTitle>
          <DialogDescription>
            Register for this event. {event.ticket_price === 0 ? "Entry is free!" : `Ticket price: ₹${event.ticket_price} per person`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tickets_count">Number of Tickets</Label>
            <Input
              id="tickets_count"
              type="number"
              min="1"
              max="10"
              value={formData.tickets_count}
              onChange={(e) => setFormData({ ...formData, tickets_count: parseInt(e.target.value) || 1 })}
              required
            />
          </div>

          <div>
            <Label htmlFor="attendee_name">Full Name</Label>
            <Input
              id="attendee_name"
              value={formData.attendee_name}
              onChange={(e) => setFormData({ ...formData, attendee_name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="attendee_email">Email</Label>
            <Input
              id="attendee_email"
              type="email"
              value={formData.attendee_email}
              onChange={(e) => setFormData({ ...formData, attendee_email: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="attendee_phone">Phone (optional)</Label>
            <Input
              id="attendee_phone"
              type="tel"
              value={formData.attendee_phone}
              onChange={(e) => setFormData({ ...formData, attendee_phone: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="special_requests">Special Requests (optional)</Label>
            <Textarea
              id="special_requests"
              value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              rows={3}
            />
          </div>

          {event.ticket_price > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Amount:</span>
                <span className="text-lg font-bold">₹{totalAmount}</span>
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {event.ticket_price === 0 ? "Confirm RSVP" : "Proceed to Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}