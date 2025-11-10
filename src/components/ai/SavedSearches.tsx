import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, Trash2, Bell, BellOff, Search, Loader2 } from "lucide-react";

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

interface SaveSearchProps {
  query: string;
  filters: any;
  name: string;
}

export const saveSearch = async ({ query, filters, name }: SaveSearchProps) => {
  if (!name.trim()) {
    toast.error("Please enter a name for this search");
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to save searches");
      return;
    }

    const { error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: user.id,
        name,
        query,
        filters,
      });

    if (error) throw error;

    toast.success("Search saved successfully!");
    return true;
  } catch (error: any) {
    console.error("Error saving search:", error);
    toast.error("Failed to save search");
    return false;
  }
};

export default function SavedSearches({ onSelectSearch }: SavedSearchesProps) {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchName, setSearchName] = useState("");

  useEffect(() => {
    fetchSavedSearches();
  }, []);

  const fetchSavedSearches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSearches(data || []);
    } catch (error: any) {
      console.error("Error fetching saved searches:", error);
      toast.error("Failed to load saved searches");
    } finally {
      setIsLoading(false);
    }
  };


  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Search deleted");
      fetchSavedSearches();
    } catch (error: any) {
      console.error("Error deleting search:", error);
      toast.error("Failed to delete search");
    }
  };

  const handleToggleNotification = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ notification_enabled: enabled })
        .eq('id', id);

      if (error) throw error;

      toast.success(enabled ? "Notifications enabled" : "Notifications disabled");
      fetchSavedSearches();
    } catch (error: any) {
      console.error("Error updating notification:", error);
      toast.error("Failed to update notification settings");
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 glass-panel">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 glass-panel">
      <div className="flex items-center gap-2 mb-4">
        <Bookmark className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-bold">Saved Searches</h3>
        <Badge variant="secondary">{searches.length}</Badge>
      </div>

      <AnimatePresence mode="popLayout">
        {searches.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground text-center py-8"
          >
            No saved searches yet. Save your AI queries to quickly access them later!
          </motion.p>
        ) : (
          <div className="space-y-3">
            {searches.map((search) => (
              <motion.div
                key={search.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                layout
              >
                <Card className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold mb-1 truncate">{search.name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {search.query}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {new Date(search.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleToggleNotification(search.id, !search.notification_enabled)}
                      >
                        {search.notification_enabled ? (
                          <Bell className="h-4 w-4 text-primary" />
                        ) : (
                          <BellOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onSelectSearch(search)}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(search.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </Card>
  );
}


