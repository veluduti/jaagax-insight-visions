import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Permissions } from "@/config/staffRoles";

/** Owner gets full access; an employee gets the permissions saved on their record for this property. */
export function useStaffAccess(hotelId: string | null | undefined, userId: string | null | undefined, managerId?: string | null) {
  const isOwner = !!userId && !!managerId && userId === managerId;
  const q = useQuery({
    queryKey: ["staff-access", hotelId, userId], enabled: !!hotelId && !!userId && !isOwner && managerId !== undefined,
    queryFn: async () => (await (supabase as any).from("hotel_employees").select("id,full_name,permissions,roles,status,must_change_password").eq("hotel_id", hotelId).eq("user_id", userId).in("status", ["active", "on_notice"]).maybeSingle()).data,
  });
  return { isOwner, loading: !isOwner && q.isLoading, employee: q.data ?? null, permissions: (q.data?.permissions ?? {}) as Permissions };
}
