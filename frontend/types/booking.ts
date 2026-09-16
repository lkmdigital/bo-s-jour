export type BookingStatus = 'awaiting_host_confirmation' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'guarantee_paid' | 'cancelled';

export interface Booking {
  id: number;
  user_id: number;
  accommodation_id: number;
  room_id: number | null;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  deposit_amount: number;
  amount_paid: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  confirmation_code: string | null;
  checked_in_at: string | null;
  is_non_refundable: boolean;
  cancellation_policy_hours_snapshot: number | null;
  special_requests: string | null;
  deposit_paid_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  accommodation?: {
    id: number;
    name: string;
    city: string;
    address?: string;
    images?: Array<{ image_path: string; is_primary: boolean }>;
  };
  room?: {
    id: number;
    name: string;
    type: string;
    price_per_night: number;
  };
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  payment?: {
    id: number;
    status: string;
    amount: number;
    paid_at: string | null;
  };
}

export interface BookingHistory {
  id: number;
  booking_id: number;
  user_id: number | null;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  action: string;
  note: string | null;
  meta: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user?: { id: number; name: string };
}

export interface BookingFilters {
  status?: BookingStatus | 'all';
  payment_status?: string;
  period?: 'upcoming' | 'past' | 'all';
  search?: string;
  page?: number;
  per_page?: number;
}

export interface CalendarDay {
  date: string;
  status: 'available' | 'occupied' | 'blocked' | 'maintenance';
  price_override: number | null;
}

export interface CalendarData {
  room_id: number;
  base_price: number;
  calendar: CalendarDay[];
}

export interface BookingCreatePayload {
  accommodation_id: number;
  room_id?: number;
  check_in: string;
  check_out: string;
  guests: number;
  special_requests?: string;
  // Invité non connecté
  name?: string;
  email?: string;
  phone?: string;
}

// Labels et couleurs par statut
export const BOOKING_STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  awaiting_host_confirmation: {
    label: "En attente de confirmation de l'hôte",
    color: 'text-orange-800 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/20',
  },
  pending: {
    label: 'En attente',
    color: 'text-yellow-800 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
  },
  confirmed: {
    label: 'Confirmée',
    color: 'text-green-800 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/20',
  },
  cancelled: {
    label: 'Annulée',
    color: 'text-red-800 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/20',
  },
  completed: {
    label: 'Terminée',
    color: 'text-gray-800 dark:text-gray-300',
    bg: 'bg-gray-100 dark:bg-gray-800',
  },
};
