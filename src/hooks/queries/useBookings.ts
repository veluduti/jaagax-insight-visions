import { useQuery } from "@tanstack/react-query";
import {
  listBuyerVisits,
  listAgentVisits,
  listHotelBookings,
  getBooking,
} from "@/services/bookingService";
import { queryKeys, STALE } from "./queryKeys";

export function useBuyerVisits(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.bookings.visits(userId as string),
    queryFn: () => listBuyerVisits(userId as string),
    enabled: !!userId,
    staleTime: STALE.SHORT,
  });
}

export function useAgentVisits(agentId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.bookings.agentVisits(agentId as string),
    queryFn: () => listAgentVisits(agentId as string),
    enabled: !!agentId,
    staleTime: STALE.SHORT,
  });
}

export function useHotelBookings(userId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.bookings.hotel(userId as string),
    queryFn: () => listHotelBookings(userId as string),
    enabled: !!userId,
    staleTime: STALE.SHORT,
  });
}

export function useBooking(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(id as string),
    queryFn: () => getBooking(id as string),
    enabled: !!id,
    staleTime: STALE.SHORT,
  });
}
