import { useState } from "react";
import { MapPin, ChevronDown, Crosshair, Search, PowerOff, Loader2, MapPinOff } from "lucide-react";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import LocationSelector from "./LocationSelector";

interface LocationPillProps {
  className?: string;
}

/**
 * Compact pill that shows the user's current location state and exposes 3 actions:
 *  - Use my current location (GPS)
 *  - Select city manually
 *  - Turn off location
 *
 * State reflected in label:
 *  - mode 'manual' + saved → "📍 City (manual)"
 *  - mode 'gps'    + saved → "📍 Using current location"
 *  - mode 'disabled'        → "📍 Location off"
 *  - none                   → "Select location"
 */
const LocationPill = ({ className = "" }: LocationPillProps) => {
  const {
    savedLocation,
    locationMode,
    requestGpsLocation,
    disableLocation,
    isResolvingGps,
  } = useLocationContext();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  let label: string;
  let LabelIcon = MapPin;
  if (locationMode === "disabled") {
    label = "Location off";
    LabelIcon = MapPinOff;
  } else if (locationMode === "gps" && savedLocation) {
    label = savedLocation.city
      ? `${savedLocation.city} · current`
      : "Using current location";
    LabelIcon = Crosshair;
  } else if (savedLocation) {
    label = savedLocation.area
      ? `${savedLocation.area}, ${savedLocation.city}`
      : savedLocation.city;
  } else {
    label = "Select location";
  }

  const handleUseGps = async () => {
    setPopoverOpen(false);
    await requestGpsLocation();
  };

  const handlePickManual = () => {
    setPopoverOpen(false);
    setManualOpen(true);
  };

  const handleDisable = async () => {
    setPopoverOpen(false);
    await disableLocation();
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-border/60 bg-background/70 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors max-w-[240px] ${className}`}
            title={label}
          >
            {isResolvingGps ? (
              <Loader2 className="h-3.5 w-3.5 flex-shrink-0 text-primary animate-spin" />
            ) : (
              <LabelIcon className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
            )}
            <span className="truncate">{label}</span>
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-60 p-1.5 z-[60]"
        >
          <button
            type="button"
            onClick={handleUseGps}
            disabled={isResolvingGps}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left hover:bg-secondary/60 transition-colors disabled:opacity-60"
          >
            <Crosshair className="h-4 w-4 text-primary" />
            <span>Use my current location</span>
          </button>
          <button
            type="button"
            onClick={handlePickManual}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left hover:bg-secondary/60 transition-colors"
          >
            <Search className="h-4 w-4 text-primary" />
            <span>Select city manually</span>
          </button>
          <button
            type="button"
            onClick={handleDisable}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left hover:bg-secondary/60 transition-colors text-destructive"
          >
            <PowerOff className="h-4 w-4" />
            <span>Turn off location</span>
          </button>
          {locationMode && (
            <p className="text-[10px] text-muted-foreground px-3 pt-1.5 pb-0.5 uppercase tracking-wider">
              Current: {locationMode}
            </p>
          )}
        </PopoverContent>
      </Popover>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-xl p-0 bg-transparent border-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Choose your location</DialogTitle>
          </DialogHeader>
          <LocationSelector onSelected={() => setManualOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LocationPill;
