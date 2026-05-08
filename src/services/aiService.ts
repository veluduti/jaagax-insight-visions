import { supabase } from "@/integrations/supabase/client";

/**
 * Thin wrappers around AI / business edge functions.
 * Centralizing them avoids scattered `supabase.functions.invoke` calls
 * and gives one place to add tracing, retries, or auth headers later.
 */

async function invoke<T = any>(fn: string, body?: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw error;
  return data as T;
}

export const aiService = {
  propertyAdvisor: (body: any) => invoke("ai-property-advisor", body),
  propertyDecision: (body: any) => invoke("ai-property-decision", body),
  propertyExpert: (body: any) => invoke("ai-property-expert", body),
  suggestProperties: (body: any) => invoke("ai-suggest-properties", body),
  compareProperties: (body: any) => invoke("ai-compare-properties", body),
  rankLeads: (body: any) => invoke("ai-rank-leads", body),
  smartHint: (body: any) => invoke("ai-smart-hint", body),
  trustEngine: (body: any) => invoke("ai-trust-engine", body),
  buyerContext: (body: any) => invoke("ai-buyer-context", body),
  generateTitles: (body: any) => invoke("ai-generate-titles", body),
  listingSuggestions: (body: any) => invoke("ai-listing-suggestions", body),
  extractProperty: (body: any) => invoke("ai-extract-property", body),
  conversationalListing: (body: any) => invoke("ai-conversational-listing", body),
  optimizeSlot: (body: any) => invoke("ai-optimize-slot", body),
  projectForecast: (body: any) => invoke("ai-project-forecast", body),
  analyzeProperty: (body: any) => invoke("analyze-property", body),
  analyzeCommunity: (body: any) => invoke("analyze-community", body),
  marketTrends: (body: any) => invoke("market-trends-ai", body),
  generateVisitSummary: (body: any) => invoke("generate-visit-summary", body),
  generateAgentSummary: (body: any) => invoke("generate-agent-summary", body),
  postVisitInsights: (body: any) => invoke("post-visit-insights", body),
  nearbyPlaces: (body: any) => invoke("nearby-places", body),
};
