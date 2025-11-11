import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Home, 
  Star,
  Target,
  Clock,
  CheckCircle
} from "lucide-react";
import { motion } from "framer-motion";

interface AgentPerformanceProps {
  salesCount: number;
  rentCount: number;
  trustScore: number;
  reviewCount: number;
  averageRating: string;
}

const AgentPerformance = ({ 
  salesCount, 
  rentCount, 
  trustScore,
  reviewCount,
  averageRating 
}: AgentPerformanceProps) => {
  const totalDeals = salesCount + rentCount;
  const salesPercentage = totalDeals > 0 ? (salesCount / totalDeals) * 100 : 0;
  const rentPercentage = totalDeals > 0 ? (rentCount / totalDeals) * 100 : 0;

  const performanceMetrics = [
    {
      icon: Target,
      label: "Success Rate",
      value: trustScore >= 90 ? "Excellent" : trustScore >= 75 ? "Very Good" : "Good",
      progress: trustScore,
      color: "text-green-500"
    },
    {
      icon: Clock,
      label: "Response Time",
      value: trustScore >= 85 ? "Fast" : "Average",
      progress: trustScore >= 85 ? 90 : 70,
      color: "text-blue-500"
    },
    {
      icon: CheckCircle,
      label: "Client Satisfaction",
      value: parseFloat(averageRating) >= 4.5 ? "Excellent" : "Very Good",
      progress: parseFloat(averageRating) * 20,
      color: "text-purple-500"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Deal Distribution */}
          <div>
            <h3 className="font-semibold mb-4">Deal Distribution</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Sales</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {salesCount} ({salesPercentage.toFixed(0)}%)
                  </span>
                </div>
                <Progress value={salesPercentage} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Rentals</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {rentCount} ({rentPercentage.toFixed(0)}%)
                  </span>
                </div>
                <Progress value={rentPercentage} className="h-2" />
              </div>
            </div>
          </div>

          {/* Performance Indicators */}
          <div>
            <h3 className="font-semibold mb-4">Performance Indicators</h3>
            <div className="space-y-4">
              {performanceMetrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${metric.color}`} />
                        <span className="text-sm font-medium">{metric.label}</span>
                      </div>
                      <span className="text-sm font-semibold">{metric.value}</span>
                    </div>
                    <Progress value={metric.progress} className="h-2" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rating Summary */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                <span className="font-semibold">Average Rating</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{averageRating}</p>
                <p className="text-xs text-muted-foreground">{reviewCount} reviews</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AgentPerformance;
