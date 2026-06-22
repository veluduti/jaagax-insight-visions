// ============================================================
// Central registry of property flow configs.
// Engines resolve a flow by category from this map.
// ============================================================
import type { PropertyCategory, PropertyFlowConfig } from "@/engines/types";
import { residentialFlow } from "./residential";
import { commercialFlow } from "./commercial";
import { plotsFlow } from "./plots";
import { agriculturalFlow as agricultureFlow } from "./agriculture";
import { coworkingFlow } from "./coworking";
import { financialRequirementFlow } from "./financial";

export const propertyFlows: Record<PropertyCategory, PropertyFlowConfig> = {
  residential: residentialFlow as unknown as PropertyFlowConfig,
  commercial: commercialFlow,
  plots: plotsFlow as unknown as PropertyFlowConfig,
  agriculture: agricultureFlow,
  coworking: coworkingFlow,
  financial: financialRequirementFlow as unknown as PropertyFlowConfig,
};

export function getPropertyFlow(category: PropertyCategory): PropertyFlowConfig {
  return propertyFlows[category];
}
