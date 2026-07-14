import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Shield, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type AdminRole = "global_admin" | "country_admin" | "state_admin" | "district_admin";

interface Scope {
  id: string;
  user_id: string;
  role: AdminRole;
  country: string | null;
  state: string | null;
  district: string | null;
  is_active: boolean;
  created_at: string;
}

const ROLE_LABEL: Record<AdminRole, string> = {
  global_admin: "Global Admin",
  country_admin: "Country Admin",
  state_admin: "State Admin",
  district_admin: "District Admin",
};

const CHILD_ROLE: Record<AdminRole, AdminRole | null> = {
  global_admin: "country_admin",
  country_admin: "state_admin",
  state_admin: "district_admin",
  district_admin: null,
};

export default function AdminHierarchyPanel() {
  const { user } = useAuth();
  const [myScope, setMyScope] = useState<Scope | null>(null);
  const [isGlobalFallback, setIsGlobalFallback] = useState(false);
  const [downstream, setDownstream] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    country: "",
    state: "",
    district: "",
    isActive: true,
  });

  const effectiveRole: AdminRole | null = myScope?.role ?? (isGlobalFallback ? "global_admin" : null);
  const targetRole = effectiveRole ? CHILD_ROLE[effectiveRole] : null;

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: scopes }, { data: globalRow }, { data: created }] = await Promise.all([
      supabase.from("admin_scopes" as any).select("*").eq("user_id", user.id).eq("is_active", true),
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
      supabase.from("admin_scopes" as any).select("*").eq("created_by", user.id).order("created_at", { ascending: false }),
    ]);

    const list = ((scopes ?? []) as Scope[]);
    const order: AdminRole[] = ["global_admin", "country_admin", "state_admin", "district_admin"];
    list.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
    setMyScope(list[0] ?? null);
    setIsGlobalFallback(!!globalRow && !list.find((s) => s.role === "global_admin"));
    setDownstream((created ?? []) as Scope[]);
    setLoading(false);
  };

  useEffect(() => { void loadAll(); }, [user?.id]);

  // Prefill inherited scope
  useEffect(() => {
    if (!myScope) return;
    setForm((f) => ({
      ...f,
      country: myScope.country ?? f.country,
      state: myScope.state ?? f.state,
    }));
  }, [myScope?.id]);

  const requiredFields = useMemo(() => {
    if (targetRole === "country_admin") return ["country"];
    if (targetRole === "state_admin") return ["country", "state"];
    if (targetRole === "district_admin") return ["country", "state", "district"];
    return [];
  }, [targetRole]);

  const canCreate = !!targetRole;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRole) return;
    if (!form.fullName || !form.email || !form.password) {
      toast({ title: "Missing details", description: "Full name, email and password are required.", variant: "destructive" });
      return;
    }
    for (const f of requiredFields) {
      if (!(form as any)[f]) {
        toast({ title: `Missing ${f}`, variant: "destructive" });
        return;
      }
    }
    setSubmitting(true);
    let errMsg: string | null = null;
    try {
      const { data, error } = await supabase.functions.invoke("create-sub-admin", {
        body: {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          country: form.country || null,
          state: form.state || null,
          district: form.district || null,
          isActive: form.isActive,
        },
      });
      if (error) {
        // Try to read the JSON error body from the FunctionsHttpError context
        try {
          const body = await (error as any).context?.json?.();
          errMsg = body?.error ?? error.message;
        } catch {
          errMsg = error.message;
        }
      } else if ((data as any)?.error) {
        errMsg = (data as any).error;
      }
    } catch (e: any) {
      errMsg = e?.message ?? "Request failed";
    }
    setSubmitting(false);

    if (errMsg) {
      toast({ title: "Failed to create admin", description: errMsg, variant: "destructive" });
      return;
    }
    toast({ title: `${ROLE_LABEL[targetRole]} created` });
    setForm((f) => ({ ...f, fullName: "", email: "", phone: "", password: "", district: "" }));
    void loadAll();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!effectiveRole) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          You don't have an admin scope assigned yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Your Admin Scope
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge>{ROLE_LABEL[effectiveRole]}</Badge>
            {myScope?.country && <Badge variant="secondary">Country: {myScope.country}</Badge>}
            {myScope?.state && <Badge variant="secondary">State: {myScope.state}</Badge>}
            {myScope?.district && <Badge variant="secondary">District: {myScope.district}</Badge>}
            {effectiveRole === "global_admin" && <Badge variant="secondary">Full access</Badge>}
          </div>
        </CardContent>
      </Card>

      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Create {ROLE_LABEL[targetRole!]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>

              {requiredFields.includes("country") && (
                <div>
                  <Label>Country</Label>
                  <Input
                    value={form.country}
                    disabled={effectiveRole !== "global_admin"}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                  />
                </div>
              )}
              {requiredFields.includes("state") && (
                <div>
                  <Label>State</Label>
                  <Input
                    value={form.state}
                    disabled={effectiveRole === "state_admin"}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  />
                </div>
              )}
              {requiredFields.includes("district") && (
                <div>
                  <Label>District</Label>
                  <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <Label>Active</Label>
              </div>

              <div className="md:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create {ROLE_LABEL[targetRole!]}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Admins you created</CardTitle>
        </CardHeader>
        <CardContent>
          {downstream.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sub-admins created yet.</p>
          ) : (
            <div className="space-y-2">
              {downstream.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
                  <Badge>{ROLE_LABEL[s.role]}</Badge>
                  {s.country && <Badge variant="secondary">{s.country}</Badge>}
                  {s.state && <Badge variant="secondary">{s.state}</Badge>}
                  {s.district && <Badge variant="secondary">{s.district}</Badge>}
                  <Badge variant={s.is_active ? "default" : "outline"}>
                    {s.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
