import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Bath, BedDouble, Building2, MapPin, Ruler } from "lucide-react";

const SAMPLES = [
  {
    title: "3 BHK Premium Apartment in Gachibowli",
    type: "Apartment",
    completion_stage: "Ready",
    city: "Hyderabad",
    locality: "Gachibowli",
    price: 9500000,
    area_sqft: 1650,
    bedrooms: 3,
    bathrooms: 3,
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
    description: "Spacious 3BHK with modern amenities, modular kitchen, balcony with lake view.",
  },
  {
    title: "4 BHK Luxury Villa with Private Garden",
    type: "Villa",
    completion_stage: "Ready",
    city: "Hyderabad",
    locality: "Kokapet",
    price: 24500000,
    area_sqft: 3400,
    bedrooms: 4,
    bathrooms: 5,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    description: "Independent villa in gated community. Private garden, premium fittings, smart-home ready.",
  },
  {
    title: "2 BHK Smart Home — New Launch",
    type: "Apartment",
    completion_stage: "New Launch",
    city: "Hyderabad",
    locality: "Narsingi",
    price: 6800000,
    area_sqft: 1180,
    bedrooms: 2,
    bathrooms: 2,
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
    description: "Brand-new launch with smart automation, EV-charging, club house, jogging track.",
  },
];

const formatPrice = (val: number) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SamplePropertiesPreviewDialog = ({ open, onOpenChange }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sample Property Listings (Preview)</DialogTitle>
          <DialogDescription>
            Examples of how a complete property listing looks. These are previews only — nothing is added to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {SAMPLES.map((s, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-video bg-muted overflow-hidden">
                <img
                  src={s.image}
                  alt={s.title}
                  className="w-full h-full object-cover"
                  onError={(e) = loading="lazy" decoding="async" /> {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800";
                  }}
                />
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="text-xs">{s.type}</Badge>
                  <Badge variant="outline" className="text-xs">{s.completion_stage}</Badge>
                </div>
                <h4 className="font-semibold text-sm leading-snug line-clamp-2">{s.title}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {s.locality}, {s.city}
                </p>
                <p className="text-base font-bold text-primary">{formatPrice(s.price)}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t">
                  <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{s.bedrooms}</span>
                  <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{s.bathrooms}</span>
                  <span className="flex items-center gap-1"><Ruler className="h-3 w-3" />{s.area_sqft} sqft</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground flex items-start gap-2">
          <Building2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>This is a read-only preview to help you understand the listing format. Use the “Add Property” button to publish your own.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SamplePropertiesPreviewDialog;
