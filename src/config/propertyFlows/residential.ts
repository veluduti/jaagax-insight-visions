// ============================================================
// Residential flow config — SCAFFOLD ONLY.
// Business logic intentionally not implemented yet.
// ============================================================
import type { PropertyFlowConfig } from "@/engines/types";

export const residentialFlow: PropertyFlowConfig = {
  category: "residential",
  label: "Residential",
  order: [],
  fields: {},
  questions: {},
  rules: [],
};

export default residentialFlow;
