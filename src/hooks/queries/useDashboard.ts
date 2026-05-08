import { useQuery } from "@tanstack/react-query";
import {
  getBuyerDashboardSummary,
  getAgentDashboardSummary,
  getBuilderDashboardSummary,
} from "@/services/dashboardService";
import { queryKeys, STALE } from "./queryKeys";

export function useBuyerDashboard(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.dashboard.buyer(userId as string),
    queryFn: () => getBuyerDashboardSummary(userId as string),
    enabled: !!userId,
    staleTime: STALE.MEDIUM,
  });
}

export function useAgentDashboard(agentId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.dashboard.agent(agentId as string),
    queryFn: () => getAgentDashboardSummary(agentId as string),
    enabled: !!agentId,
    staleTime: STALE.MEDIUM,
  });
}

export function useBuilderDashboard(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.dashboard.builder(userId as string),
    queryFn: () => getBuilderDashboardSummary(userId as string),
    enabled: !!userId,
    staleTime: STALE.MEDIUM,
  });
}
