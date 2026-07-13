import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { startWalletTopUp } from "@/lib/razorpayCheckout";

const PRESETS = [500, 1000, 2000, 5000];

export default function WalletBalance({ userId }: { userId: string }) {
  const [balance, setBalance] = useState(0);
  const [autoRecharge, setAutoRecharge] = useState(false);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(500);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const sb: any = supabase;
    const { data: w } = await sb.from("wallets").select("*").eq("user_id", userId).maybeSingle();
    if (!w) {
      await sb.from("wallets").insert({ user_id: userId, balance: 0 });
      setBalance(0);
    } else {
      setBalance(Number(w.balance) || 0);
      setAutoRecharge(!!w.auto_recharge);
    }
  };

  useEffect(() => {
    if (userId) load();
    const handleWalletUpdate = () => load();
    window.addEventListener("walletUpdated", handleWalletUpdate);
    return () => window.removeEventListener("walletUpdated", handleWalletUpdate);
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    toast.success("Wallet balance refreshed");
  };

  const handleAdd = async () => {
    if (amount < 500) return toast.error("Minimum top-up is ₹500");
    setLoading(true);
    try {
      const sb: any = supabase;
      const { data: authData } = await supabase.auth.getUser();
      const u = authData?.user;
      const result = await startWalletTopUp(amount, {
        name: (u?.user_metadata as any)?.full_name || u?.email,
        email: u?.email,
        contact: (u?.user_metadata as any)?.phone,
      });
      toast.success(`₹${result.amount.toLocaleString("en-IN")} added to wallet successfully!`);
      setOpen(false);
      await load();
      window.dispatchEvent(new Event("walletUpdated"));
    } catch (e: any) {
      toast.error(e?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleAuto = async (v: boolean) => {
    setAutoRecharge(v);
    const sb: any = supabase;
    await sb.from("wallets").update({ auto_recharge: v }).eq("user_id", userId);
    toast.success(`Auto-recharge ${v ? "enabled" : "disabled"}`, {
      description: v ? "We'll add ₹1,000 when balance drops below ₹500" : "You'll need to add money manually",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-background h-full flex flex-col shadow-lg hover:shadow-xl transition-all duration-300">
        {/* Decorative blur effect */}
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <CardContent className="p-5 relative flex-1 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <Wallet className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Wallet Balance</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px] px-2 py-0">
                <Sparkles className="h-2.5 w-2.5 mr-1" /> Instant
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-emerald-500"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Balance Section */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-4xl font-bold tracking-tight text-foreground">₹{balance.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground mt-1">Available for boosts, postings & premium</p>
            </div>
            <Button
              onClick={() => setOpen(true)}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all duration-300"
              size="default"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Money
            </Button>
          </div>


          {/* Auto-recharge Section */}
          <div className="mt-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Auto-recharge</p>
                <p className="text-xs text-muted-foreground">Add ₹1,000 when balance drops below ₹500</p>
              </div>
              <Switch
                checked={autoRecharge}
                onCheckedChange={toggleAuto}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Money Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Money to Wallet</DialogTitle>
            <DialogDescription>Choose a quick amount or enter your own. Minimum ₹100.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p}
                  variant={amount === p ? "default" : "outline"}
                  onClick={() => setAmount(p)}
                  className={`${
                    amount === p
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white"
                      : "border-emerald-500/30 text-foreground hover:bg-emerald-500/10"
                  } transition-all duration-200`}
                >
                  ₹{p.toLocaleString("en-IN")}
                </Button>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Custom Amount</label>
              <Input
                type="number"
                min={100}
                value={amount === 0 ? "" : amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                placeholder="Enter amount"
                className="focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10">
            <p className="text-xs text-muted-foreground text-center">
              💳 Demo mode: Balance updates instantly. Razorpay/PhonePe integration coming soon.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={loading || amount < 100}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                `Add ₹${amount.toLocaleString("en-IN")}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
