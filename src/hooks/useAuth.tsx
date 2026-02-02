import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export type UserRole = "buyer" | "agent" | "builder" | "admin" | "customer" | "driver";

// Map database roles to app roles
const mapDbRoleToAppRole = (dbRole: string): UserRole => {
  if (dbRole === "customer") return "buyer";
  return dbRole as UserRole;
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setRole(null);
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
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        setRole("buyer");
      } else if (data) {
        setRole(mapDbRoleToAppRole(data.role));
      } else {
        console.log("No role found, defaulting to buyer");
        setRole("buyer");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setRole("buyer");
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, selectedRole: UserRole, city?: string, name?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Map app role to database role
      const dbRole = selectedRole === "buyer" ? "customer" : selectedRole;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: dbRole,
            city: city || null,
            name: name || null,
          }
        },
      });

      if (error) {
        console.error("Signup error:", error);
        return { error };
      }
      
      if (data.user) {
        console.log("Creating user role for:", data.user.id, dbRole);
        
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert([{
            user_id: data.user.id,
            role: dbRole as "admin" | "agent" | "builder" | "customer" | "driver",
          }]);

        if (roleError) {
          console.error("Error inserting role:", roleError);
          return { error: roleError };
        }

        console.log("User role created successfully");
        setRole(selectedRole);
        
        setTimeout(() => {
          fetchUserRole(data.user.id);
        }, 500);
      }

      return { error: null };
    } catch (error: any) {
      console.error("Signup exception:", error);
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setRole(null);
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
      default:
        navigate("/");
    }
  };

  return {
    user,
    session,
    role,
    loading,
    signIn,
    signUp,
    signOut,
    redirectToDashboard,
  };
};