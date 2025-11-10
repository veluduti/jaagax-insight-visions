import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const PropertySearchBar = () => {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState("buy");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("all");
  const [propertyType, setPropertyType] = useState("residential");
  const [beds, setBeds] = useState("any");
  const [budget, setBudget] = useState("any");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const popularLocations = [
    "Hyderabad",
    "Vijayawada",
    "Vizag",
    "Guntur",
    "Tirupati"
  ];

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.append('transactionType', searchType);
    if (location) params.append('city', location);
    if (status !== 'all') params.append('status', status);
    if (propertyType !== 'residential') params.append('propertyType', propertyType);
    if (beds !== 'any') params.append('beds', beds);
    if (budget !== 'any') params.append('priceRange', budget);
    
    navigate(`/map?${params.toString()}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="w-full max-w-5xl mx-auto"
    >
      {/* Main Search Card */}
      <div className="bg-card/95 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-border/50">
        {/* Transaction Type Tabs */}
        <div className="flex border-b border-border/50">
          {[
            { value: 'buy', label: 'Buy', color: 'primary' },
            { value: 'rent', label: 'Rent', color: 'primary' },
            { value: 'commercial', label: 'Commercial', color: 'primary' }
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
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

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
                className="absolute z-50 w-full mt-2 bg-card rounded-xl overflow-hidden border border-border/50 shadow-xl"
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {/* Status Filter */}
            <div className="flex gap-2">
              {['all', 'ready', 'off-plan'].map((statusOption) => (
                <button
                  key={statusOption}
                  onClick={() => setStatus(statusOption)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                    status === statusOption
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                  }`}
                >
                  {statusOption === 'off-plan' ? 'Off-Plan' : statusOption}
                </button>
              ))}
            </div>

            {/* Property Type */}
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger className="bg-secondary/30 border-border/30 hover:bg-secondary/40 h-10">
                <SelectValue placeholder="Residential" />
              </SelectTrigger>
              <SelectContent>
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
              <SelectTrigger className="bg-secondary/30 border-border/30 hover:bg-secondary/40 h-10">
                <SelectValue placeholder="Beds & Baths" />
              </SelectTrigger>
              <SelectContent>
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
              <SelectContent>
                <SelectItem value="any">Any Budget</SelectItem>
                {searchType === 'rent' ? (
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
  );
};

export default PropertySearchBar;
