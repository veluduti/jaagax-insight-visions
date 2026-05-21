import { MapPin, Loader2 } from "lucide-react";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * In-app prompt asking the user to share their location.
 *
 * IMPORTANT: this dialog shows in-app only. The native browser permission popup
 * is triggered from the "Allow" button's onClick — i.e. a real user gesture —
 * which is the only reliable way to get the OS-level prompt to appear.
 */
const LocationPermissionDialog = () => {
  const {
    pendingGpsPrompt,
    dismissGpsPrompt,
    requestGpsLocation,
    isResolvingGps,
  } = useLocationContext();

  const handleAllow = async () => {
    // Must run synchronously from the click handler so the browser treats it
    // as a user gesture and shows the native permission popup.
    await requestGpsLocation();
  };

  return (
    <Dialog
      open={pendingGpsPrompt}
      onOpenChange={(open) => {
        if (!open) dismissGpsPrompt(false);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Show properties near you?</DialogTitle>
          <DialogDescription className="text-center">
            Allow location access so we can show properties and projects in your city.
            You can change this anytime from the location pill in the header.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            onClick={handleAllow}
            disabled={isResolvingGps}
            className="w-full"
          >
            {isResolvingGps ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Getting your location…
              </>
            ) : (
              <>Allow location</>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => dismissGpsPrompt(false)}
            disabled={isResolvingGps}
            className="w-full"
          >
            Not now — I'll pick a city manually
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPermissionDialog;
