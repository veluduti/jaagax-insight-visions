import { useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  walletService,
  formatCurrency,
  type AutoRechargeSettings,
} from "@/services/walletService";

interface AutoRechargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (settings: AutoRechargeSettings) => void;
}

export default function AutoRechargeModal({
  open,
  onOpenChange,
  onSaved,
}: AutoRechargeModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState<string>("500");
  const [rechargeAmount, setRechargeAmount] = useState<string>("1000");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const existing = await walletService.getAutoRechargeSettings();
        if (cancelled) return;
        if (existing) {
          setEnabled(existing.enabled);
          setThreshold(String(existing.threshold_amount));
          setRechargeAmount(String(existing.recharge_amount));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load settings";
        toast({ title: "Error", description: message, variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  const handleSave = async () => {
    const t = Number(threshold);
    const r = Number(rechargeAmount);
    if (!Number.isFinite(t) || t < 0) {
      toast({ title: "Invalid threshold", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(r) || r < 100) {
      toast({
        title: "Invalid recharge amount",
        description: "Minimum recharge is ₹100.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const saved = await walletService.upsertAutoRecharge({
        enabled,
        threshold_amount: t,
        recharge_amount: r,
      });
      toast({
        title: enabled ? "Auto-recharge enabled" : "Auto-recharge updated",
        description: enabled
          ? `We'll add ${formatCurrency(r)} whenever balance drops below ${formatCurrency(t)}.`
          : "Auto-recharge is now disabled.",
      });
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save settings";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-400" />
            Auto-recharge settings
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Never let your wallet run dry. We'll top up automatically when your balance dips
            below the threshold.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-800/50 p-3">
              <div>
                <p className="text-sm font-medium text-slate-100">Enable auto-recharge</p>
                <p className="text-xs text-slate-400">
                  Top up wallet automatically based on the rules below.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div>
              <Label htmlFor="threshold" className="text-slate-300">
                Threshold (₹)
              </Label>
              <Input
                id="threshold"
                type="number"
                min={0}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                disabled={!enabled}
                className="mt-1 bg-slate-800 border-slate-700 text-slate-100 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-slate-500">
                Trigger a recharge when balance falls below this amount.
              </p>
            </div>

            <div>
              <Label htmlFor="recharge" className="text-slate-300">
                Recharge amount (₹)
              </Label>
              <Input
                id="recharge"
                type="number"
                min={100}
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                disabled={!enabled}
                className="mt-1 bg-slate-800 border-slate-700 text-slate-100 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-slate-500">
                Amount added to your wallet on each auto top-up.
              </p>
            </div>

            {enabled && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                When balance falls below{" "}
                <strong>{formatCurrency(Number(threshold) || 0)}</strong>, we'll add{" "}
                <strong>{formatCurrency(Number(rechargeAmount) || 0)}</strong> automatically.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save settings"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
