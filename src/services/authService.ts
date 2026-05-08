import { supabase } from "@/integrations/supabase/client";
import type { AppUserRole } from "@/lib/authRoleResolver";

/**
 * Auth service — wraps Supabase auth + the signup-otp edge function.
 * Hooks/components must not call supabase.auth.* directly going forward.
 */

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  return supabase.auth.getSession();
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export interface SignupInitParams {
  email: string;
  password: string;
  selectedRole: AppUserRole;
  selectedRoles?: AppUserRole[];
  city?: string | null;
  name?: string | null;
  phone?: string | null;
}

/** Trigger SMS-OTP signup via edge function. */
export async function initSignupOtp(params: SignupInitParams) {
  const roles = (params.selectedRoles?.length ? params.selectedRoles : [params.selectedRole]).filter(Boolean);
  return supabase.functions.invoke("signup-otp", {
    body: {
      action: "init",
      email: params.email,
      password: params.password,
      selectedRole: params.selectedRole,
      selectedRoles: roles,
      city: params.city ?? null,
      name: params.name ?? null,
      phone: params.phone ?? null,
    },
  });
}

export async function verifySignupOtp(email: string, otp: string) {
  return supabase.functions.invoke("signup-otp", {
    body: { action: "verify", email, otp },
  });
}

export async function resendSignupOtp(email: string) {
  return supabase.functions.invoke("signup-otp", {
    body: { action: "resend", email },
  });
}
