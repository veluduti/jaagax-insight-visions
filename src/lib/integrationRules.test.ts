import { describe, expect, it } from "vitest";
import { canActivateConnection, canSubmitConnection, canUseIntegrationApi, mappingChangeRequiresReview, nextRetryStatus, normalizeScopes, retryDelayMs } from "./integrationRules";

const base = { review_status: "approved", is_active: false, credentials_status: "configured", last_test_status: "success", direction: "outbound" as const };

describe("integration activation safeguards", () => {
  it("requires configuration and at least one real room mapping before review", () => {
    expect(canSubmitConnection({ ...base, review_status: "draft" }, 1)).toBe(true);
    expect(canSubmitConnection({ ...base, review_status: "draft" }, 0)).toBe(false);
    expect(canSubmitConnection({ ...base, review_status: "draft", credentials_status: "missing" }, 1)).toBe(false);
  });

  it("does not activate an unapproved outbound provider without a live adapter", () => {
    expect(canActivateConnection(base, false, 1)).toBe(false);
    expect(canActivateConnection(base, true, 1)).toBe(true);
    expect(canActivateConnection({ ...base, review_status: "pending_review" }, true, 1)).toBe(false);
  });

  it("allows an approved inbound API connection after a real test", () => {
    expect(canActivateConnection({ ...base, direction: "inbound" }, false, 1)).toBe(true);
    expect(canActivateConnection({ ...base, direction: "inbound", last_test_status: null }, false, 1)).toBe(false);
  });

  it("rejects expired tokens, missing scopes and inactive connections", () => {
    const now = Date.parse("2026-11-18T00:00:00Z");
    expect(canUseIntegrationApi({ review_status: "active", is_active: true }, "2026-11-18T01:00:00Z", ["reservations:write"], "reservations:write", now)).toBe(true);
    expect(canUseIntegrationApi({ review_status: "active", is_active: true }, "2026-11-17T23:00:00Z", ["reservations:write"], "reservations:write", now)).toBe(false);
    expect(canUseIntegrationApi({ review_status: "active", is_active: true }, "2026-11-18T01:00:00Z", ["reservations:read"], "reservations:write", now)).toBe(false);
    expect(canUseIntegrationApi({ review_status: "approved", is_active: false }, "2026-11-18T01:00:00Z", ["reservations:write"], "reservations:write", now)).toBe(false);
  });

  it("uses bounded exponential retries and stops at the attempt limit", () => {
    expect(retryDelayMs(1)).toBe(15_000);
    expect(retryDelayMs(3)).toBe(60_000);
    expect(retryDelayMs(20)).toBe(15 * 60_000);
    expect(nextRetryStatus(4, 5)).toBe("retry");
    expect(nextRetryStatus(5, 5)).toBe("failed");
  });

  it("requires a fresh review after approved mappings change", () => {
    expect(mappingChangeRequiresReview("active")).toBe(true);
    expect(mappingChangeRequiresReview("approved")).toBe(true);
    expect(mappingChangeRequiresReview("draft")).toBe(false);
  });

  it("removes unknown and duplicate API scopes", () => {
    expect(normalizeScopes(["rates:read", "rates:read", "admin:all", "inventory:write"])).toEqual(["rates:read", "inventory:write"]);
  });
});
