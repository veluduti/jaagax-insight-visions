import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type StayRequestInput = {
  source: "search" | "tell_jaaga";
  location?: string; city?: string; latitude?: number | null; longitude?: number | null;
  check_in?: string | null; check_out?: string | null; adults?: number; children?: number;
  business_types?: string[]; preferences?: string[]; amenities?: string[];
  budget_max?: number | null; free_text?: string | null;
};
export type MatchReason = { label: string; points: number };
export type Match = { hotel_id: string; room_id: string | null; score: number; reasons: MatchReason[]; price_quote: number | null; hotel_name?: string };

/** Saves the stay request and returns ranked matches built only from partner-entered data. */
export async function matchStayRequest(input: StayRequestInput): Promise<{ stay_request_id: string | null; matches: Match[] }> {
  const { data, error } = await supabase.functions.invoke("hospitality-match", { body: input });
  if (error) throw error;
  return data;
}

export async function listMatchesForHotel(hotelId: string, limit = 50) {
  const { data, error } = await sb.from("match_results")
    .select("id,score,reasons,price_quote,created_at,stay_request_id")
    .eq("hotel_id", hotelId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; score: number; reasons: MatchReason[]; price_quote: number | null; created_at: string }>;
}
