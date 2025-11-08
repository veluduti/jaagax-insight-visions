import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, TrendingUp } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const projects = [
  {
    id: 1,
    name: "Prestige Lake Vista",
    builder: "Prestige Group",
    location: "Kokapet, Hyderabad",
    avgPrice: "₹85 L - ₹1.5 Cr",
    units: "2, 3 & 4 BHK",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
    growth: "+12% YoY",
    reraVerified: true,
  },
  {
    id: 2,
    name: "Lodha Meridian",
    builder: "Lodha Group",
    location: "Gachibowli, Hyderabad",
    avgPrice: "₹1.2 Cr - ₹2.8 Cr",
    units: "3 & 4 BHK",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
    growth: "+15% YoY",
    reraVerified: true,
  },
  {
    id: 3,
    name: "DLF Garden City",
    builder: "DLF Limited",
    location: "Tellapur, Hyderabad",
    avgPrice: "₹70 L - ₹1.2 Cr",
    units: "2 & 3 BHK",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    growth: "+10% YoY",
    reraVerified: true,
  },
  {
    id: 4,
    name: "Aparna Hillpark",
    builder: "Aparna Constructions",
    location: "Chandanagar, Hyderabad",
    avgPrice: "₹55 L - ₹95 L",
    units: "2 & 3 BHK",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
    growth: "+9% YoY",
    reraVerified: true,
  },
];

const NewProjects = () => {
  return (
    <section className="py-16 relative bg-secondary/20" id="new-projects">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            New <span className="text-gradient">Projects</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Explore upcoming projects from India's top builders
          </p>
        </motion.div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {projects.map((project, index) => (
              <CarouselItem key={project.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-panel border-border/50 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all duration-300 h-full">
                    {/* Image */}
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={project.image}
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                      
                      {/* RERA Badge */}
                      {project.reraVerified && (
                        <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground border-0">
                          RERA Verified
                        </Badge>
                      )}

                      {/* Growth Badge */}
                      <Badge className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm border-primary/50">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {project.growth}
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg mb-1 line-clamp-1">{project.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">{project.builder}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        {project.location}
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Price Range</span>
                          <span className="font-semibold text-primary">{project.avgPrice}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Units</span>
                          <span className="font-semibold">{project.units}</span>
                        </div>
                      </div>

                      <Button variant="outline" className="w-full border-primary/50 hover:bg-primary/10">
                        Explore Project
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-0 -translate-x-1/2" />
          <CarouselNext className="right-0 translate-x-1/2" />
        </Carousel>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button size="lg" variant="outline" className="border-primary/50 hover:bg-primary/10">
            Explore All Projects
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default NewProjects;
