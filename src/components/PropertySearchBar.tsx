import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const PropertySearchBar = () => {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState("buy");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("all");
  const [beds, setBeds] = useState("any");
  const [budget, setBudget] = useState("any");

  const handleSearch = () => {
    // Build search params
    const params = new URLSearchParams();
    if (searchType) params.append('type', searchType);
    if (location) params.append('location', location);
    if (propertyType !== 'all') params.append('propertyType', propertyType);
    if (beds !== 'any') params.append('beds', beds);
    if (budget !== 'any') params.append('budget', budget);
    
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
      className="glass-panel p-6 rounded-2xl max-w-5xl mx-auto glow-effect"
    >
      {/* Tabs */}
      <Tabs value={searchType} onValueChange={setSearchType} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-secondary/50">
          <TabsTrigger value="buy" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Buy
          </TabsTrigger>
          <TabsTrigger value="rent" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Rent
          </TabsTrigger>
          <TabsTrigger value="commercial" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Commercial
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Location Input */}
        <div className="md:col-span-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50">
          <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
          <Input 
            placeholder="City, community, or building" 
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>

        {/* Property Type */}
        <div className="md:col-span-3">
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="bg-secondary/50 border-0">
              <SelectValue placeholder="Property Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="apartment">Apartment</SelectItem>
              <SelectItem value="villa">Villa</SelectItem>
              <SelectItem value="plot">Plot</SelectItem>
              <SelectItem value="penthouse">Penthouse</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Beds & Baths */}
        <div className="md:col-span-2">
          <Select value={beds} onValueChange={setBeds}>
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

        {/* Budget Range */}
        <div className="md:col-span-2">
          <Select value={budget} onValueChange={setBudget}>
            <SelectTrigger className="bg-secondary/50 border-0">
              <SelectValue placeholder="Budget" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="50l">Under ₹50L</SelectItem>
              <SelectItem value="1cr">₹50L - ₹1Cr</SelectItem>
              <SelectItem value="2cr">₹1Cr - ₹2Cr</SelectItem>
              <SelectItem value="2cr+">Above ₹2Cr</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Button */}
        <div className="md:col-span-1">
          <Button 
            size="lg" 
            className="w-full glow-effect h-[42px]"
            onClick={handleSearch}
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Try AI Search */}
      <div className="mt-4 text-center">
        <button 
          onClick={() => navigate('/map')}
          className="text-sm text-primary hover:underline inline-flex items-center gap-2"
        >
          <span>or</span>
          <span className="font-semibold">Try JaagaXGPT for smarter search</span>
        </button>
      </div>
    </motion.div>
  );
};

export default PropertySearchBar;
