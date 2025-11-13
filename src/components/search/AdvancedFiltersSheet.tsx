import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Building2,
  Warehouse,
  MapPin,
  Bed,
  IndianRupee,
  Sofa,
  ParkingCircle,
  Layers,
  Waves,
  Dumbbell,
  Trees,
  Shield,
  Baby,
  Calendar,
  CreditCard,
  CheckCircle2,
  X,
  Sparkles,
} from "lucide-react";

interface AdvancedFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: string;
  searchType: string;
  filters: {
    propertyType: string;
    beds: string;
    budget: string;
    handoverBy: string;
    paymentPlan: string;
    completion: string;
    furnishing: string;
    amenities: string[];
    floorLevel: string;
    parkingSpaces: string;
    // Rent-specific filters
    monthlyRent: string;
    deposit: string;
    preferredTenants: string;
    availableFrom: string;
    // Buy-specific filters
    possessionStatus: string;
    propertyAge: string;
  };
  onFiltersChange: (filters: any) => void;
}

const AdvancedFiltersSheet = ({
  open,
  onOpenChange,
  activeTab,
  searchType,
  filters,
  onFiltersChange,
}: AdvancedFiltersSheetProps) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [priceRange, setPriceRange] = useState([0, 100]);

  const updateFilter = (key: string, value: any) => {
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
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const clearFilters = () => {
    const cleared = {
      propertyType: "residential",
      beds: "any",
      budget: "any",
      handoverBy: "any",
      paymentPlan: "any",
      completion: "any",
      furnishing: "any",
      amenities: [],
      floorLevel: "any",
      parkingSpaces: "any",
      monthlyRent: "any",
      deposit: "any",
      preferredTenants: "any",
      availableFrom: "any",
      possessionStatus: "any",
      propertyAge: "any",
    };
    setLocalFilters(cleared);
    onFiltersChange(cleared);
  };

  const propertyTypes = [
    { value: "residential", label: "Residential", icon: Home },
    { value: "Apartment", label: "Apartment", icon: Building2 },
    { value: "Villa", label: "Villa", icon: Home },
    { value: "Penthouse", label: "Penthouse", icon: Building2 },
    { value: "Independent House", label: "House", icon: Home },
    { value: "Plot", label: "Plot", icon: MapPin },
    { value: "Office Space", label: "Office", icon: Building2 },
    { value: "Retail Shop", label: "Retail", icon: Building2 },
    { value: "Warehouse", label: "Warehouse", icon: Warehouse },
  ];

  const bedrooms = [
    { value: "any", label: "Any" },
    { value: "1", label: "1 BHK" },
    { value: "2", label: "2 BHK" },
    { value: "3", label: "3 BHK" },
    { value: "4", label: "4+ BHK" },
  ];

  const furnishingOptions = [
    { value: "any", label: "Any", icon: Sofa },
    { value: "furnished", label: "Furnished", icon: Sofa },
    { value: "semi-furnished", label: "Semi-Furnished", icon: Sofa },
    { value: "unfurnished", label: "Unfurnished", icon: Sofa },
  ];

  const floorOptions = [
    { value: "any", label: "Any Floor", icon: Layers },
    { value: "ground", label: "Ground", icon: Layers },
    { value: "low", label: "Low (1-5)", icon: Layers },
    { value: "mid", label: "Mid (6-15)", icon: Layers },
    { value: "high", label: "High (16+)", icon: Layers },
    { value: "penthouse", label: "Penthouse", icon: Sparkles },
  ];

  const parkingOptions = [
    { value: "any", label: "Any" },
    { value: "1", label: "1 Space" },
    { value: "2", label: "2 Spaces" },
    { value: "3", label: "3+ Spaces" },
  ];

  const amenitiesList = [
    { value: "Pool", label: "Swimming Pool", icon: Waves },
    { value: "Gym", label: "Gym", icon: Dumbbell },
    { value: "Garden", label: "Garden", icon: Trees },
    { value: "Security", label: "24/7 Security", icon: Shield },
    { value: "Kids Play Area", label: "Play Area", icon: Baby },
  ];

  const possessionStatusOptions = [
    { value: "any", label: "Any" },
    { value: "ready-to-move", label: "Ready to Move" },
    { value: "under-construction", label: "Under Construction" },
    { value: "new-launch", label: "New Launch" },
  ];

  const propertyAgeOptions = [
    { value: "any", label: "Any Age" },
    { value: "0-1", label: "0-1 Year" },
    { value: "1-5", label: "1-5 Years" },
    { value: "5-10", label: "5-10 Years" },
    { value: "10+", label: "10+ Years" },
  ];

  const monthlyRentOptions = [
    { value: "any", label: "Any" },
    { value: "0-10000", label: "Under ₹10,000" },
    { value: "10000-20000", label: "₹10,000 - ₹20,000" },
    { value: "20000-30000", label: "₹20,000 - ₹30,000" },
    { value: "30000-50000", label: "₹30,000 - ₹50,000" },
    { value: "50000+", label: "Above ₹50,000" },
  ];

  const depositOptions = [
    { value: "any", label: "Any" },
    { value: "1-month", label: "1 Month Rent" },
    { value: "2-months", label: "2 Months Rent" },
    { value: "3-months", label: "3 Months Rent" },
    { value: "negotiable", label: "Negotiable" },
  ];

  const tenantOptions = [
    { value: "any", label: "Any" },
    { value: "family", label: "Family" },
    { value: "bachelor", label: "Bachelor" },
    { value: "company", label: "Company" },
  ];

  const availabilityOptions = [
    { value: "any", label: "Any Time" },
    { value: "immediate", label: "Immediate" },
    { value: "15-days", label: "Within 15 Days" },
    { value: "1-month", label: "Within 1 Month" },
    { value: "custom", label: "Custom Date" },
  ];

  const activeFiltersCount = Object.values(localFilters).filter(
    (v) => v !== "any" && v !== "residential" && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto glass-panel border-l border-border/30">
        <SheetHeader className="space-y-2 pb-6 border-b border-border/30">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-neon flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              Advanced Filters
            </SheetTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30">
                {activeFiltersCount} Active
              </Badge>
            )}
          </div>
          <SheetDescription className="text-sm text-muted-foreground">
            Refine your search with precision filters
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8 py-6">
          {/* Property Type */}
          {(activeTab === "properties" || activeTab === "transactions" || activeTab === "new-projects") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Property Type
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {propertyTypes.slice(0, 6).map((type) => {
                  const Icon = type.icon;
                  const isActive = localFilters.propertyType === type.value;
                  return (
                    <motion.button
                      key={type.value}
                      onClick={() => updateFilter("propertyType", type.value)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative p-3 rounded-xl border-2 transition-all overflow-hidden group ${
                        isActive
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border/50 bg-card hover:border-primary/30 hover:bg-accent/30"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2 relative z-10">
                        <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
                          {type.label}
                        </span>
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="propertyTypeIndicator"
                          className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent-neon/10"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Bedrooms */}
          {(activeTab === "properties" || activeTab === "transactions") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Bed className="h-4 w-4 text-primary" />
                Bedrooms
              </h3>
              <div className="flex gap-2 flex-wrap">
                {bedrooms.map((bed) => {
                  const isActive = localFilters.beds === bed.value;
                  return (
                    <motion.button
                      key={bed.value}
                      onClick={() => updateFilter("beds", bed.value)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      {bed.label}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Price Range */}
          {(activeTab === "properties" || activeTab === "transactions") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" />
                Price Range
              </h3>
              <div className="space-y-4 px-2">
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="px-3 py-1 rounded-md bg-muted">
                    {searchType === "rent" ? "₹10K" : "₹50L"}
                  </span>
                  <span className="px-3 py-1 rounded-md bg-muted">
                    {searchType === "rent" ? "₹50K+" : "₹2Cr+"}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Furnishing */}
          {(activeTab === "properties" || activeTab === "transactions") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sofa className="h-4 w-4 text-primary" />
                Furnishing
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {furnishingOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = localFilters.furnishing === option.value;
                  return (
                    <motion.button
                      key={option.value}
                      onClick={() => updateFilter("furnishing", option.value)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                        isActive
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/50 text-foreground hover:border-primary/30 hover:bg-accent/30"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{option.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Floor Level */}
          {(activeTab === "properties" || activeTab === "transactions") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Floor Level
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {floorOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = localFilters.floorLevel === option.value;
                  return (
                    <motion.button
                      key={option.value}
                      onClick={() => updateFilter("floorLevel", option.value)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                        isActive
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/50 text-foreground hover:border-primary/30 hover:bg-accent/30"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium text-center">{option.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Parking */}
          {(activeTab === "properties" || activeTab === "transactions") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ParkingCircle className="h-4 w-4 text-primary" />
                Parking Spaces
              </h3>
              <div className="flex gap-2">
                {parkingOptions.map((option) => {
                  const isActive = localFilters.parkingSpaces === option.value;
                  return (
                    <motion.button
                      key={option.value}
                      onClick={() => updateFilter("parkingSpaces", option.value)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      {option.label}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Amenities */}
          {(activeTab === "properties" || activeTab === "transactions") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Amenities
              </h3>
              <div className="space-y-2">
                {amenitiesList.map((amenity) => {
                  const Icon = amenity.icon;
                  const isActive = localFilters.amenities.includes(amenity.value);
                  return (
                    <motion.button
                      key={amenity.value}
                      onClick={() => toggleAmenity(amenity.value)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-primary/30 hover:bg-accent/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isActive ? "bg-primary/20" : "bg-muted"
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <span className={`text-sm font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
                          {amenity.label}
                        </span>
                      </div>
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* RENT-SPECIFIC FILTERS */}
          {searchType === "rent" && (activeTab === "properties" || activeTab === "transactions") && (
            <>
              {/* Monthly Rent */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-primary" />
                  Monthly Rent
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {monthlyRentOptions.map((option) => {
                    const isActive = localFilters.monthlyRent === option.value;
                    return (
                      <motion.button
                        key={option.value}
                        onClick={() => updateFilter("monthlyRent", option.value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        {option.label}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Deposit */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Security Deposit
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {depositOptions.map((option) => {
                    const isActive = localFilters.deposit === option.value;
                    return (
                      <motion.button
                        key={option.value}
                        onClick={() => updateFilter("deposit", option.value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        {option.label}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Preferred Tenants */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Preferred Tenants
                </h3>
                <div className="flex gap-2">
                  {tenantOptions.map((option) => {
                    const isActive = localFilters.preferredTenants === option.value;
                    return (
                      <motion.button
                        key={option.value}
                        onClick={() => updateFilter("preferredTenants", option.value)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        {option.label}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Availability */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Available From
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {availabilityOptions.map((option) => {
                    const isActive = localFilters.availableFrom === option.value;
                    return (
                      <motion.button
                        key={option.value}
                        onClick={() => updateFilter("availableFrom", option.value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        {option.label}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}

          {/* BUY-SPECIFIC FILTERS */}
          {searchType === "buy" && (activeTab === "properties" || activeTab === "transactions") && (
            <>
              {/* Possession Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Possession Status
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {possessionStatusOptions.map((option) => {
                    const isActive = localFilters.possessionStatus === option.value;
                    return (
                      <motion.button
                        key={option.value}
                        onClick={() => updateFilter("possessionStatus", option.value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        {option.label}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Property Age */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Property Age
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {propertyAgeOptions.map((option) => {
                    const isActive = localFilters.propertyAge === option.value;
                    return (
                      <motion.button
                        key={option.value}
                        onClick={() => updateFilter("propertyAge", option.value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        {option.label}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}

          {/* New Projects Filters */}
          {activeTab === "new-projects" && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Handover Year
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {["any", "2024", "2025", "2026", "2027+"].map((year) => {
                    const isActive = localFilters.handoverBy === year;
                    return (
                      <motion.button
                        key={year}
                        onClick={() => updateFilter("handoverBy", year)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        {year === "any" ? "Any Year" : year}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-3"
              >
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Payment Plan
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {["any", "10-90", "20-80", "30-70", "40-60", "50-50"].map((plan) => {
                    const isActive = localFilters.paymentPlan === plan;
                    return (
                      <motion.button
                        key={plan}
                        onClick={() => updateFilter("paymentPlan", plan)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        {plan === "any" ? "Any" : plan}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 left-0 right-0 p-4 border-t border-border/30 bg-card/95 backdrop-blur-lg flex gap-3">
          <Button
            variant="outline"
            onClick={clearFilters}
            className="flex-1 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          >
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <Button onClick={applyFilters} className="flex-1 bg-primary hover:bg-primary/90 shadow-lg">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AdvancedFiltersSheet;
