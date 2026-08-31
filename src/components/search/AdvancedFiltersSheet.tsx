import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Home,
  Building2,
  MapPin,
  Bed,
  Bath,
  IndianRupee,
  Sofa,
  ParkingCircle,
  Layers,
  Waves,
  Dumbbell,
  Trees,
  Shield,
  Baby,
  CheckCircle2,
  X,
  Sparkles,
  Zap,
  Compass,
  Ruler,
  UserCheck,
  Clock,
  FileCheck,
  Info,
} from "lucide-react";

export interface AdvancedFilters {
  propertyType: string;
  beds: string;
  bathrooms: string;
  priceMin: number;
  priceMax: number;
  areaMin: number;
  areaMax: number;
  furnishing: string;
  amenities: string[];
  floorLevel: string;
  parkingSpaces: string;
  facing: string;
  possessionStatus: string;
  listedBy: string;
  verifiedOnly: boolean;
  postedWithin: string;
  projectName: string;
  propertyAge: string;
  reraOnly: boolean;
  handoverBy: string;
  paymentPlan: string;
}

export const DEFAULT_FILTERS: AdvancedFilters = {
  propertyType: "any",
  beds: "any",
  bathrooms: "any",
  priceMin: 0,
  priceMax: 0,
  areaMin: 0,
  areaMax: 0,
  furnishing: "any",
  amenities: [],
  floorLevel: "any",
  parkingSpaces: "any",
  facing: "any",
  possessionStatus: "any",
  listedBy: "any",
  verifiedOnly: false,
  postedWithin: "any",
  projectName: "",
};

interface AdvancedFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: string;
  searchType: string;
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
}

