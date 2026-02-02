import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Construction } from "lucide-react";

interface CityEventsSummaryProps {
  city: string;
}

// Stub component - community_events table not yet created
export function CityEventsSummary({ city }: CityEventsSummaryProps) {
  return (
    <Card className="glass-panel border-primary/30">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2 mb-2">
              <Calendar className="h-6 w-6 text-primary" />
              Community Events in {city}
            </h3>
            <p className="text-muted-foreground">
              Discover local festivals, meetups, and community gatherings
            </p>
          </div>
        </div>

        <div className="text-center py-8">
          <Construction className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground text-sm">
            Community events feature is being set up. Check back soon!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
