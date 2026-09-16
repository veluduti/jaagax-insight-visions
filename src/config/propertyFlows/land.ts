// ============================================================
// "List Your Land" flow — land-focused variant of the
// agricultural land flow, asked inline like every other category.
// ============================================================
import type { PropertyFlowConfig } from "@/engines/types";
import { agriculturalFlow } from "./agriculture";

export const landFlow: PropertyFlowConfig = {
  ...agriculturalFlow,
  id: "list_your_land",
  category: "land",
  label: "List Your Land",
  version: "v1-land-inline",
};
