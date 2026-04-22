import { supabase } from "@/integrations/supabase/client";

export type PropertyEventType =
  | "view"
  | "save"
  | "lead"
  | "call_click"
  | "whatsapp_click"
  | "share";

export type EventSource = "search" | "direct" | "ad" | "featured" | string;

interface TrackParams {
  propertyId: string;
  eventType: PropertyEventType;
  source?: EventSource;
  metadata?: Record<string, any>;
}

// Debounce duplicate views from the same browser within a window (10 min)
const VIEW_DEDUPE_MS = 10 * 60 * 1000;

const dedupeKey = (propertyId: string, eventType: string) =>
  `pe:${eventType}:${propertyId}`;

const detectSource = (): EventSource => {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get("utm_source") || params.get("source");
    if (utm) return utm;
    const ref = document.referrer;
    if (!ref) return "direct";
    if (ref.includes("/search")) return "search";
    if (ref.includes("/promotions") || ref.includes("/reels")) return "ad";
    if (ref.includes(window.location.host)) return "featured";
    return "direct";
  } catch {
    return "direct";
  }
};

export async function trackPropertyEvent({
  propertyId,
  eventType,
  source,
  metadata,
}: TrackParams): Promise<void> {
  if (!propertyId) return;
  try {
    // Debounce repeated views from the same browser
    if (eventType === "view") {
      const key = dedupeKey(propertyId, eventType);
      const last = Number(sessionStorage.getItem(key) || "0");
      if (Date.now() - last < VIEW_DEDUPE_MS) return;
      sessionStorage.setItem(key, String(Date.now()));
    }

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("property_events" as any).insert({
      property_id: propertyId,
      user_id: user?.id ?? null,
      event_type: eventType,
      source: source ?? detectSource(),
      metadata: metadata ?? {},
    });
  } catch (err) {
    // Silent fail – analytics should never break UX
    console.warn("trackPropertyEvent failed", err);
  }
}
