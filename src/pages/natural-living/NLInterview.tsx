/**
 * NLInterview — Route: /natural-living/interview
 * Renders JAAGAX platform navbar above the ChatGPT-style interview surface.
 */
import Navigation from "@/components/Navigation";
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
        <div className="nl-scope flex flex-col min-h-[100dvh] bg-background">
          <Navigation />
          <div className="flex-1 min-h-0">
            <InterviewChat />
          </div>
        </div>
      </RequireNLAuth>
    </ProfileBootProvider>
  );
}

