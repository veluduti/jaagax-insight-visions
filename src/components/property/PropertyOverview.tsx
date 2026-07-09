import { motion } from "framer-motion";
import { MapPin, Bed, Bath, Square, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PropertyOverviewProps {
  property: {
    title: string;
    city: string;
    locality: string;
    price: number;
    area: number | null;
    beds: number;
    baths: number;
    bhk: number | null;
    status: string;
    verified: boolean;
    type?: string | null;
  };
}

const formatPrice = (price: number) => {
  if (!price || price <= 0) return null;
  if (price >= 10000000) return `${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `${(price / 100000).toFixed(2)} L`;
  return price.toLocaleString("en-IN");
};

// Property categories where bedrooms / bathrooms are meaningful.
const RESIDENTIAL_TYPES = new Set([
  "apartment", "flat", "villa", "house", "independent house",
  "penthouse", "studio", "residential", "builder floor", "row house",
]);

const isResidential = (type?: string | null) => {
  if (!type) return false;
  const t = type.toLowerCase();
  if (RESIDENTIAL_TYPES.has(t)) return true;
  return ["apartment", "flat", "villa", "house", "studio", "residential", "penthouse"]
    .some((k) => t.includes(k));
};

const PropertyOverview = ({ property }: PropertyOverviewProps) => {
  const priceLabel = formatPrice(property.price);
  const residential = isResidential(property.type);
  const showBeds = residential && property.beds > 0;
  const showBaths = residential && property.baths > 0;
  const showArea = property.area && property.area > 0;
  const showStatus = !!property.status?.trim();

  const stats: { icon: any; label: string; value: string }[] = [];
  if (showBeds) stats.push({ icon: Bed, label: "Bedrooms", value: String(property.beds) });
  if (showBaths) stats.push({ icon: Bath, label: "Bathrooms", value: String(property.baths) });
  if (showArea) stats.push({ icon: Square, label: "Area", value: `${property.area!.toLocaleString("en-IN")} sq.ft` });
  if (showStatus) stats.push({ icon: Clock, label: "Status", value: property.status });

  const gridCols =
    stats.length >= 4 ? "md:grid-cols-4" :
    stats.length === 3 ? "md:grid-cols-3" :
    stats.length === 2 ? "md:grid-cols-2" : "md:grid-cols-1";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-xl p-6"
    >
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{[property.locality, property.city].filter(Boolean).join(", ")}</span>
          </div>
        </div>
        {property.verified && (
          <Badge variant="default" className="gap-1 flex-shrink-0">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        )}
      </div>

      {priceLabel && (
        <div className="text-4xl font-bold mb-6 text-primary">
          ₹{priceLabel}
        </div>
      )}

      {stats.length > 0 && (
        <div className={`grid grid-cols-2 ${gridCols} gap-4 mb-6`}>
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <Icon className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">{label}</div>
                <div className="font-semibold">{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {residential && property.bhk ? <Badge variant="secondary">{property.bhk} BHK</Badge> : null}
        {property.type ? <Badge variant="secondary" className="capitalize">{property.type}</Badge> : null}
        {showStatus && <Badge variant="secondary">{property.status}</Badge>}
        {property.verified && <Badge variant="default">RERA Verified</Badge>}
      </div>
    </motion.div>
  );
};

export default PropertyOverview;
