import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, Eye, Phone, MapPin, Clock, Sparkles, 
  TrendingUp, Building2, CheckCircle, Star
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
  start_date: string | null;
  end_date: string | null;
  property_id: number | null;
  project_id: number | null;
  highlights: any;
  properties?: { title: string; locality: string; city: string; price: number; bhk: number } | null;
  projects?: { name: string; locality: string; city: string; avg_price: number } | null;
}

interface AdCardProps {
  ad: Advertisement;
  isSaved?: boolean;
  onSave?: () => void;
  onContact?: () => void;
  showStats?: boolean;
}

const AdCard = ({ ad, isSaved = false, onSave, onContact, showStats = false }: AdCardProps) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(isSaved);
  const navigate = useNavigate();

  const getGradientClass = () => {
    switch (ad.ad_type) {
      case 'property':
        return 'from-blue-500/20 via-purple-500/10 to-pink-500/20';
      case 'project':
        return 'from-emerald-500/20 via-teal-500/10 to-cyan-500/20';
      case 'builder_brand':
        return 'from-orange-500/20 via-amber-500/10 to-yellow-500/20';
      default:
        return 'from-primary/20 via-primary/10 to-primary/5';
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login to save promotions");
        navigate("/auth");
        return;
      }

      if (saved) {
        await supabase
          .from('saved_advertisements')
          .delete()
          .eq('user_id', user.id)
          .eq('advertisement_id', ad.id);
        setSaved(false);
        toast.success("Removed from saved promotions");
      } else {
        await supabase
          .from('saved_advertisements')
          .insert({ user_id: user.id, advertisement_id: ad.id });
        
        await supabase.rpc('increment_ad_stat', { p_ad_id: ad.id, p_stat_type: 'saves' });
        setSaved(true);
        toast.success("Saved to promotions!");
      }
      onSave?.();
    } catch (error) {
      console.error('Save error:', error);
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleClick = async () => {
    // Track click
    try {
      await supabase.rpc('increment_ad_stat', { p_ad_id: ad.id, p_stat_type: 'clicks' });
    } catch (e) {
      console.error('Track click error:', e);
    }
    
    if (ad.property_id) {
      navigate(`/property/${ad.property_id}`);
    } else if (ad.project_id) {
      navigate(`/project/${ad.project_id}`);
    } else {
      navigate(`/promotions/${ad.id}`);
    }
  };

  const handleContact = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.rpc('increment_ad_stat', { p_ad_id: ad.id, p_stat_type: 'contacts' });
    } catch (e) {
      console.error('Track contact error:', e);
    }
    onContact?.();
    toast.success("Contact request sent!");
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} Lac`;
  };

  const getDaysLeft = () => {
    if (!ad.end_date) return null;
    const end = new Date(ad.end_date);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
  };

  const daysLeft = getDaysLeft();
  const displayImage = ad.images?.[0] || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800";
  const location = ad.properties 
    ? `${ad.properties.locality}, ${ad.properties.city}`
    : ad.projects 
    ? `${ad.projects.locality}, ${ad.projects.city}`
    : null;
  const price = ad.properties?.price || ad.projects?.avg_price;

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
      onClick={handleClick}
    >
      <Card className={`overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-br ${getGradientClass()}`}>
        <div className="relative">
          <img
            src={displayImage}
            alt={ad.title}
            className="w-full h-48 object-cover"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800";
            }}
          />
          
          {/* Overlay Badges */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {ad.featured && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                <Star className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            )}
            {ad.offer_text && (
              <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 animate-pulse">
                {ad.offer_text}
              </Badge>
            )}
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
              {ad.ad_type === 'property' ? 'Property' : ad.ad_type === 'project' ? 'Project' : 'Brand'}
            </Badge>
          </div>

          {/* Days Left Badge */}
          {daysLeft && daysLeft <= 7 && (
            <Badge className="absolute top-2 right-12 bg-red-600 text-white animate-pulse">
              <Clock className="h-3 w-3 mr-1" />
              {daysLeft}d left
            </Badge>
          )}

          {/* Save Button */}
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={handleSave}
            disabled={saving}
          >
            <Heart className={`h-4 w-4 transition-colors ${saved ? "fill-red-500 text-red-500" : ""}`} />
          </Button>

          {/* Gradient Overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Price Tag */}
          {price && (
            <div className="absolute bottom-2 left-2 text-white font-bold text-lg drop-shadow-lg">
              {formatPrice(price)}
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Title & Tagline */}
          <div>
            <h3 className="font-bold text-lg line-clamp-1 text-foreground">{ad.title}</h3>
            {ad.tagline && (
              <p className="text-sm text-primary font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {ad.tagline}
              </p>
            )}
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mr-1" />
              {location}
            </div>
          )}

          {/* Highlights */}
          {ad.highlights && Array.isArray(ad.highlights) && ad.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {ad.highlights.slice(0, 3).map((highlight: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                  {highlight}
                </Badge>
              ))}
            </div>
          )}

          {/* Stats (for builder view) */}
          {showStats && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {ad.impressions}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {ad.saves}
              </span>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              className="flex-1 bg-gradient-to-r from-primary to-primary/80"
              onClick={handleClick}
            >
              {ad.cta_text || "View Details"}
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleContact}
            >
              <Phone className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdCard;