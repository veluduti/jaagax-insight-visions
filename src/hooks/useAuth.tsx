import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ensureApprovedRoleForUser, normalizeDbRole, resolveUserAccess, type AppUserRole } from "@/lib/authRoleResolver";

export type UserRole = AppUserRole;

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleSession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setLoading(true);
        setTimeout(() => {
          void fetchUserRole(nextSession.user.id, nextSession.user.email);
        }, 0);
      } else {
        setRole(null);
        setApprovalStatus(null);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        handleSession(nextSession);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string, email?: string | null) => {
    try {
      const access = await resolveUserAccess(userId, email);

      setApprovalStatus(access.approvalStatus);

      if (access.approvalStatus === "approved" && !access.hasAssignedRole && access.requestedRole) {
        await ensureApprovedRoleForUser(userId, access.requestedRole);
      }

      // Multi-profile bridge: if user has profiles, prefer the active profile's type for legacy `role`.
      let resolvedRole: UserRole | null = access.resolvedRole;
      try {
        const { data: profileRows } = await supabase
          .from("profiles" as any)
          .select("id, type, status")
          .eq("user_id", userId);
        const list = (profileRows ?? []) as Array<{ id: string; type: UserRole; status: string }>;
        if (list.length > 0) {
          const storedId = typeof window !== "undefined" ? localStorage.getItem("jaagax.activeProfileId") : null;
          const stored = storedId ? list.find((p) => p.id === storedId && p.status === "active") : null;
          const fallback = list.find((p) => p.status === "active") ?? list[0];
          const active = stored ?? fallback;
          if (active) resolvedRole = active.type as UserRole;
        }
      } catch (e) {
        // Profiles table may not exist yet for some users — fall back silently.
      }

      setRole(resolvedRole ?? null);
    } catch (error) {
      console.error("Error fetching user role:", error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error, resolvedRole: null as UserRole | null };

    if (data.user) {
      const access = await resolveUserAccess(data.user.id, data.user.email);

      if (access.approvalStatus === "approved" && !access.hasAssignedRole && access.requestedRole) {
        await ensureApprovedRoleForUser(data.user.id, access.requestedRole);
      }

      const requestedDbRole = normalizeDbRole(access.requestedRole);
      void requestedDbRole; // approval gates removed — anyone verified can sign in.

      return { error: null, resolvedRole: access.resolvedRole };
    }

    return { error: null, resolvedRole: null };
  };

  const signUp = async (email: string, password: string, selectedRole: UserRole, city?: string, name?: string, phone?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const dbRole = (selectedRole === "buyer" || selectedRole === "seller") ? "customer" : selectedRole;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { role: dbRole, requested_role: selectedRole, city: city || null, name: name || null, phone: phone || null },
        },
      });

      if (error) return { error };

      if (data.user) {
        // Buyers get role immediately
        if (dbRole === 'customer') {
          const { error: roleError } = await supabase.rpc("assign_user_role", {
            _user_id: data.user.id,
            _role: dbRole,
          });
          if (roleError) console.error("Error inserting role:", roleError);
        }

        // Submit signup request (RPC only accepts customer/agent/builder)
        const { error: reqError } = await supabase.rpc("submit_signup_request", {
          _user_id: data.user.id,
          _email: email,
          _full_name: name || null,
          _city: city || null,
          _requested_role: dbRole,
        });
        if (reqError) console.error("Error submitting signup request:", reqError);

        // Overwrite requested_role to 'seller' for routing if applicable + store phone in same update
        const updates: Record<string, any> = {};
        if (selectedRole === "seller") updates.requested_role = "seller";
        if (phone) updates.phone = phone;

        if (Object.keys(updates).length > 0) {
          const { error: updErr } = await supabase
            .from('signup_requests')
            .update(updates)
            .eq('user_id', data.user.id);
          if (updErr) console.error("Error updating signup_requests:", updErr);
        }
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setRole(null);
      setApprovalStatus(null);
      navigate("/auth");
    }
    return { error };
  };

  const redirectToDashboard = useCallback(() => {
    if (!role) return;
    switch (role) {
      case "buyer":
      case "customer":
        navigate("/dashboard/buyer");
        break;
      case "seller":
        navigate("/dashboard/seller");
        break;
      case "agent":
        navigate("/dashboard/agent");
        break;
      case "builder":
        navigate("/dashboard/builder");
        break;
      case "admin":
        navigate("/dashboard/admin");
        break;
      case "hotel_manager":
        navigate("/dashboard/hotel-manager");
        break;
      default:
        navigate("/");
    }
  }, [navigate, role]);

  return { user, session, role, loading, approvalStatus, signIn, signUp, signOut, redirectToDashboard };
};
