/** Presentation defaults only; posting permissions remain server-enforced. */
export function withAgentListingIdentity<T extends Record<string, unknown>>(answers: T, isAgent: boolean): T {
  return isAgent ? { ...answers, listed_by: "Agent" } : answers;
}