/**
 * NLInterview — Route: /natural-living/interview
 * Replaces the Phase 1D placeholder with the full AI Interview experience.
 * The engine ensures resume works via the existing onboarding resolver.
 */
import {
  ProfileBootProvider,
} from "@/features/natural-living/onboarding/ProfileBootProvider";
import RequireNLAuth from "@/features/natural-living/onboarding/RequireNLAuth";
import InterviewChat from "@/features/natural-living/interview/InterviewChat";
import "@/features/natural-living/theme.css";

export default function NLInterview() {
  return (
    <ProfileBootProvider>
      <RequireNLAuth allowStages={["needs_interview", "resume_interview", "needs_profile", "dashboard_ready"]}>
        <InterviewChat />
      </RequireNLAuth>
    </ProfileBootProvider>
  );
}
