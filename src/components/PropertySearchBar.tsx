import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PropertySearchBarProps {
  activeTab: string;
}

const PropertySearchBar = ({ activeTab }: PropertySearchBarProps) => {
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

  // Render transaction type tabs based on active tab
  const renderTransactionTabs = () => {
    if (activeTab === 'agents' || activeTab === 'properties') {
      return (
        <div className="flex border-b border-border/50">
          {[
            { value: 'buy', label: 'Buy' },
            { value: 'rent', label: 'Rent' },
            ...(activeTab === 'properties' ? [{ value: 'commercial', label: 'Commercial' }] : [])
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSearchType(tab.value)}
              className={`flex-1 px-6 py-4 font-semibold text-base transition-all relative ${
                searchType === tab.value
                  ? 'text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              }`}
            >
              {tab.label}
              {searchType === tab.value && (
                <motion.div
                  layoutId="searchTypeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      );
    }
    
    if (activeTab === 'transactions') {
      return (
        <div className="flex border-b border-border/50">
          {[
            { value: 'sold', label: 'Sold' },
            { value: 'rented', label: 'Rented' }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSearchType(tab.value)}
              className={`flex-1 px-6 py-4 font-semibold text-base transition-all relative ${
                searchType === tab.value
                  ? 'text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              }`}
            >
              {tab.label}
              {searchType === tab.value && (
                <motion.div
                  layoutId="searchTypeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      );
    }
    
    return null;
  };

  // Render filters based on active tab
  const renderFilters = () => {
    if (activeTab === 'agents') {
      return null; // No filters for agents
    }

    if (activeTab === 'new-projects') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* Property Type */}
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="bg-secondary/30 border-border/30 hover:bg-secondary/40 h-10">
              <SelectValue placeholder="Residential" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="Apartment">Apartment</SelectItem>
              <SelectItem value="Villa">Villa</SelectItem>
              <SelectItem value="Penthouse">Penthouse</SelectItem>
            </SelectContent>
          </Select>

          {/* Handover By */}
          <Select value={handoverBy} onValueChange={setHandoverBy}>
            <SelectTrigger className="bg-secondary/30 border-border/30 hover:bg-secondary/40 h-10">
              <SelectValue placeholder="Handover By" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027+">2027+</SelectItem>
            </SelectContent>
          </Select>

          {/* Payment Plan */}
          <Select value={paymentPlan} onValueChange={setPaymentPlan}>
            <SelectTrigger className="bg-secondary/30 border-border/30 hover:bg-secondary/40 h-10">
              <SelectValue placeholder="Payment Plan" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="10-90">10/90</SelectItem>
              <SelectItem value="20-80">20/80</SelectItem>
              <SelectItem value="30-70">30/70</SelectItem>
              <SelectItem value="40-60">40/60</SelectItem>
              <SelectItem value="50-50">50/50</SelectItem>
            </SelectContent>
          </Select>

          {/* % Completion */}
          <Select value={completion} onValueChange={setCompletion}>
            <SelectTrigger className="bg-secondary/30 border-border/30 hover:bg-secondary/40 h-10">
              <SelectValue placeholder="% Completion" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="0-25">0-25%</SelectItem>
              <SelectItem value="25-50">25-50%</SelectItem>
              <SelectItem value="50-75">50-75%</SelectItem>
              <SelectItem value="75-100">75-100%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Properties and Transactions tabs
    return (
      <div className="space-y-3 mb-4">
        {/* Status Filter */}
        <div className="flex gap-2">
          {['all', 'ready', 'off-plan'].map((statusOption) => (
            <button
              key={statusOption}
              onClick={() => setStatus(statusOption)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all capitalize ${
                status === statusOption
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              {statusOption === 'off-plan' ? 'Off-Plan' : statusOption}
            </button>
          ))}
        </div>

        {/* Property Type, Beds, Price */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Property Type */}
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="bg-secondary/30 border-border/30 hover:bg-secondary/40 h-10">
              <SelectValue placeholder="Residential" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
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

          {/* Beds */}
          <Select value={beds} onValueChange={setBeds}>
            <SelectTrigger className="bg-secondary/30 border-border/30 hover:bg-secondary/40 h-10">
              <SelectValue placeholder="Beds" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="1">1 BHK</SelectItem>
              <SelectItem value="2">2 BHK</SelectItem>
              <SelectItem value="3">3 BHK</SelectItem>
              <SelectItem value="4">4+ BHK</SelectItem>
            </SelectContent>
          </Select>

          {/* Budget Range */}
          <Select value={budget} onValueChange={setBudget}>
            <SelectTrigger className="bg-secondary/30 border-border/30 hover:bg-secondary/40 h-10">
              <SelectValue placeholder="Price (INR)" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="any">Any Budget</SelectItem>
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
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-5xl mx-auto"
      >
        {/* Main Search Card */}
        <div className="bg-card/95 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-border/50">
          {/* Transaction Type Tabs */}
          {renderTransactionTabs()}

          {/* Search Form */}
          <div className="p-6">
            {/* Main Location Input */}
            <div className="relative mb-4">
              <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-secondary/30 hover:bg-secondary/40 transition-colors border border-border/30 focus-within:border-primary/50">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                <Input 
                  placeholder="Enter location" 
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base placeholder:text-muted-foreground"
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
                  className="absolute z-[60] w-full mt-2 bg-card rounded-xl overflow-hidden border border-border/50 shadow-xl"
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
                        className="w-full px-5 py-3 text-left hover:bg-secondary/50 transition-colors flex items-center gap-3 border-b border-border/30 last:border-0"
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{loc}</span>
                      </button>
                    ))}
                </motion.div>
              )}
            </div>

            {/* Filters Row */}
            {renderFilters()}

            {/* Search Button */}
            <Button 
              size="lg" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base h-12 rounded-xl shadow-lg hover:shadow-xl transition-all"
              onClick={handleSearch}
            >
              <Search className="h-5 w-5 mr-2" />
              Search
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PropertySearchBar;
