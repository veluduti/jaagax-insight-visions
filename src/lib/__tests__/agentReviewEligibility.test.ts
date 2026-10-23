import { describe, expect, it } from "vitest";
import { isAwaitingAgentFinalApproval } from "../agentReviewEligibility";

describe("agent final approval eligibility", () => {
  it("does not offer final approval for the reported visit_confirmed mismatch", () => {
    expect(isAwaitingAgentFinalApproval({ verification_status: "agent_verified_pending", lifecycle_status: "visit_confirmed" })).toBe(false);
  });
  it("accepts a submitted agent review", () => {
    expect(isAwaitingAgentFinalApproval({ verification_status: "agent_verified_pending", lifecycle_status: "verification_submitted" })).toBe(true);
  });
  it("accepts the final approval lifecycle step", () => {
    expect(isAwaitingAgentFinalApproval({ verification_status: "agent_verified_pending", lifecycle_status: "pending_final_approval" })).toBe(true);
  });
  it("does not offer approval for a published or rejected property", () => {
    expect(isAwaitingAgentFinalApproval({ verification_status: "approved", lifecycle_status: "live_verified" })).toBe(false);
    expect(isAwaitingAgentFinalApproval({ verification_status: "rejected", lifecycle_status: "pending_final_approval" })).toBe(false);
  });
});