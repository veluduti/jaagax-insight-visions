import { motion } from "framer-motion";
import { Building2, Layers, Car, Square, Maximize } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BuildingInformationProps {
  locality: string;
  verified: boolean;
}

const BuildingInformation = ({ locality, verified }: BuildingInformationProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-panel rounded-xl p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold">Building Information</h2>
        {verified && (
          <Badge variant="default" className="gap-1">
            <Building2 className="h-3 w-3" />
            Verified
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 text-primary mt-1" />
          <div>
            <div className="text-sm text-muted-foreground mb-1">Building Name</div>
            <div className="font-semibold">{locality}</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Layers className="h-5 w-5 text-primary mt-1" />
          <div>
            <div className="text-sm text-muted-foreground mb-1">Total Floors</div>
            <div className="font-semibold">15</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 text-primary mt-1" />
          <div>
            <div className="text-sm text-muted-foreground mb-1">Retail Centres</div>
            <div className="font-semibold">2</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Car className="h-5 w-5 text-primary mt-1" />
          <div>
            <div className="text-sm text-muted-foreground mb-1">Total Parking Spaces</div>
            <div className="font-semibold">120</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Square className="h-5 w-5 text-primary mt-1" />
          <div>
            <div className="text-sm text-muted-foreground mb-1">Total Building Area</div>
            <div className="font-semibold">85,500 sq.ft</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Maximize className="h-5 w-5 text-primary mt-1" />
          <div>
            <div className="text-sm text-muted-foreground mb-1">Elevators</div>
            <div className="font-semibold">3</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BuildingInformation;
