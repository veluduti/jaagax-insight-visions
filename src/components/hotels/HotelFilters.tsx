import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, X, Filter, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HotelFiltersProps {
  cities: string[];
  selectedCity: string;
  onCityChange: (city: string) => void;
  starRating: number;
  onStarRatingChange: (rating: number) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  maxPrice: number;
  onReset: () => void;
  totalResults: number;
}

const HotelFilters = ({
  cities,
  selectedCity,
  onCityChange,
  starRating,
  onStarRatingChange,
  priceRange,
  onPriceRangeChange,
  maxPrice,
  onReset,
  totalResults,
}: HotelFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = selectedCity !== "all" || starRating > 0 || priceRange[0] > 0 || priceRange[1] < maxPrice;

  return (
    <div className="space-y-4">
      {/* Mobile Filter Toggle */}
      <div className="flex md:hidden items-center justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full">
              !
            </Badge>
          )}
        </Button>
        <span className="text-sm text-muted-foreground">{totalResults} hotels</span>
      </div>

      {/* Filter Bar */}
      <AnimatePresence>
        <motion.div 
          className={`bg-card border border-border/50 rounded-xl p-4 space-y-4 ${showFilters ? 'block' : 'hidden md:block'}`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* City Filter */}
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">City</label>
              <Select value={selectedCity} onValueChange={onCityChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Star Rating Filter */}
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Min. Star Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => onStarRatingChange(starRating === star ? 0 : star)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <Star 
                      className={`h-5 w-5 transition-colors ${
                        star <= starRating 
                          ? 'fill-amber-400 text-amber-400' 
                          : 'text-muted-foreground/40 hover:text-amber-400/60'
                      }`} 
                    />
                  </button>
                ))}
                {starRating > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">{starRating}+ stars</span>
                )}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Price Range: ₹{priceRange[0].toLocaleString()} - ₹{priceRange[1].toLocaleString()}
              </label>
              <Slider
                value={priceRange}
                onValueChange={(value) => onPriceRangeChange(value as [number, number])}
                max={maxPrice}
                min={0}
                step={500}
                className="w-full"
              />
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onReset}
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
          </div>

          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
              {selectedCity !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {selectedCity}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => onCityChange("all")} />
                </Badge>
              )}
              {starRating > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {starRating}+ Stars
                  <X className="h-3 w-3 cursor-pointer" onClick={() => onStarRatingChange(0)} />
                </Badge>
              )}
              {(priceRange[0] > 0 || priceRange[1] < maxPrice) && (
                <Badge variant="secondary" className="gap-1">
                  ₹{priceRange[0].toLocaleString()} - ₹{priceRange[1].toLocaleString()}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => onPriceRangeChange([0, maxPrice])} />
                </Badge>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default HotelFilters;
