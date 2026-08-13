// Raw external-channel payload audit.
// EVERY request/response to an external channel (HyperGuest today) is stored so
// that no external field is ever lost, even if JAAGA does not model it yet.

export type ChannelOperation =
  | "search"
  | "detail"
  | "quote"
  | "booking_create"
  | "booking_retrieve"
  | "booking_modify"
  | "booking_cancel";

export interface ChannelAuditEntry {
  hotel_id?: string | null;
  booking_id?: string | null;
  channel: string;
  operation: ChannelOperation;
  endpoint?: string | null;
  request_payload?: unknown;
  response_payload?: unknown;
  http_status?: number | null;
  request_id?: string | null;
  error_message?: string | null;
}

export async function logChannelPayload(supabase: any, entry: ChannelAuditEntry) {
  try {
    await supabase.from("channel_api_payloads").insert({
      hotel_id: entry.hotel_id ?? null,
      booking_id: entry.booking_id ?? null,
      channel: entry.channel,
      operation: entry.operation,
      endpoint: entry.endpoint ?? null,
      request_payload: entry.request_payload ?? null,
      response_payload: entry.response_payload ?? null,
      http_status: entry.http_status ?? null,
      request_id: entry.request_id ?? null,
      error_message: entry.error_message ?? null,
    });
  } catch (e) {
    // Auditing must never break the booking flow.
    console.error("channel audit failed", e);
  }
}

/** Normalizes an external error into a JAAGA error while preserving everything. */
export function normalizeChannelError(
  channel: string,
  status: number,
  raw: unknown,
  requestId?: string | null,
) {
  const r = (raw ?? {}) as Record<string, any>;
  return {
    error: r.message || r.error || r.title || `${channel} request failed`,
    channel,
    http_status: status,
    external_code: r.code ?? r.errorCode ?? null,
    external_message: r.message ?? r.error ?? null,
    request_id: requestId ?? null,
    raw_response: raw ?? null,
  };
}
