import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Settings, 
  Shield, 
  Save,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EngagementSettings {
  id?: string;
  min_effort_threshold: number;
  engagement_fee_enabled: boolean;
}

const SellerEngagementSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<EngagementSettings>({
    min_effort_threshold: 5,
    engagement_fee_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('seller_engagement_settings')
        .select('*')
        .eq('seller_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          id: data.id,
          min_effort_threshold: data.min_effort_threshold,
          engagement_fee_enabled: data.engagement_fee_enabled
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      if (settings.id) {
        // Update existing
        const { error } = await supabase
          .from('seller_engagement_settings')
          .update({
            min_effort_threshold: settings.min_effort_threshold,
            engagement_fee_enabled: settings.engagement_fee_enabled
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('seller_engagement_settings')
          .insert({
            seller_id: user.id,
            min_effort_threshold: settings.min_effort_threshold,
            engagement_fee_enabled: settings.engagement_fee_enabled
          })
          .select('id')
          .single();

        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
      }

      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getThresholdLabel = (value: number) => {
    if (value <= 3) return 'Low (Quick engagement)';
    if (value <= 7) return 'Medium (Standard)';
    if (value <= 12) return 'High (Detailed engagement)';
    return 'Very High (Comprehensive)';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Agent Engagement Protection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Configure how agent efforts are tracked and protected for your properties.
          </p>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="fee-enabled" className="font-medium">
                  Enable Engagement Protection
                </Label>
                <p className="text-xs text-muted-foreground">
                  Track agent efforts for fair compensation
                </p>
              </div>
            </div>
            <Switch
              id="fee-enabled"
              checked={settings.engagement_fee_enabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, engagement_fee_enabled: checked }))
              }
            />
          </div>

          {/* Threshold Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="font-medium">Minimum Effort Threshold</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        The minimum effort points an agent must accumulate before 
                        engagement protection applies. Higher thresholds require 
                        more agent involvement.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-sm font-bold text-primary">
                {settings.min_effort_threshold} points
              </span>
            </div>

            <Slider
              value={[settings.min_effort_threshold]}
              onValueChange={([value]) => 
                setSettings(prev => ({ ...prev, min_effort_threshold: value }))
              }
              min={1}
              max={20}
              step={1}
              disabled={!settings.engagement_fee_enabled}
              className="w-full"
            />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>{getThresholdLabel(settings.min_effort_threshold)}</span>
              <span>20</span>
            </div>
          </div>

          {/* Effort Scale Reference */}
          <div className="p-3 rounded-lg bg-muted/30 border">
            <p className="text-xs font-medium mb-2">Effort Point Reference</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>• Explanation call = 1 pt</div>
              <div>• Site visit = 3 pts</div>
              <div>• Negotiation = 5 pts</div>
              <div>• Closure bonus = 10 pts</div>
            </div>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            className="w-full gap-2"
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SellerEngagementSettings;
