import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PropertySearchBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const PropertySearchBar = ({ activeTab, onTabChange }: PropertySearchBarProps) => {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState("buy");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("all");
  const [propertyType, setPropertyType] = useState("residential");
  const [beds, setBeds] = useState("any");
  const [budget, setBudget] = useState("any");
  const [handoverBy, setHandoverBy] = useState("any");
  const [paymentPlan, setPaymentPlan] = useState("any");
  const [completion, setCompletion] = useState("any");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Reset filters when tab changes
  useEffect(() => {
    setStatus("all");
    setPropertyType("residential");
    setBeds("any");
    setBudget("any");
    setHandoverBy("any");
    setPaymentPlan("any");
    setCompletion("any");
  }, [activeTab]);

  const popularLocations = [
    "Hyderabad",
    "Vijayawada",
    "Vizag",
    "Guntur",
    "Tirupati"
  ];

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    // Route based on active tab
    let path = '/map';
    if (activeTab === 'new-projects') {
      path = '/projects';
      if (location) params.append('city', location);
      if (propertyType !== 'residential') params.append('propertyType', propertyType);
      if (handoverBy !== 'any') params.append('handoverBy', handoverBy);
      if (paymentPlan !== 'any') params.append('paymentPlan', paymentPlan);
      if (completion !== 'any') params.append('completion', completion);
    } else if (activeTab === 'transactions') {
      path = '/transactions';
      params.append('transactionType', searchType);
      if (location) params.append('city', location);
      if (status !== 'all') params.append('status', status);
      if (propertyType !== 'residential') params.append('propertyType', propertyType);
      if (beds !== 'any') params.append('beds', beds);
      if (budget !== 'any') params.append('priceRange', budget);
    } else if (activeTab === 'agents') {
      path = '/agents';
      params.append('transactionType', searchType);
      if (location) params.append('city', location);
    } else {
      // Properties tab
      params.append('transactionType', searchType);
      if (location) params.append('city', location);
      if (status !== 'all') params.append('status', status);
      if (propertyType !== 'residential') params.append('propertyType', propertyType);
      if (beds !== 'any') params.append('beds', beds);
      if (budget !== 'any') params.append('priceRange', budget);
    }
    
    navigate(`${path}?${params.toString()}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Render transaction type tabs - compact
  const renderTransactionTabs = () => {
    if (activeTab === 'agents') {
      return null;
    }
    
    const tabs = activeTab === 'transactions' 
      ? [{ value: 'sold', label: 'Sold' }, { value: 'rented', label: 'Rented' }]
      : [{ value: 'buy', label: 'Buy' }, { value: 'rent', label: 'Rent' }];
    
    return (
      <>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSearchType(tab.value)}
            className={`py-2.5 px-6 text-sm font-medium rounded-lg transition-all ${
              searchType === tab.value
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-background border border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </>
    );
  };

  // Render filters - compact
  const renderFilters = () => {
    if (activeTab === 'agents') {
      return null;
    }

    if (activeTab === 'new-projects') {
      return (
        <>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="h-10 text-sm bg-background border-border/50">
              <SelectValue placeholder="Residential" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-[70]">
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="Apartment">Apartment</SelectItem>
              <SelectItem value="Villa">Villa</SelectItem>
              <SelectItem value="Penthouse">Penthouse</SelectItem>
            </SelectContent>
          </Select>

          <Select value={handoverBy} onValueChange={setHandoverBy}>
            <SelectTrigger className="h-10 text-sm bg-background border-border/50">
              <SelectValue placeholder="Handover By" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-[70]">
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027+">2027+</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentPlan} onValueChange={setPaymentPlan}>
            <SelectTrigger className="h-10 text-sm bg-background border-border/50">
              <SelectValue placeholder="Payment Plan" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-[70]">
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="10-90">10/90</SelectItem>
              <SelectItem value="20-80">20/80</SelectItem>
              <SelectItem value="30-70">30/70</SelectItem>
              <SelectItem value="40-60">40/60</SelectItem>
              <SelectItem value="50-50">50/50</SelectItem>
            </SelectContent>
          </Select>

          <Select value={completion} onValueChange={setCompletion}>
            <SelectTrigger className="h-10 text-sm bg-background border-border/50">
              <SelectValue placeholder="% Completion" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-[70]">
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="0-25">0-25%</SelectItem>
              <SelectItem value="25-50">25-50%</SelectItem>
              <SelectItem value="50-75">50-75%</SelectItem>
              <SelectItem value="75-100">75-100%</SelectItem>
            </SelectContent>
          </Select>
        </>
      );
    }

    // Properties and Transactions - compact filters
    return (
      <>
        {/* Status Buttons */}
        {['all', 'ready', 'off-plan'].map((statusOption) => (
          <button
            key={statusOption}
            onClick={() => setStatus(statusOption)}
            className={`py-2 px-4 text-xs font-medium rounded-lg transition-all capitalize ${
              status === statusOption
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-background border border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {statusOption === 'off-plan' ? 'Off-Plan' : statusOption}
          </button>
        ))}

        {/* Property Type */}
        <Select value={propertyType} onValueChange={setPropertyType}>
          <SelectTrigger className="h-10 text-sm bg-background border-border/50 min-w-[140px]">
            <SelectValue placeholder="Residential" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-[70]">
            <SelectItem value="residential">Residential</SelectItem>
            {searchType !== 'commercial' ? (
              <>
                <SelectItem value="Apartment">Apartment</SelectItem>
                <SelectItem value="Villa">Villa</SelectItem>
                <SelectItem value="Independent House">Independent House</SelectItem>
                <SelectItem value="Plot">Plot</SelectItem>
                <SelectItem value="Penthouse">Penthouse</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="Office Space">Office Space</SelectItem>
                <SelectItem value="Retail Shop">Retail Shop</SelectItem>
                <SelectItem value="Warehouse">Warehouse</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>

        {/* Beds & Baths */}
        <Select value={beds} onValueChange={setBeds}>
          <SelectTrigger className="h-10 text-sm bg-background border-border/50 min-w-[130px]">
            <SelectValue placeholder="Beds & Baths" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-[70]">
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="1">1 BHK</SelectItem>
            <SelectItem value="2">2 BHK</SelectItem>
            <SelectItem value="3">3 BHK</SelectItem>
            <SelectItem value="4">4+ BHK</SelectItem>
          </SelectContent>
        </Select>

        {/* Price */}
        <Select value={budget} onValueChange={setBudget}>
          <SelectTrigger className="h-10 text-sm bg-background border-border/50 min-w-[130px]">
            <SelectValue placeholder="Price (INR)" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-[70]">
            <SelectItem value="any">Any</SelectItem>
            {searchType === 'rent' || searchType === 'rented' ? (
              <>
                <SelectItem value="10k">Under ₹10K</SelectItem>
                <SelectItem value="25k">₹10K - ₹25K</SelectItem>
                <SelectItem value="50k">₹25K - ₹50K</SelectItem>
                <SelectItem value="50k+">Above ₹50K</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="50l">Under ₹50L</SelectItem>
                <SelectItem value="1cr">₹50L - ₹1Cr</SelectItem>
                <SelectItem value="2cr">₹1Cr - ₹2Cr</SelectItem>
                <SelectItem value="2cr+">Above ₹2Cr</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </>
    );
  };

  const navItems = [
    { label: "Properties", value: "properties" },
    { label: "New Projects", value: "new-projects" },
    { label: "Transactions", value: "transactions" },
    { label: "Agents", value: "agents" },
  ];

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
        {/* Compact Search Card */}
        <div className="bg-card/95 backdrop-blur-lg rounded-xl shadow-lg overflow-hidden border border-border/50">
          {/* Navigation Tabs */}
          <div className="flex justify-center gap-6 px-4 pt-3 pb-2.5 bg-background/50 border-b border-border/30">
            {navItems.map((item) => (
              <button
                key={item.value}
                onClick={() => onTabChange(item.value)}
                className={`text-sm font-medium transition-colors relative pb-1.5 ${
                  activeTab === item.value ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
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

          {/* Search Form */}
          <div className="p-4 space-y-3">
            {/* Transaction Type + Location + Search - Single Row */}
            <div className="flex gap-2 items-center flex-wrap">
              {/* Transaction Type Tabs */}
              {renderTransactionTabs()}

              {/* Location Input */}
              <div className="relative flex-1 min-w-[250px]">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-background border border-border/50 hover:border-primary/30 focus-within:border-primary/50 transition-colors">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <Input 
                    placeholder="Enter location" 
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm placeholder:text-muted-foreground"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setShowSuggestions(e.target.value.length > 0);
                    }}
                    onFocus={() => setShowSuggestions(location.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyPress={handleKeyPress}
                  />
                </div>
                
                {/* Autocomplete Suggestions */}
                {showSuggestions && location && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-[60] w-full mt-1 bg-popover rounded-lg overflow-hidden border border-border/50 shadow-xl"
                  >
                    {popularLocations
                      .filter(loc => loc.toLowerCase().includes(location.toLowerCase()))
                      .map((loc, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setLocation(loc);
                            setShowSuggestions(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-secondary/50 transition-colors flex items-center gap-2 border-b border-border/30 last:border-0 text-sm"
                        >
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-foreground">{loc}</span>
                        </button>
                      ))}
                  </motion.div>
                )}
              </div>

              {/* Search Button */}
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm px-8 py-2.5 rounded-lg shadow hover:shadow-md transition-all"
                onClick={handleSearch}
              >
                Search
              </Button>
            </div>

            {/* Filters Row */}
            {(activeTab === 'properties' || activeTab === 'transactions' || activeTab === 'new-projects') && (
              <div className="flex gap-2 flex-wrap">
                {renderFilters()}
              </div>
            )}
          </div>
        </div>

        {/* AI Prompt */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 text-center"
        >
          <button
            onClick={() => navigate('/ai-advisor')}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <span>Want to find out more about real estate using AI?</span>
            <span className="text-primary font-medium">Try AI Advisor →</span>
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PropertySearchBar;
