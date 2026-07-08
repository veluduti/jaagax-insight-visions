import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, FileText } from "lucide-react";

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

  // Only show Trends tab when we have at least one real data point.
  const hasTrendData = !!(pricePerSqft || area || price || locality);

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className={`grid w-full ${hasTrendData ? 'grid-cols-2' : 'grid-cols-1'} bg-secondary/50`}>
        <TabsTrigger value="overview" className="gap-2">
          <FileText className="h-4 w-4" />
          Overview
        </TabsTrigger>
        {hasTrendData && (
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Details
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        {description?.trim() ? (
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {description}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No description provided by the owner.</p>
        )}
      </TabsContent>

      {hasTrendData && (
        <TabsContent value="trends" className="mt-6">
          <div className="glass-panel p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-4">Listing Details</h3>
            <div className="space-y-4">
              {pricePerSqft && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Price per sq.ft</span>
                  <span className="font-semibold">₹{pricePerSqft.toLocaleString('en-IN')}</span>
                </div>
              )}
              {locality && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-semibold">{locality}{city ? `, ${city}` : ''}</span>
                </div>
              )}
              {area && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Area</span>
                  <span className="font-semibold">{area.toLocaleString('en-IN')} sq.ft</span>
                </div>
              )}
              {price && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Listed Price</span>
                  <span className="font-semibold">{formatPrice(price)}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              Only fields provided by the owner are shown. Mortgage &amp; market projections will appear once verified market data is available.
            </p>
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
};

export default PropertyTabs;
