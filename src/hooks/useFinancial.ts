import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LoanType =
  | "home_loan" | "mortgage" | "property_legal"
  | "property_valuation" | "investment_advisory" | "credit_score";

export type EnquiryStatus =
  | "applied" | "documents_pending" | "under_review" | "approved" | "rejected" | "disbursed" | "deactivated";

export interface FinancialEnquiry {
  id: string;
  user_id: string;
  loan_type: string;
  amount_requested: number | null;
  property_id: string | null;
  status: string;
  documents: any;
  advisor_id: string | null;
  advisor_name: string | null;
  advisor_contact: string | null;
  monthly_emi: number | null;
  loan_tenure_years: number | null;
  interest_rate_offered: number | null;
  notes: string | null;
  deactivated_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanDocument {
  id: string;
  enquiry_id: string;
  user_id: string;
  type: string;
  file_url: string;
  status: "pending" | "verified" | "rejected";
  uploaded_at: string;
}

export function useFinancial() {
  const [userId, setUserId] = useState<string | null>(null);
  const [enquiries, setEnquiries] = useState<FinancialEnquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsLoading(false); return; }
    setUserId(user.id);
    const { data } = await supabase
      .from("financial_enquiries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setEnquiries((data as FinancialEnquiry[]) ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createEnquiry = useCallback(async (data: {
    loan_type: LoanType;
    amount_requested?: number;
    property_id?: string | null;
    loan_tenure_years?: number;
    interest_rate_offered?: number;
    monthly_emi?: number;
    notes?: string;
  }) => {
    if (!userId) throw new Error("Not signed in");
    const { data: created, error } = await supabase
      .from("financial_enquiries")
      .insert({ ...data, user_id: userId, status: "applied" } as any)
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return created as FinancialEnquiry;
  }, [userId, refresh]);

  const updateEnquiry = useCallback(async (id: string, patch: Partial<FinancialEnquiry>) => {
    const { error } = await supabase.from("financial_enquiries").update(patch as any).eq("id", id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const deactivateEnquiry = useCallback(async (id: string, reason?: string) => {
    const { error } = await supabase.from("financial_enquiries")
      .update({ status: "deactivated", deactivated_reason: reason ?? null } as any)
      .eq("id", id);
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const uploadDocument = useCallback(async (enquiryId: string, file: File, type: string) => {
    if (!userId) throw new Error("Not signed in");
    if (file.size > 10 * 1024 * 1024) throw new Error("File too large (max 10MB)");
    const ext = file.name.split(".").pop() || "bin";
    const path = `${userId}/${enquiryId}/${type}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("loan-documents").upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    const { data: signed } = await supabase.storage.from("loan-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
    const fileUrl = signed?.signedUrl || path;
    const { error } = await (supabase as any).from("loan_documents").insert({
      enquiry_id: enquiryId, user_id: userId, type, file_url: fileUrl, status: "pending",
    });
    if (error) throw error;
  }, [userId]);

  const getDocuments = useCallback(async (enquiryId: string): Promise<LoanDocument[]> => {
    const { data } = await (supabase as any)
      .from("loan_documents")
      .select("*")
      .eq("enquiry_id", enquiryId)
      .order("uploaded_at", { ascending: false });
    return (data ?? []) as LoanDocument[];
  }, []);

  return { userId, enquiries, isLoading, refresh, createEnquiry, updateEnquiry, deactivateEnquiry, uploadDocument, getDocuments };
}
