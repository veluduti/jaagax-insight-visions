/** Only navigate to app-owned URLs; legacy producers also store links in metadata. */
export function notificationDestination(notification: { link?: string | null; metadata?: Record<string, unknown> | null }): string | null {
  const candidates = [notification.link, notification.metadata?.link, notification.metadata?.url, notification.metadata?.action_url];
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    try {
      const url = new URL(candidate, window.location.origin);
      if (url.origin === window.location.origin && !/[\\\u0000-\u001f]/.test(candidate)) {
        const legacyPages: Record<string, string> = {
          "/agent-dashboard": "/dashboard/agent",
          "/builder-dashboard": "/dashboard/customer?view=builder",
          "/buyer-dashboard": "/dashboard/customer",
          "/seller-dashboard": "/dashboard/customer?view=sell",
          "/hotel-manager-dashboard": "/partners/dashboard",
          "/admin-dashboard": "/dashboard/admin",
        };
        const destination = new URL(legacyPages[url.pathname] ?? url.pathname, window.location.origin);
        url.searchParams.forEach((value, key) => destination.searchParams.set(key, value));
        return `${destination.pathname}${destination.search}${url.hash}`;
      }
    } catch { /* Ignore invalid destinations. */ }
  }
  return null;
}

export const notificationIsRead = (notification: { read?: boolean | null; is_read?: boolean | null }) =>
  Boolean(notification.read || notification.is_read);