import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, AlertTriangle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SuspiciousListing {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  trust_score: number | null;
  verified: boolean | null;
  images: any;
  description: string | null;
  reasons: string[];
}

export const FakeListingManager = () => {
  const { toast } = useToast();
  const [listings, setListings] = useState<SuspiciousListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string[]>([]);

  useEffect(() => {
    loadSuspiciousListings();
  }, []);

  const loadSuspiciousListings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('trust_score', { ascending: true });

      if (error) throw error;

      const suspicious = data?.filter((prop: any) => {
        const hasCriticalIssues = 
          !prop.title || 
          !prop.city || 
          !prop.locality ||
          prop.price === 0 || 
          prop.price === null ||
          (prop.trust_score !== null && prop.trust_score < 80) ||
          !prop.verified ||
          !prop.images || 
          (Array.isArray(prop.images) && prop.images.length === 0) ||
          !prop.description || 
          (prop.description && prop.description.length < 50);
        
        return hasCriticalIssues;
      }).map((prop: any) => {
        const reasons: string[] = [];
        if (!prop.title) reasons.push("Missing title");
        if (!prop.city) reasons.push("Missing city");
        if (!prop.locality) reasons.push("Missing locality");
        if (prop.price === 0 || prop.price === null) reasons.push("Invalid price");
        if (prop.trust_score !== null && prop.trust_score < 80) reasons.push("Low trust score");
        if (!prop.verified) reasons.push("Not verified");
        if (!prop.images || (Array.isArray(prop.images) && prop.images.length === 0)) reasons.push("No images");
        if (!prop.description || (prop.description && prop.description.length < 50)) reasons.push("Poor description");

        return {
          ...prop,
          reasons
        } as SuspiciousListing;
      }) || [];

      setListings(suspicious);
    } catch (error: any) {
      toast({
        title: "Error Loading Listings",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(prev => [...prev, id]);
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Listing Removed",
        description: "The property listing has been deleted"
      });

      setListings(prev => prev.filter(l => l.id !== id));
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleting(prev => prev.filter(d => d !== id));
    }
  };

  const handleKeep = async (id: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ trust_score: 85 })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Listing Kept",
        description: "Trust score updated"
      });

      setListings(prev => prev.filter(l => l.id !== id));
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = confirm(`Delete all ${listings.length} suspicious listings?`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const ids = listings.map(l => l.id);
      const { error } = await supabase
        .from('properties')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({
        title: "Bulk Deletion Complete",
        description: `Removed ${ids.length} listings`
      });

      setListings([]);
    } catch (error: any) {
      toast({
        title: "Bulk Deletion Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          Suspicious Listings Review
        </CardTitle>
        <CardDescription>
          Review and remove fake or low-quality property listings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Found {listings.length} suspicious listings
          </p>
          {listings.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </Button>
          )}
        </div>

        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {listings.map((listing) => (
              <Card key={listing.id} className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold">{listing.title || 'Untitled'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {listing.locality || 'N/A'}, {listing.city || 'N/A'}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        Score: {listing.trust_score ?? 0}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {listing.reasons.map((reason, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {reason}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-sm">
                      ₹{listing.price?.toLocaleString('en-IN') || 0}
                    </p>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(listing.id)}
                        disabled={deleting.includes(listing.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleKeep(listing.id)}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Keep
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {listings.length === 0 && !loading && (
              <div className="text-center py-12">
                <Check className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">
                  No suspicious listings found
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
