import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, BellRing, TrendingDown, TrendingUp, Sparkles, 
  MapPin, Building, ChevronRight, Plus, X, Check,
  AlertTriangle, Zap, Target
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PriceAlert {
  id: string;
  locality: string;
  city: string;
  propertyType: string;
  currentAvgPrice: number;
  predictedPrice: number;
  predictedChange: number;
  confidence: number;
  timeframe: string;
  isActive: boolean;
  triggers: {
    priceDropPercent?: number;
    targetPrice?: number;
    newListingMatch?: boolean;
  };
}

interface PredictivePriceAlertsProps {
  className?: string;
}

const PredictivePriceAlerts = ({ className }: PredictivePriceAlertsProps) => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([
    {
      id: "1",
      locality: "Gachibowli",
      city: "Hyderabad",
      propertyType: "3BHK Apartment",
      currentAvgPrice: 12500000,
      predictedPrice: 11800000,
      predictedChange: -5.6,
      confidence: 78,
      timeframe: "Next 3 months",
      isActive: true,
      triggers: { priceDropPercent: 5 }
    },
    {
      id: "2",
      locality: "Hitech City",
      city: "Hyderabad",
      propertyType: "2BHK Apartment",
      currentAvgPrice: 8500000,
      predictedPrice: 9200000,
      predictedChange: 8.2,
      confidence: 85,
      timeframe: "Next 6 months",
      isActive: true,
      triggers: { targetPrice: 8000000 }
    },
    {
      id: "3",
      locality: "Kondapur",
      city: "Hyderabad",
      propertyType: "Villa",
      currentAvgPrice: 25000000,
      predictedPrice: 23500000,
      predictedChange: -6.0,
      confidence: 72,
      timeframe: "Next 3 months",
      isActive: false,
      triggers: { newListingMatch: true }
    }
  ]);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAlert, setNewAlert] = useState({
    locality: "",
    propertyType: "3BHK",
    priceDropPercent: 5
  });

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)} Cr`;
    }
    return `₹${(price / 100000).toFixed(0)} L`;
  };

  const toggleAlert = (id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, isActive: !alert.isActive } : alert
    ));
    toast.success("Alert settings updated");
  };

  const deleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
    toast.success("Alert removed");
  };

  const createAlert = () => {
    const newAlertItem: PriceAlert = {
      id: Date.now().toString(),
      locality: newAlert.locality,
      city: "Hyderabad",
      propertyType: newAlert.propertyType,
      currentAvgPrice: 10000000,
      predictedPrice: 9500000,
      predictedChange: -5,
      confidence: 75,
      timeframe: "Next 3 months",
      isActive: true,
      triggers: { priceDropPercent: newAlert.priceDropPercent }
    };
    setAlerts(prev => [...prev, newAlertItem]);
    setShowCreateDialog(false);
    setNewAlert({ locality: "", propertyType: "3BHK", priceDropPercent: 5 });
    toast.success("Price alert created!");
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
            <BellRing className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Predictive Price Alerts</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered price forecasts for your saved areas
            </p>
          </div>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Create Price Alert
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Locality</Label>
                <Input
                  placeholder="e.g., Gachibowli, Hitech City"
                  value={newAlert.locality}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, locality: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Property Type</Label>
                <div className="flex flex-wrap gap-2">
                  {["2BHK", "3BHK", "4BHK", "Villa", "Plot"].map(type => (
                    <Badge
                      key={type}
                      variant={newAlert.propertyType === type ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setNewAlert(prev => ({ ...prev, propertyType: type }))}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Alert when price drops by (%)</Label>
                <Input
                  type="number"
                  value={newAlert.priceDropPercent}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, priceDropPercent: parseInt(e.target.value) || 5 }))}
                />
              </div>
              <Button 
                className="w-full gap-2" 
                onClick={createAlert}
                disabled={!newAlert.locality}
              >
                <Bell className="h-4 w-4" />
                Create Alert
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* AI Prediction Summary */}
      <Card className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">AI Market Prediction</h4>
            <p className="text-sm text-muted-foreground">
              Based on 10,000+ transactions, our AI predicts <strong>Gachibowli 3BHK prices</strong> will 
              drop <strong>5-7%</strong> in the next quarter due to new project launches. 
              Set alerts to catch the best deals!
            </p>
          </div>
        </div>
      </Card>

      {/* Alerts List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-3 pr-4">
          <AnimatePresence>
            {alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={cn(
                  "p-4 transition-all",
                  !alert.isActive && "opacity-60"
                )}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        alert.predictedChange < 0 
                          ? "bg-green-500/20" 
                          : "bg-orange-500/20"
                      )}>
                        {alert.predictedChange < 0 ? (
                          <TrendingDown className="h-5 w-5 text-green-600" />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-orange-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          {alert.locality}
                          <Badge variant="secondary" className="text-xs">
                            {alert.propertyType}
                          </Badge>
                        </h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {alert.city}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={alert.isActive}
                        onCheckedChange={() => toggleAlert(alert.id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteAlert(alert.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Price Prediction */}
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current Avg</p>
                      <p className="font-semibold">{formatPrice(alert.currentAvgPrice)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Predicted</p>
                      <p className={cn(
                        "font-semibold",
                        alert.predictedChange < 0 ? "text-green-600" : "text-orange-600"
                      )}>
                        {formatPrice(alert.predictedPrice)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Change</p>
                      <Badge className={cn(
                        alert.predictedChange < 0 
                          ? "bg-green-500/20 text-green-700 border-0" 
                          : "bg-orange-500/20 text-orange-700 border-0"
                      )}>
                        {alert.predictedChange > 0 ? "+" : ""}{alert.predictedChange}%
                      </Badge>
                    </div>
                  </div>

                  {/* Confidence & Timeframe */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Target className="h-3 w-3" />
                        {alert.confidence}% confidence
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Zap className="h-3 w-3" />
                        {alert.timeframe}
                      </span>
                    </div>
                    
                    {/* Trigger Info */}
                    <div className="flex items-center gap-1">
                      {alert.triggers.priceDropPercent && (
                        <Badge variant="outline" className="text-xs">
                          Alert at -{alert.triggers.priceDropPercent}%
                        </Badge>
                      )}
                      {alert.triggers.targetPrice && (
                        <Badge variant="outline" className="text-xs">
                          Target: {formatPrice(alert.triggers.targetPrice)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Opportunity Alert */}
                  {alert.predictedChange < -5 && alert.isActive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20"
                    >
                      <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <strong>Opportunity:</strong> Significant price drop predicted. 
                        Consider setting a lower target price alert!
                      </p>
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {alerts.length === 0 && (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h4 className="font-semibold mb-2">No Price Alerts Yet</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Create alerts to get notified when prices drop in your target areas
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Alert
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PredictivePriceAlerts;
