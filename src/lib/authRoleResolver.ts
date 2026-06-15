import { supabase } from "@/integrations/supabase/client";

export type AppUserRole = "buyer" | "seller" | "agent" | "builder" | "admin" | "customer" | "driver" | "hotel_manager" | "financial";

type SignupSnapshot = {
  status: string;
  requested_role: string | null;
};

export type AccessResolution = {
  approvalStatus: string | null;
  requestedRole: string | null;
  resolvedDbRole: string | null;
  resolvedRole: AppUserRole | null;
  hasAssignedRole: boolean;
};

const ROLE_PRIORITY = ["admin", "hotel_manager", "builder", "agent", "financial", "customer", "buyer", "driver"] as const;
const SELF_ASSIGNABLE_DB_ROLES = new Set(["customer", "agent", "builder", "financial"]);

export const mapDbRoleToAppRole = (dbRole: string, requestedRole?: string | null): AppUserRole => {
  if (dbRole === "customer") {
    if (requestedRole === "seller") return "seller";
    return "buyer";
  }
  return dbRole as AppUserRole;
};

export const normalizeDbRole = (role?: string | null) => {
  if (!role) return null;
  if (role === "buyer" || role === "seller") return "customer";
  return role;
};

const pickPreferredDbRole = (roles: Array<string | null | undefined>) => {
  const cleanRoles = roles.filter((role): role is string => Boolean(role));
  return ROLE_PRIORITY.find((role) => cleanRoles.includes(role)) ?? cleanRoles[0] ?? null;
};

const getSignupSnapshotByUserId = async (userId: string): Promise<SignupSnapshot | null> => {
  const { data, error } = await supabase
    .from("signup_requests")
    .select("status, requested_role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching signup request by user id:", error);
  }

  return data ?? null;
};

const getSignupSnapshotByEmail = async (email?: string | null): Promise<SignupSnapshot | null> => {
  if (!email) return null;

  const { data, error } = await supabase
    .from("signup_requests")
    .select("status, requested_role")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching signup request by email:", error);
  }

  return data ?? null;
};

export const resolveUserAccess = async (userId: string, email?: string | null): Promise<AccessResolution> => {
  const [{ data: roleRows, error: roleError }, signupByUserId, signupByEmail] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    getSignupSnapshotByUserId(userId),
    getSignupSnapshotByEmail(email),
  ]);

  if (roleError) {
    console.error("Error fetching user roles:", roleError);
  }

  const assignedRoles = (roleRows ?? []).map((row) => row.role);
  const assignedDbRole = pickPreferredDbRole(assignedRoles);
  const signupSnapshot = signupByUserId ?? signupByEmail;
  const requestedRole = signupSnapshot?.requested_role ?? null;
  const approvalStatus = signupSnapshot?.status ?? null;
  const fallbackDbRole = approvalStatus === "approved" ? normalizeDbRole(requestedRole) : null;
  const resolvedDbRole = assignedDbRole ?? fallbackDbRole;

  return {
    approvalStatus,
    requestedRole,
    resolvedDbRole,
    resolvedRole: resolvedDbRole ? mapDbRoleToAppRole(resolvedDbRole, requestedRole) : null,
    hasAssignedRole: Boolean(assignedDbRole),
  };
};

export const ensureApprovedRoleForUser = async (userId: string, requestedRole?: string | null) => {
  const dbRole = normalizeDbRole(requestedRole);

  if (!dbRole || !SELF_ASSIGNABLE_DB_ROLES.has(dbRole)) {
    return;
  }

  const { error } = await supabase.from("user_roles").insert({
    user_id: userId,
    role: dbRole,
  });

  if (error && error.code !== "23505" && !error.message?.toLowerCase().includes("duplicate")) {
    console.error("Error restoring approved user role:", error);
  }
};