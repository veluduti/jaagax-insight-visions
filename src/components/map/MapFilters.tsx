import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MapPin, SlidersHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MapFiltersProps {
  filters: {
    transactionType: string;
    propertyType: string;
    priceRange: number[];
    beds: string;
    verifiedOnly: boolean;
  };
  onFiltersChange: (filters: any) => void;
  currentCity: "Hyderabad" | "Vijayawada";
  onCityChange: (city: "Hyderabad" | "Vijayawada") => void;
}

const MapFilters = ({ filters, onFiltersChange, currentCity, onCityChange }: MapFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [localities, setLocalities] = useState<string[]>([]);
  const [filteredLocalities, setFilteredLocalities] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch unique localities for search
  useEffect(() => {
    const fetchLocalities = async () => {
      const { data } = await supabase
        .from("properties")
        .select("locality")
        .eq("city", currentCity);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-6 left-6 right-6 z-20 max-w-6xl mx-auto"
    >
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        {/* City Selector */}
        <div className="flex items-center gap-4 mb-4">
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
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-auto"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            {isExpanded ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>

        {/* Transaction Type Tabs */}
        <Tabs
          value={filters.transactionType}
          onValueChange={(value) => updateFilter("transactionType", value)}
        >
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-secondary/50">
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="rent">Rent</TabsTrigger>
            <TabsTrigger value="commercial">Commercial</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Main Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Location Search */}
          <div className="md:col-span-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50">
            <Search className="h-5 w-5 text-primary flex-shrink-0" />
            <Input
              placeholder="Search location or community"
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
            />
          </div>

          {/* Property Type */}
          <div className="md:col-span-3">
            <Select value={filters.propertyType} onValueChange={(value) => updateFilter("propertyType", value)}>
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
                {filters.transactionType === 'commercial' && (
                  <>
                    <SelectItem value="Office Space">Office Space</SelectItem>
                    <SelectItem value="Retail Shop">Retail Shop</SelectItem>
                    <SelectItem value="Warehouse">Warehouse</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Beds */}
          <div className="md:col-span-2">
            <Select value={filters.beds} onValueChange={(value) => updateFilter("beds", value)}>
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

          {/* Apply Button */}
          <div className="md:col-span-3">
            <Button 
              size="lg" 
              className="w-full glow-effect"
              onClick={() => {
                // Trigger filter change to refetch data
                onFiltersChange({...filters});
              }}
            >
              Apply Filters
            </Button>
          </div>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 pt-4 border-t border-border/50"
          >
            {/* Price Range */}
            <div className="space-y-3">
              <Label>Price Range</Label>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => updateFilter("priceRange", value)}
                min={1000000}
                max={50000000}
                step={500000}
                className="py-4"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>₹{(filters.priceRange[0] / 100000).toFixed(1)}L</span>
                <span>₹{(filters.priceRange[1] / 10000000).toFixed(1)}Cr</span>
              </div>
            </div>

            {/* Verified Only Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={filters.verifiedOnly}
                  onCheckedChange={(checked) => updateFilter("verifiedOnly", checked)}
                />
                <Label>Show Verified Properties Only</Label>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default MapFilters;
