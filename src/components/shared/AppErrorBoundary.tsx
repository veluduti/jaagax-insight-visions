import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

/**
 * Phase 10 — Global error boundary.
 *
 * Wraps the entire app so a render-time crash in any lazy chunk, dashboard,
 * or AI panel surfaces a branded retry screen instead of a white page.
 * Production-grade: never leaks the stack to end-users; logs to console
 * for engineers and the runtime-error pipeline.
 */
interface State {
  error: Error | null;
  /** True once a transient backend failure has already been auto-retried. */
  retried?: boolean;
}

function isChunkError(error: Error): boolean {
  const m = `${error?.message || ""} ${error?.name || ""}`.toLowerCase();
  return (
    m.includes("dynamically imported module") ||
    m.includes("loading chunk") ||
    m.includes("importing a module script failed") ||
    m.includes("failed to fetch dynamically")
  );
}

/**
 * A temporary backend hiccup (edge runtime overloaded / 503) is not a fault
 * in the page — it must never leave the user staring at a dead screen.
 */
export function isTransientBackendError(error: Error): boolean {
  const m = `${error?.message || ""}`.toLowerCase();
  return (
    m.includes("503") ||
    m.includes("service is temporarily unavailable") ||
    m.includes("service_degraded") ||
    m.includes("edge function returned")
  );
}


export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, retried: false };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface to runtime-error tooling; do NOT swallow.
    console.error("[AppErrorBoundary]", error, info.componentStack);

    // Stale-deploy self-heal: a chunk that no longer exists on the CDN throws
    // a dynamic-import error. Reload once (guarded) to pick up the new build.
    if (isChunkError(error)) {
      try {
        const KEY = "app_chunk_reload_at";
        const last = Number(sessionStorage.getItem(KEY) || 0);
        if (Date.now() - last > 30_000) {
          sessionStorage.setItem(KEY, String(Date.now()));
          window.location.reload();
        }
      } catch { /* storage blocked */ }
    }

    // Transient backend degradation (edge runtime 503 etc.) is not a code
    // fault: clear the crash screen after a short beat so the page retries.
    if (isTransientBackendError(error) && !this.state.retried) {
      this.setState({ retried: true });
      window.setTimeout(() => this.setState({ error: null }), 1200);
    }
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const message = this.state.error?.message || String(this.state.error);
    const transient = isTransientBackendError(this.state.error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full glass-panel rounded-2xl p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">
            {transient ? "The service is briefly unavailable" : "Something went wrong"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {transient
              ? "A background service is temporarily overloaded. This usually clears in a few seconds — please try again."
              : "We hit an unexpected error rendering this page. Try again, or reload the app."}
          </p>
          {!transient && message && (
            <pre className="text-left text-[11px] bg-muted/50 rounded-md p-2 overflow-auto max-h-40 whitespace-pre-wrap">
              {message}
            </pre>
          )}
          <div className="flex gap-2 justify-center pt-2">
            <Button variant="outline" onClick={this.handleReset}>Try again</Button>
            <Button onClick={this.handleReload}>Reload</Button>
          </div>
        </div>
      </div>
    );
  }

}

export default AppErrorBoundary;
