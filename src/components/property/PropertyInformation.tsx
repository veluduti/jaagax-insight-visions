import { motion } from "framer-motion";
import { Calendar, CheckCircle2, FileText, Home, Tag } from "lucide-react";

interface PropertyInformationProps {
  property: {
    type: string | null;
    status: string;
    verified: boolean;
    id: number;
  };
}

const PropertyInformation = ({ property }: PropertyInformationProps) => {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const handoverDate = property.status === "Under Construction" 
    ? "Q4 2026" 
    : "Ready to Move";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-panel rounded-xl p-6"
    >
      <h2 className="text-2xl font-bold mb-6">Property Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-start gap-3">
          <Home className="h-5 w-5 text-primary mt-1" />
          <div>
            <div className="text-sm text-muted-foreground mb-1">Type</div>
            <div className="font-semibold">{property.type || 'Apartment'}</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Tag className="h-5 w-5 text-primary mt-1" />
          <div>
            <div className="text-sm text-muted-foreground mb-1">Purpose</div>
            <div className="font-semibold">For Sale</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-primary mt-1" />
          <div>
            <div className="text-sm text-muted-foreground mb-1">Reference no.</div>
            <div className="font-semibold">JaagaX - {property.id}</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary mt-1" />
          <div>
            <div className="text-sm text-muted-foreground mb-1">Completion</div>
            <div className="font-semibold">{property.status}</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Home className="h-5 w-5 text-primary mt-1" />
          <div>
            <div className="text-sm text-muted-foreground mb-1">Furnishing</div>
            <div className="font-semibold">Semi-Furnished</div>
          </div>
        </div>

        {property.verified && (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-1" />
            <div>
              <div className="text-sm text-muted-foreground mb-1">JaagaX Verified™</div>
              <div className="font-semibold text-green-600">{currentDate}</div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-primary mt-1" />
          <div>
            <div className="text-sm text-muted-foreground mb-1">Added on</div>
            <div className="font-semibold">{currentDate}</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-primary mt-1" />
          <div>
            <div className="text-sm text-muted-foreground mb-1">Handover date</div>
            <div className="font-semibold">{handoverDate}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyInformation;
