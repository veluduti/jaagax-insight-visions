import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, ArrowRight } from "lucide-react";

const VisitStayTeaser = () => {
  const navigate = useNavigate();

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-8 md:py-12"
    >
      <div className="container mx-auto container-padding">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-4 left-8 w-16 h-16 rounded-full border border-primary" />
            <div className="absolute bottom-4 right-12 w-24 h-24 rounded-full border border-primary" />
            <div className="absolute top-1/2 left-1/3 w-8 h-8 rounded-full bg-primary/20" />
          </div>

          <div className="relative px-6 py-8 md:px-12 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Content */}
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="hidden md:flex items-center justify-center w-14 h-14 rounded-xl bg-primary/15 border border-primary/20">
                <div className="relative">
                  <MapPin className="h-6 w-6 text-primary" />
                  <Calendar className="h-3 w-3 text-primary absolute -bottom-1 -right-1" />
                </div>
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1">
                  Planning a site visit?
                </h3>
                <p className="text-sm md:text-base text-foreground/70">
                  Stay nearby and experience the area before you decide.
                </p>
              </div>
            </div>

            {/* CTA */}
            <Button
              variant="outline"
              className="border-primary/50 hover:bg-primary/10 hover:border-primary group whitespace-nowrap"
              onClick={() => navigate("/visit/schedule")}
            >
              Plan Visit + Stay
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default VisitStayTeaser;
