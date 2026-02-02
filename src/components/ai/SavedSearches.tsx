import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Construction } from "lucide-react";

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: any;
  created_at: string;
  notification_enabled: boolean;
}

interface SavedSearchesProps {
  onSelectSearch: (search: SavedSearch) => void;
}

// Export stub function for saving searches
export const saveSearch = async ({ query, filters, name }: { query: string; filters: any; name: string }) => {
  console.log("Save search feature coming soon:", { query, filters, name });
  return false;
};

// Stub component - saved_searches table not yet created
export default function SavedSearches({ onSelectSearch }: SavedSearchesProps) {
  return (
    <Card className="p-6 glass-panel">
      <div className="flex items-center gap-2 mb-4">
        <Bookmark className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-bold">Saved Searches</h3>
        <Badge variant="secondary">0</Badge>
      </div>

      <div className="text-center py-8">
        <Construction className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Saved searches feature coming soon. Save your AI queries to quickly access them later!
        </p>
      </div>
    </Card>
  );
}
