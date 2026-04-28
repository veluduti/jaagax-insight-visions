import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SimilarPropertiesProps {
  city: string;
  type: string;
  currentPropertyId: string;
}

const SimilarProperties = ({ city, type, currentPropertyId }: SimilarPropertiesProps) => {
  const [properties, setProperties] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSimilarProperties();
  }, [city, type]);

  const fetchSimilarProperties = async () => {
    const { data } = await supabase
      .from("properties")
      .select("*")
      .eq("city", city)
      .neq("id", currentPropertyId)
      .eq("verified", true)
      .eq("is_live", true)
      .limit(6);

    if (data) setProperties(data);
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  if (properties.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-panel rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold mb-6">Similar Properties</h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((property, idx) => (
          <motion.div
            key={property.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => navigate(`/property/${property.id}`)}
            className="cursor-pointer group"
          >
            <Card className="overflow-hidden border-0 bg-background/50 hover:bg-background/70 transition-all">
              <div className="relative h-40 overflow-hidden">
                <img
                  src={Array.isArray(property.images) && property.images.length > 0 
                    ? property.images[0] 
                    : '/placeholder.svg'}
                  alt={property.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                {property.verified && (
                  <Badge className="absolute top-2 left-2 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-1 line-clamp-1">{property.title}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <MapPin className="h-3 w-3" />
                  {property.locality}
                </div>
                <div className="text-lg font-bold text-primary">
                  {formatPrice(property.price)}
                </div>
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  <span>{property.bedrooms} Beds</span>
                  <span>•</span>
                  <span>{property.area_sqft} sq.ft</span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default SimilarProperties;