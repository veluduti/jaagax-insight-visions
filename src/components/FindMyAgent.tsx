import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Star, MapPin, Phone } from "lucide-react";

const agents = [
  {
    id: 1,
    name: "Rajesh Kumar",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    rating: 4.9,
    reviews: 127,
    areas: ["Kokapet", "Narsingi", "Gachibowli"],
    trustScore: 96,
    specialization: "Luxury Apartments",
  },
  {
    id: 2,
    name: "Priya Sharma",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
    rating: 4.8,
    reviews: 98,
    areas: ["Kondapur", "Hitech City"],
    trustScore: 94,
    specialization: "Commercial Properties",
  },
  {
    id: 3,
    name: "Anil Reddy",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
    rating: 4.9,
    reviews: 145,
    areas: ["Benz Circle", "Kanuru", "Vijayawada"],
    trustScore: 97,
    specialization: "Residential Villas",
  },
  {
    id: 4,
    name: "Sneha Patel",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
    rating: 4.7,
    reviews: 82,
    areas: ["Tellapur", "Nallagandla"],
    trustScore: 92,
    specialization: "Budget Homes",
  },
];

const FindMyAgent = () => {
  return (
    <section className="py-16 relative" id="find-agent">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Find Your Perfect <span className="text-gradient">Agent</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Connect with top-rated, verified agents in your area
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-panel border-border/50 overflow-hidden hover:border-primary/50 transition-all duration-300 h-full">
                {/* Photo */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={agent.photo}
                    alt={agent.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                  
                  {/* Trust Score Badge */}
                  <Badge className="absolute top-3 right-3 bg-primary/90 text-primary-foreground border-0">
                    Trust {agent.trustScore}%
                  </Badge>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-bold text-lg mb-2">{agent.name}</h3>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="font-semibold">{agent.rating}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">({agent.reviews} reviews)</span>
                  </div>

                  {/* Specialization */}
                  <Badge variant="outline" className="mb-3">
                    {agent.specialization}
                  </Badge>

                  {/* Areas */}
                  <div className="flex items-start gap-2 mb-4">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {agent.areas.join(", ")}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button className="w-full glow-effect">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Chat Now
                    </Button>
                    <Button variant="outline" className="w-full border-primary/50 hover:bg-primary/10">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Agent
                    </Button>
                  </div>
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
          <Button size="lg" variant="outline" className="border-primary/50 hover:bg-primary/10">
            View All Agents
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FindMyAgent;
