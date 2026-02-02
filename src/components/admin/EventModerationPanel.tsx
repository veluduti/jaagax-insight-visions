import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function EventModerationPanel() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Event Moderation</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              The community_events and event_vendors tables need to be created first. 
              This feature will be available once the database schema is complete.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
