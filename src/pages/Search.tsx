import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PropertySearchBar from "@/components/PropertySearchBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Bed, Bath, Square, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface Property {
  id: number;
  title: string;
  city: string;
  locality: string;
  price: number;
  area: number;
  beds: number;
  baths: number;
  bhk: number;
  type: string;
  images: string[];
  verified: boolean;
  trust_score: number;
}

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState("properties");

  useEffect(() => {
    const query = searchParams.get("q");
    const city = searchParams.get("city");
    const type = searchParams.get("type");
    
    if (query || city || type) {
      searchProperties(query, city, type);
    } else {
      fetchAllProperties();
    }
  }, [searchParams]);

  const searchProperties = async (query: string | null, city: string | null, type: string | null) => {
    setLoading(true);
    try {
      let queryBuilder = supabase
        .from("properties")
        .select("*", { count: "exact" })
        .eq("verified", true);

      if (query) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,locality.ilike.%${query}%,city.ilike.%${query}%`);
      }
      if (city) {
        queryBuilder = queryBuilder.eq("city", city);
      }
      if (type) {
        queryBuilder = queryBuilder.eq("type", type);
      }

      const { data, error, count } = await queryBuilder
        .order("trust_score", { ascending: false })
        .limit(50);

      if (error) throw error;
      setProperties(data || []);
      setTotal(count || 0);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProperties = async () => {
    setLoading(true);
    const { data, error, count } = await supabase
      .from("properties")
      .select("*", { count: "exact" })
      .eq("verified", true)
      .order("trust_score", { ascending: false })
      .limit(50);

    if (!error) {
      setProperties(data || []);
      setTotal(count || 0);
    }
    setLoading(false);
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-24 pb-16">
        <div className="container-padding max-w-7xl mx-auto">
          {/* Search Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold mb-4 text-gradient">
              Search Properties
            </h1>
            <p className="text-muted-foreground mb-6">
              {total > 0 ? `Found ${total} properties` : "Search for your dream property"}
            </p>
            
            <PropertySearchBar activeTab={activeTab} onTabChange={setActiveTab} />
          </motion.div>

          {/* Results */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : properties.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="glass-card p-12 max-w-md mx-auto">
                <p className="text-xl text-muted-foreground mb-4">
                  No properties found
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Try adjusting your search criteria
                </p>
                <Button onClick={() => navigate("/")}>
                  Back to Home
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {properties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="glass-card hover:scale-[1.02] transition-all cursor-pointer group overflow-hidden"
                    onClick={() => navigate(`/property/${property.id}`)}
                  >
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={property.images?.[0] || "/placeholder.svg"}
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-3 right-3 flex gap-2">
                        {property.verified && (
                          <Badge className="bg-primary/90 backdrop-blur">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                          {property.title}
                        </h3>
                        <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                          <TrendingUp className="w-3 h-3" />
                          {property.trust_score}
                        </Badge>
                      </div>

                      <div className="flex items-center text-sm text-muted-foreground gap-1">
                        <MapPin className="w-4 h-4" />
                        <span className="line-clamp-1">
                          {property.locality}, {property.city}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xl font-bold text-primary">
                          {formatPrice(property.price)}
                        </span>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {property.beds && (
                            <span className="flex items-center gap-1">
                              <Bed className="w-4 h-4" />
                              {property.beds}
                            </span>
                          )}
                          {property.baths && (
                            <span className="flex items-center gap-1">
                              <Bath className="w-4 h-4" />
                              {property.baths}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Square className="w-4 h-4" />
                            {property.area} sq.ft
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Search;
