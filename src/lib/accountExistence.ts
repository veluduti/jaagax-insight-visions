import { supabase } from "@/integrations/supabase/client";

/**
 * Detects whether an authenticated user already has an account footprint
 * (profiles / roles) on the platform. Used to stop Google "sign up" flows
 * from creating a second account for an identity that is already registered.
 */
export type ExistingAccount = {
  exists: boolean;
  roles: string[];
  profileTypes: string[];
};

export const getExistingAccount = async (userId: string): Promise<ExistingAccount> => {
  const [{ data: roleRows }, { data: profileRows }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    (supabase as any).from("profiles").select("type").eq("user_id", userId),
  ]);

  const roles = ((roleRows ?? []) as Array<{ role: string }>).map((r) => r.role);
  const profileTypes = ((profileRows ?? []) as Array<{ type: string }>).map((p) => p.type).filter(Boolean);

  return {
    exists: roles.length > 0 || profileTypes.length > 0,
    roles,
    profileTypes,
  };
};

export const isGoogleIdentity = (user: any) =>
  user?.app_metadata?.provider === "google" ||
  (user?.identities ?? []).some((i: any) => i.provider === "google");

export const GOOGLE_ALREADY_REGISTERED_MESSAGE =
  "This Google account is already registered. Please sign in instead.";
