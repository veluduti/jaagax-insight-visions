import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, Activity, Shield, Sparkles, Download, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LocalityData {
  name: string;
  city: string;
  avgPrice: number;
  yoyGrowth: number;
  txCount: number;
  trustScore: number;
  forecast6m: number;
}

interface LocalityIndexCardsProps {
  localities: LocalityData[];
  onForecastClick?: (locality: string) => void;
  onDownloadBrief?: (locality: string) => void;
}

export const LocalityIndexCards = ({
  localities,
  onForecastClick,
  onDownloadBrief,
}: LocalityIndexCardsProps) => {
  const navigate = useNavigate();

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)}L`;
    return `₹${price.toFixed(0)}`;
  };

  return (
    <div className="py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">
          Locality <span className="text-gradient">Market Index</span>
        </h2>
        <p className="text-muted-foreground">
          Real-time insights for top-performing localities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {localities.map((locality, idx) => (
          <motion.div
            key={locality.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -5 }}
          >
            <Card className="glass-panel hover:glow-effect transition-all border-primary/20 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-lg font-bold">{locality.name}</div>
                      <div className="text-xs text-muted-foreground">{locality.city}</div>
                    </div>
                  </div>
                  <Badge
                    variant={locality.yoyGrowth > 0 ? "default" : "destructive"}
                    className="ml-2"
                  >
                    {locality.yoyGrowth > 0 ? "+" : ""}
                    {locality.yoyGrowth.toFixed(1)}%
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Price & Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="text-xs text-muted-foreground mb-1">Avg Price/sqft</div>
                    <div className="text-lg font-bold text-gradient">
                      {formatPrice(locality.avgPrice)}
                    </div>
                  </div>
                  
                  <div className="p-3 bg-card rounded-lg border border-border">
                    <div className="text-xs text-muted-foreground mb-1">Transactions</div>
                    <div className="text-lg font-bold flex items-center gap-1">
                      {locality.txCount}
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </div>

                {/* Trust & Forecast */}
                <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm">TrustScore</span>
                  </div>
                  <Badge variant="outline" className="border-primary/50 text-primary">
                    {locality.trustScore}/100
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm">6M Forecast</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-primary">
                      {locality.forecast6m > 0 ? "+" : ""}
                      {locality.forecast6m.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/transactions/${locality.city}/${locality.name}`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Explore Transactions
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onForecastClick?.(locality.name)}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Forecast
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDownloadBrief?.(locality.name)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      AI Brief
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
