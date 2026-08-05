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

export type AccessRole = "customer" | "agent";

const FULL_ACCESS: Record<FeatureKey, AccessValue> = {
  buyRent: true,
  newProjects: true,
  sellProperty: true,
  searchFilters: true,
  transactions: true,
  agents: true,
  communities: true,
  marketIndex: true,
};

export const roleAccess: Record<AccessRole, Record<FeatureKey, AccessValue>> = {
  // Single unified identity — buying, selling and building capabilities in one
  customer: FULL_ACCESS,
  agent: FULL_ACCESS,
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
 * Normalize an auth role to an AccessRole. Defaults to "customer".
 */
export const normalizeAccessRole = (role?: string | null): AccessRole => {
  if (role === "agent" || role === "admin") return "agent";
  return "customer";
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
