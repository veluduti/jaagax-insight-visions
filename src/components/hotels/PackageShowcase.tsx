import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Plane, Utensils, Car, Tag, ArrowRight, Sparkles } from "lucide-react";

interface VisitPackage {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  includes_airport_pickup: boolean | null;
  includes_meals: boolean | null;
  includes_local_transport: boolean | null;
  base_discount_percentage: number | null;
}

interface PackageShowcaseProps {
  packages: VisitPackage[];
  onSelectPackage: (pkg: VisitPackage) => void;
}

const PackageShowcase = ({ packages, onSelectPackage }: PackageShowcaseProps) => {
  const getPackageTheme = (index: number) => {
    const themes = [
      { gradient: "from-blue-500/10 to-cyan-500/10", border: "border-blue-500/20", badge: "bg-blue-500" },
      { gradient: "from-violet-500/10 to-purple-500/10", border: "border-violet-500/20", badge: "bg-violet-500" },
      { gradient: "from-amber-500/10 to-orange-500/10", border: "border-amber-500/20", badge: "bg-amber-500" },
    ];
    return themes[index % themes.length];
  };

  if (packages.length === 0) return null;

  return (
    <section className="py-12">
      <div className="text-center mb-8">
        <Badge variant="outline" className="mb-4 gap-1">
          <Sparkles className="h-3 w-3" />
          Visit + Stay Packages
        </Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
          Combine Your Stay with Site Visits
        </h2>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Get exclusive discounts when you book a hotel along with property visits. 
          Explore neighborhoods at your own pace.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {packages.map((pkg, index) => {
          const theme = getPackageTheme(index);
          
          return (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`relative overflow-hidden h-full bg-gradient-to-br ${theme.gradient} ${theme.border} hover:shadow-lg transition-all group`}>
                {/* Discount Badge */}
                {pkg.base_discount_percentage && pkg.base_discount_percentage > 0 && (
                  <Badge className={`absolute top-4 right-4 ${theme.badge} text-white border-0`}>
                    <Tag className="h-3 w-3 mr-1" />
                    {pkg.base_discount_percentage}% OFF
                  </Badge>
                )}

                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{pkg.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {pkg.description || "Perfect for exploring properties at your own pace"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Duration */}
                  <div className="flex items-center gap-2 text-foreground">
                    <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {pkg.duration_days} {pkg.duration_days === 1 ? 'Night' : 'Nights'}
                      </p>
                      <p className="text-xs text-muted-foreground">Duration</p>
                    </div>
                  </div>

                  {/* Inclusions */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Includes:</p>
                    <div className="flex flex-wrap gap-2">
                      {pkg.includes_airport_pickup && (
                        <Badge variant="outline" className="gap-1 bg-background/50">
                          <Plane className="h-3 w-3" />
                          Airport Pickup
                        </Badge>
                      )}
                      {pkg.includes_meals && (
                        <Badge variant="outline" className="gap-1 bg-background/50">
                          <Utensils className="h-3 w-3" />
                          Meals
                        </Badge>
                      )}
                      {pkg.includes_local_transport && (
                        <Badge variant="outline" className="gap-1 bg-background/50">
                          <Car className="h-3 w-3" />
                          Local Transport
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <Button 
                    className="w-full mt-4 gap-2 group-hover:gap-3 transition-all"
                    onClick={() => onSelectPackage(pkg)}
                  >
                    Select Package
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default PackageShowcase;
