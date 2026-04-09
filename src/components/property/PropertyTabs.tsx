import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Calculator, FileText } from "lucide-react";

interface PropertyTabsProps {
  description: string;
  price?: number;
  area?: number | null;
  locality?: string;
  city?: string;
}

const formatPrice = (price: number) => {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price.toLocaleString('en-IN')}`;
};

const PropertyTabs = ({ description, price, area, locality, city }: PropertyTabsProps) => {
  const pricePerSqft = price && area ? Math.round(price / area) : null;
  const loanAmount = price ? price * 0.8 : null;
  const interestRate = 8.5;
  const tenureYears = 20;
  
  // Calculate EMI using standard formula
  let emi: number | null = null;
  if (loanAmount) {
    const r = interestRate / 12 / 100;
    const n = tenureYears * 12;
    emi = Math.round(loanAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
  }

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
          {pricePerSqft ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Price per sq.ft</span>
                <span className="font-semibold">₹{pricePerSqft.toLocaleString('en-IN')}</span>
              </div>
              {locality && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-semibold">{locality}, {city}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Area</span>
                <span className="font-semibold">{area?.toLocaleString('en-IN')} sq.ft</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Listed Price</span>
                <span className="font-semibold">{price ? formatPrice(price) : '—'}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Market trend data is not available for this property.</p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="mortgage" className="mt-6">
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4">Mortgage Estimate</h3>
          {price && loanAmount && emi ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Property Price</span>
                <span className="font-semibold">{formatPrice(price)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Loan Amount (80%)</span>
                <span className="font-semibold">{formatPrice(loanAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Interest Rate</span>
                <span className="font-semibold">{interestRate}% p.a.</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Loan Tenure</span>
                <span className="font-semibold">{tenureYears} years</span>
              </div>
              <div className="flex justify-between items-center border-t pt-4">
                <span className="text-muted-foreground font-medium">Monthly EMI</span>
                <span className="font-bold text-primary text-xl">₹{emi.toLocaleString('en-IN')}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Mortgage details are not available for this property.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default PropertyTabs;
