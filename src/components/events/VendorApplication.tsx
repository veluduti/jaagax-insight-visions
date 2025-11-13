import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Store } from "lucide-react";

interface VendorApplicationProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VendorApplication({ eventId, open, onOpenChange }: VendorApplicationProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: "",
    vendor_type: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    description: "",
    setup_time: "09:00"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('event_vendors')
        .insert({
          event_id: eventId,
          ...formData
        });

      if (error) throw error;

      toast({
        title: "Application Submitted!",
        description: "Your vendor application has been submitted for review."
      });

      onOpenChange(false);
      setFormData({
        vendor_name: "",
        vendor_type: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        description: "",
        setup_time: "09:00"
      });
    } catch (error: any) {
      console.error('Vendor application error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Vendor Application
          </DialogTitle>
          <DialogDescription>
            Apply to participate as a vendor at this event
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vendor_name">Business Name *</Label>
              <Input
                id="vendor_name"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="vendor_type">Vendor Type *</Label>
              <Select
                value={formData.vendor_type}
                onValueChange={(value) => setFormData({ ...formData, vendor_type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food & Beverage</SelectItem>
                  <SelectItem value="retail">Retail & Merchandise</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_name">Contact Person *</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="setup_time">Preferred Setup Time</Label>
              <Input
                id="setup_time"
                type="time"
                value={formData.setup_time}
                onChange={(e) => setFormData({ ...formData, setup_time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="contact_email">Email *</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="contact_phone">Phone *</Label>
            <Input
              id="contact_phone"
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Business Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your business, products/services, and what you plan to offer at the event"
              rows={4}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Application
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
