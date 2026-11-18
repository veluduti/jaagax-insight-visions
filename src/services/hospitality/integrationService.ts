import { supabase } from "@/integrations/supabase/client";

export type IntegrationProvider = { key: string; name: string; kind: "ota" | "pms" | "channel_manager"; live_adapter: boolean; configuration_enabled: boolean; description: string };
export type IntegrationConnection = {
  id: string; hotel_id: string; channel: string; channel_property_id: string | null; connection_kind: "ota" | "pms" | "channel_manager";
  direction: "inbound" | "outbound" | "bidirectional"; environment: "sandbox" | "production"; status: string; review_status: string;
  is_active: boolean; credentials_status: string; client_id: string | null; settings: Record<string, any>; review_notes: string | null;
  last_test_status: string | null; last_test_details: { checks?: { name: string; ok: boolean; detail: string }[] };
  last_sync_at: string | null; last_sync_status: string | null; last_sync_error: string | null; updated_at: string;
};
export type IntegrationOverview = {
  providers: IntegrationProvider[]; connections: IntegrationConnection[]; hotels: { id: string; name: string; city: string | null }[];
  rooms: { id: string; hotel_id: string; room_type: string; room_name: string | null; max_occupancy: number | null; base_price: number | null; is_active: boolean | null }[];
  rate_plans: { id: string; hotel_id: string; room_id: string | null; name: string | null; rate_plan_name: string | null; rate_plan_code: string | null; is_active: boolean | null }[];
  room_mappings: any[]; rate_mappings: any[]; jobs: any[]; webhook_events: any[]; deliveries: any[]; issues: any[];
};
export type IntegrationAccessDetails = {
  connection_id: string; hotel_id: string; direction: IntegrationConnection["direction"]; environment: IntegrationConnection["environment"];
  external_property_id: string | null; jaagax_property_id: string; client_id: string | null; scopes: string[];
  credentials_issued: boolean; credentials_issued_at?: string | null; client_secret?: string; webhook_secret?: string;
  token_url: string; api_base_url: string; webhook_url: string | null;
};

export async function integrationRequest<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("integration-management", { body });
  if (error) {
    let message = "Integration service could not complete the request.";
    try { message = (await error.context.json())?.error ?? message; } catch { /* use safe fallback */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const loadIntegrationOverview = (hotelId?: string) => integrationRequest<IntegrationOverview>({ action: "overview", hotel_id: hotelId });
export const integrationKindLabel = (kind: string) => kind === "ota" ? "OTA" : kind === "pms" ? "PMS" : "Channel Manager";
export const integrationStatusLabel = (status: string) => status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
