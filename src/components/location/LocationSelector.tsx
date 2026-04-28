import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Crosshair, Loader2, Search, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import { INDIAN_CITIES } from "@/data/indianCities";

const POPULAR_CITIES = [
  "Hyderabad",
  "Bangalore",
  "Mumbai",
  "Pune",
  "Chennai",
  "Delhi",
  "Vijayawada",
  "Vizag",
];

interface LocationSelectorProps {
  /** Called after the user picks/sets a location. */
  onSelected?: () => void;
  /** Show a back button (only used when rendered as a full-page screen). */
  showBack?: boolean;
}

const LocationSelector = ({ onSelected, showBack = false }: LocationSelectorProps) => {
  const navigate = useNavigate();
  const { selectLocation, requestGpsLocation, isResolvingGps } = useLocationContext();
  const [query, setQuery] = useState("");
  const [skipped, setSkipped] = useState(false);

  // Slow GPS guard: after ~6s show "Skip" hint
  useEffect(() => {
    if (!isResolvingGps) return;
    const t = setTimeout(() => setSkipped(true), 6000);
    return () => clearTimeout(t);
  }, [isResolvingGps]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return INDIAN_CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  const handleManualSelect = async (city: string, area = "") => {
    await selectLocation({ city, area, latitude: null, longitude: null });
    onSelected?.();
  };

  const handleUseGps = async () => {
    setSkipped(false);
    await requestGpsLocation();
    onSelected?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto"
    >
      <Card className="glass-panel border-border/50 p-6 md:p-8">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}

        <div className="flex items-center gap-2 mb-1">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Choose your location</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          We'll show properties in your area. You can change this anytime.
        </p>

        {/* Search input */}
        <div className="relative mb-3">
          <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-background border border-border/50 focus-within:border-primary/50 transition-colors">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city, area or locality..."
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) {
                  void handleManualSelect(suggestions[0] || query.trim());
                }
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border/50 rounded-lg shadow-xl overflow-hidden">
              {suggestions.map((city) => (
                <button
                  key={city}
                  onClick={() => handleManualSelect(city)}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-secondary/60 flex items-center gap-2 border-b border-border/30 last:border-0"
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground">{city}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Use Current Location */}
        <Button
          type="button"
          onClick={handleUseGps}
          disabled={isResolvingGps}
          className="w-full mb-2"
          variant="default"
        >
          {isResolvingGps ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Getting your location...
            </>
          ) : (
            <>
              <Crosshair className="h-4 w-4 mr-2" />
              Use current location
            </>
          )}
        </Button>

        {isResolvingGps && skipped && (
          <p className="text-xs text-muted-foreground text-center mb-3">
            Taking too long? Pick a city below to continue.
          </p>
        )}

        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-border/60 flex-1" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            or popular cities
          </span>
          <div className="h-px bg-border/60 flex-1" />
        </div>

        <div className="flex flex-wrap gap-2">
          {POPULAR_CITIES.map((city) => (
            <button
              key={city}
              onClick={() => handleManualSelect(city)}
              className="px-3 py-1.5 rounded-full text-sm border border-border/60 bg-background hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors"
            >
              {city}
            </button>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};

export default LocationSelector;
