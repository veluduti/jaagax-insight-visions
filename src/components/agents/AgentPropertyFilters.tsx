import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";

interface AgentPropertyFiltersProps {
  onFilterChange: (filters: PropertyFilters) => void;
}

export interface PropertyFilters {
  purpose: "all" | "sale" | "rent";
  type: string;
  bhk: string;
  minPrice: string;
  maxPrice: string;
  location: string;
}

const AgentPropertyFilters = ({ onFilterChange }: AgentPropertyFiltersProps) => {
  const [filters, setFilters] = useState<PropertyFilters>({
    purpose: "all",
    type: "all",
    bhk: "all",
    minPrice: "",
    maxPrice: "",
    location: "",
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: keyof PropertyFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: PropertyFilters = {
      purpose: "all",
      type: "all",
      bhk: "all",
      minPrice: "",
      maxPrice: "",
      location: "",
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className="glass-panel rounded-xl p-4 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filter Properties</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          {showAdvanced ? "Hide" : "More"} Filters
        </Button>
      </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Select
          value={filters.purpose}
          onValueChange={(value) => handleFilterChange("purpose", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Purpose" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            <SelectItem value="sale">For Sale</SelectItem>
            <SelectItem value="rent">For Rent</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.type}
          onValueChange={(value) => handleFilterChange("type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Property Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="apartment">Apartment</SelectItem>
            <SelectItem value="villa">Villa</SelectItem>
            <SelectItem value="penthouse">Penthouse</SelectItem>
            <SelectItem value="plot">Plot</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.bhk}
          onValueChange={(value) => handleFilterChange("bhk", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="BHK" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any BHK</SelectItem>
            <SelectItem value="1">1 BHK</SelectItem>
            <SelectItem value="2">2 BHK</SelectItem>
            <SelectItem value="3">3 BHK</SelectItem>
            <SelectItem value="4">4+ BHK</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Input
            placeholder="Search location..."
            value={filters.location}
            onChange={(e) => handleFilterChange("location", e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Min Price (₹)
            </label>
            <Input
              type="number"
              placeholder="Minimum price"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange("minPrice", e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Max Price (₹)
            </label>
            <Input
              type="number"
              placeholder="Maximum price"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Reset Button */}
      <Button variant="outline" size="sm" onClick={handleReset} className="w-full">
        Reset Filters
      </Button>
    </div>
  );
};

export default AgentPropertyFilters;
