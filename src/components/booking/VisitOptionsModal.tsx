import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, Hotel, Clock, Sparkles, ArrowRight, 
  MapPin, Plane, Car
} from "lucide-react";
import { useBuyerContext } from "@/hooks/useBuyerContext";
import { motion } from "framer-motion";

interface VisitOptionsModalProps {
  open: boolean;
  onClose: () => void;
  onSelectQuickVisit: () => void;
  onSelectVisitStay: () => void;
  propertyTitle: string;
  propertyCity: string;
}

export const VisitOptionsModal = ({
  open,
  onClose,
  onSelectQuickVisit,
  onSelectVisitStay,
  propertyTitle,
  propertyCity
}: VisitOptionsModalProps) => {
  const { buyerContext } = useBuyerContext();
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  // Check if AI should suggest Visit + Stay
  const shouldSuggestStay = buyerContext?.primary_fear?.some(
    fear => ['distance', 'confidence', 'travel', 'unfamiliar_area'].includes(fear)
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Plan Your Visit
          </DialogTitle>
          <DialogDescription>
            Choose how you'd like to visit {propertyTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* AI Recommendation */}
          {shouldSuggestStay && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-3"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">AI Suggests: Visit + Stay</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Based on your preferences, staying nearby gives you more time to explore the area confidently.
              </p>
            </motion.div>
          )}

          {/* Option Cards */}
          <div className="grid gap-4">
            {/* Quick Visit */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${
                hoveredOption === 'quick' ? 'ring-2 ring-primary/50' : ''
              }`}
              onMouseEnter={() => setHoveredOption('quick')}
              onMouseLeave={() => setHoveredOption(null)}
              onClick={onSelectQuickVisit}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10">
                    <Clock className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      Quick Visit
                      <Badge variant="outline" className="text-xs">Popular</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Schedule a single property visit at your preferred time
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        1-2 hours
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        On-site visit
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className={`h-5 w-5 transition-transform ${
                    hoveredOption === 'quick' ? 'translate-x-1' : ''
                  }`} />
                </div>
              </CardContent>
            </Card>

            {/* Visit + Stay */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md relative overflow-hidden ${
                hoveredOption === 'stay' ? 'ring-2 ring-primary/50' : ''
              } ${shouldSuggestStay ? 'border-amber-500/30' : ''}`}
              onMouseEnter={() => setHoveredOption('stay')}
              onMouseLeave={() => setHoveredOption(null)}
              onClick={onSelectVisitStay}
            >
              {shouldSuggestStay && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg bg-amber-500 text-xs">
                    Recommended
                  </Badge>
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
                    <Hotel className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold flex items-center gap-2">
                      Visit + Stay
                      <Badge className="text-xs bg-gradient-to-r from-primary to-purple-500 text-white">
                        New
                      </Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Book property visit with nearby partner hotel at exclusive discounts
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs">
                        <Hotel className="h-3 w-3 mr-1" />
                        1-3 nights
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Plane className="h-3 w-3 mr-1" />
                        Airport pickup
                      </Badge>
                      <Badge variant="secondary" className="text-xs text-green-600">
                        Up to 25% OFF
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className={`h-5 w-5 transition-transform ${
                    hoveredOption === 'stay' ? 'translate-x-1' : ''
                  }`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hotel Only Option Link */}
          <div className="text-center pt-2">
            <Button 
              variant="link" 
              size="sm" 
              className="text-muted-foreground"
              onClick={onSelectVisitStay}
            >
              <Hotel className="h-3 w-3 mr-1" />
              Just looking for hotel booking? Click here
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
