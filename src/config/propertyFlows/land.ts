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
  fields: {
    ...agriculturalFlow.fields,
    agricultural_land_type: {
      ...agriculturalFlow.fields.agricultural_land_type,
      question: "Which land types suit this property for farming? Select all that apply.",
    },
    listing_type: {
      ...agriculturalFlow.fields.listing_type,
      question: "Is this property available for Sale, Lease, Rent or Partnership?",
      options: ["Sale", "Lease", "Rent", "Partnership"],
    },
    total_price: {
      ...agriculturalFlow.fields.total_price,
      visibleIf: { field: "listing_type", in: ["Sale", "Buy"] },
    },
    price_per_unit: {
      ...agriculturalFlow.fields.price_per_unit,
      visibleIf: { field: "listing_type", in: ["Sale", "Buy"] },
    },
  },
};
