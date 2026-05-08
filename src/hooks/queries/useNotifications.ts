import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/services/notificationService";

export const notificationKeys = {
  list: (userId: string | null | undefined) => ["notifications", userId ?? "anon"] as const,
};

export function useNotifications(userId: string | null | undefined) {
  return useQuery({
    queryKey: notificationKeys.list(userId),
    queryFn: () => listNotifications(userId as string),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead(userId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.list(userId) }),
  });
}

export function useMarkAllNotificationsRead(userId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(userId as string),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.list(userId) }),
  });
}
