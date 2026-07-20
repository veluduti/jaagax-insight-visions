/**
 * AI Memory & Context Layer
 * -------------------------
 * Shared key/value store every AI agent reads and writes. Scopes:
 *  - session  : ephemeral per-conversation state
 *  - user     : long-lived facts about the user
 *  - agent    : agent-specific memory across sessions
 *  - module   : module-scoped shared context
 *
 * Row-level security guarantees only the owning user can read.
 */
import { supabase } from "@/integrations/supabase/client";

export type MemoryScope = "session" | "user" | "agent" | "module";

export interface MemoryInput {
  userId: string;
  scope: MemoryScope;
  key: string;
  value: unknown;
  agentKey?: string;
  moduleKey?: string;
  expiresAt?: string | null;
}

export async function remember(input: MemoryInput): Promise<void> {
  await supabase.from("ai_memory" as never).upsert(
    {
      user_id: input.userId,
      scope: input.scope,
      agent_key: input.agentKey ?? null,
      module_key: input.moduleKey ?? null,
      key: input.key,
      value: input.value ?? {},
      expires_at: input.expiresAt ?? null,
    } as never,
    { onConflict: "user_id,scope,agent_key,module_key,key" } as never,
  );
}

export async function recall<T = unknown>(params: {
  userId: string;
  scope: MemoryScope;
  key: string;
  agentKey?: string;
  moduleKey?: string;
}): Promise<T | null> {
  const q = supabase
    .from("ai_memory" as never)
    .select("value")
    .eq("user_id", params.userId)
    .eq("scope", params.scope)
    .eq("key", params.key);
  if (params.agentKey) q.eq("agent_key", params.agentKey);
  if (params.moduleKey) q.eq("module_key", params.moduleKey);
  const { data } = await q.maybeSingle();
  return (data as { value: T } | null)?.value ?? null;
}

export async function forget(params: {
  userId: string;
  scope?: MemoryScope;
  agentKey?: string;
  moduleKey?: string;
  key?: string;
}): Promise<void> {
  let q = supabase.from("ai_memory" as never).delete().eq("user_id", params.userId);
  if (params.scope) q = q.eq("scope", params.scope);
  if (params.agentKey) q = q.eq("agent_key", params.agentKey);
  if (params.moduleKey) q = q.eq("module_key", params.moduleKey);
  if (params.key) q = q.eq("key", params.key);
  await q;
}
