import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/services/notificationService";
import { queryKeys, STALE } from "./queryKeys";

export const notificationKeys = {
  list: queryKeys.notifications.list,
};

export function useNotifications(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.notifications.list(userId),
    queryFn: () => listNotifications(userId as string),
    enabled: !!userId,
    staleTime: STALE.INSTANT,
  });
}

export function useMarkNotificationRead(userId: string | null | undefined) {
  const qc = useQueryClient();
  const key = queryKeys.notifications.list(userId);
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<any[]>(key) ?? [];
      qc.setQueryData(key, prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useMarkAllNotificationsRead(userId: string | null | undefined) {
  const qc = useQueryClient();
  const key = queryKeys.notifications.list(userId);
  return useMutation({
    mutationFn: () => markAllNotificationsRead(userId as string),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<any[]>(key) ?? [];
      qc.setQueryData(key, prev.map((n) => ({ ...n, read: true })));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
