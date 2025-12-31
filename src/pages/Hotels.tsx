import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Hotel, MapPin, Star, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Hotels = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-24 pb-16">
        <div className="container-padding">
          <div className="max-w-4xl mx-auto text-center">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 px-4 py-1.5">
                <Hotel className="h-4 w-4 mr-2" />
                Coming Soon
              </Badge>
              
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                Partner Hotels for <span className="text-gradient">Site Visits</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Book curated stays near your shortlisted properties. Experience the neighborhood 
                before making your decision, with exclusive discounts for JaagaX users.
              </p>
            </motion.div>

            {/* Feature Preview Cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-16 grid md:grid-cols-3 gap-6"
            >
              <div className="p-6 rounded-xl bg-card border border-border/50 text-left">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Locality-Matched</h3>
                <p className="text-sm text-muted-foreground">
                  Hotels selected near your shortlisted properties for convenient site visits.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-card border border-border/50 text-left">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Verified Partners</h3>
                <p className="text-sm text-muted-foreground">
                  Trusted hotel partners with quality assurance and transparent pricing.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-card border border-border/50 text-left">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Visit + Stay Bundles</h3>
                <p className="text-sm text-muted-foreground">
                  Combine site visits with accommodation for a seamless experience.
                </p>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-12"
            >
              <Button variant="outline" size="lg" className="group" disabled>
                Get Notified When Available
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                We're onboarding hotel partners across major cities.
              </p>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Hotels;
