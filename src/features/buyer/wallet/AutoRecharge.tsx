import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Zap } from "lucide-react";
import { useWallet, formatINR } from "@/contexts/WalletContext";

export function AutoRecharge() {
  const { autoRecharge, balance } = useWallet();
  const [editing, setEditing] = useState(false);
  const [threshold, setThreshold] = useState(autoRecharge.threshold);
  const [amount, setAmount] = useState(autoRecharge.amount);

  useEffect(() => { setThreshold(autoRecharge.threshold); setAmount(autoRecharge.amount); }, [autoRecharge.threshold, autoRecharge.amount]);

  const below = balance < autoRecharge.threshold;

  const save = async () => {
    await autoRecharge.updateThreshold(threshold);
    await autoRecharge.updateAmount(amount);
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Auto Recharge</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={`rounded-md p-4 border ${autoRecharge.enabled ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-muted border-border text-muted-foreground"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{autoRecharge.enabled ? "Auto Recharge Enabled" : "Auto Recharge Disabled"}</p>
              <p className="text-xs">
                {autoRecharge.enabled
                  ? `Top up ${formatINR(autoRecharge.amount)} when balance falls below ${formatINR(autoRecharge.threshold)}`
                  : "Turn on to never run out of wallet balance."}
              </p>
            </div>
            <Switch checked={autoRecharge.enabled} onCheckedChange={autoRecharge.toggle} />
          </div>
        </div>

        {below && autoRecharge.enabled && (
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
            <AlertTriangle className="h-4 w-4" />
            Your balance ({formatINR(balance)}) is below the threshold. Next debit will trigger an auto recharge.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2"><span>Threshold</span><span className="font-medium">{formatINR(threshold)}</span></div>
            <Slider min={100} max={1000} step={50} value={[threshold]} onValueChange={(v) => setThreshold(v[0])} disabled={!editing} />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2"><span>Recharge Amount</span><span className="font-medium">{formatINR(amount)}</span></div>
            <Slider min={500} max={5000} step={100} value={[amount]} onValueChange={(v) => setAmount(v[0])} disabled={!editing} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setThreshold(autoRecharge.threshold); setAmount(autoRecharge.amount); }}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>Edit Settings</Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">Current Balance: <span className="font-medium text-foreground">{formatINR(balance)}</span></div>
      </CardContent>
    </Card>
  );
}

export default AutoRecharge;
