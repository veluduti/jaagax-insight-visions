import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Sparkles, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdvancedFiltersSheet, { AdvancedFilters, DEFAULT_FILTERS } from "@/components/search/AdvancedFiltersSheet";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { canSee } from "@/lib/roleAccess";
import InlineLocationSearch from "@/components/location/InlineLocationSearch";

interface PropertySearchBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  compact?: boolean; // NEW: Add compact mode
}

const PropertySearchBar = ({ activeTab, onTabChange, compact = false }: PropertySearchBarProps) => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [searchType, setSearchType] = useState("buy");
  const [location, setLocation] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(DEFAULT_FILTERS);

  // Reset filters on tab change
  useEffect(() => {
    setAdvancedFilters(DEFAULT_FILTERS);
  }, [activeTab]);

  const popularLocations = ["Hyderabad", "Vijayawada", "Vizag", "Guntur", "Tirupati"];

  const buildParams = () => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    if (location) params.set("city", location);
    if (activeTab !== "new-projects" && activeTab !== "agents") {
      params.set("type", searchType);
    }
    const f = advancedFilters;
    if (f.propertyType !== "any") params.set("propertyType", f.propertyType);
    if (f.beds !== "any") params.set("beds", f.beds);
    if (f.bathrooms !== "any") params.set("bathrooms", f.bathrooms);
    if (f.priceMin > 0) params.set("priceMin", String(f.priceMin));
    if (f.priceMax > 0) params.set("priceMax", String(f.priceMax));
    if (f.areaMin > 0) params.set("areaMin", String(f.areaMin));
    if (f.areaMax > 0) params.set("areaMax", String(f.areaMax));
    if (f.furnishing !== "any") params.set("furnishing", f.furnishing);
    if (f.amenities.length > 0) params.set("amenities", f.amenities.join(","));
    if (f.floorLevel !== "any") params.set("floorLevel", f.floorLevel);
    if (f.parkingSpaces !== "any") params.set("parking", f.parkingSpaces);
    if (f.facing !== "any") params.set("facing", f.facing);
    if (f.possessionStatus !== "any") params.set("status", f.possessionStatus);
    if (f.propertyAge !== "any") params.set("age", f.propertyAge);
    if (f.listedBy !== "any") params.set("listedBy", f.listedBy);
    if (f.verifiedOnly) params.set("verified", "1");
    if (f.postedWithin !== "any") params.set("posted", f.postedWithin);
    if (f.reraOnly) params.set("rera", "1");
    if (f.projectName) params.set("projectName", f.projectName);
    if (f.handoverBy !== "any") params.set("handoverBy", f.handoverBy);
    if (f.paymentPlan !== "any") params.set("paymentPlan", f.paymentPlan);
    return params;
  };

  const handleSearch = () => {
    const params = buildParams();
    let path = "/search";
    if (activeTab === "new-projects") path = "/projects";
    else if (activeTab === "transactions") path = "/transactions";
    else if (activeTab === "agents") path = "/agents";
    navigate(`${path}?${params.toString()}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const renderTransactionTabs = () => {
    if (activeTab === "agents" || activeTab === "new-projects") return null;
    const tabs =
      activeTab === "transactions"
        ? [
            { value: "sold", label: "Sold" },
            { value: "rented", label: "Rented" },
          ]
        : [
            { value: "buy", label: "Buy" },
            { value: "rent", label: "Rent" },
          ];
    return (
      <>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSearchType(tab.value)}
            className={`py-1.5 px-3 text-xs font-medium rounded-lg transition-all ${
              searchType === tab.value
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-background border border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </>
    );
  };

  const navItems = useMemo(() => {
    const all = [
      { key: "buyRent", label: "Properties", value: "properties" },
      { key: "newProjects", label: "New Projects", value: "new-projects" },
      { key: "transactions", label: "Transactions", value: "transactions" },
      { key: "agents", label: "Agents", value: "agents" },
    ];
    return all.filter((i) => canSee(role, i.key as any));
  }, [role]);

  // If currently active tab gets hidden by role, switch to first available
  useEffect(() => {
    if (navItems.length > 0 && !navItems.some((i) => i.value === activeTab)) {
      onTabChange(navItems[0].value);
    }
  }, [navItems, activeTab, onTabChange]);

  const showFilters = canSee(role, "searchFilters");

  // Active filter badge count
  const activeCount = [
    advancedFilters.propertyType !== "any",
    advancedFilters.beds !== "any",
    advancedFilters.bathrooms !== "any",
    advancedFilters.priceMin > 0 || advancedFilters.priceMax > 0,
    advancedFilters.areaMin > 0 || advancedFilters.areaMax > 0,
    advancedFilters.furnishing !== "any",
    advancedFilters.amenities.length > 0,
    advancedFilters.floorLevel !== "any",
    advancedFilters.parkingSpaces !== "any",
    advancedFilters.facing !== "any",
    advancedFilters.possessionStatus !== "any",
    advancedFilters.verifiedOnly,
    advancedFilters.reraOnly,
    advancedFilters.listedBy !== "any",
  ].filter(Boolean).length;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-5xl mx-auto"
      >
        <div
          className={`${
            compact
              ? "bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg p-2"
              : "bg-card/95 backdrop-blur-lg rounded-xl shadow-lg border border-border/50"
          }`}
        >
          {/* Tabs - HIDE in compact mode */}
          {!compact && (
            <div className="flex justify-center gap-6 px-4 pt-3 pb-2.5 bg-background/50 border-b border-border/30">
              {navItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => onTabChange(item.value)}
                  className={`text-sm font-medium transition-colors relative pb-1.5 ${
                    activeTab === item.value ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                  {activeTab === item.value && (
                    <motion.span
                      layoutId="activeSearchTab"
                      className="absolute -bottom-[11px] left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Form */}
          <div className={`${compact ? "p-1" : "p-3"} space-y-2`}>
            {/* Main search row */}
            <div className="flex gap-2 items-center">
              {/* Transaction tabs - Buy/Rent - HIDE in compact mode */}
              {!compact && renderTransactionTabs()}

              {/* Location input */}
              <div className={`${compact ? "flex-1" : "flex-1 min-w-[180px]"}`}>
                <InlineLocationSearch
                  variant="box"
                  placeholder="Enter location"
                  initialValue={location}
                  onTextChange={setLocation}
                  onSelected={(loc) => {
                    setLocation(loc.city || loc.locality || "");
                  }}
                  onEnterRaw={() => handleSearch()}
                />
              </div>

              {/* Search Button */}
              <Button
                className={`bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow whitespace-nowrap ${
                  compact ? "text-xs px-4 py-1.5" : "text-sm px-6 py-2"
                }`}
                onClick={handleSearch}
              >
                Search
              </Button>
            </div>

            {/* Filters row - HIDE in compact mode */}
            {!compact &&
              showFilters &&
              (activeTab === "properties" || activeTab === "transactions" || activeTab === "new-projects") && (
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowMoreFilters(true)}
                    className="h-9 text-sm bg-background/80 border-border/50 hover:bg-primary/5 hover:border-primary/30 gap-2"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>More Filters</span>
                    {activeCount > 0 && (
                      <Badge className="ml-1 bg-primary/10 text-primary border-primary/30">{activeCount}</Badge>
                    )}
                  </Button>
                </div>
              )}
          </div>
        </div>

        {/* AI Advisor text - HIDE in compact mode */}
        {!compact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-center"
          >
            <button
              onClick={() => navigate("/ai-advisor")}
              className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-primary transition-colors group"
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <span>Want to find out more about real estate using AI?</span>
              <span className="text-primary font-medium">Try AI Advisor →</span>
            </button>
          </motion.div>
        )}

        <AdvancedFiltersSheet
          open={showMoreFilters}
          onOpenChange={setShowMoreFilters}
          activeTab={activeTab}
          searchType={searchType}
          filters={advancedFilters}
          onFiltersChange={setAdvancedFilters}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default PropertySearchBar;
