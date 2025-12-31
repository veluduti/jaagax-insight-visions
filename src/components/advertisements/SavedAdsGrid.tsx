import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdCard from "./AdCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, Search, Filter, Trash2, Phone, 
  CheckCircle, SlidersHorizontal, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface SavedAd {
  id: string;
  notes: string | null;
  contacted: boolean;
  contacted_at: string | null;
  saved_at: string;
  advertisement: {
    id: string;
    title: string;
    tagline: string | null;
    description: string | null;
    images: string[];
    offer_text: string | null;
    cta_text: string | null;
    ad_type: string;
    featured: boolean;
    impressions: number;
    saves: number;
    start_date: string | null;
    end_date: string | null;
    property_id: number | null;
    project_id: number | null;
    highlights: any;
    properties?: { title: string; locality: string; city: string; price: number; bhk: number } | null;
    projects?: { name: string; locality: string; city: string; avg_price: number } | null;
  };
}

const SavedAdsGrid = () => {
  const [savedAds, setSavedAds] = useState<SavedAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedAds();
  }, []);

  const fetchSavedAds = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('saved_advertisements')
        .select(`
          *,
          advertisement:advertisements(
            *,
            properties(title, locality, city, price, bhk),
            projects(name, locality, city, avg_price)
          )
        `)
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

      if (error) throw error;
      setSavedAds(data || []);
    } catch (error) {
      console.error('Error fetching saved ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsContacted = async (savedAdId: string) => {
    try {
      const { error } = await supabase
        .from('saved_advertisements')
        .update({ contacted: true, contacted_at: new Date().toISOString() })
        .eq('id', savedAdId);

      if (error) throw error;
      
      setSavedAds(prev => prev.map(sa => 
        sa.id === savedAdId 
          ? { ...sa, contacted: true, contacted_at: new Date().toISOString() } 
          : sa
      ));
      toast.success("Marked as contacted");
    } catch (error) {
      console.error('Mark contacted error:', error);
      toast.error("Failed to update");
    }
  };

  const removeSaved = async (savedAdId: string) => {
    try {
      const { error } = await supabase
        .from('saved_advertisements')
        .delete()
        .eq('id', savedAdId);

      if (error) throw error;
      
      setSavedAds(prev => prev.filter(sa => sa.id !== savedAdId));
      toast.success("Removed from saved");
    } catch (error) {
      console.error('Remove saved error:', error);
      toast.error("Failed to remove");
    }
  };

  const filteredAds = savedAds.filter(sa => {
    const ad = sa.advertisement;
    const matchesSearch = ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ad.tagline?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterType || ad.ad_type === filterType;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Saved Promotions
            </CardTitle>
            <CardDescription>
              {savedAds.length} promotions saved
            </CardDescription>
          </div>
          
          {/* Stats */}
          <div className="flex gap-3">
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {savedAds.filter(sa => sa.contacted).length} Contacted
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              {savedAds.filter(sa => sa.advertisement.featured).length} Featured
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search & Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search saved promotions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {['property', 'project', 'builder_brand'].map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(filterType === type ? null : type)}
              >
                {type === 'builder_brand' ? 'Brand' : type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Saved Ads List */}
        {filteredAds.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {savedAds.length === 0 ? "No saved promotions yet" : "No matching promotions"}
            </h3>
            <p className="text-muted-foreground">
              {savedAds.length === 0 
                ? "Browse promotions and save the ones you like!" 
                : "Try adjusting your search or filters"}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAds.map((savedAd) => (
                <motion.div
                  key={savedAd.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative"
                >
                  {/* Contacted Badge */}
                  {savedAd.contacted && (
                    <Badge className="absolute -top-2 -right-2 z-10 bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Contacted
                    </Badge>
                  )}
                  
                  <AdCard
                    ad={savedAd.advertisement}
                    isSaved={true}
                    onSave={fetchSavedAds}
                    onContact={() => markAsContacted(savedAd.id)}
                  />

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-2">
                    {!savedAd.contacted && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => markAsContacted(savedAd.id)}
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        Mark Contacted
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeSaved(savedAd.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
};

export default SavedAdsGrid;