import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Users, UserCheck, Home, CalendarHeart, Loader2 } from "lucide-react";
import { useState } from "react";
import { useWallet, formatINR } from "@/contexts/WalletContext";

const SOURCE_META: Record<string, { label: string; icon: any }> = {
  referral_buyer: { label: "Referring Buyers", icon: Users },
  referral_agent: { label: "Referring Agents", icon: UserCheck },
  property_posting: { label: "Property Posting", icon: Home },
  event_referral: { label: "Event Referral", icon: CalendarHeart },
  other: { label: "Other", icon: Gift },
};

export function CashBackSection() {
  const { cashBack } = useWallet();
  const [busy, setBusy] = useState(false);

  const handleRedeem = async () => {
    setBusy(true);
    try { await cashBack.redeem(); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" /> Cash Back Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-muted-foreground">Available cash back</p>
              <p className="text-3xl font-bold text-emerald-600">{formatINR(cashBack.total)}</p>
            </div>
            <Button onClick={handleRedeem} disabled={busy || cashBack.total <= 0}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redeeming…</> : "Redeem to Wallet"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">All Entries</CardTitle></CardHeader>
        <CardContent>
          {cashBack.entries.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No cashback yet. Refer friends and post properties to earn rewards.
            </div>
          ) : (
            <div className="divide-y border rounded-md">
              {cashBack.entries.map(e => {
                const meta = SOURCE_META[e.source] || SOURCE_META.other;
                const Icon = meta.icon;
                return (
                  <div key={e.id} className="flex items-center gap-3 p-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">+{formatINR(Number(e.amount))}</p>
                      <Badge variant={e.status === "available" ? "default" : "outline"} className="text-[10px] mt-1 capitalize">{e.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CashBackSection;
