/**
 * Platform Event Bus
 * ------------------
 * Decoupled pub/sub for cross-module communication. Modules publish
 * domain events; any subscriber (notifications, timeline, analytics,
 * dashboards, AI) can react without being coupled to the publisher.
 *
 * - In-memory delivery is synchronous & best-effort.
 * - Optional persistence bridge writes to `platform_events` so events
 *   survive reloads and become queryable by admin/analytics later.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PlatformEvent<T = unknown> {
  topic: string;
  actorUserId?: string | null;
  subjectType?: string;
  subjectId?: string;
  moduleKey?: string;
  payload?: T;
  occurredAt?: string;
}

type Handler = (event: PlatformEvent) => void | Promise<void>;

const handlers = new Map<string, Set<Handler>>();
const wildcardHandlers = new Set<Handler>();

/** Subscribe to a specific topic. Use `*` to subscribe to all events. */
export function subscribe(topic: string, handler: Handler): () => void {
  if (topic === "*") {
    wildcardHandlers.add(handler);
    return () => wildcardHandlers.delete(handler);
  }
  const set = handlers.get(topic) ?? new Set();
  set.add(handler);
  handlers.set(topic, set);
  return () => set.delete(handler);
}

/** Publish an event to all local subscribers (and optionally persist it). */
export async function publish<T = unknown>(
  event: PlatformEvent<T>,
  opts: { persist?: boolean } = {},
): Promise<void> {
  const enriched: PlatformEvent<T> = {
    ...event,
    occurredAt: event.occurredAt ?? new Date().toISOString(),
  };
  const set = handlers.get(event.topic);
  const targets = [...(set ?? []), ...wildcardHandlers];
  await Promise.allSettled(targets.map((h) => Promise.resolve(h(enriched))));

  if (opts.persist) {
    try {
      await supabase.from("platform_events" as never).insert({
        topic: enriched.topic,
        actor_user_id: enriched.actorUserId ?? null,
        subject_type: enriched.subjectType ?? null,
        subject_id: enriched.subjectId ?? null,
        module_key: enriched.moduleKey ?? null,
        payload: enriched.payload ?? {},
      } as never);
    } catch (err) {
      // never let persistence break the flow
      console.warn("[EventBus] persist failed", err);
    }
  }
}

/** Well-known topic keys. Modules should add their own with a namespace prefix. */
export const Topics = {
  UserSignedIn: "auth.signed_in",
  UserSignedOut: "auth.signed_out",
  PropertyCreated: "property.created",
  PropertyApproved: "property.approved",
  LandRegistrationSubmitted: "nl.land_registration.submitted",
  LandRegistrationApproved: "nl.land_registration.approved",
  BookingCreated: "booking.created",
  NotificationRequested: "notification.requested",
} as const;
