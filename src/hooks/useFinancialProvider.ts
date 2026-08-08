import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type LoanApp = any;

export function useFinancialProvider() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<any>(null);
  const [applications, setApplications] = useState<LoanApp[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data: prov } = await (supabase as any)
      .from("financial_providers").select("*").eq("user_id", user.id).maybeSingle();
    setProvider(prov ?? null);
    if (prov) {
      const { data } = await (supabase as any)
        .from("financial_loan_applications").select("*")
        .eq("provider_id", prov.id).order("created_at", { ascending: false });
      setApplications(data ?? []);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!provider?.id) return;
    const ch = supabase
      .channel(`fin-apps-${provider.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_loan_applications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [provider?.id, load]);

  const stats = useMemo(() => {
    const by = (s: string) => applications.filter((a) => a.status === s).length;
    const disbursedAmt = applications
      .filter((a) => ["disbursed", "closed"].includes(a.status))
      .reduce((s, a) => s + Number(a.disbursed_amount || a.loan_amount || 0), 0);
    const processingFees = applications.reduce((s, a) => s + Number(a.processing_fee || 0), 0);
    const decided = applications.filter((a) => ["approved", "disbursed", "closed", "rejected"].includes(a.status));
    return {
      total: applications.length,
      new: by("new"),
      documents_pending: by("documents_pending"),
      under_verification: by("under_verification"),
      credit_check: by("credit_check"),
      approved: by("approved"),
      disbursed: by("disbursed"),
      closed: by("closed"),
      rejected: by("rejected"),
      pending: applications.filter((a) =>
        ["new", "documents_pending", "under_verification", "credit_check"].includes(a.status)).length,
      disbursedAmount: disbursedAmt,
      processingFees,
      revenue: processingFees || disbursedAmt * 0.01,
      approvalRate: decided.length
        ? Math.round((decided.filter((a) => a.status !== "rejected").length / decided.length) * 100) : 0,
      rejectionRate: decided.length
        ? Math.round((decided.filter((a) => a.status === "rejected").length / decided.length) * 100) : 0,
    };
  }, [applications]);

  return { provider, setProvider, applications, loading, reload: load, stats };
}
