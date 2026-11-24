/** Pure rules for the partner onboarding checklist shown on the Partner Dashboard. */
export type OnboardingInput = {
  accountCreated: boolean; contactVerified: boolean; propertyTypeChosen: boolean; businessProfile: boolean;
  hasProperty: boolean; inventoryReady: boolean; documentsReady: boolean; bankReady: boolean;
  applicationStatus?: string | null; isLive: boolean;
};
export type StepState = "done" | "action" | "locked";
export type ListingStatus = "profile_completed" | "property_setup" | "under_verification" | "changes_requested" | "rejected" | "approved" | "live";

export function onboardingSteps(i: OnboardingInput): StepState[] {
  const submitted = ["pending", "approved", "changes_requested", "rejected"].includes(i.applicationStatus ?? "") || i.isLive;
  const approved = i.applicationStatus === "approved" || i.isLive;
  const done = [i.accountCreated, i.contactVerified, i.propertyTypeChosen, i.businessProfile, i.hasProperty, i.inventoryReady, i.documentsReady && i.bankReady, submitted && i.applicationStatus !== "changes_requested" && i.applicationStatus !== "rejected", i.isLive];
  const prereq = [true, i.accountCreated, i.contactVerified, i.propertyTypeChosen, i.businessProfile, i.hasProperty, i.inventoryReady, i.inventoryReady && i.documentsReady && i.bankReady, approved];
  return done.map((d, n) => d ? "done" : prereq[n] && done.slice(0, n).every((x, k) => x || k >= 7) ? "action" : "locked");
}

export function listingStatus(i: OnboardingInput): ListingStatus {
  if (i.isLive) return "live";
  switch (i.applicationStatus) {
    case "approved": return "approved";
    case "pending": return "under_verification";
    case "changes_requested": return "changes_requested";
    case "rejected": return "rejected";
  }
  return i.hasProperty ? "property_setup" : "profile_completed";
}
