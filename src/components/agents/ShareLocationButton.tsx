import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";

interface ShareLocationButtonProps {
  bookingId: string;
  locationType?: "agent" | "vehicle";
  className?: string;
}

const ShareLocationButton = ({ 
  bookingId, 
  locationType = "agent",
  className = "" 
}: ShareLocationButtonProps) => {
  const [sharing, setSharing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const shareLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setSharing(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          const { error } = await supabase.functions.invoke("update-location", {
            body: {
              bookingId,
              lat: latitude,
              lng: longitude,
              locationType
            }
          });

          if (error) throw error;

          setLastUpdate(new Date());
          toast.success("Location shared successfully!");
        } catch (error: any) {
          console.error("Error sharing location:", error);
          toast.error(error.message || "Failed to share location");
        } finally {
          setSharing(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Failed to get your location. Please enable location services.");
        setSharing(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className={className}>
      <Button
        onClick={shareLocation}
        disabled={sharing}
        variant="default"
        size="lg"
        className="w-full"
      >
        {sharing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Sharing Location...
          </>
        ) : (
          <>
            <MapPin className="w-5 h-5 mr-2" />
            Share My Location
          </>
        )}
      </Button>
      
      {lastUpdate && (
        <p className="text-xs text-center text-muted-foreground mt-2">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
      )}

      <p className="text-xs text-center text-muted-foreground mt-2">
        Click to update your location for the customer to track
      </p>
    </div>
  );
};

export default ShareLocationButton;
