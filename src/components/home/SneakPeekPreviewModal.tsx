import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  MapPin, Bed, Maximize, ShieldAlert, Clock, Eye, Bell, X,
  Building2, Ruler, IndianRupee, CheckCircle2, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PreviewProperty {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  bedrooms: number | null;
  area_sqft: number | null;
  images: any;
  trust_score: number | null;
  bhk: number | null;
  type: string | null;
  completion_stage: string | null;
  created_at: string | null;
  description?: string | null;
}

interface SneakPeekPreviewModalProps {
  property: PreviewProperty | null;
  open: boolean;
  onClose: () => void;
}

const SneakPeekPreviewModal = ({ property, open, onClose }: SneakPeekPreviewModalProps) => {
  if (!property) return null;

  const progress = getProgress(property);
  const missingFields = getMissingFields(property);
  const imageUrl = Array.isArray(property.images) && property.images[0]
    ? property.images[0]
    : "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-dashed border-primary/30 bg-card/95 backdrop-blur-xl">
        {/* Hero image with overlay */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={imageUrl}
            alt={property.title}
            className="w-full h-full object-cover saturate-[0.6]"
          />
          {/* Diagonal watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15">
            <span className="text-5xl font-black tracking-[0.3em] text-foreground rotate-[-30deg] select-none">
              PREVIEW
            </span>
          </div>
          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 bg-background/80 backdrop-blur-sm text-xs px-2">
              <ShieldAlert className="h-3 w-3 mr-1" />
              Unverified
            </Badge>
            <span className="text-xs text-foreground/70 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {getTimeAgo(property.created_at)}
            </span>
          </div>
          {/* Gradient fade */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-card/95 to-transparent" />
        </div>

        {/* Content */}
        <div className="px-5 pb-5 -mt-4 relative z-10 space-y-4">
          <div>
            <h3 className="font-bold text-lg leading-tight">{property.title}</h3>
            <div className="flex items-center gap-1 text-foreground/50 text-sm mt-1">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{property.locality || "TBD"}, {property.city || "TBD"}</span>
            </div>
          </div>

          {/* Quick specs row */}
          <div className="flex items-center gap-3 flex-wrap">
            {(property.bhk || property.bedrooms) && (
              <div className="flex items-center gap-1.5 text-sm text-foreground/70 bg-muted/50 rounded-lg px-2.5 py-1.5">
                <Bed className="h-4 w-4 text-primary" />
                <span>{property.bhk || property.bedrooms} BHK</span>
              </div>
            )}
            {property.area_sqft && (
              <div className="flex items-center gap-1.5 text-sm text-foreground/70 bg-muted/50 rounded-lg px-2.5 py-1.5">
                <Maximize className="h-4 w-4 text-primary" />
                <span>{property.area_sqft} sqft</span>
              </div>
            )}
            {property.type && (
              <div className="flex items-center gap-1.5 text-sm text-foreground/70 bg-muted/50 rounded-lg px-2.5 py-1.5">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="capitalize">{property.type}</span>
              </div>
            )}
            {property.completion_stage && (
              <Badge variant="secondary" className="text-xs">
                {property.completion_stage}
              </Badge>
            )}
          </div>

          {/* Price — blurred with explanation */}
          <div className="bg-muted/30 rounded-xl p-3 border border-dashed border-foreground/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" />
                <span className="font-bold text-lg blur-[4px] select-none">
                  ₹{(property.price / 100000).toFixed(0)} L
                </span>
              </div>
              <span className="text-xs text-foreground/40 italic">Price unverified</span>
            </div>
          </div>

          {/* Verification progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground/50 font-medium">Listing Completeness</span>
              <span className="text-primary font-bold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-muted" />

            {/* Missing fields */}
            {missingFields.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {missingFields.map((field) => (
                  <span
                    key={field}
                    className="text-[10px] text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2 py-0.5 flex items-center gap-1"
                  >
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {field}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Verification notice */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-primary text-sm font-medium">
              <Eye className="h-4 w-4" />
              Verification In Progress
            </div>
            <p className="text-xs text-foreground/50">
              This listing is being reviewed by JaagaX. Full details will be available once verified.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 gap-2"
              onClick={() => {
                window.open(`/property/${property.id}`, '_blank');
                onClose();
              }}
            >
              <Eye className="h-4 w-4" />
              View Full Listing
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 gap-2"
              onClick={onClose}
            >
              <Bell className="h-4 w-4" />
              Notify Me
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function getProgress(p: PreviewProperty) {
  let score = 0;
  if (p.title) score += 15;
  if (p.city) score += 10;
  if (p.locality) score += 10;
  if (p.price && p.price > 0) score += 15;
  if (p.bhk || p.bedrooms) score += 10;
  if (p.area_sqft) score += 10;
  if (Array.isArray(p.images) && p.images.length > 0) score += 15;
  if (p.type) score += 5;
  if (p.completion_stage) score += 5;
  if (p.trust_score && p.trust_score > 0) score += 5;
  return Math.min(score, 100);
}

function getMissingFields(p: PreviewProperty) {
  const missing: string[] = [];
  if (!p.locality) missing.push("Locality");
  if (!p.area_sqft) missing.push("Area");
  if (!p.bhk && !p.bedrooms) missing.push("BHK");
  if (!Array.isArray(p.images) || p.images.length === 0) missing.push("Photos");
  if (!p.type) missing.push("Type");
  if (!p.completion_stage) missing.push("Status");
  return missing;
}

function getTimeAgo(dateStr: string | null) {
  if (!dateStr) return "Recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default SneakPeekPreviewModal;
