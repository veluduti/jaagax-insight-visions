/**
 * Notification Service
 * --------------------
 * Publishes a `notification.requested` event that channel adapters
 * (in-app, email, push, sms, whatsapp) subscribe to. Reads per-user
 * preferences to decide which channels to fan out to.
 */
import { publish } from "@/platform/events/EventBus";
import { supabase } from "@/integrations/supabase/client";

export type ChannelKey = "inApp" | "email" | "push" | "sms" | "whatsapp";

export interface NotifyInput {
  userId: string;
  category: string;
  title: string;
  body?: string;
  moduleKey?: string;
  data?: Record<string, unknown>;
  channels?: ChannelKey[];
}

export async function getEnabledChannels(userId: string, category: string): Promise<ChannelKey[]> {
  const { data } = await supabase
    .from("notification_preferences" as never)
    .select("channel_key, enabled")
    .eq("user_id", userId)
    .eq("category", category);
  const rows = (data as Array<{ channel_key: ChannelKey; enabled: boolean }> | null) ?? [];
  if (!rows.length) return ["inApp"]; // sensible default
  return rows.filter((r) => r.enabled).map((r) => r.channel_key);
}

export async function notify(input: NotifyInput): Promise<void> {
  const channels = input.channels ?? (await getEnabledChannels(input.userId, input.category));
  await publish(
    {
      topic: "notification.requested",
      actorUserId: input.userId,
      moduleKey: input.moduleKey,
      subjectType: "user",
      subjectId: input.userId,
      payload: {
        category: input.category,
        title: input.title,
        body: input.body,
        data: input.data ?? {},
        channels,
      },
    },
    { persist: true },
  );
}
