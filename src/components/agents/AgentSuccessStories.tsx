import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, Quote } from "lucide-react";
import { motion } from "framer-motion";

interface AgentSuccessStoriesProps {
  agentName: string;
}

const AgentSuccessStories = ({ agentName }: AgentSuccessStoriesProps) => {
  // Mock success stories - in production, these would come from database
  const successStories = [
    {
      id: "1",
      clientName: "Rajesh & Priya Kumar",
      propertyType: "3 BHK Apartment",
      location: "Gachibowli, Hyderabad",
      beforeImage: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400",
      afterImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400",
      testimonial: "We were first-time homebuyers and felt completely lost in the process. The agent guided us through every step, from understanding our budget to negotiating the best price. Found us our dream home in just 3 weeks!",
      achievement: "30% below market rate",
      timeline: "3 weeks",
      date: "Oct 2024"
    },
    {
      id: "2",
      clientName: "Amit Sharma",
      propertyType: "4 BHK Villa",
      location: "Jubilee Hills, Hyderabad",
      beforeImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400",
      afterImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400",
      testimonial: "After months of searching, I was about to give up. Then I connected with this agent who understood exactly what I needed. Not only did they find the perfect villa, but also helped with all legal documentation and loan processing.",
      achievement: "₹50L saved in negotiations",
      timeline: "6 weeks",
      date: "Sep 2024"
    },
    {
      id: "3",
      clientName: "Sarah & John Williams",
      propertyType: "Luxury Penthouse",
      location: "Banjara Hills, Hyderabad",
      beforeImage: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400",
      afterImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400",
      testimonial: "As expats relocating to India, we needed someone who could handle everything - from property search to registration. The agent's expertise and dedication made our transition seamless. Highly professional service!",
      achievement: "Complete relocation support",
      timeline: "4 weeks",
      date: "Aug 2024"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Success Stories
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Real transformations and client journeys with {agentName}
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {successStories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 }}
              className="border-b border-border/50 pb-8 last:border-0 last:pb-0"
            >
              {/* Before/After Images */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Badge variant="secondary" className="mb-2">Before</Badge>
                  <div className="relative rounded-lg overflow-hidden group">
                    <img
                      src={story.beforeImage}
                      alt="Before"
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Badge className="mb-2 bg-green-600">After</Badge>
                  <div className="relative rounded-lg overflow-hidden group">
                    <img
                      src={story.afterImage}
                      alt="After"
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-lg mb-1">{story.clientName}</h4>
                  <p className="text-sm text-muted-foreground">
                    {story.propertyType} • {story.location}
                  </p>
                </div>

                {/* Testimonial */}
                <div className="relative p-4 rounded-lg bg-accent/30 border border-border/50">
                  <Quote className="absolute top-2 left-2 h-6 w-6 text-primary/20" />
                  <p className="text-muted-foreground italic pl-6 leading-relaxed">
                    "{story.testimonial}"
                  </p>
                </div>

                {/* Achievements */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{story.achievement}</span>
                  </div>
                  <Badge variant="outline">{story.timeline}</Badge>
                  <Badge variant="outline">{story.date}</Badge>
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AgentSuccessStories;
