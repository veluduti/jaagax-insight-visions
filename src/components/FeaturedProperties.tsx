import { motion } from "framer-motion";
import { getPublicPropertyView } from "@/lib/publicPropertyView";
const toPublicRow = (row: any) => {
  const v = getPublicPropertyView(row);
  if (!v) return row;
  return { ...row, title: v.title, city: v.city ?? row.city, locality: v.locality ?? row.locality, price: v.price ?? row.price, area_sqft: v.area_sqft ?? row.area_sqft, bhk: v.bhk ?? row.bhk, bedrooms: v.bedrooms ?? row.bedrooms, bathrooms: v.bathrooms ?? row.bathrooms, type: v.type ?? row.type, images: (v.images?.length ? v.images : row.images), amenities: (v.amenities?.length ? v.amenities : row.amenities), description: v.description ?? row.description };
};
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Bed, Bath, Maximize, MapPin, Shield, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import PropertyWhyLink from "@/components/home/PropertyWhyLink";
import MatchBadge from "@/components/home/MatchBadge";
import { classifyProperty } from "@/lib/propertyClassifier";
import { canonicalizeCity, isSameCity } from "@/lib/cityNormalizer";

interface Property {
  id: string;
  slug?: string | null;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  images: any;
  verified: boolean | null;
  trust_score: number | null;
  bhk: number | null;
}

const openProperty = (p: { slug?: string | null; id: string }) => {
  window.open(`/property/${p.slug || p.id}`, "_blank", "noopener,noreferrer");
};

interface FeaturedPropertiesProps {
  detectedCity?: string;
}

const FeaturedProperties = ({ detectedCity }: FeaturedPropertiesProps) => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
    fetchFavorites();
  }, [detectedCity]);

  const fetchFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await (supabase as any)
      .from("favorites")
      .select("property_id")
      .eq("user_id", user.id);
    if (data) setFavorites(data.map((r: any) => r.property_id));
  };

  const fetchProperties = async () => {
    try {
      let query: any = (supabase.from("properties" as any).select("*") as any)
        .neq("is_draft", true)
        .not("title", "is", null)
        .not("city", "is", null);

      const { data, error } = await query
        .order("trust_score", { ascending: false })
        .limit(120);

      if (error) throw error;

      const normalizedCity = canonicalizeCity(detectedCity);

      const featured = ((data as any[]) || [])
        .map(toPublicRow)
        .filter((p) => !detectedCity || isSameCity(p.city, normalizedCity))
        .filter((p) => classifyProperty(p) === "featured")
        .slice(0, 4);

      console.log("[FeaturedProperties] Selected city:", detectedCity);
      console.log("[FeaturedProperties] Filtered properties:", featured.length, featured.map((p) => p.city));

      // NO cross-city fallback — strict location filtering.
      setProperties(featured);
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    const isFav = favorites.includes(id);
    if (isFav) {
      await (supabase as any).from("favorites").delete().eq("user_id", user.id).eq("property_id", id);
      setFavorites((prev) => prev.filter((f) => f !== id));
    } else {
      const { error } = await (supabase as any).from("favorites").insert({ user_id: user.id, property_id: id });
      if (!error) setFavorites((prev) => [...prev, id]);
    }
  };

  if (loading) {
    return (
      <section className="py-16 relative" id="properties">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        </div>
      </section>
    );
  }

  if (properties.length === 0) {
    if (!detectedCity) return null;
    return (
      <section className="section-spacing relative" id="properties">
        <div className="container mx-auto container-padding text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-md">
            Featured <span className="text-gradient">Properties</span>
            <span className="text-foreground/60 text-xl md:text-2xl"> in {detectedCity}</span>
          </h2>
          <p className="text-foreground/70 text-base md:text-lg max-w-2xl mx-auto mt-md">
            No properties available in this location yet.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-spacing relative" id="properties">
      <div className="container mx-auto container-padding">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-xl"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-md">
            Featured <span className="text-gradient">Properties</span>
            {detectedCity && <span className="text-foreground/60 text-xl md:text-2xl"> in {detectedCity}</span>}
          </h2>
          <p className="text-foreground/70 text-base md:text-lg max-w-2xl mx-auto">
            {detectedCity ? `Properties near your location verified by JaagaX AI` : 'Handpicked properties verified by JaagaX AI'}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md lg:gap-lg">
          {properties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className="card-hover overflow-hidden group cursor-pointer"
                onClick={() => openProperty(property)}
              >
                {/* Image — hidden when no image */}
                {Array.isArray(property.images) && property.images[0] ? (
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.parentElement?.classList.add("hidden");
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Match Badge - Top Right Corner (before favorite) */}
                  <MatchBadge score={property.trust_score ?? 0} />
                  
                  {/* Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(property.id);
                    }}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <Heart
                      className={`h-5 w-5 ${
                        favorites.includes(property.id)
                          ? "fill-primary text-primary"
                          : "text-foreground"
                      }`}
                    />
                  </button>

                  {/* Verified Badge */}
                  {property.verified && (
                    <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground border-0">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                ) : null}

                {/* Content */}
                <div className="p-md">
                  <div className="flex items-start justify-between mb-sm gap-sm">
                    <h3 className="font-semibold text-lg line-clamp-1 flex-1">{property.title}</h3>
                    <span className="text-primary font-bold text-lg whitespace-nowrap">
                      ₹{(property.price / 10000000).toFixed(2)} Cr
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-foreground/70 text-sm mb-md">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="line-clamp-1">{property.locality || 'N/A'}, {property.city || 'N/A'}</span>
                  </div>

                  <div className="flex items-center gap-md text-sm text-foreground/70 mb-md">
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      <span>{property.bhk || property.bedrooms || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      <span>{property.bathrooms || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Maximize className="h-4 w-4" />
                      <span>{property.area_sqft || 0} sqft</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-primary/50 hover:bg-primary/10 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      openProperty(property);
                    }}
                  >
                    View Details
                  </Button>
                  
                  {/* Why this property link */}
                  <PropertyWhyLink
                    propertyId={property.id as any}
                    verified={property.verified ?? false}
                    trustScore={property.trust_score ?? 0}
                    locality={property.locality || ''}
                  />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-xl"
        >
          <Button 
            size="lg" 
            variant="outline" 
            className="border-primary/50 hover:bg-primary/10 hover:border-primary transition-all"
            onClick={() => navigate('/search?tab=properties&tier=featured')}
          >
            View All Properties
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProperties;
