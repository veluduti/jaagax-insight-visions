import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  hotelId: string;
  bookingId?: string | null;
  guestName: string;
  onSubmitted?: () => void;
}

export default function HotelReviewDialog({
  open, onOpenChange, hotelId, bookingId, guestName, onSubmitted,
}: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (rating < 1) return toast.error("Please choose a rating");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("hotel_reviews").insert({
        hotel_id: hotelId,
        booking_id: bookingId || null,
        guest_user_id: user?.id || null,
        guest_name: guestName || user?.email?.split("@")[0] || "Guest",
        rating, title: title.trim() || null, body: body.trim() || null,
      });
      if (error) throw error;
      toast.success("Thanks for your review!");
      onOpenChange(false);
      setRating(0); setTitle(""); setBody("");
      onSubmitted?.();
    } catch (e: any) {
      toast.error(e?.message || "Could not submit review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate your stay</DialogTitle>
          <DialogDescription>Help future guests by sharing your experience.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-1 justify-center py-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="p-1">
                <Star className={`w-8 h-8 transition-colors ${
                  (hover || rating) >= n ? "text-amber-400 fill-amber-400" : "text-muted-foreground"
                }`} />
              </button>
            ))}
          </div>
          <div>
            <Label>Title (optional)</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={120}
              placeholder="Great stay near the beach" />
          </div>
          <div>
            <Label>Details (optional)</Label>
            <Textarea rows={4} value={body} onChange={e => setBody(e.target.value)} maxLength={1000}
              placeholder="What did you like? Anything to improve?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Submit review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
