import { describe, it, expect } from "vitest";
import { onboardingSteps, listingStatus, type OnboardingInput } from "./partnerOnboarding";
const base: OnboardingInput = { accountCreated: true, contactVerified: true, propertyTypeChosen: true, businessProfile: true, hasProperty: false, inventoryReady: false, documentsReady: false, bankReady: false, applicationStatus: null, isLive: false };
describe("partner onboarding", () => {
  it("after registration only Add Property is actionable and later steps are locked", () => {
    expect(onboardingSteps(base)).toEqual(["done","done","done","done","action","locked","locked","locked","locked"]);
  });
  it("submission unlocks only after rooms, documents and bank are ready", () => {
    const s = onboardingSteps({ ...base, hasProperty: true, inventoryReady: true, documentsReady: true, bankReady: false });
    expect(s[6]).toBe("action"); expect(s[7]).toBe("locked");
    expect(onboardingSteps({ ...base, hasProperty: true, inventoryReady: true, documentsReady: true, bankReady: true })[7]).toBe("action");
  });
  it("go live stays locked until approval", () => {
    const ready = { ...base, hasProperty: true, inventoryReady: true, documentsReady: true, bankReady: true };
    expect(onboardingSteps({ ...ready, applicationStatus: "pending" })[8]).toBe("locked");
    expect(onboardingSteps({ ...ready, applicationStatus: "approved" })[8]).toBe("action");
  });
  it("reports the real listing status", () => {
    expect(listingStatus(base)).toBe("profile_completed");
    expect(listingStatus({ ...base, hasProperty: true })).toBe("property_setup");
    expect(listingStatus({ ...base, hasProperty: true, applicationStatus: "pending" })).toBe("under_verification");
    expect(listingStatus({ ...base, hasProperty: true, applicationStatus: "changes_requested" })).toBe("changes_requested");
    expect(listingStatus({ ...base, isLive: true })).toBe("live");
  });
});
