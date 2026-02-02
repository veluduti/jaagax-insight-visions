import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export const LeadsCRMPanel = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads & Site Visits CRM</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            The leads and site_visits tables need to be created first. 
            This feature will be available once the database schema is complete.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
