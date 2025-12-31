import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, Heart, Phone, MousePointer, TrendingUp, 
  TrendingDown, Minus, BarChart3
} from "lucide-react";

interface AdAnalyticsCardProps {
  ad: {
    id: string;
    title: string;
    status: string;
    impressions: number;
    clicks: number;
    saves: number;
    contacts: number;
    featured: boolean;
    start_date: string | null;
    end_date: string | null;
  };
}

const AdAnalyticsCard = ({ ad }: AdAnalyticsCardProps) => {
  const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : 0;
  const saveRate = ad.impressions > 0 ? ((ad.saves / ad.impressions) * 100).toFixed(2) : 0;
  const contactRate = ad.clicks > 0 ? ((ad.contacts / ad.clicks) * 100).toFixed(2) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'expired':
        return 'bg-gray-500';
      case 'pending_approval':
        return 'bg-blue-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-muted';
    }
  };

  const getTrendIcon = (value: number) => {
    if (value > 2) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (value < 1) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base line-clamp-1">{ad.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Badge className={`${getStatusColor(ad.status)} text-white text-xs`}>
                {ad.status.replace('_', ' ')}
              </Badge>
              {ad.featured && (
                <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                  Featured
                </Badge>
              )}
            </CardDescription>
          </div>
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Main Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <Eye className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold">{ad.impressions.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Views</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <MousePointer className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-lg font-bold">{ad.clicks.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Clicks</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <Heart className="h-4 w-4 mx-auto mb-1 text-red-500" />
            <p className="text-lg font-bold">{ad.saves.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Saves</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <Phone className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">{ad.contacts.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Contacts</p>
          </div>
        </div>

        {/* Conversion Rates */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Click Rate (CTR)</span>
            <span className="font-medium flex items-center gap-1">
              {ctr}%
              {getTrendIcon(parseFloat(ctr as string))}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Save Rate</span>
            <span className="font-medium flex items-center gap-1">
              {saveRate}%
              {getTrendIcon(parseFloat(saveRate as string))}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Contact Rate</span>
            <span className="font-medium flex items-center gap-1">
              {contactRate}%
              {getTrendIcon(parseFloat(contactRate as string))}
            </span>
          </div>
        </div>

        {/* Date Range */}
        {(ad.start_date || ad.end_date) && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            {ad.start_date && <span>Started: {new Date(ad.start_date).toLocaleDateString()}</span>}
            {ad.start_date && ad.end_date && <span className="mx-2">•</span>}
            {ad.end_date && <span>Ends: {new Date(ad.end_date).toLocaleDateString()}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdAnalyticsCard;