import { motion } from "framer-motion";
import { MapPin, Bed, Bath, Square, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PropertyOverviewProps {
  property: {
    title: string;
    city: string;
    locality: string;
    price: number;
    area: number;
    beds: number;
    baths: number;
    bhk: number;
    status: string;
    verified: boolean;
  };
}

const PropertyOverview = ({ property }: PropertyOverviewProps) => {
  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} L`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-xl p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{property.locality}, {property.city}</span>
          </div>
        </div>
        {property.verified && (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        )}
      </div>

      <div className="text-4xl font-bold text-primary mb-6">
        {formatPrice(property.price)}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
          <Bed className="h-5 w-5 text-primary" />
          <div>
            <div className="text-sm text-muted-foreground">Bedrooms</div>
            <div className="font-semibold">{property.beds}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
          <Bath className="h-5 w-5 text-primary" />
          <div>
            <div className="text-sm text-muted-foreground">Bathrooms</div>
            <div className="font-semibold">{property.baths}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
          <Square className="h-5 w-5 text-primary" />
          <div>
            <div className="text-sm text-muted-foreground">Area</div>
            <div className="font-semibold">{property.area} sq.ft</div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="font-semibold">{property.status}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{property.bhk} BHK</Badge>
        <Badge variant="secondary">{property.status}</Badge>
        {property.verified && <Badge variant="default">RERA Verified</Badge>}
      </div>
    </motion.div>
  );
};

export default PropertyOverview;
