// Helper to open SEO-friendly URLs in a new tab safely.
export function openInNewTab(path: string) {
  if (!path) return;
  const url = path.startsWith("/") ? path : `/${path}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function propertyPath(p: { slug?: string | null; id: string }) {
  return `/property/${p.slug || p.id}`;
}

export function projectPath(p: { slug?: string | null; id: string }) {
  return `/project/${p.slug || p.id}`;
}
