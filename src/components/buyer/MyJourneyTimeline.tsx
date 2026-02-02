import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Construction } from "lucide-react";

// Stub component - buyer_journey_events table not yet created
const MyJourneyTimeline = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          My Journey
        </CardTitle>
        <CardDescription>
          Your path to finding the perfect home
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Construction className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">Journey Tracking Coming Soon</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            As you explore properties, connect with agents, and schedule visits, 
            your milestones will appear here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MyJourneyTimeline;
