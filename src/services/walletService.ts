// Wallet service for the builder module.
// Wraps Supabase access to wallets, wallet_transactions, and auto_recharge_settings.

import { supabase } from "@/integrations/supabase/client";
import { fromTable } from "@/lib/supabaseHelper";

// ---------- Types ----------
export type TransactionType = "credit" | "debit";
export type TransactionStatus = "pending" | "completed" | "failed" | "refunded";
export type TransactionCategory =
  | "add_money"
  | "promotion"
  | "lead_purchase"
  | "subscription"
  | "cashback"
  | "referral"
  | "refund"
  | "withdrawal";

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  auto_recharge: boolean;
  auto_recharge_threshold: number | null;
  auto_recharge_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  wallet_id: string | null;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  category: TransactionCategory | null;
  description: string | null;
  reference: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AutoRechargeSettings {
  id: string;
  wallet_id: string;
  enabled: boolean;
  threshold_amount: number;
  recharge_amount: number;
  payment_method_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletStats {
  balance: number;
  currency: string;
  totalCredits: number;
  totalDebits: number;
  monthSpend: number;
  transactionCount: number;
}

// ---------- Wallet CRUD ----------

/** Get the wallet for the currently authenticated user, creating one if missing. */
export async function getOrCreateWallet(): Promise<Wallet> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { data: existing, error: selErr } = await fromTable("wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing as Wallet;

  // Create via RPC (SECURITY DEFINER, idempotent).
  const { error: rpcErr } = await supabase.rpc("create_wallet_for_user", {
    _user_id: userId,
  });
  if (rpcErr) throw rpcErr;

  const { data: fresh, error: fetchErr } = await fromTable("wallets")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (fetchErr) throw fetchErr;
  return fresh as Wallet;
}

export async function getWalletBalance(): Promise<number> {
  const wallet = await getOrCreateWallet();
  return Number(wallet.balance ?? 0);
}

// ---------- Transactions ----------

export interface ListTransactionsOptions {
  limit?: number;
  offset?: number;
  category?: TransactionCategory;
  type?: TransactionType;
  status?: TransactionStatus;
}

export async function listTransactions(
  options: ListTransactionsOptions = {}
): Promise<WalletTransaction[]> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  let q = fromTable("wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.category) q = q.eq("category", options.category);
  if (options.type) q = q.eq("type", options.type);
  if (options.status) q = q.eq("status", options.status);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WalletTransaction[];
}

export async function getWalletStats(): Promise<WalletStats> {
  const wallet = await getOrCreateWallet();
  const txns = await listTransactions({ limit: 500 });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let totalCredits = 0;
  let totalDebits = 0;
  let monthSpend = 0;

  for (const t of txns) {
    const amt = Number(t.amount ?? 0);
    if (t.status !== "completed") continue;
    if (t.type === "credit") totalCredits += amt;
    if (t.type === "debit") {
      totalDebits += amt;
      if (new Date(t.created_at).getTime() >= monthStart) monthSpend += amt;
    }
  }

  return {
    balance: Number(wallet.balance ?? 0),
    currency: wallet.currency ?? "INR",
    totalCredits,
    totalDebits,
    monthSpend,
    transactionCount: txns.length,
  };
}

// ---------- Add money ----------

export interface AddMoneyParams {
  amount: number;
  description?: string;
  reference?: string;
  paymentMethod?: string;
}

/**
 * Credit the user's wallet. Uses the SECURITY DEFINER RPC so the transaction
 * is recorded atomically. Replace `reference` with a real payment gateway id
 * after Razorpay/Stripe integration is wired in.
 */
export async function addMoney(params: AddMoneyParams): Promise<number> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  await getOrCreateWallet();

  const { data, error } = await supabase.rpc("increment_wallet_balance", {
    _user_id: userId,
    _amount: amount,
    _description: params.description ?? "Wallet top-up",
    _reference: params.reference ?? `topup_${Date.now()}`,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

// ---------- Auto-recharge ----------

export async function getAutoRechargeSettings(): Promise<AutoRechargeSettings | null> {
  const wallet = await getOrCreateWallet();
  const { data, error } = await fromTable("auto_recharge_settings")
    .select("*")
    .eq("wallet_id", wallet.id)
    .maybeSingle();
  if (error) throw error;
  return (data as AutoRechargeSettings) ?? null;
}

export interface UpsertAutoRechargeParams {
  enabled: boolean;
  threshold_amount: number;
  recharge_amount: number;
  payment_method_id?: string | null;
}

export async function upsertAutoRecharge(
  params: UpsertAutoRechargeParams
): Promise<AutoRechargeSettings> {
  const wallet = await getOrCreateWallet();

  if (params.threshold_amount < 0 || params.recharge_amount <= 0) {
    throw new Error("Invalid threshold or recharge amount");
  }

  const payload = {
    wallet_id: wallet.id,
    enabled: params.enabled,
    threshold_amount: params.threshold_amount,
    recharge_amount: params.recharge_amount,
    payment_method_id: params.payment_method_id ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await fromTable("auto_recharge_settings")
    .upsert(payload, { onConflict: "wallet_id" })
    .select("*")
    .single();
  if (error) throw error;

  // Keep the legacy wallets.* columns in sync so older code keeps working.
  await fromTable("wallets")
    .update({
      auto_recharge: params.enabled,
      auto_recharge_threshold: params.threshold_amount,
      auto_recharge_amount: params.recharge_amount,
    })
    .eq("id", wallet.id);

  return data as AutoRechargeSettings;
}

export async function disableAutoRecharge(): Promise<void> {
  const existing = await getAutoRechargeSettings();
  if (!existing) return;
  await upsertAutoRecharge({
    enabled: false,
    threshold_amount: existing.threshold_amount,
    recharge_amount: existing.recharge_amount,
    payment_method_id: existing.payment_method_id,
  });
}

// ---------- Helpers ----------

export function formatCurrency(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount ?? 0));
  } catch {
    return `₹${Math.round(Number(amount ?? 0)).toLocaleString("en-IN")}`;
  }
}

export const walletService = {
  getOrCreateWallet,
  getWalletBalance,
  getWalletStats,
  listTransactions,
  addMoney,
  getAutoRechargeSettings,
  upsertAutoRecharge,
  disableAutoRecharge,
  formatCurrency,
};

export default walletService;
