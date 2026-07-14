import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminScopeRole =
  | "global_admin"
  | "country_admin"
  | "state_admin"
  | "district_admin"
  | null;

export interface AdminScopeBounds {
  role: AdminScopeRole;
  country: string | null;
  state: string | null;
  district: string | null;
}

export interface AdminScopeSelection {
  country: string | null;
  state: string | null;
  district: string | null;
}

interface Ctx {
  loading: boolean;
  bounds: AdminScopeBounds;
  selection: AdminScopeSelection;
  setCountry: (v: string | null) => void;
  setState: (v: string | null) => void;
  setDistrict: (v: string | null) => void;
  reset: () => void;
  /** Available options derived from data the admin can already see */
  options: {
    countries: string[];
    states: string[];
    districts: string[];
  };
  /** Effective filters merging bounds + selection. Use in queries. */
  effective: AdminScopeSelection;
}

const AdminScopeFilterContext = createContext<Ctx | undefined>(undefined);

export const AdminScopeFilterProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [bounds, setBounds] = useState<AdminScopeBounds>({
    role: null,
    country: null,
    state: null,
    district: null,
  });
  const [selection, setSel] = useState<AdminScopeSelection>({
    country: null,
    state: null,
    district: null,
  });
  const [rawScopeRows, setRawScopeRows] = useState<
    Array<{ country: string | null; state: string | null; district: string | null }>
  >([]);

  // Resolve admin's own scope + options
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) {
          if (alive) setLoading(false);
          return;
        }
        // Fetch this user's admin_scopes record for bounds
        const { data: scopeRow } = await (supabase as any)
          .from("admin_scopes")
          .select("role, country, state, district")
          .eq("user_id", uid)
          .eq("is_active", true)
          .maybeSingle();

        // Fetch distinct location tuples from properties (RLS will already
        // restrict to what this admin can see, so options never leak scope).
        const { data: locRows } = await (supabase as any)
          .from("properties")
          .select("country, state, district")
          .limit(2000);

        if (!alive) return;
        setBounds({
          role: (scopeRow?.role as AdminScopeRole) ?? "global_admin",
          country: scopeRow?.country ?? null,
          state: scopeRow?.state ?? null,
          district: scopeRow?.district ?? null,
        });
        setRawScopeRows(
          (locRows || []).map((r: any) => ({
            country: r.country ?? null,
            state: r.state ?? null,
            district: r.district ?? null,
          })),
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Derive cascading options
  const options = useMemo(() => {
    const countries = new Set<string>();
    const states = new Set<string>();
    const districts = new Set<string>();

    const effectiveCountry = bounds.country ?? selection.country;
    const effectiveState = bounds.state ?? selection.state;

    for (const r of rawScopeRows) {
      if (r.country) countries.add(r.country);
      if (effectiveCountry && r.country !== effectiveCountry) continue;
      if (r.state) states.add(r.state);
      if (effectiveState && r.state !== effectiveState) continue;
      if (r.district) districts.add(r.district);
    }
    return {
      countries: [...countries].sort(),
      states: [...states].sort(),
      districts: [...districts].sort(),
    };
  }, [rawScopeRows, bounds, selection.country, selection.state]);

  const setCountry = useCallback((v: string | null) => {
    setSel({ country: v, state: null, district: null });
  }, []);
  const setState = useCallback((v: string | null) => {
    setSel((s) => ({ ...s, state: v, district: null }));
  }, []);
  const setDistrict = useCallback((v: string | null) => {
    setSel((s) => ({ ...s, district: v }));
  }, []);
  const reset = useCallback(() => setSel({ country: null, state: null, district: null }), []);

  const effective = useMemo<AdminScopeSelection>(
    () => ({
      country: bounds.country ?? selection.country,
      state: bounds.state ?? selection.state,
      district: bounds.district ?? selection.district,
    }),
    [bounds, selection],
  );

  const value: Ctx = {
    loading,
    bounds,
    selection,
    setCountry,
    setState,
    setDistrict,
    reset,
    options,
    effective,
  };

  return (
    <AdminScopeFilterContext.Provider value={value}>{children}</AdminScopeFilterContext.Provider>
  );
};

export const useAdminScopeFilter = () => {
  const ctx = useContext(AdminScopeFilterContext);
  if (!ctx) {
    // Inert defaults so non-admin pages don't crash
    return {
      loading: false,
      bounds: { role: null, country: null, state: null, district: null } as AdminScopeBounds,
      selection: { country: null, state: null, district: null },
      setCountry: () => {},
      setState: () => {},
      setDistrict: () => {},
      reset: () => {},
      options: { countries: [], states: [], districts: [] },
      effective: { country: null, state: null, district: null },
    } as Ctx;
  }
  return ctx;
};

/**
 * Applies the current effective scope to a Supabase query builder.
 * Usage:
 *   applyAdminScope(supabase.from("properties").select("*"), effective)
 */
export function applyAdminScope<T = any>(
  query: T,
  scope: AdminScopeSelection,
  cols: { country?: string; state?: string; district?: string } = {},
): T {
  let q: any = query;
  const cCol = cols.country ?? "country";
  const sCol = cols.state ?? "state";
  const dCol = cols.district ?? "district";
  if (scope.country) q = q.eq(cCol, scope.country);
  if (scope.state) q = q.eq(sCol, scope.state);
  if (scope.district) q = q.eq(dCol, scope.district);
  return q as T;
}
