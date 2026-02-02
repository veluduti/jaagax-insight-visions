import { Calendar, Construction } from "lucide-react";

// Stub component - community_events table not yet created
export function CommunityEventHighlights() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8 text-primary" />
          Community Events
        </h2>
      </div>

      <div className="text-center py-12 bg-muted/30 rounded-lg">
        <Construction className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Community events and local gatherings feature is being set up. 
          Check back soon to discover festivals, meetups, and events in your area!
        </p>
      </div>
    </div>
  );
}
