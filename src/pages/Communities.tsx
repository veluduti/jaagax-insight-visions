import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Home,
  TrendingUp,
  School,
  ShoppingCart,
  Hospital,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Community {
  name: string;
  city: string;
  description: string;
  avgPrice: number;
  propertyCount: number;
  amenities: string[];
  image: string;
}

const Communities = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>([]);
  const [cityFilter, setCityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunities();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [communities, cityFilter, searchQuery]);

  const fetchCommunities = async () => {
    try {
      // Group properties by locality to create communities
      const { data: properties, error } = await supabase
        .from("properties")
        .select("*");

      if (error) throw error;

      if (properties) {
        // Group by locality and city
        const communityMap = new Map<string, any>();

        properties.forEach((prop) => {
          const key = `${prop.city}-${prop.locality}`;
          if (!communityMap.has(key)) {
            communityMap.set(key, {
              name: prop.locality || "Unknown",
              city: prop.city || "Unknown",
              properties: [],
              totalPrice: 0,
            });
          }
          const community = communityMap.get(key);
          community.properties.push(prop);
          community.totalPrice += prop.price || 0;
        });

        // Convert to community array
        const communityList: Community[] = Array.from(communityMap.values())
          .map((comm) => ({
            name: comm.name,
            city: comm.city,
            description: `Premium residential locality in ${comm.city}`,
            avgPrice: Math.round(comm.totalPrice / comm.properties.length),
            propertyCount: comm.properties.length,
            amenities: ["Schools", "Shopping", "Hospitals", "Parks"],
            image: comm.properties[0]?.images?.[0] || "/placeholder.svg",
          }))
          .sort((a, b) => b.propertyCount - a.propertyCount);

        setCommunities(communityList);
      }
    } catch (error) {
      console.error("Error fetching communities:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...communities];

    if (cityFilter !== "all") {
      filtered = filtered.filter((comm) => comm.city === cityFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter((comm) =>
        comm.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCommunities(filtered);
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Explore Communities
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover the best localities in Hyderabad and Vijayawada
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col md:flex-row gap-4 mb-8 max-w-4xl mx-auto"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search communities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Select City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                <SelectItem value="Vijayawada">Vijayawada</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {/* Communities Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="glass-panel p-6 animate-pulse">
                  <div className="h-48 bg-muted rounded-lg mb-4" />
                  <div className="h-6 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </Card>
              ))}
            </div>
          ) : filteredCommunities.length === 0 ? (
            <div className="text-center py-16">
              <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No communities found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCommunities.map((community, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="glass-panel overflow-hidden hover:scale-105 transition-all duration-300 group cursor-pointer">
                    <div
                      className="h-48 bg-cover bg-center relative"
                      style={{ backgroundImage: `url(${community.image})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                      <Badge className="absolute top-4 right-4">
                        {community.city}
                      </Badge>
                    </div>

                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {community.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {community.description}
                      </p>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Avg Price
                            </p>
                            <p className="font-semibold text-sm">
                              ₹{(community.avgPrice / 10000000).toFixed(2)}Cr
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Properties
                            </p>
                            <p className="font-semibold text-sm">
                              {community.propertyCount}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="secondary" className="text-xs">
                          <School className="h-3 w-3 mr-1" />
                          Schools
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Shopping
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          <Hospital className="h-3 w-3 mr-1" />
                          Healthcare
                        </Badge>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() =>
                          (window.location.href = `/map?city=${community.city}&locality=${community.name}`)
                        }
                      >
                        View Properties
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Communities;
