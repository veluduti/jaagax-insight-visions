import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Share2, Phone, Eye } from "lucide-react";

interface AdCardProps {
  ad: any;
  isSaved?: boolean;
  onSave?: () => void;
  onContact?: () => void;
  showStats?: boolean;
}

const AdCard = ({ ad, isSaved = false, onSave, onContact, showStats = false }: AdCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48">
        <img
          src={ad.images?.[0] || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"}
          alt={ad.title}
          className="w-full h-full object-cover"
        />
        <Badge className="absolute top-2 left-2 bg-primary">
          {ad.ad_type || "Featured"}
        </Badge>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-1">{ad.title}</h3>
        {ad.tagline && (
          <p className="text-sm text-muted-foreground mb-2">{ad.tagline}</p>
        )}
        <div className="flex gap-2 mt-4">
          <Button size="sm" variant="outline" onClick={onSave}>
            <Heart className={`h-4 w-4 mr-1 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
            {isSaved ? "Saved" : "Save"}
          </Button>
          <Button size="sm" variant="outline">
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdCard;