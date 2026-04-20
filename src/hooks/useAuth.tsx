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

      if (access.resolvedRole) {
        setRole(access.resolvedRole);
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };

    if (data.user) {
      const access = await resolveUserAccess(data.user.id, data.user.email);

      if (access.approvalStatus === "approved" && !access.hasAssignedRole && access.requestedRole) {
        await ensureApprovedRoleForUser(data.user.id, access.requestedRole);
      }

      const requestedDbRole = normalizeDbRole(access.requestedRole);

      if (access.approvalStatus && requestedDbRole !== "customer") {
        if (access.approvalStatus === "pending") {
          await supabase.auth.signOut();
          return { error: { message: "Your account is pending admin approval. Please wait for approval before signing in." } as any };
        }
        if (access.approvalStatus === "rejected") {
          await supabase.auth.signOut();
          return { error: { message: "Your account registration was rejected. Please contact support." } as any };
        }
      }
    }

    return { error: null };
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

        // Submit signup request for all roles (store seller as 'seller' in requested_role for routing)
        const requestedRoleForRecord = selectedRole === "seller" ? "seller" : dbRole;
        const { error: reqError } = await supabase.rpc("submit_signup_request", {
          _user_id: data.user.id,
          _email: email,
          _full_name: name || null,
          _city: city || null,
          _requested_role: requestedRoleForRecord,
        });
        if (reqError) console.error("Error submitting signup request:", reqError);

        // Store phone in signup_requests if provided
        if (phone) {
          await supabase
            .from('signup_requests')
            .update({ phone })
            .eq('user_id', data.user.id);
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
