import { supabase } from "@/integrations/supabase/client";

export type FinancialEnquiryStatus =
  | "new"
  | "contacted"
  | "documents_submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "deactivated";

export type FinancialEnquiryType = "home_loan" | "mortgage" | "refinance";

export interface FinancialEnquiry {
  id: string;
  builder_profile_id: string | null;
  user_id: string;
  property_id: string | null;
  loan_type: string;
  enquiry_type: FinancialEnquiryType | null;
  amount_requested: number | null;
  loan_amount: number | null;
  loan_tenure_years: number | null;
  interest_rate_offered: number | null;
  monthly_emi: number | null;
  status: FinancialEnquiryStatus;
  documents: any;
  advisor_id: string | null;
  advisor_name: string | null;
  advisor_contact: string | null;
  advisor_notes: string | null;
  notes: string | null;
  contact_date: string | null;
  follow_up_date: string | null;
  deactivated_reason: string | null;
  created_at: string;
  updated_at: string;
}

const sb = supabase as any;

export const financialService = {
  async getEnquiries(builderProfileId: string): Promise<FinancialEnquiry[]> {
    const { data, error } = await sb
      .from("financial_enquiries")
      .select("*")
      .eq("builder_profile_id", builderProfileId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as FinancialEnquiry[];
  },

  async getEnquiry(id: string): Promise<FinancialEnquiry | null> {
    const { data, error } = await sb.from("financial_enquiries").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as FinancialEnquiry | null;
  },

  async createEnquiry(
    input: Partial<FinancialEnquiry> & { builder_profile_id: string; user_id: string; loan_type: string },
  ): Promise<FinancialEnquiry> {
    const payload = {
      builder_profile_id: input.builder_profile_id,
      user_id: input.user_id,
      property_id: input.property_id ?? null,
      loan_type: input.loan_type,
      enquiry_type: input.enquiry_type ?? "home_loan",
      amount_requested: input.loan_amount ?? input.amount_requested ?? null,
      loan_amount: input.loan_amount ?? null,
      loan_tenure_years: input.loan_tenure_years ?? null,
      interest_rate_offered: input.interest_rate_offered ?? null,
      monthly_emi: input.monthly_emi ?? null,
      status: (input.status as FinancialEnquiryStatus) ?? "new",
      documents: input.documents ?? [],
      notes: input.notes ?? null,
    };
    const { data, error } = await sb.from("financial_enquiries").insert(payload).select("*").single();
    if (error) throw error;
    return data as FinancialEnquiry;
  },

  async updateEnquiryStatus(id: string, status: FinancialEnquiryStatus, notes?: string): Promise<FinancialEnquiry> {
    const patch: any = { status, updated_at: new Date().toISOString() };
    if (notes !== undefined) patch.advisor_notes = notes;
    const { data, error } = await sb.from("financial_enquiries").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return data as FinancialEnquiry;
  },

  async submitDocuments(enquiryId: string, documents: any[]): Promise<FinancialEnquiry> {
    const { data, error } = await sb
      .from("financial_enquiries")
      .update({ documents, status: "documents_submitted", updated_at: new Date().toISOString() })
      .eq("id", enquiryId)
      .select("*")
      .single();
    if (error) throw error;
    return data as FinancialEnquiry;
  },

  async scheduleEMIDiscussion(enquiryId: string, date: string): Promise<FinancialEnquiry> {
    const { data, error } = await sb
      .from("financial_enquiries")
      .update({ follow_up_date: date, status: "contacted", updated_at: new Date().toISOString() })
      .eq("id", enquiryId)
      .select("*")
      .single();
    if (error) throw error;
    return data as FinancialEnquiry;
  },

  async assignAdvisor(enquiryId: string, advisorName: string, contact: string): Promise<FinancialEnquiry> {
    const { data, error } = await sb
      .from("financial_enquiries")
      .update({
        advisor_name: advisorName,
        advisor_contact: contact,
        contact_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", enquiryId)
      .select("*")
      .single();
    if (error) throw error;
    return data as FinancialEnquiry;
  },

  async deactivateEnquiry(id: string, reason: string): Promise<FinancialEnquiry> {
    const { data, error } = await sb
      .from("financial_enquiries")
      .update({ status: "deactivated", deactivated_reason: reason, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as FinancialEnquiry;
  },

  async getEnquiryStats(builderProfileId: string) {
    const enquiries = await this.getEnquiries(builderProfileId);
    return {
      total: enquiries.length,
      new: enquiries.filter((e) => e.status === "new").length,
      under_review: enquiries.filter((e) => e.status === "under_review" || e.status === "documents_submitted").length,
      approved: enquiries.filter((e) => e.status === "approved").length,
      rejected: enquiries.filter((e) => e.status === "rejected").length,
    };
  },

  async getBuilderProfileId(userId: string): Promise<string | null> {
    const { data } = await sb.from("builder_profiles").select("id").eq("user_id", userId).maybeSingle();
    return data?.id ?? null;
  },
};

export function calculateEMI(principal: number, annualRate: number, years: number): number {
  if (!principal || !annualRate || !years) return 0;
  const r = annualRate / 12 / 100;
  const n = years * 12;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
}
