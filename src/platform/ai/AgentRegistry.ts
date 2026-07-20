/**
 * AI Agent Registry
 * -----------------
 * Every AI capability (land agent, farmer assistant, buyer copilot)
 * registers a descriptor. The shared AIChat shell renders any of
 * them without needing per-agent UI code.
 */
export interface AgentDescriptor {
  key: string;
  label: string;
  moduleKey?: string;
  description?: string;
  edgeFunction: string;
  systemHint?: string;
  suggestedPrompts?: string[];
  supportsAttachments?: boolean;
}

const agents = new Map<string, AgentDescriptor>();

export function registerAgent(a: AgentDescriptor): void {
  agents.set(a.key, a);
}

export function getAgent(key: string): AgentDescriptor | undefined {
  return agents.get(key);
}

export function listAgents(moduleKey?: string): AgentDescriptor[] {
  const all = [...agents.values()];
  return moduleKey ? all.filter((a) => a.moduleKey === moduleKey) : all;
}
