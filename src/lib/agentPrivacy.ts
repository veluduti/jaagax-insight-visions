/**
 * Agent privacy helpers.
 *
 * Rule: customers must never see an agent's real name. They only see the
 * public agent code (e.g. AGX-4F2K9D). Phone/email are only revealed once the
 * agent has been assigned to (and accepted) the customer's property.
 */

export interface PublicAgentLike {
  id?: string | null;
  agent_code?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  languages?: string | string[] | null;
  languages_spoken?: string[] | null;
}

/** Lifecycle states in which the assigned agent's contact details may be shown. */
export const AGENT_CONTACT_VISIBLE_STATUSES = [
  "agent_accepted",
  "visit_scheduled",
  "visit_confirmed",
  "visit_reschedule_requested",
  "under_verification",
  "verification_submitted",
  "pending_final_approval",
  "live_verified",
  "live",
];

/** Fallback code derived from the agent id so the UI never shows a blank label. */
export function fallbackAgentCode(id?: string | null): string {
  if (!id) return "JAAGA Agent";
  return `AGX-${String(id).replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/** The only label a customer may see for an agent. */
export function agentPublicLabel(agent: PublicAgentLike | null | undefined): string {
  if (!agent) return "JAAGA Agent";
  return agent.agent_code?.trim() || fallbackAgentCode(agent.id);
}

/** Avatar initials must not leak the real name. */
export function agentAvatarInitials(agent: PublicAgentLike | null | undefined): string {
  const label = agentPublicLabel(agent);
  const compact = label.replace(/[^A-Z0-9]/gi, "");
  return compact.slice(0, 2).toUpperCase() || "AG";
}

/** True when contact details may be revealed for the given property status. */
export function canRevealAgentContact(lifecycleStatus?: string | null): boolean {
  return AGENT_CONTACT_VISIBLE_STATUSES.includes(lifecycleStatus || "");
}

/** Normalised language list for display / matching. */
export function agentLanguages(agent: PublicAgentLike | null | undefined): string[] {
  if (!agent) return [];
  if (Array.isArray(agent.languages_spoken) && agent.languages_spoken.length) {
    return agent.languages_spoken.filter(Boolean);
  }
  if (Array.isArray(agent.languages)) return agent.languages.filter(Boolean);
  if (typeof agent.languages === "string") {
    return agent.languages.split(",").map((l) => l.trim()).filter(Boolean);
  }
  return [];
}

export const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Telugu",
  "Tamil",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Odia",
  "Urdu",
];
