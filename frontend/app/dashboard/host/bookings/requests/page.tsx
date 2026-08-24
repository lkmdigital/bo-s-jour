'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  ArrowLeft,
  Filter,
  CreditCard
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BookingRequest {
  id: number;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  deposit_amount: number;
  amount_paid: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  expires_at?: string;
  deposit_paid_at?: string;
  created_at: string;
  accommodation: {
    id: number;
    name: string;
    city: string;
    images?: Array<{ url: string }>;
  };
  room?: { id: number; name: string | null };
  user: { id: number; name: string; email: string; phone?: string };
  payment?: {
    id: number;
    status: string;
    amount: number;
    purpose?: string;
  };
}

export default function BookingRequestsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    per_page: 10,
    current_page: 1,
    last_page: 1,
  });
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const confirmAction = useConfirm();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'host')) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'host') {
      fetchBookings();
    }
  }, [isAuthenticated, user, statusFilter, paymentFilter, currentPage]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('per_page', '10');
      params.append('page', currentPage.toString());
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await api.get(`/bookings?${params.toString()}`);
      let bookingsData = response.data.data || response.data;
      
      // Gérer la pagination
      if (response.data.data && Array.isArray(response.data.data)) {
        setPagination({
          total: response.data.total || 0,
          per_page: response.data.per_page || 10,
          current_page: response.data.current_page || 1,
          last_page: response.data.last_page || 1,
        });
      }
      
      // Filtrer par statut de paiement côté client
      if (paymentFilter !== 'all') {
        bookingsData = bookingsData.filter((b: BookingRequest) => b.payment_status === paymentFilter);
        // Ajuster le total après filtrage client
        setPagination(prev => ({
          ...prev,
          total: bookingsData.length,
          last_page: Math.ceil(bookingsData.length / 10),
        }));
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

  // Réinitialiser à la page 1 quand les filtres changent
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [statusFilter, paymentFilter]);

  const handleStatusChange = async (bookingId: number, newStatus: 'confirmed' | 'cancelled', reason?: string) => {
    if (newStatus === 'confirmed') {
      const ok = await confirmAction({
        title: 'Confirmer la réservation',
        message: 'Confirmer cette réservation ?',
        confirmLabel: 'Confirmer',
        cancelLabel: 'Annuler',
      });
      if (!ok) return;
    }
    if (newStatus === 'cancelled') {
      const cancelReason = reason || prompt('Raison du refus (indisponibilité, etc.) :') || 'Indisponibilité';
      if (!cancelReason) return;

      const ok = await confirmAction({
        title: 'Refuser la réservation',
        message: `Refuser cette réservation ?\nRaison : ${cancelReason}`,
        confirmLabel: 'Refuser',
        cancelLabel: 'Annuler',
        variant: 'danger',
      });
      if (!ok) return;
    }

    setUpdatingId(bookingId);
    try {
      await api.put(`/bookings/${bookingId}`, {
        status: newStatus,
        cancellation_reason: newStatus === 'cancelled' ? reason : undefined
      });
      await fetchBookings();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: {
        label: 'En attente',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
        icon: Clock,
      },
      confirmed: {
        label: 'Confirmée',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
        icon: CheckCircle,
      },
      cancelled: {
        label: 'Annulée',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
        icon: XCircle,
      },
    };
    return configs[status as keyof typeof configs] || { ...configs.pending, label: status };
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const configs = {
      pending: {
        label: 'Non payé',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      },
      paid: {
        label: 'Payé',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      },
      failed: {
        label: 'Échec',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      },
      refunded: {
        label: 'Remboursé',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      },
    };
    return configs[paymentStatus as keyof typeof configs] || configs.pending;
  };

  const isExpired = (booking: BookingRequest) => {
    if (!booking.expires_at || booking.payment_status === 'paid') return false;
    return new Date(booking.expires_at) < new Date();
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'host') {
    return null;
  }

  const filteredBookings = bookings;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const unpaidCount = bookings.filter(b => b.payment_status === 'pending' && b.status !== 'cancelled').length;

  return (
    <div className="min-h-screen">
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <Link 
            href="/dashboard/host"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour au tableau de bord
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-primary mb-2">Demandes de réservation</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gérez les demandes de réservation et suivez les paiements
              </p>
            </div>
            <Link
              href="/dashboard/host/bookings"
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Vue calendrier
            </Link>
          </div>
        </div>

        {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

        {/* Alertes */}
        {pendingCount > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-yellow-800 dark:text-yellow-400">
              Vous avez <strong>{pendingCount}</strong> demande(s) de réservation en attente
            </p>
          </div>
        )}

        {unpaidCount > 0 && (
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <p className="text-orange-800 dark:text-orange-400">
              <strong>{unpaidCount}</strong> réservation(s) en attente de paiement
            </p>
          </div>
        )}

        {/* Filtres */}
        <div className="card mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-medium">Filtres :</span>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {status === 'all' ? 'Tous' : getStatusBadge(status).label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap sm:ml-auto">
              {(['all', 'pending', 'paid', 'failed'] as const).map((payment) => (
                <button
                  key={payment}
                  onClick={() => setPaymentFilter(payment)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    paymentFilter === payment
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  {payment === 'all' ? 'Tous' : getPaymentStatusBadge(payment).label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Liste des réservations */}
        {filteredBookings.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Aucune réservation {statusFilter !== 'all' ? `avec le statut "${getStatusBadge(statusFilter).label}"` : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const StatusConfig = getStatusBadge(booking.status);
              const StatusIcon = StatusConfig?.icon || Clock;
              const PaymentConfig = getPaymentStatusBadge(booking.payment_status);
              const nights = differenceInDays(new Date(booking.check_out), new Date(booking.check_in));
              const expired = isExpired(booking);
              const remainingBalance = booking.total_price - (booking.amount_paid || 0);
              const depositPaid = (booking.amount_paid || 0) >= (booking.deposit_amount || 0);

              return (
                <div
                  key={booking.id}
                  className={`card ${expired && booking.status === 'pending' ? 'border-red-300 dark:border-red-700' : ''}`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Informations principales */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <h3 className="text-xl font-bold mb-1">{booking.accommodation.name}</h3>
                          <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {booking.accommodation.city}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${StatusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {StatusConfig.label}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${PaymentConfig.color}`}>
                            {PaymentConfig.label}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400 mb-1">Dates</p>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(booking.check_in), 'dd MMM yyyy', { locale: fr })} → {format(new Date(booking.check_out), 'dd MMM yyyy', { locale: fr })}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {nights} nuit{nights > 1 ? 's' : ''}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-600 dark:text-gray-400 mb-1">Voyageurs</p>
                          <p className="font-medium flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {booking.guests} {booking.guests > 1 ? 'personnes' : 'personne'}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-600 dark:text-gray-400 mb-1">Client</p>
                          <p className="font-medium">{booking.user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">{booking.user.email}</p>
                        </div>

                        <div>
                          <p className="text-gray-600 dark:text-gray-400 mb-1">Créée le</p>
                          <p className="font-medium text-xs">
                            {format(new Date(booking.created_at), 'dd MMM yyyy', { locale: fr })}
                          </p>
                          {booking.expires_at && booking.payment_status !== 'paid' && (
                            <p className={`text-xs mt-1 ${expired ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-500'}`}>
                              {expired ? 'Expirée' : `Expire le ${format(new Date(booking.expires_at), 'dd MMM yyyy', { locale: fr })}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Informations de paiement */}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign className="w-5 h-5 text-primary" />
                          <h4 className="font-semibold">État du paiement</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400 mb-1">Total</p>
                            <p className="font-bold text-lg text-primary">{formatPrice(booking.total_price)} FCFA</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400 mb-1">Acompte</p>
                            <p className="font-medium">{formatPrice(booking.deposit_amount || 0)} FCFA</p>
                            {depositPaid && booking.deposit_paid_at && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Payé le {format(new Date(booking.deposit_paid_at), 'dd MMM yyyy', { locale: fr })}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400 mb-1">Payé</p>
                            <p className="font-medium">{formatPrice(booking.amount_paid || 0)} FCFA</p>
                            {booking.payment?.purpose && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {booking.payment.purpose === 'deposit' ? 'Acompte' : 'Solde'}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400 mb-1">Reste à payer</p>
                            <p className={`font-medium ${remainingBalance > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                              {formatPrice(remainingBalance)} FCFA
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="lg:col-span-1 space-y-4">
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/dashboard/host/bookings/${booking.id}`}
                          className="btn-primary w-full text-center flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Voir les détails
                        </Link>

                        {booking.status === 'pending' && !expired && (
                          <>
                            <button
                              onClick={() => handleStatusChange(booking.id, 'confirmed')}
                              disabled={updatingId === booking.id}
                              className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {updatingId === booking.id ? 'Traitement...' : 'Valider'}
                            </button>
                            <button
                              onClick={() => handleStatusChange(booking.id, 'cancelled', 'Indisponibilité')}
                              disabled={updatingId === booking.id}
                              className="btn-outline w-full text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              {updatingId === booking.id ? 'Traitement...' : 'Refuser'}
                            </button>
                          </>
                        )}

                        {expired && booking.status === 'pending' && (
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-800 dark:text-red-400">
                              Cette réservation a expiré (paiement non effectué dans les 48h)
                            </p>
                          </div>
                        )}

                        {booking.status === 'confirmed' && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm text-green-800 dark:text-green-400 font-medium">
                              Réservation confirmée
                            </p>
                            {booking.payment_status === 'paid' ? (
                              <p className="text-xs text-green-700 dark:text-green-500 mt-1">
                                Paiement complet reçu
                              </p>
                            ) : (
                              <p className="text-xs text-orange-700 dark:text-orange-500 mt-1">
                                En attente de paiement complet
                              </p>
                            )}
                          </div>
                        )}
                      </div>
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
      </main>
    </div>
  );
}

