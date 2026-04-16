import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export type UserRole = "buyer" | "agent" | "builder" | "admin" | "customer" | "driver" | "hotel_manager";

const mapDbRoleToAppRole = (dbRole: string): UserRole => {
  if (dbRole === "customer") return "buyer";
  return dbRole as UserRole;
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => { fetchUserRole(session.user.id); }, 0);
        } else {
          setRole(null);
          setApprovalStatus(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (roleError) {
        console.error("Error fetching user role:", roleError);
      }

      // Fetch approval status
      const { data: signupData } = await supabase
        .from("signup_requests")
        .select("status, requested_role")
        .eq("user_id", userId)
        .maybeSingle();

      if (signupData) {
        setApprovalStatus(signupData.status);
      }

      if (roleData) {
        setRole(mapDbRoleToAppRole(roleData.role));
      } else {
        // No role assigned yet - user is pending approval
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

    // Check approval status for non-buyer roles
    if (data.user) {
      const { data: signupData } = await supabase
        .from("signup_requests")
        .select("status, requested_role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (signupData && signupData.requested_role !== 'customer') {
        if (signupData.status === 'pending') {
          await supabase.auth.signOut();
          return { error: { message: "Your account is pending admin approval. Please wait for approval before signing in." } as any };
        }
        if (signupData.status === 'rejected') {
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
      const dbRole = selectedRole === "buyer" ? "customer" : selectedRole;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { role: dbRole, city: city || null, name: name || null, phone: phone || null },
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

        // Submit signup request for all roles
        const { error: reqError } = await supabase.rpc("submit_signup_request", {
          _user_id: data.user.id,
          _email: email,
          _full_name: name || null,
          _city: city || null,
          _requested_role: dbRole,
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

  const redirectToDashboard = () => {
    if (!role) return;
    switch (role) {
      case "buyer":
      case "customer":
        navigate("/dashboard/buyer");
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
  };

  return { user, session, role, loading, approvalStatus, signIn, signUp, signOut, redirectToDashboard };
};
