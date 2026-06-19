import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Search, X, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import { usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete";
import { toast } from "@/hooks/use-toast";

interface LocationSelectorProps {
  /** Called after the user picks/sets a location. */
  onSelected?: () => void;
  /** Show a back button (only used when rendered as a full-page screen). */
  showBack?: boolean;
}

const LocationSelector = ({ onSelected, showBack = false }: LocationSelectorProps) => {
  const navigate = useNavigate();
  const { selectLocation } = useLocationContext();
  const [query, setQuery] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { suggestions, loading, selectPlace } = usePlacesAutocomplete(query, {
    country: "in",
  });

  const handlePick = (placeId: string, label: string) => {
    setSelectedPlaceId(placeId);
    setQuery(label);
  };

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setSubmitting(true);
    try {
      // Prefer explicitly selected suggestion; otherwise use the first one.
      const placeId = selectedPlaceId || suggestions[0]?.placeId;
      if (!placeId) {
        toast({
          title: "Pick a location",
          description: "Choose a city or locality from the suggestions.",
          variant: "destructive",
        });
        return;
      }
      const details = await selectPlace(placeId);
      await selectLocation({
        city: details.city || details.locality || query.trim(),
        area: details.locality && details.locality !== details.city ? details.locality : "",
        latitude: details.latitude ?? null,
        longitude: details.longitude ?? null,
      });
      onSelected?.();
    } catch (err) {
      console.error("Location selection failed", err);
      toast({
        title: "Could not set location",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
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
          Search for a city, area or locality. We'll show properties within 10km.
        </p>

        {/* Search input */}
        <div className="relative mb-4">
          <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-background border border-border/50 focus-within:border-primary/50 transition-colors">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedPlaceId(null);
              }}
              placeholder="Search city, area or locality..."
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {query && !loading && (
              <button
                onClick={() => {
                  setQuery("");
                  setSelectedPlaceId(null);
                }}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {suggestions.length > 0 && !selectedPlaceId && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border/50 rounded-lg shadow-xl overflow-hidden max-h-72 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s.placeId}
                  onClick={() => handlePick(s.placeId, s.fullText)}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-secondary/60 flex items-start gap-2 border-b border-border/30 last:border-0"
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-foreground font-medium">{s.mainText}</span>
                    {s.secondaryText && (
                      <span className="text-xs text-muted-foreground">{s.secondaryText}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !query.trim()}
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Setting location...
            </>
          ) : (
            "Submit"
          )}
        </Button>
      </Card>
    </motion.div>
  );
};

export default LocationSelector;
