/**
 * Cross-Module Search Registry
 * ----------------------------
 * Each module registers a `SearchProvider` that answers a text query
 * with typed results. The global search bar iterates all providers
 * in parallel; no module needs to know about the others.
 */
export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  moduleKey: string;
  href: string;
  score?: number;
  icon?: string;
}

export interface SearchProvider {
  key: string;
  label: string;
  moduleKey: string;
  search: (query: string, opts?: { limit?: number; signal?: AbortSignal }) => Promise<SearchResult[]>;
}

const providers = new Map<string, SearchProvider>();

export function registerSearchProvider(p: SearchProvider): void {
  providers.set(p.key, p);
}

export function listSearchProviders(): SearchProvider[] {
  return [...providers.values()];
}

export async function searchAll(query: string, opts?: { limit?: number }): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const ac = new AbortController();
  const settled = await Promise.allSettled(
    listSearchProviders().map((p) => p.search(query, { limit: opts?.limit ?? 5, signal: ac.signal })),
  );
  return settled
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
