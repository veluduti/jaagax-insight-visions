import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Shield } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface ForecastData {
  month: string;
  actual?: number;
  predicted: number;
  low: number;
  high: number;
}

export const AIForecastSection = () => {
  const [selectedCity, setSelectedCity] = useState("Hyderabad");
  const [selectedLocality, setSelectedLocality] = useState("Kokapet");
  const [selectedPropertyType, setSelectedPropertyType] = useState("all");
  const [trustAdjusted, setTrustAdjusted] = useState(true);

  // Mock forecast data
  const forecastData: ForecastData[] = [
    { month: "Jul '24", actual: 8500, predicted: 8500, low: 8200, high: 8800 },
    { month: "Aug '24", actual: 8700, predicted: 8700, low: 8400, high: 9000 },
    { month: "Sep '24", actual: 8900, predicted: 8900, low: 8600, high: 9200 },
    { month: "Oct '24", actual: 9100, predicted: 9100, low: 8800, high: 9400 },
    { month: "Nov '24", actual: 9300, predicted: 9300, low: 9000, high: 9600 },
    { month: "Dec '24", actual: 9500, predicted: 9500, low: 9200, high: 9800 },
    { month: "Jan '25", predicted: 9800, low: 9400, high: 10200 },
    { month: "Feb '25", predicted: 10100, low: 9600, high: 10600 },
    { month: "Mar '25", predicted: 10400, low: 9900, high: 10900 },
    { month: "Apr '25", predicted: 10700, low: 10200, high: 11200 },
    { month: "May '25", predicted: 11000, low: 10400, high: 11600 },
    { month: "Jun '25", predicted: 11300, low: 10700, high: 11900 },
  ];

  const formatPrice = (value: number) => `₹${(value / 1000).toFixed(1)}K`;

  return (
    <div className="py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="text-3xl font-bold mb-2">
          AI Price <span className="text-gradient">Forecasting</span>
        </h2>
        <p className="text-muted-foreground">
          Machine learning-powered predictions with confidence bands
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Hyderabad">Hyderabad</SelectItem>
            <SelectItem value="Vijayawada">Vijayawada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedLocality} onValueChange={setSelectedLocality}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Kokapet">Kokapet</SelectItem>
            <SelectItem value="Gachibowli">Gachibowli</SelectItem>
            <SelectItem value="Kondapur">Kondapur</SelectItem>
            <SelectItem value="Narsingi">Narsingi</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedPropertyType} onValueChange={setSelectedPropertyType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Property Types</SelectItem>
            <SelectItem value="apartment">Apartment</SelectItem>
            <SelectItem value="villa">Villa</SelectItem>
            <SelectItem value="plot">Plot</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="glass-panel border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Price Forecast: {selectedLocality}, {selectedCity}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={trustAdjusted ? "default" : "outline"}
                onClick={() => setTrustAdjusted(!trustAdjusted)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Trust-Adjusted View
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatPrice}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => formatPrice(value)}
              />
              
              {/* Confidence Band */}
              <Area
                type="monotone"
                dataKey="high"
                stroke="none"
                fill="url(#confidenceBand)"
              />
              <Area
                type="monotone"
                dataKey="low"
                stroke="none"
                fill="hsl(var(--background))"
              />
              
              {/* Actual Values */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                name="Actual"
              />
              
              {/* Predicted Values */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "hsl(var(--primary))", r: 3 }}
                name="Forecast"
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* AI Commentary */}
          <div className="mt-6 p-6 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-1" />
              <div className="flex-1">
                <h4 className="font-semibold text-primary mb-2">AI Analysis</h4>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {selectedLocality} is projected to see a <strong className="text-primary">+18.9% appreciation</strong> over 
                  the next 6 months, driven by upcoming infrastructure projects and sustained buyer demand. 
                  {trustAdjusted && (
                    <> Trust-adjusted prices account for verified property data, resulting in more conservative 
                    estimates with higher confidence.</>
                  )}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Confidence</div>
                    <Badge className="bg-primary/20 text-primary">87%</Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Risk Level</div>
                    <Badge variant="outline" className="border-green-500/50 text-green-500">Low</Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Liquidity</div>
                    <Badge variant="outline" className="border-blue-500/50 text-blue-500">High</Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Investment Grade</div>
                    <Badge variant="outline" className="border-primary/50 text-primary">A+</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
