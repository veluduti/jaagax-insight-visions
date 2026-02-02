import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function WhatsAppLogsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            The whatsapp_logs table needs to be created first. 
            This feature will be available once the database schema is complete.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