const formatINR = (n: number) => {
  if (!n) return "Any";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

// Parse price with shortcuts like "50L" or "2Cr"
const parsePrice = (value: string): number => {
  const clean = value.replace(/,/g, "").trim();
  if (!clean) return NaN;

  const lower = clean.toLowerCase();
  if (lower.includes("cr")) {
    const num = parseFloat(clean.replace(/[^0-9.]/g, ""));
    return num * 10000000;
  }
  if (lower.includes("l")) {
    const num = parseFloat(clean.replace(/[^0-9.]/g, ""));
    return num * 100000;
  }
  return parseFloat(clean);
};

const formatPriceInput = (value: string): string => {
  const num = parsePrice(value);
  if (isNaN(num)) return value;
  return num.toLocaleString("en-IN");
};

const AdvancedFiltersSheet = ({
  open,
  onOpenChange,
  activeTab,
  searchType,
  filters,
  onFiltersChange,
}: AdvancedFiltersSheetProps) => {
  const isRent = searchType === "rent";
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Price presets based on search type
  const pricePresets = isRent
    ? [
        { label: "Under ₹15K", min: 0, max: 15000 },
        { label: "₹15K-₹25K", min: 15000, max: 25000 },
        { label: "₹25K-₹50K", min: 25000, max: 50000 },
        { label: "₹50K-₹1L", min: 50000, max: 100000 },
        { label: "₹1L+", min: 100000, max: Infinity },
      ]
    : [
        { label: "Under ₹50L", min: 0, max: 5000000 },
        { label: "₹50L-₹1Cr", min: 5000000, max: 10000000 },
        { label: "₹1Cr-₹2Cr", min: 10000000, max: 20000000 },
        { label: "₹2Cr-₹5Cr", min: 20000000, max: 50000000 },
        { label: "₹5Cr+", min: 50000000, max: Infinity },
      ];

  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);
  const [customPriceMin, setCustomPriceMin] = useState("");
  const [customPriceMax, setCustomPriceMax] = useState("");
  const [selectedPricePreset, setSelectedPricePreset] = useState<number | null>(null);
  const [areaRange, setAreaRange] = useState<[number, number]>([filters.areaMin || 0, filters.areaMax || 10000]);

  useEffect(() => {
    setLocalFilters(filters);
    setAreaRange([filters.areaMin || 0, filters.areaMax || 10000]);
    if (filters.priceMin === 0 && filters.priceMax === 0) {
      setSelectedPricePreset(null);
      setCustomPriceMin("");
      setCustomPriceMax("");
    } else {
      // Check if current range matches any preset
      const matchedPreset = pricePresets.findIndex((p) => p.min === filters.priceMin && p.max === filters.priceMax);
      if (matchedPreset !== -1) {
        setSelectedPricePreset(matchedPreset);
        setCustomPriceMin("");
        setCustomPriceMax("");
      } else {
        setSelectedPricePreset(null);
        setCustomPriceMin(filters.priceMin ? formatINR(filters.priceMin) : "");
        setCustomPriceMax(filters.priceMax ? formatINR(filters.priceMax) : "");
      }
    }
  }, [filters]);

  const updateFilter = <K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAmenity = (amenity: string) => {
    const current = localFilters.amenities;
    const updated = current.includes(amenity) ? current.filter((a) => a !== amenity) : [...current, amenity];
    updateFilter("amenities", updated);
  };

  const handlePricePreset = (index: number) => {
    const preset = pricePresets[index];
    setSelectedPricePreset(index);
    setCustomPriceMin("");
    setCustomPriceMax("");
    // Update local filters immediately for real-time feedback
    setLocalFilters((prev) => ({
      ...prev,
      priceMin: preset.min,
      priceMax: preset.max === Infinity ? 0 : preset.max,
    }));
  };

  const handleCustomPriceApply = () => {
    const min = parsePrice(customPriceMin);
    const max = parsePrice(customPriceMax);

    if (!isNaN(min) && !isNaN(max) && min >= 0 && max > min) {
      setSelectedPricePreset(null);
      setLocalFilters((prev) => ({
        ...prev,
        priceMin: min,
        priceMax: max,
      }));
    }
  };

  const applyFilters = () => {
    const finalFilters: AdvancedFilters = {
      ...localFilters,
      areaMin: areaRange[0],
      areaMax: areaRange[1] >= 10000 ? 0 : areaRange[1],
    };
    onFiltersChange(finalFilters);
    onOpenChange(false);
  };

  const clearFilters = () => {
    setLocalFilters(DEFAULT_FILTERS);
    setAreaRange([0, 10000]);
    setSelectedPricePreset(null);
    setCustomPriceMin("");
    setCustomPriceMax("");
    onFiltersChange(DEFAULT_FILTERS);
  };

  const propertyTypes = [
    { value: "any", label: "Any", icon: Home },
    { value: "Apartment", label: "Apartment", icon: Building2 },
    { value: "Villa", label: "Villa", icon: Home },
    { value: "Independent House", label: "House", icon: Home },
    { value: "Plot", label: "Plot", icon: MapPin },
    { value: "Office Space", label: "Office", icon: Building2 },
  ];

  const bedrooms = ["any", "1", "2", "3", "4", "5+"];
  const bathroomOptions = ["any", "1", "2", "3", "4+"];
  const facingOptions = [
    "any",
    "North",
    "South",
    "East",
    "West",
    "North-East",
    "North-West",
    "South-East",
    "South-West",
  ];
  const furnishingOptions = ["any", "Furnished", "Semi-Furnished", "Unfurnished"];
  const floorOptions = [
    { value: "any", label: "Any" },
    { value: "ground", label: "Ground" },
    { value: "low", label: "1-5" },
    { value: "mid", label: "6-15" },
    { value: "high", label: "16+" },
  ];
  const parkingOptions = ["any", "1", "2", "3+"];
  const amenitiesList = [
    { value: "Gym", label: "Gym", icon: Dumbbell },
    { value: "Pool", label: "Swimming Pool", icon: Waves },
    { value: "Parking", label: "Parking", icon: ParkingCircle },
    { value: "Lift", label: "Lift", icon: Layers },
    { value: "Security", label: "24/7 Security", icon: Shield },
    { value: "Power Backup", label: "Power Backup", icon: Zap },
    { value: "Clubhouse", label: "Clubhouse", icon: Building2 },
    { value: "Garden", label: "Garden", icon: Trees },
    { value: "Kids Play Area", label: "Kids Play Area", icon: Baby },
  ];
  const possessionOptions = [
    { value: "any", label: "Any" },
    { value: "Ready", label: "Ready to Move" },
    { value: "Under Construction", label: "Under Construction" },
    { value: "New Launch", label: "New Launch" },
  ];
  const listedByOptions = [
    { value: "any", label: "Anyone" },
    { value: "builder", label: "Builder" },
    { value: "agent", label: "Agent" },
    { value: "seller", label: "Owner" },
  ];
  const postedWithinOptions = [
    { value: "any", label: "Any time" },
    { value: "1", label: "Last 24 hr" },
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 3 months" },
  ];

  // Active filter count
  const activeCount = [
    localFilters.propertyType !== "any" ? 1 : 0,
    localFilters.beds !== "any" ? 1 : 0,
    localFilters.bathrooms !== "any" ? 1 : 0,
    localFilters.priceMin > 0 || localFilters.priceMax > 0 ? 1 : 0,
    areaRange[0] > 0 || areaRange[1] < 10000 ? 1 : 0,
    localFilters.furnishing !== "any" ? 1 : 0,
    localFilters.amenities.length > 0 ? 1 : 0,
    localFilters.floorLevel !== "any" ? 1 : 0,
    localFilters.parkingSpaces !== "any" ? 1 : 0,
    localFilters.facing !== "any" ? 1 : 0,
    localFilters.possessionStatus !== "any" ? 1 : 0,
    localFilters.listedBy !== "any" ? 1 : 0,
    localFilters.verifiedOnly ? 1 : 0,
    localFilters.postedWithin !== "any" ? 1 : 0,
    localFilters.projectName ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const showPropertyFilters = activeTab === "properties" || activeTab === "transactions";

  // Reusable chip group
  const Chips = ({
    options,
    value,
    onChange,
    getLabel,
  }: {
    options: any[];
    value: string;
    onChange: (v: string) => void;
    getLabel?: (o: any) => string;
  }) => (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value;
        const label = getLabel ? getLabel(opt) : typeof opt === "string" ? (opt === "any" ? "Any" : opt) : opt.label;
        const active = value === v;
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
              active
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/50 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  const Section = ({ icon: Icon, title, children }: any) => (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      {children}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/30 sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Filters
            </SheetTitle>
            {activeCount > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30">
                {activeCount} active
              </Badge>
            )}
          </div>
          <SheetDescription className="text-xs">Find your dream property</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Verified toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" />
              <Label htmlFor="verified" className="text-sm font-medium cursor-pointer">
                Verified Listings Only
              </Label>
            </div>
            <Switch
              id="verified"
              checked={localFilters.verifiedOnly}
              onCheckedChange={(v) => updateFilter("verifiedOnly", v)}
            />
          </div>

          {/* Property Type */}
          <Section icon={Building2} title="Property Type">
            <div className="grid grid-cols-3 gap-2">
              {propertyTypes.map((type) => {
                const Icon = type.icon;
                const active = localFilters.propertyType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => updateFilter("propertyType", type.value)}
                    className={`p-2.5 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                      active ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${active ? "text-primary" : "text-foreground"}`}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Price Range - User Friendly */}
          <Section icon={IndianRupee} title={isRent ? "Monthly Rent" : "Price Range"}>
            <div className="space-y-4">
              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2">
                {pricePresets.map((preset, index) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePricePreset(index)}
                    className={`px-4 py-2 rounded-full border text-sm transition-all ${
                      selectedPricePreset === index
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-muted/50 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Range */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Min ₹ (e.g. 50L)"
                    value={customPriceMin}
                    onChange={(e) => setCustomPriceMin(e.target.value)}
                    className="h-10"
                  />
                </div>
                <span className="text-muted-foreground text-sm">to</span>
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Max ₹ (e.g. 2Cr)"
                    value={customPriceMax}
                    onChange={(e) => setCustomPriceMax(e.target.value)}
                    className="h-10"
                  />
                </div>
                <Button onClick={handleCustomPriceApply} size="sm" className="h-10 px-4">
                  Go
                </Button>
              </div>

              {/* Help text */}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Type "50L" for 50 Lakh, "2Cr" for 2 Crore
              </p>

              {/* Selected range display */}
              {(localFilters.priceMin > 0 || localFilters.priceMax > 0) && (
                <div className="text-sm bg-primary/5 p-2 rounded-lg border border-primary/20 text-center">
                  Selected: {formatINR(localFilters.priceMin)} -{" "}
                  {localFilters.priceMax === 0 ? "Any" : formatINR(localFilters.priceMax)}
                </div>
              )}
            </div>
          </Section>

          {/* BHK */}
          <Section icon={Bed} title="Bedrooms (BHK)">
            <Chips
              options={bedrooms}
              value={localFilters.beds}
              onChange={(v) => updateFilter("beds", v)}
              getLabel={(o) => (o === "any" ? "Any" : `${o} BHK`)}
            />
          </Section>

          {/* Status */}
          <Section icon={CheckCircle2} title="Property Status">
            <Chips
              options={possessionOptions}
              value={localFilters.possessionStatus}
              onChange={(v) => updateFilter("possessionStatus", v)}
            />
          </Section>

          {/* More Filters Toggle */}
          <button
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition"
          >
            <span className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              More Filters
            </span>
            <span className="text-sm text-muted-foreground">{showMoreFilters ? "▲" : "▼"}</span>
          </button>

          {showMoreFilters && (
            <div className="space-y-6 animate-in slide-in-from-top-5 duration-200">
              {/* Area */}
              <Section icon={Ruler} title="Area (sq.ft)">
                <div className="px-1 space-y-3">
                  <input
                    type="range"
                    min={0}
                    max={10000}
                    step={100}
                    value={areaRange[0]}
                    onChange={(e) => setAreaRange([Number(e.target.value), areaRange[1]])}
                    className="w-full"
                  />
                  <input
                    type="range"
                    min={0}
                    max={10000}
                    step={100}
                    value={areaRange[1]}
                    onChange={(e) => setAreaRange([areaRange[0], Number(e.target.value)])}
                    className="w-full"
                  />
                  <div className="flex justify-between items-center text-xs">
                    <span className="px-3 py-1.5 rounded-md bg-primary/10 text-primary font-semibold">
                      {areaRange[0]} sq.ft
                    </span>
                    <span className="text-muted-foreground">to</span>
                    <span className="px-3 py-1.5 rounded-md bg-primary/10 text-primary font-semibold">
                      {areaRange[1] >= 10000 ? "10000+" : areaRange[1]} sq.ft
                    </span>
                  </div>
                </div>
              </Section>

              {/* Bathrooms */}
              <Section icon={Bath} title="Bathrooms">
                <Chips
                  options={bathroomOptions}
                  value={localFilters.bathrooms}
                  onChange={(v) => updateFilter("bathrooms", v)}
                />
              </Section>

              {/* Furnishing */}
              <Section icon={Sofa} title="Furnishing">
                <Chips
                  options={furnishingOptions}
                  value={localFilters.furnishing}
                  onChange={(v) => updateFilter("furnishing", v)}
                />
              </Section>

              {/* Floor Level */}
              <Section icon={Layers} title="Floor Level">
                <Chips
                  options={floorOptions}
                  value={localFilters.floorLevel}
                  onChange={(v) => updateFilter("floorLevel", v)}
                />
              </Section>

              {/* Facing */}
              <Section icon={Compass} title="Facing Direction">
                <Chips
                  options={facingOptions}
                  value={localFilters.facing}
                  onChange={(v) => updateFilter("facing", v)}
                />
              </Section>

              {/* Parking */}
              <Section icon={ParkingCircle} title="Parking">
                <Chips
                  options={parkingOptions}
                  value={localFilters.parkingSpaces}
                  onChange={(v) => updateFilter("parkingSpaces", v)}
                />
              </Section>

              {/* Amenities */}
              <Section icon={Sparkles} title="Amenities">
                <div className="flex flex-wrap gap-2">
                  {amenitiesList.map((amenity) => {
                    const Icon = amenity.icon;
                    const active = localFilters.amenities.includes(amenity.value);
                    return (
                      <button
                        key={amenity.value}
                        onClick={() => toggleAmenity(amenity.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                          active
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-muted/50 border-border/50 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {amenity.label}
                        {active && <CheckCircle2 className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* Listed By */}
              <Section icon={UserCheck} title="Listed By">
                <Chips
                  options={listedByOptions}
                  value={localFilters.listedBy}
                  onChange={(v) => updateFilter("listedBy", v)}
                />
              </Section>

              {/* Posted Within */}
              <Section icon={Clock} title="Posted Within">
                <Chips
                  options={postedWithinOptions}
                  value={localFilters.postedWithin}
                  onChange={(v) => updateFilter("postedWithin", v)}
                />
              </Section>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 left-0 right-0 p-4 border-t border-border/30 bg-background flex gap-3">
          <Button variant="outline" onClick={clearFilters} className="flex-1">
            <X className="h-4 w-4 mr-2" /> Clear All
          </Button>
          <Button onClick={applyFilters} className="flex-1 bg-primary">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Show Results
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AdvancedFiltersSheet;
