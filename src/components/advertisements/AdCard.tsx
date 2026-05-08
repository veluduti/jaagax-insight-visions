import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Share2, ExternalLink } from "lucide-react";

interface AdCardProps {
  ad: any;
  isSaved?: boolean;
  onSave?: () => void;
  onContact?: () => void;
  showStats?: boolean;
}

const AdCard = ({ ad, isSaved = false, onSave, onContact, showStats = false }: AdCardProps) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    if (ad.property_id) navigate(`/property/${ad.property_id}`);
    else if (ad.project_id) navigate(`/project/${ad.project_id}`);
  };

  const hasDetailPage = !!(ad.property_id || ad.project_id);

  return (
    <Card
      className={`overflow-hidden hover:shadow-lg transition-shadow ${hasDetailPage ? "cursor-pointer" : ""}`}
      onClick={hasDetailPage ? handleNavigate : undefined}
    >
      <div className="relative h-48">
        <img
          src={ad.images?.[0] || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"}
          alt={ad.title}
          className="w-full h-full object-cover"
         loading="lazy" decoding="async" />
        <Badge className="absolute top-2 left-2 bg-primary">
          {ad.ad_type || "Featured"}
        </Badge>
        {hasDetailPage && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-black/60 text-white border-0 gap-1">
              <ExternalLink className="h-3 w-3" />
              View
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-1">{ad.title}</h3>
        {ad.tagline && (
          <p className="text-sm text-muted-foreground mb-2">{ad.tagline}</p>
        )}
        <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" onClick={onSave}>
            <Heart className={`h-4 w-4 mr-1 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
            {isSaved ? "Saved" : "Save"}
          </Button>
          <Button size="sm" variant="outline">
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
          {hasDetailPage && (
            <Button size="sm" variant="default" onClick={handleNavigate}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdCard;
