import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePendingPayment() {
  const [hasPending, setHasPending] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);

  // Check if there's a pending payment when component loads
  useEffect(() => {
    const pendingPayment = sessionStorage.getItem("pending_payment");
    const pendingSub = sessionStorage.getItem("pending_subscription");

    if (pendingPayment) {
      setPendingData(JSON.parse(pendingPayment));
      setHasPending(true);
    } else if (pendingSub) {
      setPendingData(JSON.parse(pendingSub));
      setHasPending(true);
    }
  }, []);

  // This function will deduct money AFTER property is saved
  const processPendingPayment = async (propertyId: string): Promise<boolean> => {
    if (!hasPending || !pendingData) return true; // No payment needed

    const sb: any = supabase;

    if (pendingData.type === "pay_per_post") {
      // Check wallet balance
      const { data: wallet } = await sb.from("wallets").select("balance").eq("user_id", pendingData.userId).single();

      if (!wallet || wallet.balance < pendingData.amount) {
        toast.error("Insufficient wallet balance. Payment failed.");
        // Delete the property since payment failed
        await sb.from("properties").delete().eq("id", propertyId);
        return false;
      }

      // Deduct money from wallet
      const { error } = await sb.rpc("decrement_wallet_balance", {
        _user_id: pendingData.userId,
        _amount: pendingData.amount,
        _description: "Property posting fee",
        _reference: `property:${propertyId}`,
      });

      if (error) {
        toast.error(error.message || "Payment failed");
        await sb.from("properties").delete().eq("id", propertyId);
        return false;
      }

      // Create transaction record
      const { data: walletData } = await sb.from("wallets").select("id").eq("user_id", pendingData.userId).single();

      await sb.from("wallet_transactions").insert({
        user_id: pendingData.userId,
        wallet_id: walletData.id,
        amount: pendingData.amount,
        type: "debit",
        category: "posting_fee",
        description: "Property listing fee",
        status: "completed",
      });

      toast.success(`₹${pendingData.amount} deducted from wallet`);
    } else if (pendingData.type === "subscription") {
      // Check wallet balance
      const { data: wallet } = await sb.from("wallets").select("balance").eq("user_id", pendingData.userId).single();

      if (!wallet || wallet.balance < pendingData.amount) {
        toast.error("Insufficient balance for subscription. Payment failed.");
        await sb.from("properties").delete().eq("id", propertyId);
        return false;
      }

      // Deduct money
      const { error } = await sb.rpc("decrement_wallet_balance", {
        _user_id: pendingData.userId,
        _amount: pendingData.amount,
        _description: "Premium subscription",
        _reference: `property:${propertyId}`,
      });

      if (error) {
        toast.error(error.message || "Payment failed");
        await sb.from("properties").delete().eq("id", propertyId);
        return false;
      }

      // Deactivate old subscriptions
      await sb
        .from("seller_subscriptions")
        .update({ is_active: false })
        .eq("user_id", pendingData.userId)
        .eq("is_active", true);

      // Create new subscription
      const expires = new Date();
      expires.setMonth(expires.getMonth() + 1);
      await sb.from("seller_subscriptions").insert({
        user_id: pendingData.userId,
        plan_type: "premium",
        is_active: true,
        expires_at: expires.toISOString(),
      });

      // Create transaction record
      const { data: walletData } = await sb.from("wallets").select("id").eq("user_id", pendingData.userId).single();

      await sb.from("wallet_transactions").insert({
        user_id: pendingData.userId,
        wallet_id: walletData.id,
        amount: pendingData.amount,
        type: "debit",
        category: "subscription",
        description: "Premium subscription - Unlimited posts",
        status: "completed",
      });

      toast.success("Premium subscription activated!");
    }

    // Clear pending data from storage
    sessionStorage.removeItem("pending_payment");
    sessionStorage.removeItem("pending_subscription");
    window.dispatchEvent(new Event("walletUpdated"));

    return true;
  };

  return { hasPending, pendingData, processPendingPayment };
}
