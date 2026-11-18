export type IntegrationDirection = "inbound" | "outbound" | "bidirectional";
export type IntegrationConnection = {
  review_status: string;
  is_active: boolean;
  credentials_status: string;
  last_test_status: string | null;
  direction: IntegrationDirection;
};

export function canSubmitConnection(connection: IntegrationConnection, roomMappings: number) {
  return connection.credentials_status === "configured" && roomMappings > 0 && ["draft", "rejected"].includes(connection.review_status);
}

export function canActivateConnection(
  connection: IntegrationConnection,
  providerHasLiveAdapter: boolean,
  roomMappings: number,
) {
  const inboundOnly = connection.direction === "inbound";
  return connection.review_status === "approved"
    && connection.credentials_status === "configured"
    && connection.last_test_status === "success"
    && roomMappings > 0
    && (providerHasLiveAdapter || inboundOnly);
}

export function canUseIntegrationApi(connection: Pick<IntegrationConnection, "review_status" | "is_active">, tokenExpiresAt: string, scopes: string[], requiredScope: string, now = Date.now()) {
  return connection.review_status === "active" && connection.is_active
    && Date.parse(tokenExpiresAt) > now && scopes.includes(requiredScope);
}

export function retryDelayMs(attempt: number) {
  const safeAttempt = Math.max(1, Math.min(8, Math.floor(attempt)));
  return Math.min(15 * 60_000, 15_000 * 2 ** (safeAttempt - 1));
}

export function nextRetryStatus(attempts: number, maxAttempts: number) {
  return attempts >= maxAttempts ? "failed" : "retry";
}

export function mappingChangeRequiresReview(currentStatus: string) {
  return ["approved", "active"].includes(currentStatus);
}

export const integrationScopes = [
  "properties:read", "inventory:read", "inventory:write", "rates:read", "rates:write",
  "reservations:read", "reservations:write",
] as const;

export function normalizeScopes(scopes: string[]) {
  return [...new Set(scopes.filter((scope): scope is typeof integrationScopes[number] => (integrationScopes as readonly string[]).includes(scope)))];
}
