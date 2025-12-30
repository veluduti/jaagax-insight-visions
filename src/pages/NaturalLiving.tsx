import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";
import { Leaf, TreePine, Sun, Mountain, Sprout, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const NaturalLiving = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-24 lg:pt-28 pb-24">
        <div className="container-padding">
          <div className="max-w-4xl mx-auto text-center">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6">
                <Leaf className="h-4 w-4" />
                <span className="text-sm font-medium">Coming Soon</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-gradient">Farm & Natural Living</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Discover your connection to the land. Premium farmland, assisted farming programs, 
                and sustainable living opportunities across India.
              </p>
            </motion.div>

            {/* Feature Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid md:grid-cols-3 gap-6 mb-12"
            >
              {[
                {
                  icon: TreePine,
                  title: "Farm Land",
                  description: "Verified agricultural land with clear titles and modern amenities"
                },
                {
                  icon: Sprout,
                  title: "Assisted Farming",
                  description: "Expert-managed farming programs with guaranteed yields"
                },
                {
                  icon: Mountain,
                  title: "Weekend Retreats",
                  description: "Scenic plots for your weekend getaway or retirement home"
                }
              ].map((feature, index) => (
                <div
                  key={feature.title}
                  className="glass-panel p-6 rounded-xl border border-border/50"
                >
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 mx-auto">
                    <feature.icon className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </motion.div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="glass-panel p-8 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent"
            >
              <Sun className="h-10 w-10 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-3">Be the First to Know</h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                We're crafting something special. Register your interest to get early access 
                to premium farmland listings and exclusive investment opportunities.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  size="lg" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => navigate("/auth")}
                >
                  Register Interest
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => navigate("/")}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NaturalLiving;
