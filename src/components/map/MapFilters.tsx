import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MapPin, SlidersHorizontal, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MapFiltersProps {
  filters: {
    transactionType: string;
    propertyType: string;
    priceRange: number[];
    beds: string;
    verifiedOnly: boolean;
    locality?: string;
  };
  onFiltersChange: (filters: any) => void;
  currentCity: "Hyderabad" | "Vijayawada";
  onCityChange: (city: "Hyderabad" | "Vijayawada") => void;
  isOpen: boolean;
  onClose: () => void;
}

const MapFilters = ({ filters, onFiltersChange, currentCity, onCityChange, isOpen, onClose }: MapFiltersProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Draft filters — only applied on Apply click for smooth UX
  const [draft, setDraft] = useState(filters);
  const [searchQuery, setSearchQuery] = useState(filters.locality || "");
  const [localities, setLocalities] = useState<string[]>([]);
  const [filteredLocalities, setFilteredLocalities] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sync draft when parent filters change (e.g. city change)
  useEffect(() => {
    setDraft(filters);
    setSearchQuery(filters.locality || "");
  }, [filters]);

  useEffect(() => {
    const fetchLocalities = async () => {
      const { data } = await supabase
        .from("properties")
        .select("locality")
        .ilike("city", currentCity);
      if (data) {
        const unique = [...new Set(data.map(d => d.locality).filter(Boolean))];
        setLocalities(unique);
      }
    };
    fetchLocalities();
  }, [currentCity]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = localities.filter(l =>
        l.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLocalities(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchQuery, localities]);

  const updateDraft = (key: string, value: any) => {
    setDraft({ ...draft, [key]: value });
  };

  const handleApply = () => {
    onFiltersChange({ ...draft, locality: searchQuery.trim() || undefined });
    onClose();
  };

  const handleLocalitySelect = (locality: string) => {
    setSearchQuery(locality);
    setShowSuggestions(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-6 left-6 right-6 z-30 max-w-6xl mx-auto"
        >
          <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-2xl">
            {/* Top bar */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <Select value={currentCity} onValueChange={onCityChange}>
                  <SelectTrigger className="w-40 bg-secondary/50 border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                    <SelectItem value="Vijayawada">Vijayawada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="ml-auto"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                {showAdvanced ? "Hide Advanced" : "Show Advanced"}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} title="Close filters">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <Tabs value={draft.transactionType} onValueChange={(v) => updateDraft("transactionType", v)}>
              <TabsList className="grid w-full max-w-md grid-cols-3 bg-secondary/50">
                <TabsTrigger value="buy">Buy</TabsTrigger>
                <TabsTrigger value="rent">Rent</TabsTrigger>
                <TabsTrigger value="commercial">Commercial</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Locality search */}
              <div className="md:col-span-4 relative">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50">
                  <Search className="h-5 w-5 text-primary flex-shrink-0" />
                  <Input
                    placeholder="Search locality (e.g., Gachibowli)"
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  {searchQuery && (
                    <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSearchQuery("")}>✕</button>
                  )}
                </div>
                {showSuggestions && filteredLocalities.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto">
                    {filteredLocalities.map(loc => (
                      <div key={loc} className="px-4 py-2 hover:bg-muted cursor-pointer text-sm" onMouseDown={() => handleLocalitySelect(loc)}>
                        <MapPin className="h-3 w-3 inline mr-2 text-primary" />{loc}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-3">
                <Select value={draft.propertyType} onValueChange={(v) => updateDraft("propertyType", v)}>
                  <SelectTrigger className="bg-secondary/50 border-0">
                    <SelectValue placeholder="Property Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Apartment">Apartment</SelectItem>
                    <SelectItem value="Villa">Villa</SelectItem>
                    <SelectItem value="Independent House">Independent House</SelectItem>
                    <SelectItem value="Plot">Plot</SelectItem>
                    <SelectItem value="Penthouse">Penthouse</SelectItem>
                    <SelectItem value="Office Space">Office Space</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Select value={draft.beds} onValueChange={(v) => updateDraft("beds", v)}>
                  <SelectTrigger className="bg-secondary/50 border-0">
                    <SelectValue placeholder="Beds" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="1">1 BHK</SelectItem>
                    <SelectItem value="2">2 BHK</SelectItem>
                    <SelectItem value="3">3 BHK</SelectItem>
                    <SelectItem value="4">4+ BHK</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3">
                <Button size="lg" className="w-full glow-effect" onClick={handleApply}>
                  Apply Filters
                </Button>
              </div>
            </div>

            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-4 pt-4 border-t border-border/50"
              >
                <div className="space-y-3">
                  <Label>Price Range</Label>
                  <Slider
                    value={draft.priceRange}
                    onValueChange={(v) => updateDraft("priceRange", v)}
                    min={1000000}
                    max={50000000}
                    step={500000}
                    className="py-4"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>₹{(draft.priceRange[0] / 100000).toFixed(1)}L</span>
                    <span>₹{(draft.priceRange[1] / 10000000).toFixed(1)}Cr</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={draft.verifiedOnly}
                      onCheckedChange={(checked) => updateDraft("verifiedOnly", checked)}
                    />
                    <Label>Show Verified Properties Only</Label>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MapFilters;
