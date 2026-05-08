import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Bed, Bath, Maximize, MapPin, Shield } from "lucide-react";
import PropertyWhyLink from "@/components/home/PropertyWhyLink";
import MatchBadge from "@/components/home/MatchBadge";
import { useFeaturedProperties, useFavoriteIds, useToggleFavorite } from "@/hooks/queries/useProperties";
import { useAuth } from "@/hooks/useAuth";

const openProperty = (p: { slug?: string | null; id: string }) => {
  window.open(`/property/${p.slug || p.id}`, "_blank", "noopener,noreferrer");
};

interface FeaturedPropertiesProps {
  detectedCity?: string;
}

const FeaturedProperties = ({ detectedCity }: FeaturedPropertiesProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: properties = [], isLoading } = useFeaturedProperties(detectedCity);
  const { data: favorites = [] } = useFavoriteIds(user?.id);
  const toggleFavoriteMutation = useToggleFavorite(user?.id);

  const handleToggleFavorite = (id: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    toggleFavoriteMutation.mutate({ propertyId: id, isFav: favorites.includes(id) });
  };

  if (isLoading) {
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

                  <MatchBadge score={property.trust_score ?? 0} />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(property.id);
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

                  {property.verified && (
                    <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground border-0">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                ) : null}

                <div className="p-md">
                  <div className="flex items-start justify-between mb-sm gap-sm">
                    <h3 className="font-semibold text-lg line-clamp-1 flex-1">{property.title}</h3>
                    <span className="text-primary font-bold text-lg whitespace-nowrap">
                      ₹{((property.price ?? 0) / 10000000).toFixed(2)} Cr
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
