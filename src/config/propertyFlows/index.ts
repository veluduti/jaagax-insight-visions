// ============================================================
// Central registry of property flow configs.
// Engines resolve a flow by category from this map.
// ============================================================
import type { PropertyCategory, PropertyFlowConfig } from "@/engines/types";
import { residentialFlow } from "./residential";
import { commercialFlow } from "./commercial";
import { plotsFlow } from "./plots";
import { agricultureFlow } from "./agriculture";
import { coworkingFlow } from "./coworking";

export const propertyFlows: Record<PropertyCategory, PropertyFlowConfig> = {
  residential: residentialFlow,
  commercial: commercialFlow,
  plots: plotsFlow,
  agriculture: agricultureFlow,
  coworking: coworkingFlow,
};

export function getPropertyFlow(category: PropertyCategory): PropertyFlowConfig {
  return propertyFlows[category];
}
