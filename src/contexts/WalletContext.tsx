import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TransactionType = "credit" | "debit";
export type TransactionStatus = "pending" | "completed" | "failed" | "refunded";

export interface WalletTransaction {
  id: string;
  wallet_id: string | null;
  user_id: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  category: string | null;
  description: string | null;
  reference: string | null;
  reference_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface CashBackEntry {
  id: string;
  user_id: string;
  amount: number;
  source: "referral_buyer" | "referral_agent" | "property_posting" | "event_referral" | "other";
  reference_id: string | null;
  status: "available" | "redeemed" | "expired";
  redeemed_at: string | null;
  created_at: string;
}

export interface AutoRecharge {
  enabled: boolean;
  threshold: number;
  amount: number;
  toggle: (enabled: boolean) => Promise<void>;
  updateThreshold: (n: number) => Promise<void>;
  updateAmount: (n: number) => Promise<void>;
}

export interface CashBack {
  total: number;
  entries: CashBackEntry[];
  refresh: () => Promise<void>;
  redeem: () => Promise<void>;
}

interface WalletContextValue {
  balance: number;
  walletId: string | null;
  isLoading: boolean;
  addMoney: (amount: number, opts?: { description?: string; paymentMethod?: string }) => Promise<void>;
  debitMoney: (amount: number, description?: string) => Promise<void>;
  refreshWallet: () => Promise<void>;
  getTransactionHistory: (limit?: number) => Promise<WalletTransaction[]>;
  autoRecharge: AutoRecharge;
  cashBack: CashBack;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [arEnabled, setArEnabled] = useState(false);
  const [arThreshold, setArThreshold] = useState(500);
  const [arAmount, setArAmount] = useState(1000);
  const [cbEntries, setCbEntries] = useState<CashBackEntry[]>([]);

  const ensureWallet = useCallback(async (uid: string) => {
    const { data: existing } = await supabase.from("wallets").select("*").eq("user_id", uid).maybeSingle();
    if (existing) return existing;
    try {
      await supabase.rpc("create_wallet_for_user", { _user_id: uid });
    } catch {}
    const { data: fresh } = await supabase.from("wallets").select("*").eq("user_id", uid).maybeSingle();
    if (fresh) return fresh;
    const { data: created, error } = await supabase.from("wallets").insert({ user_id: uid, balance: 0 }).select().single();
    if (error) throw error;
    return created;
  }, []);

  const loadCashBack = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("cash_back_entries" as any)
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setCbEntries((data as any) || []);
  }, []);

  const refreshWallet = useCallback(async () => {
    if (!userId) return;
    const w: any = await ensureWallet(userId);
    setWalletId(w.id);
    setBalance(Number(w.balance ?? 0));
    setArEnabled(!!w.auto_recharge);
    setArThreshold(Number(w.auto_recharge_threshold ?? 500));
    setArAmount(Number(w.auto_recharge_amount ?? 1000));
    await loadCashBack(userId);
  }, [userId, ensureWallet, loadCashBack]);

  // Bootstrap auth + wallet
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      setBalance(0);
      setWalletId(null);
      setCbEntries([]);
      return;
    }
    setIsLoading(true);
    refreshWallet().finally(() => setIsLoading(false));
  }, [userId, refreshWallet]);

  // Realtime subscriptions
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`wallet-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${userId}` }, (payload: any) => {
        const w = payload.new || payload.old;
        if (w) {
          setBalance(Number(w.balance ?? 0));
          setArEnabled(!!w.auto_recharge);
          setArThreshold(Number(w.auto_recharge_threshold ?? 500));
          setArAmount(Number(w.auto_recharge_amount ?? 1000));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wallet_transactions", filter: `user_id=eq.${userId}` }, () => {
        refreshWallet();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_back_entries", filter: `user_id=eq.${userId}` }, () => {
        loadCashBack(userId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, refreshWallet, loadCashBack]);

  const addMoney = useCallback(async (amount: number, opts?: { description?: string; paymentMethod?: string }) => {
    if (!userId) throw new Error("Not authenticated");
    if (!(amount > 0)) throw new Error("Amount must be greater than 0");
    try {
      const ref = `topup_${opts?.paymentMethod ?? "manual"}_${Date.now()}`;
      const { error } = await supabase.rpc("add_to_wallet" as any, {
        _user_id: userId, _amount: amount,
        _description: opts?.description ?? `Added via ${opts?.paymentMethod ?? "wallet"}`,
        _reference: ref,
      });
      if (error) throw error;
      toast.success(`₹${amount.toLocaleString("en-IN")} added to wallet`);
      await refreshWallet();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add money");
      throw e;
    }
  }, [userId, refreshWallet]);

  const debitMoney = useCallback(async (amount: number, description?: string) => {
    if (!userId) throw new Error("Not authenticated");
    try {
      const { error } = await supabase.rpc("debit_from_wallet" as any, {
        _user_id: userId, _amount: amount,
        _description: description ?? "Wallet debit",
        _reference: `debit_${Date.now()}`,
      });
      if (error) throw error;
      toast.success(`₹${amount.toLocaleString("en-IN")} debited`);
      await refreshWallet();
    } catch (e: any) {
      toast.error(e?.message || "Failed to debit");
      throw e;
    }
  }, [userId, refreshWallet]);

  const getTransactionHistory = useCallback(async (limit = 100): Promise<WalletTransaction[]> => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []) as WalletTransaction[];
  }, [userId]);

  const updateAutoRecharge = useCallback(async (patch: Partial<{ enabled: boolean; threshold: number; amount: number }>) => {
    if (!walletId) return;
    const next = {
      auto_recharge: patch.enabled ?? arEnabled,
      auto_recharge_threshold: patch.threshold ?? arThreshold,
      auto_recharge_amount: patch.amount ?? arAmount,
    };
    const { error } = await supabase.from("wallets").update(next).eq("id", walletId);
    if (error) { toast.error(error.message); return; }
    if (patch.enabled !== undefined) setArEnabled(patch.enabled);
    if (patch.threshold !== undefined) setArThreshold(patch.threshold);
    if (patch.amount !== undefined) setArAmount(patch.amount);
    toast.success("Auto recharge updated");
  }, [walletId, arEnabled, arThreshold, arAmount]);

  const cashBackTotal = cbEntries.filter(e => e.status === "available").reduce((s, e) => s + Number(e.amount || 0), 0);

  const cashBack: CashBack = {
    total: cashBackTotal,
    entries: cbEntries,
    refresh: async () => { if (userId) await loadCashBack(userId); },
    redeem: async () => {
      if (!userId) return;
      if (cashBackTotal <= 0) { toast.error("No cashback to redeem"); return; }
      const { error } = await supabase.rpc("redeem_cashback" as any, { _user_id: userId });
      if (error) { toast.error(error.message); return; }
      toast.success(`₹${cashBackTotal.toLocaleString("en-IN")} redeemed to wallet`);
      await refreshWallet();
    },
  };

  const autoRecharge: AutoRecharge = {
    enabled: arEnabled,
    threshold: arThreshold,
    amount: arAmount,
    toggle: (e) => updateAutoRecharge({ enabled: e }),
    updateThreshold: (n) => updateAutoRecharge({ threshold: n }),
    updateAmount: (n) => updateAutoRecharge({ amount: n }),
  };

  return (
    <WalletContext.Provider value={{
      balance, walletId, isLoading,
      addMoney, debitMoney, refreshWallet, getTransactionHistory,
      autoRecharge, cashBack,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export function formatINR(n: number) {
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0); }
  catch { return `₹${Math.round(n || 0).toLocaleString("en-IN")}`; }
}
