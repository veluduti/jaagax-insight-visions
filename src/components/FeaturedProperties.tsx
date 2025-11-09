import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Bed, Bath, Maximize, MapPin, Shield } from "lucide-react";
import { useState } from "react";

const properties = [
  {
    id: 1,
    title: "Luxury 3BHK Apartment",
    location: "Kokapet, Hyderabad",
    price: "₹1.2 Cr",
    beds: 3,
    baths: 3,
    area: "2100 sqft",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
    verified: true,
    trustScore: 95,
  },
  {
    id: 2,
    title: "Premium Villa with Garden",
    location: "Gachibowli, Hyderabad",
    price: "₹2.8 Cr",
    beds: 4,
    baths: 4,
    area: "3500 sqft",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    verified: true,
    trustScore: 98,
  },
  {
    id: 3,
    title: "Modern 2BHK Flat",
    location: "Benz Circle, Vijayawada",
    price: "₹65 L",
    beds: 2,
    baths: 2,
    area: "1450 sqft",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
    verified: true,
    trustScore: 92,
  },
  {
    id: 4,
    title: "Spacious Penthouse",
    location: "Kondapur, Hyderabad",
    price: "₹3.5 Cr",
    beds: 4,
    baths: 5,
    area: "4200 sqft",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
    verified: true,
    trustScore: 97,
  },
];

const FeaturedProperties = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<number[]>([]);

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  return (
    <section className="py-16 relative" id="properties">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Featured <span className="text-gradient">Properties</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Handpicked properties verified by JaagaX AI
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {properties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className="glass-panel border-border/50 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all duration-300"
                onClick={() => navigate(`/property/${property.id}`)}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={property.image}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
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

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg line-clamp-1">{property.title}</h3>
                    <span className="text-primary font-bold text-lg whitespace-nowrap ml-2">
                      {property.price}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                    <MapPin className="h-4 w-4" />
                    {property.location}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      {property.beds}
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      {property.baths}
                    </div>
                    <div className="flex items-center gap-1">
                      <Maximize className="h-4 w-4" />
                      {property.area}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-primary/50 hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/property/${property.id}`);
                    }}
                  >
                    View Details
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
          className="text-center mt-12"
        >
          <Button 
            size="lg" 
            variant="outline" 
            className="border-primary/50 hover:bg-primary/10"
            onClick={() => navigate('/map')}
          >
            View All Properties
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProperties;
