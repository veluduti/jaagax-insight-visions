import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PendingPayment {
  id: string;
  amount: number;
  type: string;
  description: string;
  status: string;
  reference: string;
  created_at: string;
}

export function usePendingPayment(userId?: string | null) {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setPendingPayments([]);
      return;
    }

    const fetchPending = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: supaError } = await supabase
          .from("wallet_transactions")
          .select("id, amount, type, description, status, reference, created_at")
          .eq("user_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (supaError) throw supaError;
        setPendingPayments(data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load pending payments");
      } finally {
        setLoading(false);
      }
    };

    fetchPending();
  }, [userId]);

  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const hasPendingPayment = pendingPayments.length > 0;

  return {
    pendingPayments,
    totalPendingAmount,
    hasPendingPayment,
    loading,
    error,
  };
}
