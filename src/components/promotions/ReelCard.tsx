import { Heart, Bookmark, Share2, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Advertisement {
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
  highlights: any;
  properties?: { title: string; locality: string; city: string; price: number; bhk: number; area?: number } | null;
  projects?: { name: string; locality: string; city: string; avg_price: number } | null;
}

interface ReelCardProps {
  ad: Advertisement;
  isActive: boolean;
  isSaved: boolean;
  onSave: () => void;
  index: number;
}

const formatPrice = (price: number) => {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price.toLocaleString()}`;
};

// Stub component - saved_advertisements table not yet created
const ReelCard = ({ ad, isActive, isSaved, onSave, index }: ReelCardProps) => {
  const images = ad.images?.length ? ad.images : [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'
  ];

  const price = ad.properties?.price || ad.projects?.avg_price || 0;
  const location = ad.properties?.locality || ad.projects?.locality || '';
  const city = ad.properties?.city || ad.projects?.city || '';

  const handleContact = () => {
    toast.success("Contact request sent! Agent will reach out soon.");
  };

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={images[0]}
          alt={ad.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90" />

      {/* Top Left Badges */}
      <div className="absolute top-12 left-4 z-10 flex flex-col gap-2">
        {ad.featured && (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1 shadow-lg">
            <Sparkles className="h-3 w-3" />
            Featured
          </Badge>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-48 flex flex-col items-center gap-5 z-10">
        <button className="flex flex-col items-center gap-1">
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{ad.impressions || 0}</span>
        </button>

        <button className="flex flex-col items-center gap-1" onClick={onSave}>
          <div className={`p-3 rounded-full backdrop-blur-sm ${isSaved ? "bg-primary" : "bg-black/40"}`}>
            <Bookmark className={`h-6 w-6 ${isSaved ? "text-white fill-white" : "text-white"}`} />
          </div>
          <span className="text-white text-xs font-medium">{ad.saves || 0}</span>
        </button>

        <button className="flex flex-col items-center gap-1">
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm shadow-lg">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">Share</span>
        </button>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-20 p-4 z-10">
        {/* Offer Tag */}
        {ad.offer_text && (
          <Badge variant="destructive" className="bg-gradient-to-r from-rose-500 to-pink-500 border-0 text-sm px-3 py-1 shadow-lg mb-3">
            🔥 {ad.offer_text}
          </Badge>
        )}

        {/* Title & Price */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1 line-clamp-2 drop-shadow-lg">
              {ad.title}
            </h2>
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <MapPin className="h-4 w-4" />
              <span>{location}{city ? `, ${city}` : ''}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
              {formatPrice(price)}
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-4">
          <Button 
            className="w-full bg-white text-black hover:bg-white/90 font-semibold h-12 text-base shadow-xl"
            onClick={handleContact}
          >
            {ad.cta_text || "Schedule Visit"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReelCard;
