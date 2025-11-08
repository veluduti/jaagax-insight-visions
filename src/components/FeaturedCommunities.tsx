import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, CheckCircle2 } from "lucide-react";

const communities = [
  {
    name: "Kokapet",
    city: "Hyderabad",
    avgPrice: "₹8,500/sq ft",
    growth: "+18%",
    verified: true,
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop",
  },
  {
    name: "Gachibowli",
    city: "Hyderabad",
    avgPrice: "₹9,200/sq ft",
    growth: "+22%",
    verified: true,
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop",
  },
  {
    name: "Narsingi",
    city: "Hyderabad",
    avgPrice: "₹7,800/sq ft",
    growth: "+15%",
    verified: true,
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop",
  },
  {
    name: "Benz Circle",
    city: "Vijayawada",
    avgPrice: "₹5,500/sq ft",
    growth: "+12%",
    verified: true,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
  },
];

const FeaturedCommunities = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 glow-effect">Top Communities</Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Explore <span className="text-gradient">Premium Localities</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover verified communities with the highest growth potential and best amenities
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {communities.map((community, index) => (
            <motion.div
              key={community.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden glass-panel border-border/50 hover:border-primary/50 transition-all duration-300 group cursor-pointer">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={community.image}
                    alt={community.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                  {community.verified && (
                    <Badge className="absolute top-4 right-4 bg-primary/90 glow-effect">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{community.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {community.city}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-accent font-semibold">
                      <TrendingUp className="h-4 w-4" />
                      {community.growth}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gradient">
                    {community.avgPrice}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Average Price</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCommunities;
