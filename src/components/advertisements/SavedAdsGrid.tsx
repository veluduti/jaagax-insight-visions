import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Construction } from "lucide-react";

// Stub component - saved_advertisements table not yet created
const SavedAdsGrid = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Saved Promotions
        </CardTitle>
        <CardDescription>
          Your saved promotions will appear here
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <Construction className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground">
            The saved promotions feature is being set up. Check back soon!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SavedAdsGrid;
