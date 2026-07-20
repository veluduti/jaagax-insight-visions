/**
 * Platform Public API
 * -------------------
 * Every module imports from `@/platform` (never from the internal
 * paths) so we can reorganize the internals later without touching
 * callers.
 */
export * as EventBus from "./events/EventBus";
export * as ModuleRegistry from "./modules/ModuleRegistry";
export * as Permissions from "./permissions/permissions";
export { usePermission, useRoles } from "./permissions/usePermission";
export * as Timeline from "./timeline/timeline";
export * as Analytics from "./analytics/analytics";
export * as Media from "./media/mediaService";
export * as Geo from "./geo/geoService";
export * as Search from "./search/searchRegistry";
export * as Notifications from "./notifications/notificationService";
export * as AIMemory from "./ai/AIMemory";
export * as AgentRegistry from "./ai/AgentRegistry";
export * as Widgets from "./dashboard/WidgetRegistry";
export { DashboardShell } from "./dashboard/DashboardShell";
export { RouteAliases } from "./routing/RouteAliases";
