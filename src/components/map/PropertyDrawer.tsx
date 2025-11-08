import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { X, MapPin, Maximize2, Bed, Bath, CheckCircle, MessageCircle, Phone, TrendingUp } from "lucide-react";

interface PropertyDrawerProps {
  property: {
    id: string;
    title: string;
    price: number;
    area: number;
    type: string;
    bhk: number;
    verified: boolean;
    images: string[];
    trust_score: number;
    city: string;
    locality: string;
  };
  onClose: () => void;
}

const PropertyDrawer = ({ property, onClose }: PropertyDrawerProps) => {
  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed top-0 right-0 h-full w-full md:w-[480px] z-50 glass-panel border-l border-border/50 overflow-y-auto"
    >
      <div className="relative">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-background/80 hover:bg-background"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Image Carousel */}
        {property.images && property.images.length > 0 ? (
          <Carousel className="w-full">
            <CarouselContent>
              {property.images.map((image, index) => (
                <CarouselItem key={index}>
                  <div className="relative h-64 w-full">
                    <img
                      src={image}
                      alt={`${property.title} - ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        ) : (
          <div className="relative h-64 w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <p className="text-muted-foreground">No images available</p>
          </div>
        )}

        {/* Property Details */}
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            {property.verified && (
              <Badge className="mb-3 bg-primary/90 glow-effect">
                <CheckCircle className="h-3 w-3 mr-1" />
                JaagaX Verified™
              </Badge>
            )}
            <h2 className="text-2xl font-bold mb-2">{property.title}</h2>
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <MapPin className="h-4 w-4" />
              <span>{property.locality}, {property.city}</span>
            </div>
            <div className="text-3xl font-bold text-gradient mb-2">
              ₹{(property.price / 100000).toFixed(2)}L
            </div>
          </div>

          {/* Property Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 bg-secondary/50 border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Bed className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">BHK</span>
              </div>
              <p className="text-xl font-bold">{property.bhk}</p>
            </Card>
            <Card className="p-4 bg-secondary/50 border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Maximize2 className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Area</span>
              </div>
              <p className="text-xl font-bold">{property.area}</p>
              <p className="text-xs text-muted-foreground">sq.ft</p>
            </Card>
            <Card className="p-4 bg-secondary/50 border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Trust</span>
              </div>
              <p className="text-xl font-bold">{property.trust_score}</p>
            </Card>
          </div>

          {/* Property Type */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Property Type</h3>
            <Badge variant="outline" className="capitalize">
              {property.type}
            </Badge>
          </div>

          {/* AI Summary */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <span className="text-primary">✨</span> AI Summary
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This {property.bhk} BHK {property.type} in {property.locality} offers {property.area} sq.ft of premium living space.
              {property.verified && " This property is JaagaX Verified™ with complete documentation and transparent pricing."}
              {" "}Located in a prime area with excellent connectivity and amenities.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button size="lg" className="w-full glow-effect">
              <MessageCircle className="h-5 w-5 mr-2" />
              Chat with Agent
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="lg">
                <Phone className="h-5 w-5 mr-2" />
                Call Agent
              </Button>
              <Button variant="outline" size="lg">
                Get Valuation
              </Button>
            </div>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => window.location.href = `/property/${property.id}`}
            >
              View Full Details
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyDrawer;
