import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission, resolveRoles } from "./permissions";

export function usePermission(resource: string, action: string) {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setAllowed(false);
      return;
    }
    hasPermission(user.id, resource, action).then((v) => {
      if (!cancelled) setAllowed(v);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, resource, action]);

  return { allowed: allowed ?? false, loading: allowed === null };
}

export function useRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    resolveRoles(user.id).then((r) => {
      if (!cancelled) {
        setRoles(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { roles, loading, hasRole: (k: string) => roles.includes(k) };
}
