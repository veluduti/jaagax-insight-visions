import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminScopeRole = "global_admin" | "country_admin" | "state_admin" | "district_admin" | null;

/**
 * Resolves the current user's hierarchical admin role from `admin_scopes`.
 * Returns null if the user has no admin scope.
 */
export function useAdminRole() {
  const [role, setRole] = useState<AdminScopeRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) { if (alive) { setRole(null); setLoading(false); } return; }
        const { data } = await (supabase as any).rpc("get_admin_role", { _user_id: uid });
        if (!alive) return;
        setRole((data as AdminScopeRole) ?? null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const isOperator = role === "district_admin" || role === "global_admin";
  // Phase 3: only District Admin performs operational property actions.
  // Global Admin retains all other admin capabilities but the property workflow
  // (assign agent / approve / reject) is now District-Admin-only.
  const canOperateProperty = role === "district_admin";
  return { role, loading, isOperator, canOperateProperty };
}
