import { Calendar, Construction } from "lucide-react";

interface LocalityEventsProps {
  city: string;
  locality: string;
}

// Stub component - community_events table not yet created
export function LocalityEvents({ city, locality }: LocalityEventsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          Upcoming Events in {locality}
        </h2>
      </div>

      <div className="text-center py-8 bg-muted/30 rounded-lg">
        <Construction className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold mb-2">Coming Soon</h3>
        <p className="text-muted-foreground text-sm">
          Local events feature is being set up. Check back soon!
        </p>
      </div>
    </div>
  );
}
