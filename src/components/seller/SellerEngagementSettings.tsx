import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
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
  min_effort_threshold: number;
  engagement_fee_enabled: boolean;
}

const SellerEngagementSettings = () => {
  const [settings, setSettings] = useState<EngagementSettings>({
    min_effort_threshold: 5,
    engagement_fee_enabled: true
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulating save - will be connected when seller_engagement_settings table is created
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success('Settings saved successfully');
    setSaving(false);
  };

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