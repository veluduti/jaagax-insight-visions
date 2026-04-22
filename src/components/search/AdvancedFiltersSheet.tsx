import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Building2, Warehouse, MapPin, Bed, Bath, IndianRupee, Sofa,
  ParkingCircle, Layers, Waves, Dumbbell, Trees, Shield, Baby, Calendar,
  CreditCard, CheckCircle2, X, Sparkles, Zap, Compass, Ruler, UserCheck,
  Clock, FileCheck,
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
  propertyAge: string;
  listedBy: string;
  verifiedOnly: boolean;
  postedWithin: string;
  reraOnly: boolean;
  projectName: string;
  // Project-specific
  handoverBy: string;
  paymentPlan: string;
  completion: string;
  // Rent-specific
  monthlyRent: string;
  deposit: string;
  preferredTenants: string;
  availableFrom: string;
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
  propertyAge: "any",
  listedBy: "any",
  verifiedOnly: false,
  postedWithin: "any",
  reraOnly: false,
  projectName: "",
  handoverBy: "any",
  paymentPlan: "any",
  completion: "any",
  monthlyRent: "any",
  deposit: "any",
  preferredTenants: "any",
  availableFrom: "any",
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
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
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
  const priceCap = isRent ? 200000 : 200000000; // 2L/month, 20Cr
  const priceStep = isRent ? 1000 : 100000;
  const areaCap = 10000;

  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.priceMin || 0,
    filters.priceMax || priceCap,
  ]);
  const [areaRange, setAreaRange] = useState<[number, number]>([
    filters.areaMin || 0,
    filters.areaMax || areaCap,
  ]);

  useEffect(() => {
    setLocalFilters(filters);
    setPriceRange([filters.priceMin || 0, filters.priceMax || priceCap]);
    setAreaRange([filters.areaMin || 0, filters.areaMax || areaCap]);
  }, [filters, priceCap]);

  const updateFilter = <K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAmenity = (amenity: string) => {
    const current = localFilters.amenities;
    const updated = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity];
    updateFilter("amenities", updated);
  };

  const applyFilters = () => {
    const finalFilters: AdvancedFilters = {
      ...localFilters,
      priceMin: priceRange[0],
      priceMax: priceRange[1] >= priceCap ? 0 : priceRange[1],
      areaMin: areaRange[0],
      areaMax: areaRange[1] >= areaCap ? 0 : areaRange[1],
    };
    onFiltersChange(finalFilters);
    onOpenChange(false);
  };

  const clearFilters = () => {
    setLocalFilters(DEFAULT_FILTERS);
    setPriceRange([0, priceCap]);
    setAreaRange([0, areaCap]);
    onFiltersChange(DEFAULT_FILTERS);
  };

  const propertyTypes = [
    { value: "any", label: "Any", icon: Home },
    { value: "Apartment", label: "Apartment", icon: Building2 },
    { value: "Villa", label: "Villa", icon: Home },
    { value: "Penthouse", label: "Penthouse", icon: Building2 },
    { value: "Independent House", label: "House", icon: Home },
    { value: "Plot", label: "Plot", icon: MapPin },
    { value: "Office Space", label: "Office", icon: Building2 },
    { value: "Retail Shop", label: "Retail", icon: Building2 },
    { value: "Warehouse", label: "Warehouse", icon: Warehouse },
  ];

  const bedrooms = ["any", "1", "2", "3", "4", "5+"];
  const bathroomOptions = ["any", "1", "2", "3", "4+"];
  const facingOptions = ["any", "North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];
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
  const propertyAgeOptions = [
    { value: "any", label: "Any" },
    { value: "0-1", label: "<1 yr" },
    { value: "1-5", label: "1-5 yrs" },
    { value: "5-10", label: "5-10 yrs" },
    { value: "10+", label: "10+ yrs" },
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
    priceRange[0] > 0 || priceRange[1] < priceCap ? 1 : 0,
    areaRange[0] > 0 || areaRange[1] < areaCap ? 1 : 0,
    localFilters.furnishing !== "any" ? 1 : 0,
    localFilters.amenities.length > 0 ? 1 : 0,
    localFilters.floorLevel !== "any" ? 1 : 0,
    localFilters.parkingSpaces !== "any" ? 1 : 0,
    localFilters.facing !== "any" ? 1 : 0,
    localFilters.possessionStatus !== "any" ? 1 : 0,
    localFilters.propertyAge !== "any" ? 1 : 0,
    localFilters.listedBy !== "any" ? 1 : 0,
    localFilters.verifiedOnly ? 1 : 0,
    localFilters.postedWithin !== "any" ? 1 : 0,
    localFilters.reraOnly ? 1 : 0,
    localFilters.projectName ? 1 : 0,
    localFilters.handoverBy !== "any" ? 1 : 0,
    localFilters.paymentPlan !== "any" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const showPropertyFilters = activeTab === "properties" || activeTab === "transactions";
  const showProjectFilters = activeTab === "new-projects";

  // Reusable chip group
  const Chips = ({ options, value, onChange, getLabel }: {
    options: any[]; value: string; onChange: (v: string) => void;
    getLabel?: (o: any) => string;
  }) => (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value;
        const label = getLabel ? getLabel(opt) : (typeof opt === "string" ? (opt === "any" ? "Any" : opt) : opt.label);
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
          <SheetDescription className="text-xs">Refine results — production-grade filters</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Verified toggle (always) */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" />
              <Label htmlFor="verified" className="text-sm font-medium cursor-pointer">Verified Listings Only</Label>
            </div>
            <Switch
              id="verified"
              checked={localFilters.verifiedOnly}
              onCheckedChange={(v) => updateFilter("verifiedOnly", v)}
            />
          </div>

          {showProjectFilters && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <Label htmlFor="rera" className="text-sm font-medium cursor-pointer">RERA Approved Only</Label>
              </div>
              <Switch
                id="rera"
                checked={localFilters.reraOnly}
                onCheckedChange={(v) => updateFilter("reraOnly", v)}
              />
            </div>
          )}

          {/* Property Type */}
          {(showPropertyFilters || showProjectFilters) && (
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
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-primary/30"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-xs font-medium ${active ? "text-primary" : "text-foreground"}`}>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Bedrooms */}
          {showPropertyFilters && (
            <Section icon={Bed} title="Bedrooms (BHK)">
              <Chips
                options={bedrooms}
                value={localFilters.beds}
                onChange={(v) => updateFilter("beds", v)}
                getLabel={(o) => o === "any" ? "Any" : `${o} BHK`}
              />
            </Section>
          )}

          {/* Bathrooms */}
          {showPropertyFilters && (
            <Section icon={Bath} title="Bathrooms">
              <Chips
                options={bathroomOptions}
                value={localFilters.bathrooms}
                onChange={(v) => updateFilter("bathrooms", v)}
              />
            </Section>
          )}

          {/* Price Range Slider */}
          {(showPropertyFilters || showProjectFilters) && (
            <Section icon={IndianRupee} title={isRent ? "Monthly Rent" : "Price Range"}>
              <div className="px-1 space-y-3">
                <Slider
                  value={priceRange}
                  onValueChange={(v) => setPriceRange(v as [number, number])}
                  min={0}
                  max={priceCap}
                  step={priceStep}
                />
                <div className="flex justify-between items-center text-xs">
                  <span className="px-3 py-1.5 rounded-md bg-primary/10 text-primary font-semibold">
                    {priceRange[0] === 0 ? "Min" : formatINR(priceRange[0])}
                  </span>
                  <span className="text-muted-foreground">to</span>
                  <span className="px-3 py-1.5 rounded-md bg-primary/10 text-primary font-semibold">
                    {priceRange[1] >= priceCap ? "Max" : formatINR(priceRange[1])}
                  </span>
                </div>
              </div>
            </Section>
          )}

          {/* Area Slider */}
          {showPropertyFilters && (
            <Section icon={Ruler} title="Area (sq.ft)">
              <div className="px-1 space-y-3">
                <Slider
                  value={areaRange}
                  onValueChange={(v) => setAreaRange(v as [number, number])}
                  min={0}
                  max={areaCap}
                  step={50}
                />
                <div className="flex justify-between items-center text-xs">
                  <span className="px-3 py-1.5 rounded-md bg-primary/10 text-primary font-semibold">
                    {areaRange[0]} sq.ft
                  </span>
                  <span className="text-muted-foreground">to</span>
                  <span className="px-3 py-1.5 rounded-md bg-primary/10 text-primary font-semibold">
                    {areaRange[1] >= areaCap ? "10000+" : areaRange[1]} sq.ft
                  </span>
                </div>
              </div>
            </Section>
          )}

          {/* Furnishing */}
          {showPropertyFilters && (
            <Section icon={Sofa} title="Furnishing">
              <Chips
                options={furnishingOptions}
                value={localFilters.furnishing}
                onChange={(v) => updateFilter("furnishing", v)}
              />
            </Section>
          )}

          {/* Possession / Property Status */}
          {showPropertyFilters && (
            <Section icon={CheckCircle2} title="Property Status">
              <Chips
                options={possessionOptions}
                value={localFilters.possessionStatus}
                onChange={(v) => updateFilter("possessionStatus", v)}
              />
            </Section>
          )}

          {/* Floor */}
          {showPropertyFilters && (
            <Section icon={Layers} title="Floor Level">
              <Chips
                options={floorOptions}
                value={localFilters.floorLevel}
                onChange={(v) => updateFilter("floorLevel", v)}
              />
            </Section>
          )}

          {/* Facing */}
          {showPropertyFilters && (
            <Section icon={Compass} title="Facing Direction">
              <Chips
                options={facingOptions}
                value={localFilters.facing}
                onChange={(v) => updateFilter("facing", v)}
              />
            </Section>
          )}

          {/* Parking */}
          {showPropertyFilters && (
            <Section icon={ParkingCircle} title="Parking">
              <Chips
                options={parkingOptions}
                value={localFilters.parkingSpaces}
                onChange={(v) => updateFilter("parkingSpaces", v)}
              />
            </Section>
          )}

          {/* Amenities */}
          {(showPropertyFilters || showProjectFilters) && (
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
          )}

          {/* Property Age */}
          {showPropertyFilters && (
            <Section icon={Calendar} title="Property Age">
              <Chips
                options={propertyAgeOptions}
                value={localFilters.propertyAge}
                onChange={(v) => updateFilter("propertyAge", v)}
              />
            </Section>
          )}

          {/* Listed By */}
          {showPropertyFilters && (
            <Section icon={UserCheck} title="Listed By">
              <Chips
                options={listedByOptions}
                value={localFilters.listedBy}
                onChange={(v) => updateFilter("listedBy", v)}
              />
            </Section>
          )}

          {/* Posted Within */}
          {showPropertyFilters && (
            <Section icon={Clock} title="Posted Within">
              <Chips
                options={postedWithinOptions}
                value={localFilters.postedWithin}
                onChange={(v) => updateFilter("postedWithin", v)}
              />
            </Section>
          )}

          {/* Project-specific */}
          {showProjectFilters && (
            <>
              <Section icon={Building2} title="Project Name">
                <Input
                  placeholder="Search project name..."
                  value={localFilters.projectName}
                  onChange={(e) => updateFilter("projectName", e.target.value)}
                />
              </Section>

              <Section icon={Calendar} title="Handover By">
                <Chips
                  options={["any", "2025", "2026", "2027", "2028+"]}
                  value={localFilters.handoverBy}
                  onChange={(v) => updateFilter("handoverBy", v)}
                  getLabel={(o) => o === "any" ? "Any Year" : o}
                />
              </Section>

              <Section icon={CreditCard} title="Payment Plan">
                <Chips
                  options={["any", "10-90", "20-80", "30-70", "40-60", "50-50"]}
                  value={localFilters.paymentPlan}
                  onChange={(v) => updateFilter("paymentPlan", v)}
                />
              </Section>
            </>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 left-0 right-0 p-4 border-t border-border/30 bg-background flex gap-3">
          <Button variant="outline" onClick={clearFilters} className="flex-1">
            <X className="h-4 w-4 mr-2" /> Clear All
          </Button>
          <Button onClick={applyFilters} className="flex-1 bg-primary">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AdvancedFiltersSheet;
