/**
 * Dashboard Widget Registry
 * -------------------------
 * Modules register widgets; `DashboardShell` composes them for a
 * given role/permission set. Adding a widget never requires editing
 * a central dashboard file.
 */
import type { ComponentType, LazyExoticComponent } from "react";

export interface WidgetDescriptor {
  key: string;
  title: string;
  moduleKey: string;
  component: LazyExoticComponent<ComponentType<unknown>> | ComponentType<unknown>;
  span?: 1 | 2 | 3 | 4;
  minHeight?: number;
  requiresPermission?: string;
  requiresRole?: string | string[];
  audience?: string[]; // dashboard slots this widget belongs to (e.g. ['buyer','seller'])
  order?: number;
}

const widgets = new Map<string, WidgetDescriptor>();

export function registerWidget(w: WidgetDescriptor): void {
  widgets.set(w.key, w);
}

export function listWidgetsForAudience(audience: string): WidgetDescriptor[] {
  return [...widgets.values()]
    .filter((w) => !w.audience || w.audience.includes(audience))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function listAllWidgets(): WidgetDescriptor[] {
  return [...widgets.values()];
}
