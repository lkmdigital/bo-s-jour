'use client';

import DateRangeFilter from '@/components/common/DateRangeFilter';
import { FilterSelect } from '@/components/common/FilterBar';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/components/common/ConfirmContext';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Pagination from '@/components/common/Pagination';
import Link from 'next/link';
import {
  Calendar,
  Users,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  AlertCircle,
  Eye,
  Filter,
  CreditCard,
  Bed,
} from 'lucide-react';
import { formatPrice, getRoomCategoryLabel } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BookingRequest {
  id: number;
  booking_number?: string | null;
  confirmation_code?: string | null;
  assigned_room_number?: string | null;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  deposit_amount: number;
  amount_paid: number;
  status: 'awaiting_host_confirmation' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  expires_at?: string;
  deposit_paid_at?: string;
  created_at: string;
  payment_type?: 'full' | 'guarantee';
  accommodation: { id: number; name: string; city: string; establishment_code?: string | null };
  room?: { id: number; name: string; type?: string; room_category?: string } | null;
  user: { id: number; name: string; email: string; phone?: string };
  payment?: { id: number; status: string; amount: number; purpose?: string };
}

const STATUS_CONFIG = {
  awaiting_host_confirmation: { label: 'En attente de validation', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400', icon: AlertCircle },
  pending: { label: 'Validée · paiement en attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', icon: Clock },
  confirmed: { label: 'Confirmée', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: CheckCircle },
  in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', icon: Bed },
  finished: { label: 'Terminée', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: XCircle },
};

type StatusKey = keyof typeof STATUS_CONFIG;

// Statut affiché : "en cours" / "terminée" sont déduits des dates du séjour.
function displayStatus(b: { status: string; check_in: string; check_out: string }): StatusKey {
  const now = new Date();
  if (b.status === 'completed') return 'finished';
  if (b.status === 'confirmed') {
    if (new Date(b.check_out) <= now) return 'finished';
    if (new Date(b.check_in) <= now) return 'in_progress';
    return 'confirmed';
  }
  return (b.status in STATUS_CONFIG ? b.status : 'pending') as StatusKey;
}

const PAYMENT_CONFIG = {
  pending: { label: 'Non payé', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
  paid: { label: 'Payé', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  failed: { label: 'Échec', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  refunded: { label: 'Remboursé', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' },
};

export default function HostReservationsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | StatusKey>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, per_page: 10, current_page: 1, last_page: 1 });
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const confirmAction = useConfirm();

  useEffect(() => {
    if (isAuthenticated && user?.role === 'host') {
      fetchBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, statusFilter, paymentFilter, dateFrom, dateTo, currentPage]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('per_page', '10');
      params.append('page', currentPage.toString());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      // Retour client 2026-09-18 : ce filtre ne filtrait que la page déjà
      // paginée reçue (10 résultats), sous-comptant les réservations —
      // envoyé au backend désormais (BookingController::index le supporte
      // déjà) comme statusFilter juste au-dessus.
      if (paymentFilter !== 'all') params.append('payment_status', paymentFilter);
      if (dateFrom && dateTo) { params.append('from_date', dateFrom); params.append('to_date', dateTo); }

      const response = await api.get(`/bookings?${params.toString()}`);
      const bookingsData = response.data.data || response.data;

      if (response.data.data && Array.isArray(response.data.data)) {
        setPagination({
          total: response.data.total || 0,
          per_page: response.data.per_page || 10,
          current_page: response.data.current_page || 1,
          last_page: response.data.last_page || 1,
        });
      }

      setBookings(bookingsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des réservations');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, paymentFilter, dateFrom, dateTo]);

  // Retour client 2026-09-16 : "confirmation hôte avant paiement" — endpoints
  // dédiés approve()/refuse() au lieu du PUT générique (voir requests/page.tsx
  // pour le contexte complet de ce changement).
  const handleApprove = async (bookingId: number) => {
    const ok = await confirmAction({ title: 'Confirmer la disponibilité', message: 'Confirmer la disponibilité pour cette demande ? Le voyageur sera invité à payer.', confirmLabel: 'Confirmer', cancelLabel: 'Annuler' });
    if (!ok) return;

    setUpdatingId(bookingId);
    try {
      await api.post(`/bookings/${bookingId}/approve`);
      await fetchBookings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la confirmation');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRefuse = async (bookingId: number, reason?: string) => {
    const refuseReason = reason || prompt('Raison du refus (indisponibilité, etc.) :') || 'Indisponibilité';
    if (!refuseReason) return;
    const ok = await confirmAction({ title: 'Refuser la demande', message: `Refuser cette demande ?\nRaison : ${refuseReason}`, confirmLabel: 'Refuser', cancelLabel: 'Annuler', variant: 'danger' });
    if (!ok) return;

    setUpdatingId(bookingId);
    try {
      await api.post(`/bookings/${bookingId}/refuse`, { reason: refuseReason });
      await fetchBookings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du refus');
    } finally {
      setUpdatingId(null);
    }
  };

  const isExpired = (booking: BookingRequest) => {
    if (!booking.expires_at || booking.payment_status === 'paid') return false;
    return new Date(booking.expires_at) < new Date();
  };

  const pendingCount = bookings.filter((b) => b.status === 'awaiting_host_confirmation').length;
  const unpaidCount = bookings.filter((b) => b.status === 'pending' && b.payment_status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Réservations</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Gérez les demandes et suivez les paiements</p>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

      {pendingCount > 0 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
          <p className="text-yellow-800 dark:text-yellow-400 text-sm">
            Vous avez <strong>{pendingCount}</strong> demande(s) de réservation en attente
          </p>
        </div>
      )}
      {unpaidCount > 0 && (
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-orange-600 shrink-0" />
          <p className="text-orange-800 dark:text-orange-400 text-sm">
            <strong>{unpaidCount}</strong> réservation(s) en attente de paiement
          </p>
        </div>
      )}

      {/* Filtres — style de référence client (2026-09-18) */}
      <DateRangeFilter
        from={dateFrom}
        to={dateTo}
        onRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
        label="Dates de séjour (arrivée)"
        onReset={() => { setStatusFilter('all'); setPaymentFilter('all'); setDateFrom(''); setDateTo(''); }}
      >
        <FilterSelect value={statusFilter} onChange={(v) => setStatusFilter(v as typeof statusFilter)} ariaLabel="Statut">
          <option value="all">Tous les statuts</option>
          {(['awaiting_host_confirmation', 'pending', 'confirmed', 'in_progress', 'finished', 'cancelled'] as const).map((status) => (
            <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={paymentFilter} onChange={(v) => setPaymentFilter(v as typeof paymentFilter)} ariaLabel="Paiement">
          <option value="all">Tous les paiements</option>
          {(['pending', 'paid', 'failed'] as const).map((payment) => (
            <option key={payment} value={payment}>{PAYMENT_CONFIG[payment].label}</option>
          ))}
        </FilterSelect>
      </DateRangeFilter>

      {loading ? (
        <div className="py-16">
          <LoadingSpinner />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-12 text-center">
          <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            Aucune réservation {statusFilter !== 'all' ? `avec le statut "${STATUS_CONFIG[statusFilter].label}"` : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const statusConfig = STATUS_CONFIG[displayStatus(booking)];
            const StatusIcon = statusConfig.icon;
            const paymentConfig = PAYMENT_CONFIG[booking.payment_status] ?? PAYMENT_CONFIG.pending;
            const nights = differenceInDays(new Date(booking.check_out), new Date(booking.check_in));
            const expired = isExpired(booking);

            return (
              <div
                key={booking.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border p-5 ${
                  expired && (booking.status === 'pending' || booking.status === 'awaiting_host_confirmation') ? 'border-red-300 dark:border-red-700' : 'border-gray-100 dark:border-gray-700'
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{booking.accommodation.name}</h3>
                        <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 text-sm mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {booking.accommodation.city}
                        </p>
                        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-mono text-gray-500 dark:text-gray-400">
                          <span>Réservation : <strong className="text-gray-700 dark:text-gray-200">{booking.booking_number || `#${booking.id}`}</strong></span>
                          {booking.confirmation_code && <span>Code boséjour : <strong className="text-gray-700 dark:text-gray-200">{booking.confirmation_code}</strong></span>}
                          {booking.accommodation.establishment_code && <span>ID : <strong className="text-gray-700 dark:text-gray-200">{booking.accommodation.establishment_code}</strong></span>}
                          {(booking.room || booking.assigned_room_number) && (
                            <span>Chambre : <strong className="text-gray-700 dark:text-gray-200">{booking.assigned_room_number || booking.room?.name}</strong></span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${paymentConfig.color}`}>{paymentConfig.label}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400 dark:text-gray-500 mb-1">Dates</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(booking.check_in), 'dd MMM', { locale: fr })} → {format(new Date(booking.check_out), 'dd MMM yyyy', { locale: fr })}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{nights} nuit{nights > 1 ? 's' : ''}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 dark:text-gray-500 mb-1">Voyageurs</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {booking.guests} {booking.guests > 1 ? 'personnes' : 'personne'}
                        </p>
                      </div>
                      {booking.room && (
                        <div>
                          <p className="text-gray-400 dark:text-gray-500 mb-1">Chambre</p>
                          <p className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                            <Bed className="w-3.5 h-3.5" />
                            {booking.room.name}
                          </p>
                          {(booking.room.room_category || booking.room.type) && (
                            <p className="text-xs text-gray-400 mt-1">{getRoomCategoryLabel(booking.room.room_category || booking.room.type)}</p>
                          )}
                        </div>
                      )}
                      <div>
                        <p className="text-gray-400 dark:text-gray-500 mb-1">Client</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{booking.user.name}</p>
                        <p className="text-xs text-gray-400">{booking.user.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 dark:text-gray-500 mb-1">Créée le</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200 text-xs">
                          {format(new Date(booking.created_at), 'dd MMM yyyy', { locale: fr })}
                        </p>
                        {booking.expires_at && booking.payment_status !== 'paid' && (
                          <p className={`text-xs mt-1 ${expired ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                            {expired ? 'Expirée' : `Expire le ${format(new Date(booking.expires_at), 'dd MMM yyyy', { locale: fr })}`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-bosejour-red" />
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Prix de la chambre</h4>
                      </div>
                      <p className="font-bold text-bosejour-red">{formatPrice(booking.total_price)} FCFA</p>
                    </div>
                  </div>

                  <div className="lg:col-span-1 flex flex-col gap-2 justify-center">
                    <Link
                      href={`/dashboard/host/bookings/${booking.id}`}
                      className="w-full text-center inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Eye className="w-4 h-4" />
                      Voir les détails
                    </Link>

                    {booking.status === 'awaiting_host_confirmation' && !expired && (
                      <>
                        <button
                          onClick={() => handleApprove(booking.id)}
                          disabled={updatingId === booking.id}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-bosejour-red text-white font-medium text-sm hover:opacity-90 disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {updatingId === booking.id ? 'Traitement...' : 'Confirmer la disponibilité'}
                        </button>
                        <button
                          onClick={() => handleRefuse(booking.id, 'Indisponibilité')}
                          disabled={updatingId === booking.id}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          {updatingId === booking.id ? 'Traitement...' : 'Refuser'}
                        </button>
                      </>
                    )}

                    {expired && booking.status === 'awaiting_host_confirmation' && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-xs text-red-800 dark:text-red-400">Demande expirée (aucune réponse dans le délai imparti)</p>
                      </div>
                    )}

                    {booking.status === 'pending' && (
                      <div className={`p-3 rounded-lg border ${expired ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'}`}>
                        <p className={`text-xs font-medium ${expired ? 'text-red-800 dark:text-red-400' : 'text-yellow-800 dark:text-yellow-400'}`}>Disponibilité confirmée</p>
                        <p className={`text-xs mt-1 ${expired ? 'text-red-700 dark:text-red-500' : 'text-yellow-700 dark:text-yellow-500'}`}>
                          {expired ? "Expirée : paiement non effectué dans le délai imparti." : 'En attente du paiement du voyageur.'}
                        </p>
                      </div>
                    )}

                    {booking.status === 'confirmed' && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-xs text-green-800 dark:text-green-400 font-medium">Réservation confirmée</p>
                        <p className={`text-xs mt-1 ${booking.payment_status === 'paid' ? 'text-green-700 dark:text-green-500' : 'text-orange-700 dark:text-orange-500'}`}>
                          {booking.payment_status === 'paid' ? 'Paiement complet reçu' : 'En attente de paiement complet'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <Pagination
            currentPage={pagination.current_page}
            totalPages={pagination.last_page}
            onPageChange={handlePageChange}
            totalItems={pagination.total}
            itemsPerPage={pagination.per_page}
          />
        </div>
      )}
    </div>
  );
}
