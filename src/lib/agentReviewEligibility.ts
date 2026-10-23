export interface AgentReviewState {
  verification_status?: string | null;
  lifecycle_status?: string | null;
}

export function isAwaitingAgentFinalApproval(property: AgentReviewState): boolean {
  return property.verification_status === "agent_verified_pending" &&
    ["verification_submitted", "pending_final_approval"].includes(property.lifecycle_status ?? "");
}