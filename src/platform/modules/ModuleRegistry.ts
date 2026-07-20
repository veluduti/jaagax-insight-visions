/**
 * Module Registry
 * ---------------
 * Every business domain (Real Estate, Hotels, Natural Living, future
 * modules) registers a `ModuleDescriptor` describing its identity,
 * routes, navigation, dashboard widgets, permissions and AI agents.
 *
 * The registry is the single spine that navigation, permissions,
 * dashboards, and admin UIs read from - so adding a new module never
 * requires editing central files.
 */
import type { ComponentType, LazyExoticComponent } from "react";

export interface ModuleNavItem {
  key: string;
  label: string;
  path: string;
  icon?: string;
  requiresPermission?: string;
  requiresRole?: string | string[];
  order?: number;
}

export interface ModuleRoute {
  path: string;
  element: LazyExoticComponent<ComponentType<unknown>> | ComponentType<unknown>;
  requiresAuth?: boolean;
  requiresPermission?: string;
  requiresRole?: string | string[];
}

export interface ModuleWidget {
  key: string;
  title: string;
  component: LazyExoticComponent<ComponentType<unknown>> | ComponentType<unknown>;
  span?: 1 | 2 | 3 | 4;
  minHeight?: number;
  requiresPermission?: string;
  requiresRole?: string | string[];
  order?: number;
}

export interface ModuleAgent {
  key: string;
  label: string;
  edgeFunction: string;
  description?: string;
}

export interface ModuleDescriptor {
  key: string;
  label: string;
  description?: string;
  basePath: string;
  color?: string;
  icon?: string;
  enabled?: boolean;
  navItems?: ModuleNavItem[];
  routes?: ModuleRoute[];
  widgets?: ModuleWidget[];
  agents?: ModuleAgent[];
  permissions?: string[];
}

const modules = new Map<string, ModuleDescriptor>();

export function registerModule(descriptor: ModuleDescriptor): void {
  modules.set(descriptor.key, { enabled: true, ...descriptor });
}

export function getModule(key: string): ModuleDescriptor | undefined {
  return modules.get(key);
}

export function listModules(): ModuleDescriptor[] {
  return [...modules.values()].filter((m) => m.enabled !== false);
}

export function listNavForModule(key: string): ModuleNavItem[] {
  const m = modules.get(key);
  if (!m?.navItems) return [];
  return [...m.navItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function listWidgetsForModule(key: string): ModuleWidget[] {
  const m = modules.get(key);
  if (!m?.widgets) return [];
  return [...m.widgets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function findModuleByPath(pathname: string): ModuleDescriptor | undefined {
  return listModules().find((m) => pathname.startsWith(m.basePath));
}
