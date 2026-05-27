import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Route, MapPin, Clock, Car, Zap, ChevronRight, 
  Calendar, Users, Building, CheckCircle2, Plus 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ClusterProperty {
  id: number;
  name: string;
  locality: string;
  image: string;
  estimatedTime: number; // minutes at property
  travelTime?: number; // minutes to next property
  matchScore: number;
}

interface VisitCluster {
  id: string;
  date: string;
  timeSlot: string;
  properties: ClusterProperty[];
  totalDuration: number;
  totalDistance: number;
  savings: {
    time: number;
    distance: number;
  };
}

interface SmartVisitClusterProps {
  savedProperties: ClusterProperty[];
  onScheduleCluster: (cluster: VisitCluster) => void;
  className?: string;
}

const SmartVisitCluster = ({ 
  savedProperties, 
  onScheduleCluster,
  className 
}: SmartVisitClusterProps) => {
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Demo clusters - in production, this would come from an AI optimization API
  const suggestedClusters: VisitCluster[] = [
    {
      id: "cluster-1",
      date: "Tomorrow",
      timeSlot: "10:00 AM - 2:00 PM",
      properties: [
        { id: 1, name: "Skyline Heights", locality: "Gachibowli", image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200", estimatedTime: 45, travelTime: 15, matchScore: 92 },
        { id: 2, name: "Urban Oasis", locality: "Hitech City", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=200", estimatedTime: 40, travelTime: 10, matchScore: 88 },
        { id: 3, name: "Green Valley", locality: "Kondapur", image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200", estimatedTime: 35, matchScore: 85 }
      ],
      totalDuration: 145,
      totalDistance: 12,
      savings: { time: 45, distance: 8 }
    },
    {
      id: "cluster-2",
      date: "This Weekend",
      timeSlot: "3:00 PM - 6:00 PM",
      properties: [
        { id: 4, name: "Lake View Residency", locality: "Jubilee Hills", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200", estimatedTime: 50, travelTime: 20, matchScore: 90 },
        { id: 5, name: "Heritage Towers", locality: "Banjara Hills", image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=200", estimatedTime: 45, matchScore: 87 }
      ],
      totalDuration: 115,
      totalDistance: 8,
      savings: { time: 30, distance: 5 }
    }
  ];

  const handleOptimize = async () => {
    setIsOptimizing(true);
    // Simulate AI optimization
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsOptimizing(false);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/60">
            <Route className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Smart Visit Planner</h3>
            <p className="text-sm text-muted-foreground">
              AI-optimized routes for efficient property tours
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleOptimize}
          disabled={isOptimizing}
          className="gap-2"
        >
          <Zap className={cn("h-4 w-4", isOptimizing && "animate-pulse")} />
          {isOptimizing ? "Optimizing..." : "Re-optimize"}
        </Button>
      </div>

      {/* Cluster Cards */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {suggestedClusters.map((cluster, index) => (
            <motion.div
              key={cluster.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  "w-[340px] cursor-pointer transition-all duration-300",
                  "hover:shadow-lg hover:border-primary/50",
                  selectedCluster === cluster.id && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedCluster(
                  selectedCluster === cluster.id ? null : cluster.id
                )}
              >
                <div className="p-4">
                  {/* Date & Time */}
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {cluster.date}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {cluster.timeSlot}
                    </span>
                  </div>

                  {/* Properties Preview */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex -space-x-3">
                      {cluster.properties.map((prop, i) => (
                        <motion.img
                          key={prop.id}
                          src={prop.image}
                          alt={prop.name}
                          className="w-10 h-10 rounded-full border-2 border-background object-cover"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">
                      {cluster.properties.length} properties
                    </span>
                  </div>

                  {/* Route Info */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {Math.floor(cluster.totalDuration / 60)}h {cluster.totalDuration % 60}m
                    </span>
                    <span className="flex items-center gap-1">
                      <Car className="h-4 w-4" />
                      {cluster.totalDistance} km
                    </span>
                  </div>

                  {/* Savings Badge */}
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 border-0">
                      <Zap className="h-3 w-3 mr-1" />
                      Save {cluster.savings.time} mins
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      -{cluster.savings.distance} km
                    </Badge>
                  </div>
                </div>

                {/* Expanded View */}
                <AnimatePresence>
                  {selectedCluster === cluster.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-2 border-t">
                        <h4 className="text-sm font-semibold mb-3">Optimized Route</h4>
                        <div className="space-y-3">
                          {cluster.properties.map((prop, i) => (
                            <div key={prop.id} className="relative">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                                    {i + 1}
                                  </div>
                                  {i < cluster.properties.length - 1 && (
                                    <div className="absolute top-8 left-1/2 w-0.5 h-8 bg-border -translate-x-1/2" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{prop.name}</p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {prop.locality}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {prop.matchScore}% match
                                </Badge>
                              </div>
                              {prop.travelTime && (
                                <div className="ml-11 mt-1 text-xs text-muted-foreground flex items-center gap-1">
                                  <Car className="h-3 w-3" />
                                  {prop.travelTime} min drive
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <Button 
                          className="w-full mt-4 gap-2"
                          onClick={() => onScheduleCluster(cluster)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Book This Tour
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}

          {/* Add Custom Cluster */}
          <Card className="w-[170px] sm:w-[200px] border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
            <div className="text-center p-6">
              <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Create Custom Tour</p>
              <p className="text-xs text-muted-foreground mt-1">
                Select properties manually
              </p>
            </div>
          </Card>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default SmartVisitCluster;
