import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AutoRechargeSettingsProps {
  userId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  walletBalance?: number;
  onUpdate?: () => void;
}

const PRESET_THRESHOLDS = [500, 1000, 2000, 5000];
const PRESET_TOPUP_AMOUNTS = [1000, 2000, 5000, 10000];

export default function AutoRechargeSettings({
  userId,
  open,
  onOpenChange,
  walletBalance = 0,
  onUpdate,
}: AutoRechargeSettingsProps) {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(1000);
  const [amount, setAmount] = useState(2000);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Use dialog open state if provided, otherwise use internal state
  const showDialog = open !== undefined ? open : isDialogOpen;
  const setShowDialog = onOpenChange || setIsDialogOpen;

  useEffect(() => {
    if (!userId) return;
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    setLoading(true);
    const sb: any = supabase;
    try {
      const { data } = await sb
        .from("wallets")
        .select("auto_recharge, auto_recharge_threshold, auto_recharge_amount")
        .eq("user_id", userId)
        .maybeSingle();

      if (data) {
        setEnabled(!!data.auto_recharge);
        if (data.auto_recharge_threshold) setThreshold(Number(data.auto_recharge_threshold));
        if (data.auto_recharge_amount) setAmount(Number(data.auto_recharge_amount));
      }
    } catch (error) {
      console.error("Error loading auto recharge settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (nextEnabled = enabled) => {
    setSaving(true);
    const sb: any = supabase;

    try {
      const { error } = await sb
        .from("wallets")
        .update({
          auto_recharge: nextEnabled,
          auto_recharge_threshold: threshold,
          auto_recharge_amount: amount,
          auto_recharge_updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success(nextEnabled ? "Auto-recharge enabled" : "Auto-recharge disabled");
      onUpdate?.();
      setShowDialog(false);
    } catch (error: any) {
      console.error("Error saving auto recharge settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (value: boolean) => {
    setEnabled(value);
    await saveSettings(value);
  };

  const getNextRechargeInfo = () => {
    if (!enabled) return null;
    if (walletBalance <= threshold) {
      return (
        <Alert className="bg-yellow-500/10 border-yellow-500/30">
          <Zap className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-xs">
            Your balance ({new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(walletBalance)}
            ) is at or below the threshold (₹{threshold.toLocaleString("en-IN")}). Auto recharge of ₹
            {amount.toLocaleString("en-IN")} will trigger on next transaction.
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <Alert className="bg-green-500/10 border-green-500/30">
        <Shield className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-xs">
          Your balance ({new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(walletBalance)})
          is above threshold (₹{threshold.toLocaleString("en-IN")}). Auto recharge will trigger when balance drops below
          threshold.
        </AlertDescription>
      </Alert>
    );
  };

  const Content = () => (
    <div className="space-y-4">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Enable auto-recharge</p>
          <p className="text-xs text-muted-foreground">Top up automatically when balance is low</p>
        </div>
        <Switch checked={enabled} onCheckedChange={toggleEnabled} disabled={loading || saving} />
      </div>

      {enabled && (
        <>
          {/* Threshold Setting */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Trigger when balance falls below (₹)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {PRESET_THRESHOLDS.map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  variant={threshold === amt ? "default" : "outline"}
                  size="sm"
                  onClick={() => setThreshold(amt)}
                  disabled={!enabled}
                >
                  ₹{amt.toLocaleString("en-IN")}
                </Button>
              ))}
            </div>
            <Input
              type="number"
              min={100}
              max={10000}
              step={100}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value) || 0)}
              disabled={!enabled}
            />
            <p className="text-xs text-muted-foreground mt-1">Min: ₹100 | Max: ₹10,000</p>
          </div>

          {/* Top-up Amount Setting */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Auto recharge amount (₹)</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {PRESET_TOPUP_AMOUNTS.map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  variant={amount === amt ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAmount(amt)}
                  disabled={!enabled}
                >
                  ₹{amt.toLocaleString("en-IN")}
                </Button>
              ))}
            </div>
            <Input
              type="number"
              min={500}
              max={25000}
              step={500}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              disabled={!enabled}
            />
            <p className="text-xs text-muted-foreground mt-1">Min: ₹500 | Max: ₹25,000</p>
          </div>

          {/* Status Info */}
          {getNextRechargeInfo()}

          {/* Info Box */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">
              🔄 <strong>How it works:</strong> When your wallet balance drops below the threshold, we'll automatically
              add the selected amount using your saved payment method. You'll receive a notification each time auto
              recharge happens.
            </p>
          </div>
        </>
      )}

      <Button onClick={() => saveSettings()} disabled={saving || !enabled} className="w-full">
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Settings"
        )}
      </Button>
    </div>
  );

  // If open/onOpenChange props are provided, render as Dialog
  if (open !== undefined && onOpenChange) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Auto Recharge Settings
            </DialogTitle>
            <DialogDescription>
              Automatically add funds to your wallet when balance falls below a threshold.
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Content />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise render as Card (for dashboard)
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-amber-500" />
          Auto-Recharge
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <Content />
        )}
      </CardContent>
    </Card>
  );
}
