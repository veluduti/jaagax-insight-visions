/**
 * Registers Natural Living dashboard widgets with the platform WidgetRegistry.
 * Side-effect import from App.tsx so downstream `<DashboardShell audience="nl_user"/>`
 * can compose them without touching central files.
 */
import { registerWidget } from "@/platform/dashboard/WidgetRegistry";
import {
  NLJourneyCard,
  NLProfileSummaryWidget,
  NLResumeWidget,
  NLTimelineWidget,
  NLNotificationsWidget,
  NLQuickActions,
  NLAssistantWidget,
} from "./widgets";

const AUDIENCE = "nl_user";
const MODULE = "natural-living";

registerWidget({ key: "nl.journey", moduleKey: MODULE, title: "Your journey", component: NLJourneyCard, span: 2, order: 10, audience: [AUDIENCE] });
registerWidget({ key: "nl.profile-summary", moduleKey: MODULE, title: "AI Profile", component: NLProfileSummaryWidget, span: 2, order: 20, audience: [AUDIENCE] });
registerWidget({ key: "nl.resume", moduleKey: MODULE, title: "Resume", component: NLResumeWidget, span: 2, order: 30, audience: [AUDIENCE] });
registerWidget({ key: "nl.quick-actions", moduleKey: MODULE, title: "Quick actions", component: NLQuickActions, span: 2, order: 40, audience: [AUDIENCE] });
registerWidget({ key: "nl.timeline", moduleKey: MODULE, title: "Timeline", component: NLTimelineWidget, span: 2, order: 50, audience: [AUDIENCE] });
registerWidget({ key: "nl.notifications", moduleKey: MODULE, title: "Notifications", component: NLNotificationsWidget, span: 2, order: 60, audience: [AUDIENCE] });
registerWidget({ key: "nl.assistant", moduleKey: MODULE, title: "AI companion", component: NLAssistantWidget, span: 2, order: 70, audience: [AUDIENCE] });
