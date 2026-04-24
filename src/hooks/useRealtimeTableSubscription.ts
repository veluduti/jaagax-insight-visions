import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseRealtimeTableSubscriptionOptions {
  channelName: string;
  tables: string[];
  onChange: () => void;
  enabled?: boolean;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  schema?: string;
}

export function useRealtimeTableSubscription({
  channelName,
  tables,
  onChange,
  enabled = true,
  event = "*",
  schema = "public",
}: UseRealtimeTableSubscriptionOptions) {
  const onChangeRef = useRef(onChange);
  const tablesKey = tables.join("|");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    let channel = supabase.channel(channelName);

    tables.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event, schema, table },
        () => onChangeRef.current()
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, enabled, event, schema, tablesKey]);
}