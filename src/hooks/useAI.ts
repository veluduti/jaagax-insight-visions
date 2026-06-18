import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SmartSuggestionGroup {
  key: "search" | "budget" | "location" | "visit" | "interest";
  title: string;
  properties: any[];
  count: number;
}

export interface MatchScore { score: number; reasons: string[]; }
export interface PricePrediction { current: number; predicted: number; change: number; period: string; }
export interface InvestmentInsights { roi: number; rentalYield: number; appreciation: number; }

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * AI-style heuristics computed from buyer activity. Keeps results deterministic
 * and free of external calls so suggestions are always available.
 */
export function useAI() {
  const [suggestions, setSuggestions] = useState<SmartSuggestionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getSmartSuggestions = useCallback(async (): Promise<SmartSuggestionGroup[]> => {
    const uid = await getCurrentUserId();
    if (!uid) return [];

    const [{ data: searches }, { data: favs }, { data: visits }, { data: locs }, { data: ctx }] =
      await Promise.all([
        (supabase as any).from("saved_searches").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(5),
        (supabase as any).from("favorites").select("property_id").eq("user_id", uid).limit(20),
        (supabase as any).from("visit_bookings").select("property_id").eq("buyer_id", uid).limit(20),
        (supabase as any).from("buyer_preferred_locations").select("city, locality").eq("user_id", uid).limit(10),
        (supabase as any).from("buyer_context").select("*").eq("user_id", uid).maybeSingle(),
      ]);

    const base = (supabase as any).from("properties")
      .select("id, title, city, locality, price, area_sqft, bedrooms, bhk, type, images, trust_score")
      .eq("verified", true).eq("is_live", true);

    // 1. Search history
    let searchQ = base;
    const recentCity = (searches?.[0] as any)?.filters?.city || (searches?.[0] as any)?.city;
    if (recentCity) searchQ = searchQ.eq("city", recentCity);
    const { data: searchProps } = await searchQ.limit(8);

    // 2. Budget
    const budgetMax = (ctx as any)?.budget_max || (searches?.[0] as any)?.filters?.priceMax || 10000000;
    const budgetMin = (ctx as any)?.budget_min || 0;
    const { data: budgetProps } = await base.gte("price", budgetMin).lte("price", budgetMax).limit(8);

    // 3. Preferred locations
    const cities = Array.from(new Set((locs || []).map((l: any) => l.city).filter(Boolean)));
    let locProps: any[] = [];
    if (cities.length) {
      const { data } = await base.in("city", cities).limit(8);
      locProps = data || [];
    }

    // 4. Visit patterns (similar to visited)
    let visitProps: any[] = [];
    const visitedIds = (visits || []).map((v: any) => v.property_id).filter(Boolean);
    if (visitedIds.length) {
      const { data: visited } = await (supabase as any).from("properties").select("city, type, bhk").in("id", visitedIds).limit(5);
      const sampleCity = visited?.[0]?.city;
      const sampleType = visited?.[0]?.type;
      let q = base;
      if (sampleCity) q = q.eq("city", sampleCity);
      if (sampleType) q = q.eq("type", sampleType);
      const { data } = await q.not("id", "in", `(${visitedIds.join(",")})`).limit(8);
      visitProps = data || [];
    } else {
      const { data } = await base.limit(8);
      visitProps = data || [];
    }

    // 5. Interests (favorites)
    let interestProps: any[] = [];
    const favIds = (favs || []).map((f: any) => f.property_id).filter(Boolean);
    if (favIds.length) {
      const { data: liked } = await (supabase as any).from("properties").select("city, bhk, type").in("id", favIds).limit(5);
      const c = liked?.[0]?.city; const b = liked?.[0]?.bhk;
      let q = base;
      if (c) q = q.eq("city", c);
      if (b) q = q.eq("bhk", b);
      const { data } = await q.not("id", "in", `(${favIds.join(",")})`).limit(8);
      interestProps = data || [];
    }

    const groups: SmartSuggestionGroup[] = [
      { key: "search", title: "Based on Search History", properties: searchProps || [], count: (searchProps || []).length },
      { key: "budget", title: "Based on Budget", properties: budgetProps || [], count: (budgetProps || []).length },
      { key: "location", title: "Based on Preferred Locations", properties: locProps, count: locProps.length },
      { key: "visit", title: "Based on Visit Patterns", properties: visitProps, count: visitProps.length },
      { key: "interest", title: "Based on Property Interests", properties: interestProps, count: interestProps.length },
    ];
    return groups;
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const g = await getSmartSuggestions();
      setSuggestions(g);
    } finally { setIsLoading(false); }
  }, [getSmartSuggestions]);

  useEffect(() => { refresh(); }, [refresh]);

  /** Match a property to user preferences (0-100). */
  const getMatchScore = useCallback(async (propertyId: string): Promise<MatchScore> => {
    const uid = await getCurrentUserId();
    if (!uid) return { score: 0, reasons: [] };
    const [{ data: prop }, { data: ctx }, { data: locs }] = await Promise.all([
      (supabase as any).from("properties").select("city, price, bhk, type").eq("id", propertyId).maybeSingle(),
      (supabase as any).from("buyer_context").select("*").eq("user_id", uid).maybeSingle(),
      (supabase as any).from("buyer_preferred_locations").select("city").eq("user_id", uid),
    ]);
    if (!prop) return { score: 0, reasons: [] };
    let score = 50; const reasons: string[] = [];
    const cities = (locs || []).map((l: any) => l.city);
    if (cities.includes(prop.city)) { score += 20; reasons.push(`In preferred city ${prop.city}`); }
    if (ctx?.budget_max && prop.price <= ctx.budget_max) { score += 15; reasons.push("Within your budget"); }
    if (ctx?.preferred_bhk && prop.bhk === ctx.preferred_bhk) { score += 10; reasons.push(`${prop.bhk} BHK matches preference`); }
    if (ctx?.preferred_type && prop.type === ctx.preferred_type) { score += 5; reasons.push(`${prop.type} matches preference`); }
    return { score: Math.min(100, score), reasons };
  }, []);

  /** Heuristic price prediction: +6-12% over 12 months based on trust_score. */
  const getPricePrediction = useCallback(async (propertyId: string): Promise<PricePrediction> => {
    const { data: prop } = await (supabase as any).from("properties").select("price, trust_score").eq("id", propertyId).maybeSingle();
    if (!prop?.price) return { current: 0, predicted: 0, change: 0, period: "12 months" };
    const growth = 0.06 + Math.min(0.06, ((prop.trust_score || 50) / 100) * 0.06);
    const predicted = Math.round(prop.price * (1 + growth));
    return { current: prop.price, predicted, change: +(growth * 100).toFixed(1), period: "12 months" };
  }, []);

  const getInvestmentInsights = useCallback(async (propertyId: string): Promise<InvestmentInsights> => {
    const { data: prop } = await (supabase as any).from("properties").select("price, area_sqft, city").eq("id", propertyId).maybeSingle();
    if (!prop?.price) return { roi: 0, rentalYield: 0, appreciation: 0 };
    // Typical Indian residential: 2.5-3.5% rental yield, 6-10% appreciation
    const rentalYield = 3;
    const appreciation = 8;
    const roi = +(rentalYield + appreciation).toFixed(1);
    return { roi, rentalYield, appreciation };
  }, []);

  const getNearbyOpportunities = useCallback(async (propertyId: string): Promise<any[]> => {
    const { data: prop } = await (supabase as any).from("properties").select("city, locality, bhk, type").eq("id", propertyId).maybeSingle();
    if (!prop) return [];
    let q = (supabase as any).from("properties")
      .select("id, title, city, locality, price, images, bhk, type")
      .eq("verified", true).eq("is_live", true).neq("id", propertyId);
    if (prop.locality) q = q.eq("locality", prop.locality);
    else if (prop.city) q = q.eq("city", prop.city);
    if (prop.bhk) q = q.eq("bhk", prop.bhk);
    const { data } = await q.limit(6);
    return data || [];
  }, []);

  return {
    suggestions, isLoading, refresh,
    getSmartSuggestions, getMatchScore, getPricePrediction, getInvestmentInsights, getNearbyOpportunities,
  };
}
