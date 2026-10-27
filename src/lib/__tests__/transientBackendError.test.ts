import { describe, expect, it } from "vitest";
import { isTransientBackendError } from "@/components/shared/AppErrorBoundary";

describe("Transient backend failures never blank the screen", () => {
  it("recognises the reported edge-runtime outage as retryable", () => {
    const outage = new Error(
      'Edge function returned 503: Error, {"code":"SUPABASE_EDGE_RUNTIME_SERVICE_DEGRADED","message":"Service is temporarily unavailable"}',
    );
    expect(isTransientBackendError(outage)).toBe(true);
  });

  it("still treats a genuine code fault as a real crash", () => {
    const bug = new Error("Cannot read properties of undefined (reading 'AutocompleteSessionToken')");
    expect(isTransientBackendError(bug)).toBe(false);
  });
});
