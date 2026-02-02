import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface CreateAdFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CreateAdForm = ({ onSuccess, onCancel }: CreateAdFormProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Advertisement</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            The advertisements table needs to be created first. 
            This feature will be available once the database schema is complete.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default CreateAdForm;