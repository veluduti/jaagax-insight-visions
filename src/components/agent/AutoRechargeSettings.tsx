import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { toast } from "sonner";

export default function AutoRechargeSettings({ userId }: { userId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(500);
  const [amount, setAmount] = useState(1000);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const sb: any = supabase;
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
    })();
  }, [userId]);

  const save = async (nextEnabled = enabled) => {
    setSaving(true);
    const sb: any = supabase;
    const { error } = await sb
      .from("wallets")
      .update({
        auto_recharge: nextEnabled,
        auto_recharge_threshold: threshold,
        auto_recharge_amount: amount,
      })
      .eq("user_id", userId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Auto-recharge settings updated");
  };

  const toggle = async (v: boolean) => {
    setEnabled(v);
    await save(v);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-amber-500" /> Auto-Recharge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Enable auto-recharge</p>
            <p className="text-xs text-muted-foreground">
              Top up automatically when balance is low
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={toggle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              When balance below (₹)
            </label>
            <Input
              type="number"
              min={100}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value) || 0)}
              disabled={!enabled}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Recharge amount (₹)
            </label>
            <Input
              type="number"
              min={100}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              disabled={!enabled}
            />
          </div>
        </div>

        <Button onClick={() => save()} disabled={saving || !enabled} className="w-full">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
