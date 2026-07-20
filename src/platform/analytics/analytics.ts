/**
 * Analytics Foundation
 * --------------------
 * Uniform `track(event, props)` API. Currently emits to the platform
 * event bus and console; future phases can plug PostHog, GA, or a
 * warehouse pipeline without touching call sites.
 */
import { publish } from "@/platform/events/EventBus";

export interface AnalyticsEvent {
  name: string;
  props?: Record<string, unknown>;
  userId?: string | null;
  moduleKey?: string;
}

export async function track(event: AnalyticsEvent): Promise<void> {
  if (import.meta.env.DEV) {
    console.debug("[analytics]", event.name, event.props ?? {});
  }
  await publish({
    topic: `analytics.${event.name}`,
    actorUserId: event.userId ?? null,
    moduleKey: event.moduleKey,
    payload: event.props ?? {},
  });
}

export function trackPageView(path: string, userId?: string | null) {
  return track({ name: "page_view", props: { path }, userId });
}
