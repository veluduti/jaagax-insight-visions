import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Lock, LogIn } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface RequireAuthOptions {
  title?: string;
  message?: string;
  /** Optional callback invoked when the user is already authenticated. */
  onAuthed?: () => void;
}

interface RequireAuthContextValue {
  isAuthenticated: boolean;
  /** Returns true if the user is authenticated; otherwise opens the popup. */
  requireAuth: (opts?: RequireAuthOptions) => boolean;
  /** Wraps a handler so it only runs when authed. */
  guard: <T extends (...args: any[]) => any>(fn: T, opts?: RequireAuthOptions) => (...args: Parameters<T>) => void;
  openAuthPopup: (opts?: RequireAuthOptions) => void;
}

const RequireAuthContext = createContext<RequireAuthContextValue | null>(null);

export const useRequireAuth = (): RequireAuthContextValue => {
  const ctx = useContext(RequireAuthContext);
  if (!ctx) throw new Error("useRequireAuth must be used inside <RequireAuthProvider>");
  return ctx;
};

export const RequireAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Sign in required");
  const [message, setMessage] = useState("Please sign in to continue with this action.");
  const navigate = useNavigate();
  const location = useLocation();
  const authedRef = useRef(false);

  useEffect(() => {
    authedRef.current = isAuthed;
  }, [isAuthed]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session?.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const openAuthPopup = useCallback((opts?: RequireAuthOptions) => {
    if (opts?.title) setTitle(opts.title);
    else setTitle("Sign in required");
    if (opts?.message) setMessage(opts.message);
    else setMessage("Please sign in to continue with this action.");
    setOpen(true);
  }, []);

  const requireAuth = useCallback(
    (opts?: RequireAuthOptions) => {
      if (authedRef.current) {
        opts?.onAuthed?.();
        return true;
      }
      openAuthPopup(opts);
      return false;
    },
    [openAuthPopup],
  );

  const guard = useCallback(
    <T extends (...args: any[]) => any>(fn: T, opts?: RequireAuthOptions) =>
      (...args: Parameters<T>) => {
        if (authedRef.current) {
          fn(...args);
        } else {
          openAuthPopup(opts);
        }
      },
    [openAuthPopup],
  );

  // Global click interceptor for declarative gating via [data-requires-auth]
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (authedRef.current) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest<HTMLElement>("[data-requires-auth]");
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      const customTitle = el.getAttribute("data-auth-title") || undefined;
      const customMessage = el.getAttribute("data-auth-message") || undefined;
      openAuthPopup({ title: customTitle, message: customMessage });
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [openAuthPopup]);

  const value = useMemo<RequireAuthContextValue>(
    () => ({ isAuthenticated: isAuthed, requireAuth, guard, openAuthPopup }),
    [isAuthed, requireAuth, guard, openAuthPopup],
  );

  const handleSignIn = () => {
    setOpen(false);
    const from = location.pathname + location.search;
    navigate("/auth", { state: { from } });
  };

  return (
    <RequireAuthContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-center">{title}</DialogTitle>
            <DialogDescription className="text-center">{message}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep browsing
            </Button>
            <Button onClick={handleSignIn} className="gap-2">
              <LogIn className="w-4 h-4" /> Sign in / Sign up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RequireAuthContext.Provider>
  );
};

export default RequireAuthProvider;
