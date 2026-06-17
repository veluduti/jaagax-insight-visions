import { supabase } from "@/integrations/supabase/client";

export type ReferralStatus = "clicked" | "visit_scheduled" | "deal_closed" | "paid";

export interface ReferralProgram {
  id: string;
  builder_profile_id: string;
  property_id: string | null;
  referral_amount: number;
  status: "active" | "inactive";
  max_referrals: number | null;
  referral_code: string;
  created_at: string;
  property?: { id: string; title: string | null } | null;
}

export interface ReferralTracking {
  id: string;
  referral_program_id: string;
  referrer_id: string | null;
  visitor_id: string | null;
  visit_date: string;
  status: ReferralStatus;
  commission_amount: number | null;
  paid_at: string | null;
  created_at: string;
}

const sb = supabase as any;

export const referralService = {
  async createReferralProgram(
    builderProfileId: string,
    propertyId: string | null,
    amount: number,
    maxReferrals?: number | null,
  ): Promise<ReferralProgram> {
    const { data, error } = await sb
      .from("referral_programs")
      .insert({
        builder_profile_id: builderProfileId,
        property_id: propertyId,
        referral_amount: amount,
        max_referrals: maxReferrals ?? null,
        status: "active",
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as ReferralProgram;
  },

  async getReferralPrograms(builderProfileId: string): Promise<ReferralProgram[]> {
    const { data, error } = await sb
      .from("referral_programs")
      .select("*, property:properties(id,title)")
      .eq("builder_profile_id", builderProfileId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ReferralProgram[];
  },

  async updateProgramStatus(programId: string, status: "active" | "inactive") {
    const { error } = await sb.from("referral_programs").update({ status }).eq("id", programId);
    if (error) throw error;
  },

  async getReferralStats(builderProfileId: string) {
    const programs = await this.getReferralPrograms(builderProfileId);
    const programIds = programs.map((p) => p.id);
    if (programIds.length === 0) {
      return { totalReferrals: 0, totalClicks: 0, closedDeals: 0, commissionsEarned: 0, programs };
    }
    const { data } = await sb.from("referral_tracking").select("*").in("referral_program_id", programIds);
    const tracking = (data ?? []) as ReferralTracking[];
    return {
      totalReferrals: tracking.length,
      totalClicks: tracking.filter((t) => t.status === "clicked").length,
      closedDeals: tracking.filter((t) => t.status === "deal_closed" || t.status === "paid").length,
      commissionsEarned: tracking
        .filter((t) => t.status === "paid")
        .reduce((s, t) => s + Number(t.commission_amount || 0), 0),
      programs,
      recent: tracking.slice(0, 20),
    };
  },

  generateReferralLink(referralCode: string): string {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/r/${referralCode}`;
  },

  async trackReferralClick(referralCode: string, visitorId?: string | null) {
    const { data: program } = await sb
      .from("referral_programs")
      .select("id")
      .eq("referral_code", referralCode)
      .maybeSingle();
    if (!program) throw new Error("Invalid referral code");
    const { data, error } = await sb
      .from("referral_tracking")
      .insert({
        referral_program_id: program.id,
        visitor_id: visitorId ?? null,
        status: "clicked",
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as ReferralTracking;
  },

  async updateReferralStatus(trackingId: string, status: ReferralStatus, commission?: number) {
    const patch: any = { status };
    if (typeof commission === "number") patch.commission_amount = commission;
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await sb.from("referral_tracking").update(patch).eq("id", trackingId);
    if (error) throw error;
  },

  async payoutCommission(trackingId: string) {
    const { data: track } = await sb
      .from("referral_tracking")
      .select("*, program:referral_programs(referral_amount,builder_profile_id)")
      .eq("id", trackingId)
      .maybeSingle();
    if (!track) throw new Error("Tracking not found");
    if (track.status === "paid") throw new Error("Already paid");

    const amount = Number(track.commission_amount || track.program?.referral_amount || 0);
    const { data: bp } = await sb
      .from("builder_profiles")
      .select("user_id")
      .eq("id", track.program?.builder_profile_id)
      .maybeSingle();
    if (bp?.user_id && amount > 0) {
      await sb.rpc("decrement_wallet_balance", {
        _user_id: bp.user_id,
        _amount: amount,
        _description: "Referral commission payout",
        _reference: `referral:${trackingId}`,
      });
    }
    await this.updateReferralStatus(trackingId, "paid", amount);
    return { paid: amount };
  },
};

export default referralService;
