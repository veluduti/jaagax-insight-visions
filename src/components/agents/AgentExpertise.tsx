import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Home, 
  MapPin, 
  TrendingUp,
  Users,
  Briefcase
} from "lucide-react";
import { motion } from "framer-motion";

interface AgentExpertiseProps {
  salesCount: number;
  rentCount: number;
  citiesServed: string;
}

const AgentExpertise = ({ salesCount, rentCount, citiesServed }: AgentExpertiseProps) => {
  const expertise = [];

  // Determine specializations
  if (salesCount > rentCount * 1.5) {
    expertise.push("Residential Sales");
  } else if (rentCount > salesCount * 1.5) {
    expertise.push("Residential Leasing");
  } else {
    expertise.push("Residential Sales");
    expertise.push("Residential Leasing");
  }

  // Add based on volume
  if (salesCount + rentCount >= 20) {
    expertise.push("Investment Properties");
  }

  if (salesCount >= 10) {
    expertise.push("Off-Plan Sales");
  }

  const serviceAreas = citiesServed.split(",").map(city => city.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Expertise & Service Areas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Expertise */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Specializations</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {expertise.map((item) => (
                <Badge key={item} variant="secondary" className="text-sm py-1.5 px-3">
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          {/* Service Areas */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Service Areas</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {serviceAreas.map((area) => (
                <Badge key={area} variant="outline" className="text-sm py-1.5 px-3">
                  {area}
                </Badge>
              ))}
            </div>
          </div>

          {/* Property Types */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Property Types</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/30">
                <Home className="h-4 w-4 text-primary" />
                <span className="text-sm">Apartments</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/30">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm">Villas</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/30">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm">Penthouses</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/30">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm">Plots</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AgentExpertise;
