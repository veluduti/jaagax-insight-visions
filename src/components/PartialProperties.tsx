import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed, Bath, Maximize, MapPin, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { classifyProperty } from "@/lib/propertyClassifier";
import { getPublicPropertyView } from "@/lib/publicPropertyView";
const toPublicRow = (row: any) => {
  const v = getPublicPropertyView(row);
  if (!v) return row;
  return { ...row, title: v.title, city: v.city ?? row.city, locality: v.locality ?? row.locality, price: v.price ?? row.price, area_sqft: v.area_sqft ?? row.area_sqft, bhk: v.bhk ?? row.bhk, bedrooms: v.bedrooms ?? row.bedrooms, bathrooms: v.bathrooms ?? row.bathrooms, type: v.type ?? row.type, images: (v.images?.length ? v.images : row.images) };
};

interface Property {
  id: string;
  slug?: string | null;
  title: string;
  city: string | null;
  locality: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  images: any;
  verified: boolean | null;
  trust_score: number | null;
  bhk: number | null;
  type?: string | null;
  listing_type?: string | null;
}

const openProperty = (p: { slug?: string | null; id: string }) => {
  window.open(`/property/${p.slug || p.id}`, "_blank", "noopener,noreferrer");
};

interface PartialPropertiesProps {
  detectedCity?: string;
}

const PartialProperties = ({ detectedCity }: PartialPropertiesProps) => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartial();
  }, [detectedCity]);

  const fetchPartial = async () => {
    try {
      let query: any = (supabase.from("properties" as any).select("*") as any)
        .neq("is_draft", true)
        .not("title", "is", null)
        .not("city", "is", null);

      if (detectedCity) {
        query = query.ilike("city", `%${detectedCity}%`);
      }

      const { data, error } = await query
        .order("updated_at", { ascending: false })
        .limit(40);

      if (error) throw error;

      const partial = ((data as any[]) || [])
        .map(toPublicRow)
        .filter((p) => classifyProperty(p) === "basic")
        .slice(0, 8);

      // Fallback to other cities if none matched the detected city
      if (partial.length === 0 && detectedCity) {
        const { data: fb } = await (supabase.from("properties" as any).select("*") as any)
          .neq("is_draft", true)
          .not("title", "is", null)
          .not("city", "is", null)
          .order("updated_at", { ascending: false })
          .limit(40);
        const partialFb = ((fb as any[]) || [])
          .map(toPublicRow)
          .filter((p) => classifyProperty(p) === "basic")
          .slice(0, 8);
        setProperties(partialFb);
      } else {
        setProperties(partial);
      }
    } catch (err) {
      console.error("Error fetching partial properties:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || properties.length === 0) return null;

  return (
    <section className="section-spacing relative" id="partial-properties">
      <div className="container mx-auto container-padding">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 text-xs font-medium text-foreground/70 mb-3">
            <Info className="h-3 w-3" /> Partial listings — details still coming in
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-md">
            Partial <span className="text-gradient">Properties</span>
            {detectedCity && (
              <span className="text-foreground/60 text-xl md:text-2xl"> in {detectedCity}</span>
            )}
          </h2>
          <p className="text-foreground/70 text-base md:text-lg max-w-2xl mx-auto">
            Newly listed by agents and builders. Some details may be missing.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md lg:gap-lg">
          {properties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="card-hover overflow-hidden group cursor-pointer relative"
                onClick={() => openProperty(property)}
              >
                <div className="relative h-48 overflow-hidden bg-muted">
                  <img
                    src={
                      Array.isArray(property.images) && property.images[0]
                        ? property.images[0]
                        : "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"
                    }
                    alt={property.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 saturate-75"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800";
                    }}
                  />
                  <Badge
                    variant="secondary"
                    className="absolute top-3 left-3 bg-background/85 backdrop-blur-sm border-0 text-foreground/80"
                  >
                    Partial info
                  </Badge>
                </div>

                <div className="p-md">
                  <div className="flex items-start justify-between mb-sm gap-sm">
                    <h3 className="font-semibold text-lg line-clamp-1 flex-1">
                      {property.title}
                    </h3>
                    {property.price ? (
                      <span className="text-primary font-bold text-lg whitespace-nowrap">
                        ₹{(property.price / 10000000).toFixed(2)} Cr
                      </span>
                    ) : (
                      <span className="text-foreground/50 text-sm whitespace-nowrap">
                        Price on request
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-foreground/70 text-sm mb-md">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="line-clamp-1">
                      {property.locality || "Locality TBD"}, {property.city || "—"}
                    </span>
                  </div>

                  <div className="flex items-center gap-md text-sm text-foreground/70 mb-md">
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      <span>{property.bhk || property.bedrooms || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      <span>{property.bathrooms || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Maximize className="h-4 w-4" />
                      <span>{property.area_sqft ? `${property.area_sqft} sqft` : "—"}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-primary/40 hover:bg-primary/10 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      openProperty(property);
                    }}
                  >
                    View Available Details
                  </Button>
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
            className="border-primary/40 hover:bg-primary/10 hover:border-primary transition-all"
            onClick={() => navigate("/search?tab=properties&tier=partial")}
          >
            Explore All Listings
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default PartialProperties;
