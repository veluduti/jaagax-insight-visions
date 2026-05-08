import { supabase } from "@/integrations/supabase/client";
import { cachedInvoke, type CachedInvokeOptions } from "@/lib/aiCache";

/**
 * Thin wrappers around AI / business edge functions.
 * Centralizing them avoids scattered `supabase.functions.invoke` calls
 * and gives one place to add tracing, retries, caching, or auth headers.
 *
 * Phase 9: every wrapper is non-blocking by contract — callers must not
 * `await` these on the critical render path. Use `useAICall` or fire from
 * `useEffect` and render skeletons until the promise resolves.
 */

async function rawInvoke<T = any>(fn: string, body?: any): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw error;
  return data as T;
}

/** Invoke without caching — for write-style / always-fresh AI ops. */
async function invoke<T = any>(fn: string, body?: any): Promise<T> {
  return rawInvoke<T>(fn, body);
}

/** Invoke with cache + in-flight dedup. Use for read-style AI ops. */
function invokeCached<T = any>(fn: string, body?: any, opts?: CachedInvokeOptions): Promise<T> {
  return cachedInvoke<T>(fn, body, () => rawInvoke<T>(fn, body), opts);
}

export const aiService = {
  // Read-style / idempotent AI — cached + deduped.
  propertyAdvisor: (body: any) => invokeCached("ai-property-advisor", body),
  propertyDecision: (body: any) => invokeCached("ai-property-decision", body),
  propertyExpert: (body: any) => invokeCached("ai-property-expert", body),
  suggestProperties: (body: any) => invokeCached("ai-suggest-properties", body),
  compareProperties: (body: any) => invokeCached("ai-compare-properties", body),
  rankLeads: (body: any) => invokeCached("ai-rank-leads", body),
  smartHint: (body: any) => invokeCached("ai-smart-hint", body),
  trustEngine: (body: any) => invokeCached("ai-trust-engine", body),
  buyerContext: (body: any) => invokeCached("ai-buyer-context", body),
  optimizeSlot: (body: any) => invokeCached("ai-optimize-slot", body),
  projectForecast: (body: any) => invokeCached("ai-project-forecast", body),
  analyzeProperty: (body: any) => invokeCached("analyze-property", body),
  analyzeCommunity: (body: any) => invokeCached("analyze-community", body),
  marketTrends: (body: any) => invokeCached("market-trends-ai", body),
  postVisitInsights: (body: any) => invokeCached("post-visit-insights", body),
  nearbyPlaces: (body: any) => invokeCached("nearby-places", body, { ttl: 30 * 60 * 1000 }),

  // Write-style / generative — bypass cache so each request is fresh.
  generateTitles: (body: any) => invoke("ai-generate-titles", body),
  listingSuggestions: (body: any) => invoke("ai-listing-suggestions", body),
  extractProperty: (body: any) => invoke("ai-extract-property", body),
  conversationalListing: (body: any) => invoke("ai-conversational-listing", body),
  generateVisitSummary: (body: any) => invoke("generate-visit-summary", body),
  generateAgentSummary: (body: any) => invoke("generate-agent-summary", body),
};

export { invoke as invokeAI, invokeCached as invokeAICached };
