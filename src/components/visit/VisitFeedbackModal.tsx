import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VisitFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  onSuccess?: () => void;
}

export const VisitFeedbackModal = ({ open, onOpenChange, bookingId, onSuccess }: VisitFeedbackModalProps) => {
  const [propertyRating, setPropertyRating] = useState(0);
  const [agentRating, setAgentRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      if (photos.length + newPhotos.length > 5) {
        toast.error("You can upload maximum 5 photos");
        return;
      }
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (propertyRating === 0 || agentRating === 0 || serviceRating === 0) {
      toast.error("Please provide all ratings");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload photos
      const photoUrls: string[] = [];
      if (photos.length > 0) {
        const feedbackId = crypto.randomUUID();
        
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const fileName = `${user.id}/${feedbackId}/photo-${i}-${Date.now()}.jpg`;
          
          const { error: uploadError, data } = await supabase.storage
            .from('visit-feedback-photos')
            .upload(fileName, photo, {
              contentType: photo.type,
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('visit-feedback-photos')
            .getPublicUrl(fileName);
          
          photoUrls.push(publicUrl);
        }
      }

      // Submit feedback
      const { error } = await supabase
        .from('visit_feedback')
        .insert({
          booking_id: bookingId,
          user_id: user.id,
          property_rating: propertyRating,
          agent_rating: agentRating,
          service_rating: serviceRating,
          rating: Math.round((propertyRating + agentRating + serviceRating) / 3),
          feedback,
          photo_urls: photoUrls
        });

      if (error) throw error;

      // Update booking status to completed
      await supabase
        .from('visit_bookings')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      toast.success("Thank you for your feedback!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast.error(error.message || "Failed to submit feedback");
    } finally {
      setUploading(false);
    }
  };

  const RatingStars = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate Your Visit Experience</DialogTitle>
          <DialogDescription>
            Help us improve by sharing your feedback and photos from the visit
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Property Rating */}
          <div>
            <Label className="mb-2 block">How was the property?</Label>
            <RatingStars value={propertyRating} onChange={setPropertyRating} />
          </div>

          {/* Agent Rating */}
          <div>
            <Label className="mb-2 block">How was the agent service?</Label>
            <RatingStars value={agentRating} onChange={setAgentRating} />
          </div>

          {/* Service Rating */}
          <div>
            <Label className="mb-2 block">Overall visit experience?</Label>
            <RatingStars value={serviceRating} onChange={setServiceRating} />
          </div>

          {/* Feedback Text */}
          <div>
            <Label htmlFor="feedback" className="mb-2 block">
              Share your thoughts (optional)
            </Label>
            <Textarea
              id="feedback"
              placeholder="Tell us about your experience..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>

          {/* Photo Upload */}
          <div>
            <Label className="mb-2 block">Upload photos (optional, max 5)</Label>
            {photos.length < 5 && (
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                  id="photo-upload"
                  disabled={uploading}
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload photos from your visit
                  </p>
                </label>
              </div>
            )}

            {/* Photo Previews */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={uploading || propertyRating === 0 || agentRating === 0 || serviceRating === 0}
              className="flex-1"
            >
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Feedback
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};