import { useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LocationSelector from "./LocationSelector";

interface LocationPillProps {
  className?: string;
}

/**
 * Compact pill that shows the user's saved location and opens a selector
 * dialog when clicked. Used in the navigation header and as a prominent
 * trigger on listing pages.
 */
const LocationPill = ({ className = "" }: LocationPillProps) => {
  const { savedLocation } = useLocationContext();
  const [open, setOpen] = useState(false);

  const label = savedLocation
    ? savedLocation.area
      ? `${savedLocation.area}, ${savedLocation.city}`
      : savedLocation.city
    : "Select location";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-border/60 bg-background/70 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors max-w-[220px] ${className}`}
        title={label}
      >
        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0 bg-transparent border-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Choose your location</DialogTitle>
          </DialogHeader>
          <LocationSelector onSelected={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LocationPill;
