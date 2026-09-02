'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useBookings } from '@/hooks/useBookings';
import { BOOKING_STATUS_CONFIG, type BookingFilters } from '@/types/booking';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Pagination from '@/components/common/Pagination';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import { Calendar, Users, MapPin, CreditCard, ArrowRight, Filter, Search, X, FileText, CheckCircle, Wallet } from 'lucide-react';

export default function BookingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const filters: BookingFilters = {
    status: statusFilter as BookingFilters['status'],
    payment_status: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
    period: periodFilter as BookingFilters['period'],
    search: searchQuery.trim() || undefined,
    page: currentPage,
    per_page: 10,
  };

  const { data: result, isLoading: loading, error, refetch } = useBookings(filters);

  const bookings = result?.data ?? [];
  const pagination = {
    total: result?.total ?? 0,
    per_page: result?.per_page ?? 10,
    current_page: result?.current_page ?? 1,
    last_page: result?.last_page ?? 1,
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
    if (!isLoading && isAuthenticated && user?.role === 'host') {
      router.push('/dashboard/host/bookings');
    }
  }, [isAuthenticated, isLoading, user, router]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setPaymentStatusFilter('all');
    setPeriodFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    statusFilter !== 'all' || paymentStatusFilter !== 'all' ||
    periodFilter !== 'all' || searchQuery.trim() !== '';

  if (isLoading || loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Chargement de vos réservations..." size="lg" />
        </div>
      </div>
    );
  }

  const statusLabels = BOOKING_STATUS_CONFIG;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-3xl font-bold">Mes réservations</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-outline flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtres
            {hasActiveFilters && (
              <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {[statusFilter, paymentStatusFilter, periodFilter, searchQuery].filter(f => f !== 'all' && f !== '').length}
              </span>
            )}
          </button>
        </div>

        {/* Section des filtres */}
        {showFilters && (
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtres de recherche
              </h2>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Réinitialiser
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Recherche */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Search className="w-4 h-4 inline mr-1" />
                  Rechercher
                </label>
                <input
                  type="text"
                  placeholder="Nom ou ville..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
                />
              </div>

              {/* Filtre par statut */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Statut de réservation
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="confirmed">Confirmée</option>
                  <option value="cancelled">Annulée</option>
                </select>
              </div>

              {/* Filtre par statut de paiement */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Statut de paiement
                </label>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => {
                    setPaymentStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
                >
                  <option value="all">Tous les paiements</option>
                  <option value="paid">Payé</option>
                  <option value="pending">En attente</option>
                  <option value="failed">Échec</option>
                </select>
              </div>

              {/* Filtre par période */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Période
                </label>
                <select
                  value={periodFilter}
                  onChange={(e) => {
                    setPeriodFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
                >
                  <option value="all">Toutes les périodes</option>
                  <option value="upcoming">À venir</option>
                  <option value="past">Passées</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {error && (
          <ErrorDisplay
            error={(error as any)?.response?.data?.message ?? (error as any)?.message ?? 'Erreur de chargement'}
            onRetry={() => refetch()}
            type="error"
          />
        )}

        {!error && bookings.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Vous n'avez aucune réservation pour le moment.
            </p>
            <Link href="/" className="btn-primary inline-block">
              Explorer les hébergements
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {bookings.map((booking) => {
              const isPast = new Date(booking.check_out) < new Date();
              const needsPayment = booking.payment_status === 'pending' && !isPast;
              
              return (
                <div
                  key={booking.id}
                  className="card hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col md:flex-row gap-4">
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="flex-1"
                    >
                      <h2 className="text-xl font-semibold mb-2">{booking.accommodation?.name}</h2>
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4" />
                          <span>{booking.accommodation?.city}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(booking.check_in).toLocaleDateString('fr-FR')} -{' '}
                            {new Date(booking.check_out).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>{booking.guests} voyageur{booking.guests > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </Link>
                    <div className="flex flex-col items-end justify-between gap-3">
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusLabels[booking.status as keyof typeof statusLabels]?.bg ?? ''} ${statusLabels[booking.status as keyof typeof statusLabels]?.color ?? ''}`}>
                          {statusLabels[booking.status as keyof typeof statusLabels]?.label ?? booking.status}
                        </span>
                        {booking.payment_status && (
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                              booking.payment_status === 'paid'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : booking.payment_status === 'failed'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            }`}>
                              {booking.payment_status === 'paid' && <CheckCircle className="w-3 h-3" />}
                              {booking.payment_status === 'paid' ? 'Payé' :
                               booking.payment_status === 'failed' ? 'Échec paiement' :
                               'Paiement en attente'}
                            </span>
                            {booking.payment_status === 'paid' && (
                              <Link
                                href={`/bookings/${booking.id}#receipt`}
                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Voir le reçu de paiement"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FileText className="w-5 h-5" />
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary mb-3">
                          {formatPrice(booking.total_price)} FCFA
                        </div>
                        
                        {/* Informations de paiement */}
                        {(() => {
                          const depositAmount = booking.deposit_amount || 0;
                          const amountPaid = booking.amount_paid || 0;
                          const totalPrice = booking.total_price || 0;
                          const remainingBalance = totalPrice - amountPaid;
                          const hasPaidDeposit = booking.deposit_paid_at || (depositAmount > 0 && amountPaid >= depositAmount);
                          const depositPaidAmount = depositAmount > 0 ? Math.min(amountPaid, depositAmount) : 0;
                          
                          return (
                            <div className="space-y-2 text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
                              {/* Acompte payé - Toujours afficher si un acompte est configuré */}
                              {depositAmount > 0 && (
                                <div className="flex items-center justify-end gap-2 mb-2">
                                  {hasPaidDeposit ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                      <span className="font-semibold text-green-700 dark:text-green-300">
                                        Acompte payé: {formatPrice(depositAmount)} FCFA
                                      </span>
                                    </div>
                                  ) : depositPaidAmount > 0 ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                      <Wallet className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                      <span className="font-medium text-yellow-700 dark:text-yellow-300">
                                        Acompte partiel: {formatPrice(depositPaidAmount)} / {formatPrice(depositAmount)} FCFA
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                      <Wallet className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                      <span className="font-medium text-orange-700 dark:text-orange-300">
                                        Acompte à payer: {formatPrice(depositAmount)} FCFA
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Reste à payer - Toujours afficher si il reste quelque chose à payer */}
                              {remainingBalance > 0 && (
                                <div className="flex items-center justify-end gap-2">
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <Wallet className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                    <span className="font-semibold text-orange-700 dark:text-orange-300">
                                      Reste à payer: {formatPrice(remainingBalance)} FCFA
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Total payé si partiellement payé */}
                              {amountPaid > 0 && amountPaid < totalPrice && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 text-right mt-1">
                                  Déjà payé: {formatPrice(amountPaid)} FCFA sur {formatPrice(totalPrice)} FCFA
                                </div>
                              )}
                              
                              {/* Tout payé */}
                              {remainingBalance <= 0 && amountPaid > 0 && (
                                <div className="flex items-center justify-end gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mt-2">
                                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span className="font-semibold text-green-700 dark:text-green-300">
                                    Total payé
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        
                        {needsPayment && (
                          <Link
                            href={`/bookings/${booking.id}/payment`}
                            className="mt-3 btn-primary inline-flex items-center gap-2 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <CreditCard className="w-4 h-4" />
                            Payer maintenant
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
            <Pagination
              currentPage={pagination.current_page}
              totalPages={pagination.last_page}
              onPageChange={handlePageChange}
              totalItems={pagination.total}
              itemsPerPage={pagination.per_page}
            />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

