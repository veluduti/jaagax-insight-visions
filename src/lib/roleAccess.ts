// Role-based feature visibility config
// "true" = visible, false = hidden, "optional" = visible (controlled by flag)

export type FeatureKey =
  | "buyRent"
  | "newProjects"
  | "sellProperty"
  | "searchFilters"
  | "transactions"
  | "agents"
  | "communities"
  | "marketIndex";

export type AccessValue = boolean | "optional";

export type AccessRole = "buyer" | "seller" | "agent" | "builder";

export const roleAccess: Record<AccessRole, Record<FeatureKey, AccessValue>> = {
  buyer: {
    buyRent: true,
    newProjects: true,
    sellProperty: true,
    searchFilters: true,
    transactions: false,
    agents: "optional",
    communities: true,
    marketIndex: false,
  },
  seller: {
    buyRent: true,
    newProjects: true,
    sellProperty: true,
    searchFilters: true,
    transactions: true,
    agents: true,
    communities: true,
    marketIndex: true,
  },
  agent: {
    buyRent: true,
    newProjects: true,
    sellProperty: true,
    searchFilters: true,
    transactions: true,
    agents: true,
    communities: true,
    marketIndex: true,
  },
  builder: {
    buyRent: false,
    newProjects: true,
    sellProperty: true,
    searchFilters: false,
    transactions: true,
    agents: false,
    communities: false,
    marketIndex: "optional",
  },
};

// Flags for "optional" features — flip to false to hide later
export const optionalFlags: Record<FeatureKey, boolean> = {
  buyRent: true,
  newProjects: true,
  sellProperty: true,
  searchFilters: true,
  transactions: true,
  agents: true,
  communities: true,
  marketIndex: true,
};

/**
 * Normalize an auth role to an AccessRole. Defaults to "buyer".
 */
export const normalizeAccessRole = (role?: string | null): AccessRole => {
  if (!role) return "buyer";
  if (role === "customer" || role === "buyer") return "buyer";
  if (role === "seller") return "seller";
  if (role === "agent") return "agent";
  if (role === "builder") return "builder";
  // admin, hotel_manager, etc → fall back to most permissive
  if (role === "admin") return "agent";
  return "buyer";
};

/**
 * Returns true if the feature should render for the given role.
 * Treats "optional" as true unless its flag is explicitly disabled.
 */
export const canSee = (role: string | null | undefined, feature: FeatureKey): boolean => {
  const accessRole = normalizeAccessRole(role);
  const value = roleAccess[accessRole][feature];
  if (value === true) return true;
  if (value === false) return false;
  return optionalFlags[feature] !== false; // "optional"
};
