import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Bed,
  Bath,
  Maximize,
  MapPin,
  ShieldCheck,
  Image as ImageIcon,
  Compass,
  Building2,
  Trees,
  Truck,
  Sofa,
  Car,
  Droplet,
  Route,
  Home as HomeIcon,
} from "lucide-react";
import MatchBadge from "@/components/home/MatchBadge";
import {
  useFeaturedProperties,
  useFavoriteIds,
  useToggleFavorite,
} from "@/hooks/queries/useProperties";
import { useAuth } from "@/hooks/useAuth";

const openProperty = (p: { slug?: string | null; id: string }) => {
  window.open(`/property/${p.slug || p.id}`, "_blank", "noopener,noreferrer");
};

interface FeaturedPropertiesProps {
  detectedCity?: string;
}

// ---------- helpers ----------
const formatPrice = (price: number | null | undefined) => {
  if (!price || price <= 0) return null;
  if (price >= 10000000) {
    const cr = price / 10000000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
  }
  if (price >= 100000) {
    const lakh = price / 100000;
    return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} Lakh`;
  }
  return `₹${price.toLocaleString("en-IN")}`;
};

const titleCase = (s: string) =>
  s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

type Attr = { icon: React.ComponentType<{ className?: string }>; label: string };

/**
 * Pick up to 3 contextually relevant attributes based on property type & available data.
 * Never returns fields with empty/zero values.
 */
const pickAttributes = (p: any): Attr[] => {
  const type = (p.type || p.property_type || "").toLowerCase();
  const out: Attr[] = [];

  const push = (icon: Attr["icon"], label: string | null | undefined) => {
    if (!label) return;
    if (out.length >= 3) return;
    out.push({ icon, label });
  };

  const area =
    p.area_sqft && p.area_sqft > 0
      ? `${p.area_sqft.toLocaleString("en-IN")} sqft`
      : null;
  const areaYd =
    p.area_sqyd && p.area_sqyd > 0
      ? `${p.area_sqyd.toLocaleString("en-IN")} sq yd`
      : null;
  const acres = p.acres && p.acres > 0 ? `${p.acres} Acres` : null;
  const beds =
    (p.bhk || p.bedrooms) && (p.bhk || p.bedrooms) > 0
      ? `${p.bhk || p.bedrooms} Beds`
      : null;
  const baths = p.bathrooms && p.bathrooms > 0 ? `${p.bathrooms} Baths` : null;
  const facing = p.facing ? `${titleCase(p.facing)} Facing` : null;

  if (type.includes("agri") || type.includes("farm")) {
    push(Trees, acres || area);
    if (p.borewell) push(Droplet, "Borewell");
    if (p.road_access) push(Route, "Road Access");
  } else if (type.includes("plot") || type.includes("land")) {
    push(Maximize, areaYd || area);
    push(Compass, facing);
    if (p.corner_plot) push(HomeIcon, "Corner Plot");
  } else if (
    type.includes("commercial") ||
    type.includes("office") ||
    type.includes("retail") ||
    type.includes("cowork")
  ) {
    push(Building2, area);
    if (p.furnished || p.furnishing) push(Sofa, "Furnished");
    if (p.parking) push(Car, "Parking");
  } else if (type.includes("warehouse") || type.includes("industrial")) {
    push(Building2, area);
    if (p.loading_dock) push(Truck, "Loading Dock");
    if (p.truck_access) push(Route, "Truck Access");
  } else {
    // residential default: apartment / villa / house
    push(Bed, beds);
    push(Bath, baths);
    push(Maximize, area);
  }

  // Fallback: ensure at least area appears if nothing matched
  if (out.length === 0) {
    if (area) out.push({ icon: Maximize, label: area });
    if (facing && out.length < 3) out.push({ icon: Compass, label: facing });
  }

  return out;
};


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
    toggleFavoriteMutation.mutate({
      propertyId: id,
      isFav: favorites.includes(id),
    });
  };

  if (isLoading) {
    return (
      <section className="py-16 relative" id="properties">
        <div className="container mx-auto px-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
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
          <h2 className="text-3xl md:text-4xl font-bold mb-md tracking-tight">
            Featured <span className="text-gradient">Properties</span>
            {detectedCity && (
              <span className="text-foreground/60 text-xl md:text-2xl">
                {" "}in {detectedCity}
              </span>
            )}
          </h2>
          <p className="text-foreground/70 text-base md:text-lg max-w-2xl mx-auto">
            {detectedCity
              ? `Curated properties near your location, verified by JaagaX AI`
              : "Handpicked, AI-verified premium listings"}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {properties.map((property: any, index: number) => {
            const attributes = pickAttributes(property);
            const price = formatPrice(property.price);
            const hasImage =
              Array.isArray(property.images) && property.images[0];
            const isFav = favorites.includes(property.id);

            return (
              <motion.article
                key={property.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.06, 0.4), duration: 0.45 }}
                onClick={() => openProperty(property)}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card cursor-pointer shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.18)] hover:border-primary/30 transition-all duration-500"
              >
                {/* HERO IMAGE — fixed aspect ratio for uniformity */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  {hasImage ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.08]"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const t = e.currentTarget;
                        t.style.display = "none";
                        t.parentElement
                          ?.querySelector("[data-fallback]")
                          ?.classList.remove("hidden");
                      }}
                    />
                  ) : null}

                  {/* Premium placeholder */}
                  <div
                    data-fallback
                    className={`${hasImage ? "hidden" : ""} absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-muted via-muted/60 to-primary/10`}
                  >
                    <ImageIcon className="h-10 w-10 text-foreground/30 mb-2" />
                    <span className="text-xs text-foreground/40 tracking-wide">
                      Image coming soon
                    </span>
                  </div>

                  {/* Image gradient overlay (always-on subtle, stronger on hover) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" />

                  {/* Verified badge — top-left */}
                  {property.verified && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-background/85 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm border border-white/40">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      Verified
                    </div>
                  )}

                  {/* Match score — under verified badge if present */}
                  {(property.trust_score ?? 0) > 0 && (
                    <div className={`absolute ${property.verified ? "top-12" : "top-3"} left-3`}>
                      <MatchBadge score={property.trust_score ?? 0} />
                    </div>
                  )}

                  {/* Wishlist — top-right */}
                  <button
                    aria-label={isFav ? "Remove from wishlist" : "Add to wishlist"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(property.id);
                    }}
                    className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-background/85 backdrop-blur-md border border-white/40 shadow-sm hover:bg-background transition-all hover:scale-105 active:scale-95"
                  >
                    <Heart
                      className={`h-4.5 w-4.5 transition-colors ${
                        isFav ? "fill-primary text-primary" : "text-foreground/80"
                      }`}
                    />
                  </button>

                  {/* Price — overlaid at bottom of image for premium feel */}
                  {price && (
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                      <span className="text-white font-bold text-2xl tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                        {price}
                      </span>
                      {property.listing_type && (
                        <Badge
                          variant="secondary"
                          className="bg-white/90 text-foreground border-0 text-[10px] uppercase tracking-wider font-semibold"
                        >
                          For {property.listing_type}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* BODY */}
                <div className="flex flex-1 flex-col p-5">
                  {/* Title — fixed 2-line height */}
                  <h3 className="font-semibold text-[15px] leading-snug text-foreground line-clamp-2 min-h-[2.6rem]">
                    {property.title}
                  </h3>

                  {/* Location */}
                  {(property.locality || property.city) && (
                    <div className="mt-1.5 flex items-center gap-1 text-[13px] text-foreground/60">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="line-clamp-1">
                        {[property.locality, property.city]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}

                  {/* Attributes — data-driven, contextual */}
                  {attributes.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 pb-4 border-b border-border/50">
                      {attributes.map((a, i) => {
                        const Icon = a.icon;
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 text-[13px] text-foreground/75"
                          >
                            <Icon className="h-3.5 w-3.5 text-primary/70" />
                            <span className="font-medium">{a.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* CTA — pinned bottom, uniform alignment */}
                  <div className="mt-auto pt-5">
                    <Button
                      className="w-full font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        openProperty(property);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </motion.article>
            );
          })}
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
            onClick={() => navigate("/search?tab=properties")}
          >
            View All Properties
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProperties;
