import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useWallet, formatINR } from "@/contexts/WalletContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Wallet, Sparkles, CheckCircle2, Users, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | null;
  onPaidPerPost?: () => void;
  onSubscribed?: () => void;
}

const BENEFITS = [
  "Unlimited Listings",
  "Premium Visibility",
  "AI Lead Recommendations",
  "Featured Properties",
  "Advanced Analytics",
];

export function SubscriptionModal({ open, onOpenChange, userId, onPaidPerPost, onSubscribed }: Props) {
  const { balance, debitMoney } = useWallet();
  const [selected, setSelected] = useState<"pay" | "sub">("sub");
  const [busy, setBusy] = useState(false);

  const handlePayPerPost = async () => {
    if (!userId) return;
    if (balance < 500) return toast.error("Insufficient wallet balance");
    setBusy(true);
    try {
      await debitMoney(500, "Property posting fee");
      await (supabase as any).from("property_posts").insert({
        user_id: userId,
        is_free_post: false,
        month_year: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
      });
      toast.success("₹500 charged. You can now post your property.");
      onPaidPerPost?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSubscribe = async () => {
    if (!userId) return;
    if (balance < 2000) return toast.error("Insufficient wallet balance for subscription");
    setBusy(true);
    try {
      await debitMoney(2000, "Pro Subscription (1 month)");
      const end = new Date();
      end.setMonth(end.getMonth() + 1);
      await (supabase as any).from("user_subscriptions").insert({
        user_id: userId,
        plan_type: "pro",
        is_active: true,
        end_date: end.toISOString(),
        auto_renew: false,
      });
      toast.success("Pro Plan activated! Unlimited postings unlocked.");
      onSubscribed?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Subscription failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            You've used your free monthly post
          </DialogTitle>
          <DialogDescription>Choose how you want to post this property</DialogDescription>
        </DialogHeader>

        <div className="text-sm text-muted-foreground">
          Wallet Balance: <span className="font-semibold text-foreground">{formatINR(balance)}</span>
        </div>

        {/* Option 1 */}
        <Card
          onClick={() => setSelected("pay")}
          className={`p-4 cursor-pointer transition ${selected === "pay" ? "border-primary ring-1 ring-primary" : ""}`}
        >
          <div className="flex items-start gap-3">
            <Wallet className="h-5 w-5 mt-1 text-primary" />
            <div className="flex-1">
              <div className="font-semibold">Pay ₹500 from Wallet</div>
              <div className="text-xs text-muted-foreground">One-time payment for this property</div>
              {balance < 500 && (
                <div className="text-xs text-rose-600 mt-1">Insufficient balance. Add money to continue.</div>
              )}
            </div>
            <Button size="sm" disabled={busy || balance < 500} onClick={handlePayPerPost}>
              {busy && selected === "pay" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pay ₹500"}
            </Button>
          </div>
        </Card>

        {/* Option 2 */}
        <Card
          onClick={() => setSelected("sub")}
          className={`p-4 cursor-pointer transition relative ${selected === "sub" ? "border-primary ring-1 ring-primary" : ""}`}
        >
          <Badge className="absolute -top-2 right-3 bg-amber-500 text-white">Best Value</Badge>
          <div className="flex items-start gap-3">
            <Crown className="h-5 w-5 mt-1 text-amber-500" />
            <div className="flex-1">
              <div className="font-semibold">Subscribe ₹2000/month</div>
              <div className="text-xs text-muted-foreground mb-2">Unlimited property postings</div>
              <ul className="space-y-1">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    {b}
                  </li>
                ))}
              </ul>
              <Button size="sm" className="mt-3 w-full" disabled={busy} onClick={handleSubscribe}>
                {busy && selected === "sub" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe Now"}
              </Button>
            </div>
          </div>
        </Card>

        {selected === "sub" && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3 flex gap-3">
            <Users className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-xs">
              <div className="font-medium text-blue-900 dark:text-blue-200">
                💡 Switch to Agent Profile to get more leads
              </div>
              <div className="text-blue-700 dark:text-blue-300 mt-0.5">
                Get more leads and visibility by switching to an Agent profile. Agents get priority listings and direct buyer inquiries.
              </div>
              <a href="/select-profile" className="underline text-blue-700 dark:text-blue-300">
                Learn more
              </a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default SubscriptionModal;
