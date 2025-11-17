import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Search, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="min-h-[80vh] flex items-center justify-center pt-24 pb-16">
        <div className="container-padding max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-card p-12 text-center">
              {/* 404 Illustration */}
              <div className="mb-8">
                <div className="text-8xl font-bold text-gradient mb-4">404</div>
                <div className="w-32 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 mx-auto" />
              </div>

              {/* Message */}
              <h1 className="text-3xl font-bold mb-4">Page Not Found</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                The page you're looking for doesn't exist or may have been moved. 
                Let's get you back on track.
              </p>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => navigate("/")}
                  className="gap-2"
                >
                  <Home className="w-4 h-4" />
                  Back to Home
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/search")}
                  className="gap-2"
                >
                  <Search className="w-4 h-4" />
                  Search Properties
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/projects")}
                  className="gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Browse Projects
                </Button>
              </div>

              {/* Helpful Links */}
              <div className="mt-8 pt-8 border-t">
                <p className="text-sm text-muted-foreground mb-3">Popular Pages</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/agents")}
                  >
                    Find Agent
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/communities")}
                  >
                    Communities
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/transactions")}
                  >
                    Transactions
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/events")}
                  >
                    Events
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default NotFound;
