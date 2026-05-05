import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, Ruler, Bath, BedDouble, Verified, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BookingModal from "@/components/property/BookingModal";
import { useState } from "react";

interface Property {
  id: string;
  title: string;
  city: string;
  locality: string;
  price: number;
  bhk: number | null;
  type: string | null;
  verified: boolean | null;
  description: string | null;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  images: string[] | null;
  address: string | null;
}

interface ReelPropertyDrawerProps {
  open: boolean;
  onClose: () => void;
  property: Property | null;
  activeTab?: "details" | "book";
}

const formatPrice = (price: number) => {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(0)} L`;
  return `₹${price.toLocaleString()}`;
};

export default function ReelPropertyDrawer({ open, onClose, property, activeTab = "details" }: ReelPropertyDrawerProps) {
  const navigate = useNavigate();
  const [bookingOpen, setBookingOpen] = useState(false);

  if (!property) return null;

  const images = property.images?.length ? property.images : [
    ""
  ];

  return (
    <>
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center gap-2 text-lg">
              {property.title}
              {property.verified && <Verified className="h-4 w-4 text-emerald-500" />}
            </DrawerTitle>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {property.locality}, {property.city}
            </div>
          </DrawerHeader>

          <Tabs defaultValue={activeTab} className="px-4 pb-6">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              <TabsTrigger value="book" className="flex-1">Book Visit</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-4 overflow-y-auto max-h-[55vh]">
              {/* Images */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.slice(0, 5).map((img, i) => (
                  <img key={i} src={img} alt="" className="h-32 w-48 rounded-lg object-cover flex-shrink-0" />
                ))}
              </div>

              {/* Price & specs */}
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">{formatPrice(property.price)}</span>
                <div className="flex gap-2">
                  {property.bhk && <Badge variant="secondary">{property.bhk} BHK</Badge>}
                  <Badge variant="outline">{property.type || "Apartment"}</Badge>
                </div>
              </div>

              {/* Quick specs */}
              <div className="grid grid-cols-3 gap-3">
                {property.area_sqft && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Area</p>
                      <p className="text-sm font-medium">{property.area_sqft} sqft</p>
                    </div>
                  </div>
                )}
                {property.bedrooms && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <BedDouble className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Beds</p>
                      <p className="text-sm font-medium">{property.bedrooms}</p>
                    </div>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <Bath className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Baths</p>
                      <p className="text-sm font-medium">{property.bathrooms}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {property.description && (
                <div>
                  <h4 className="font-semibold mb-1">About</h4>
                  <p className="text-sm text-muted-foreground line-clamp-4">{property.description}</p>
                </div>
              )}

              {/* View full page */}
              <Button variant="outline" className="w-full" onClick={() => navigate(`/property/${property.id}`)}>
                <ExternalLink className="h-4 w-4 mr-2" /> View Full Property Page
              </Button>
            </TabsContent>

            <TabsContent value="book" className="mt-4 space-y-4">
              <div className="text-center space-y-3">
                <Building2 className="h-12 w-12 mx-auto text-primary" />
                <h3 className="font-semibold text-lg">Schedule a Visit</h3>
                <p className="text-sm text-muted-foreground">
                  Choose how you'd like to visit <span className="font-medium text-foreground">{property.title}</span>
                </p>
              </div>

              <div className="grid gap-3">
                <Button
                  className="w-full h-14 text-base"
                  onClick={() => navigate(`/visit/schedule/${property.id}`)}
                >
                  ⚡ Quick Visit — Free Site Tour
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-14 text-base"
                  onClick={() => {
                    onClose();
                    setBookingOpen(true);
                  }}
                >
                  🏨 Visit + Stay — Hotel Package
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Book a quick visit or combine it with a stay package for a complete experience
              </p>
            </TabsContent>
          </Tabs>
        </DrawerContent>
      </Drawer>

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        propertyId={property.id}
        propertyTitle={property.title}
        propertyCity={property.city}
        propertyLocality={property.locality}
      />
    </>
  );
}
