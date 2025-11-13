import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, MapPin } from "lucide-react";

export const FetchCommunityEvents = () => {
  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fetchedEvents, setFetchedEvents] = useState<any[]>([]);

  const handleFetchEvents = async () => {
    if (!city.trim() || !locality.trim()) {
      toast.error("Please enter both city and locality");
      return;
    }

    setIsLoading(true);
    setFetchedEvents([]);

    try {
      const { data, error } = await supabase.functions.invoke('fetch-community-events', {
        body: { city: city.trim(), locality: locality.trim() }
      });

      if (error) throw error;

      if (data?.success) {
        setFetchedEvents(data.events || []);
        toast.success(data.message || `Successfully fetched ${data.events?.length || 0} events`);
      } else {
        toast.error(data?.error || "Failed to fetch events");
      }
    } catch (error: any) {
      console.error("Error fetching events:", error);
      toast.error(error.message || "Failed to fetch community events");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Fetch Community Events
        </CardTitle>
        <CardDescription>
          Extract and populate community events for a specific locality using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="e.g., Hyderabad"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="locality">Locality</Label>
            <Input
              id="locality"
              placeholder="e.g., Kokapet"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <Button
          onClick={handleFetchEvents}
          disabled={isLoading || !city || !locality}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching Events...
            </>
          ) : (
            <>
              <Calendar className="mr-2 h-4 w-4" />
              Fetch Events
            </>
          )}
        </Button>

        {fetchedEvents.length > 0 && (
          <div className="space-y-3 mt-6">
            <h3 className="font-semibold text-lg">Fetched Events ({fetchedEvents.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {fetchedEvents.map((event, idx) => (
                <Card key={idx} className="glass-panel">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-20 h-20 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1 truncate">{event.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(event.event_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.venue}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};