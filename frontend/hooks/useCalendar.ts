import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, addMonths, format } from 'date-fns';
import api from '@/lib/api';
import type { CalendarData } from '@/types/booking';

export const calendarKeys = {
  all: ['calendar'] as const,
  room: (roomId: number, month: string) => ['calendar', 'room', roomId, month] as const,
};

export function useRoomCalendar(roomId: number | null, month: Date) {
  const monthStr = format(month, 'yyyy-MM');
  const start = format(startOfMonth(month), 'yyyy-MM-dd');
  const end = format(endOfMonth(addMonths(month, 1)), 'yyyy-MM-dd');

  return useQuery({
    queryKey: calendarKeys.room(roomId!, monthStr),
    queryFn: async (): Promise<CalendarData> => {
      const { data } = await api.get(`/rooms/${roomId}/calendar`, {
        params: { start, end },
      });
      return data;
    },
    enabled: !!roomId,
    staleTime: 2 * 60_000,
  });
}

/**
 * Vérification rapide de disponibilité avant d'ouvrir le formulaire.
 * Retourne true si les dates sont disponibles, false sinon.
 */
export function useCheckAvailability(
  roomId: number | null,
  checkIn: string | null,
  checkOut: string | null
) {
  return useQuery({
    queryKey: ['availability-check', roomId, checkIn, checkOut],
    queryFn: async (): Promise<{ available: boolean; message?: string }> => {
      const { data } = await api.post(`/rooms/${roomId}/check-availability`, {
        check_in: checkIn,
        check_out: checkOut,
      });
      return data;
    },
    enabled: !!(roomId && checkIn && checkOut),
    staleTime: 10_000,
    retry: false,
  });
}

/** Nuits déjà prises d'un établissement (YYYY-MM-DD), pour griser le calendrier de réservation. */
export function useUnavailableDates(accommodationId: number | undefined, roomId?: number): string[] {
  const { data } = useQuery({
    queryKey: ['unavailable-dates', accommodationId, roomId ?? null],
    queryFn: async (): Promise<string[]> => {
      const { data } = await api.get(`/accommodations/${accommodationId}/unavailable-dates`, {
        params: roomId ? { room_id: roomId } : undefined,
      });
      return data?.dates ?? [];
    },
    enabled: !!accommodationId,
    staleTime: 60_000,
  });
  return data ?? [];
}
