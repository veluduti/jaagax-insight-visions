import { motion } from "framer-motion";
import { Building2, Layers, Car, Square, Maximize, DoorOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BuildingInformationProps {
  buildingName?: string | null;
  totalFloors?: number | null;
  totalParking?: number | null;
  buildingArea?: number | null;
  elevators?: number | null;
  retailCentres?: number | null;
  locality: string;
  verified: boolean;
}

const BuildingInformation = ({
  buildingName,
  totalFloors,
  totalParking,
  buildingArea,
  elevators,
  retailCentres,
  locality,
  verified,
}: BuildingInformationProps) => {
  const items = [
    { icon: Building2, label: "Building Name", value: buildingName || locality },
    { icon: Layers, label: "Total Floors", value: totalFloors },
    { icon: Building2, label: "Retail Centres", value: retailCentres },
    { icon: Car, label: "Total Parking Spaces", value: totalParking },
    { icon: Square, label: "Total Building Area", value: buildingArea ? `${buildingArea.toLocaleString()} sq.ft` : null },
    { icon: DoorOpen, label: "Elevators", value: elevators },
  ].filter((item) => item.value != null);

  if (items.length <= 1) return null;

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
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <item.icon className="h-5 w-5 text-primary mt-1" />
            <div>
              <div className="text-sm text-muted-foreground mb-1">{item.label}</div>
              <div className="font-semibold">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default BuildingInformation;
