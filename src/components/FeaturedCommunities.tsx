import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, CheckCircle } from "lucide-react";

const communities = [
  {
    name: "Gachibowli",
    city: "Hyderabad",
    avgPrice: "₹8,500/sq.ft",
    growth: "+12%",
    verified: 42,
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop"
  },
  {
    name: "Kokapet",
    city: "Hyderabad",
    avgPrice: "₹7,200/sq.ft",
    growth: "+18%",
    verified: 38,
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop"
  },
  {
    name: "Narsingi",
    city: "Hyderabad",
    avgPrice: "₹6,800/sq.ft",
    growth: "+15%",
    verified: 29,
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop"
  },
  {
    name: "Kondapur",
    city: "Hyderabad",
    avgPrice: "₹7,900/sq.ft",
    growth: "+10%",
    verified: 35,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop"
  },
  {
    name: "Tellapur",
    city: "Hyderabad",
    avgPrice: "₹5,500/sq.ft",
    growth: "+22%",
    verified: 24,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop"
  },
  {
    name: "Benz Circle",
    city: "Vijayawada",
    avgPrice: "₹4,200/sq.ft",
    growth: "+14%",
    verified: 18,
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop"
  },
  {
    name: "Kanuru",
    city: "Vijayawada",
    avgPrice: "₹3,800/sq.ft",
    growth: "+16%",
    verified: 15,
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop"
  },
  {
    name: "Poranki",
    city: "Vijayawada",
    avgPrice: "₹3,500/sq.ft",
    growth: "+19%",
    verified: 12,
    image: "https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=800&h=600&fit=crop"
  },
  {
    name: "Tadepalli",
    city: "Vijayawada",
    avgPrice: "₹4,000/sq.ft",
    growth: "+20%",
    verified: 16,
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop"
  },
  {
    name: "Mangalagiri",
    city: "Vijayawada",
    avgPrice: "₹3,200/sq.ft",
    growth: "+25%",
    verified: 10,
    image: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop"
  }
];

const FeaturedCommunities = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-20 px-6 bg-gradient-to-b from-background via-background/50 to-background">
      <div className="container mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Explore <span className="text-gradient">Top Communities</span>
          </h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Discover verified neighborhoods with the best growth potential
          </p>
        </motion.div>

        {/* Communities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {communities.map((community, index) => (
            <motion.div
              key={community.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className="glass-panel overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer group"
                onClick={() => navigate('/communities')}
              >
                {/* Community Image */}
                <div className="relative h-40 overflow-hidden">
                  <img 
                    src={community.image} 
                    alt={community.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) = loading="lazy" decoding="async" /> {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                  
                  {/* Growth Badge */}
                  <Badge className="absolute top-3 right-3 bg-primary/90 text-primary-foreground">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {community.growth}
                  </Badge>
                </div>

                {/* Community Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {community.name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-foreground/70">
                      <MapPin className="h-3 w-3" />
                      <span>{community.city}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div>
                      <p className="text-xs text-foreground/70">Avg. Price</p>
                      <p className="font-semibold text-foreground">{community.avgPrice}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <CheckCircle className="h-3 w-3" />
                        <span className="font-semibold">{community.verified}</span>
                      </div>
                      <p className="text-xs text-foreground/70">Verified</p>
                    </div>
                  </div>
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
