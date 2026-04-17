import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Bed, Bath, Maximize, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

interface FavoriteProperty {
  favorite_id: string;
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  bhk: number | null;
  images: any;
  verified: boolean | null;
}

const MyFavorites = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("favorites")
      .select("id, property_id, properties(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    const mapped: FavoriteProperty[] = (data || [])
      .filter((row: any) => row.properties)
      .map((row: any) => ({ favorite_id: row.id, ...row.properties }));
    setFavorites(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchFavorites();

    const channel = supabase
      .channel("buyer-favorites")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "favorites" },
        () => fetchFavorites()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const removeFavorite = async (favoriteId: string) => {
    const { error } = await supabase.from("favorites").delete().eq("id", favoriteId);
    if (error) {
      toast.error("Failed to remove");
      return;
    }
    toast.success("Removed from favorites");
    setFavorites((prev) => prev.filter((f) => f.favorite_id !== favoriteId));
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
        <p className="text-muted-foreground mb-4">
          Tap the heart icon on any property to save it here.
        </p>
        <Button onClick={() => navigate("/map")}>Browse Properties</Button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {favorites.map((property) => (
        <Card key={property.favorite_id} className="overflow-hidden hover:shadow-xl transition-all">
          <div className="relative h-48">
            <img
              src={(Array.isArray(property.images) && property.images[0]) || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800"}
              alt={property.title}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => navigate(`/property/${property.id}`)}
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800";
              }}
            />
            {property.verified && (
              <Badge className="absolute top-2 left-2 bg-primary">Verified</Badge>
            )}
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={() => removeFavorite(property.favorite_id)}
              title="Remove from favorites"
            >
              <Heart className="h-4 w-4 fill-primary text-primary" />
            </Button>
          </div>
          <CardContent className="p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {property.locality || "N/A"}, {property.city || "N/A"}
              </p>
            </div>
            <p className="text-2xl font-bold text-primary">{formatPrice(property.price)}</p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Bed className="h-4 w-4" />{property.bhk || property.bedrooms || 0}</span>
              <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{property.bathrooms || 0}</span>
              <span className="flex items-center gap-1"><Maximize className="h-4 w-4" />{property.area_sqft || 0} sqft</span>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1" onClick={() => navigate(`/property/${property.id}`)}>
                <Eye className="h-4 w-4 mr-1" /> View
              </Button>
              <Button size="sm" variant="outline" onClick={() => removeFavorite(property.favorite_id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MyFavorites;
