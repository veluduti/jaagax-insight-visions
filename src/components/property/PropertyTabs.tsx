import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Calculator, FileText } from "lucide-react";

interface PropertyTabsProps {
  description: string;
}

const PropertyTabs = ({ description }: PropertyTabsProps) => {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-secondary/50">
        <TabsTrigger value="overview" className="gap-2">
          <FileText className="h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="trends" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Trends
        </TabsTrigger>
        <TabsTrigger value="mortgage" className="gap-2">
          <Calculator className="h-4 w-4" />
          Mortgage
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <div className="prose prose-sm max-w-none">
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {description}
          </p>
        </div>
      </TabsContent>

      <TabsContent value="trends" className="mt-6">
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4">Market Trends</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Average Price (per sq.ft)</span>
              <span className="font-semibold">₹5,200</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Price Change (Last Year)</span>
              <span className="font-semibold text-green-600">+12.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Demand Level</span>
              <span className="font-semibold">High</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Average Days on Market</span>
              <span className="font-semibold">45 days</span>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="mortgage" className="mt-6">
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4">Mortgage Calculator</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Loan Amount (80%)</span>
              <span className="font-semibold">₹2.56 Cr</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Interest Rate</span>
              <span className="font-semibold">8.5% p.a.</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Loan Tenure</span>
              <span className="font-semibold">20 years</span>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-muted-foreground font-medium">Monthly EMI</span>
              <span className="font-bold text-primary text-xl">₹2,21,500</span>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default PropertyTabs;
