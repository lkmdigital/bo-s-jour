'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import Header from '@/components/common/Header';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Pagination from '@/components/common/Pagination';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import { Calendar, Users, TrendingUp, Star, ArrowRight, CreditCard, FileText, Wallet, RefreshCw, MessageSquare, Compass } from 'lucide-react';

interface Booking {
  id: number;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: string;
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  accommodation: {
    id: number;
    name: string;
    city: string;
    images: Array<{ url: string }>;
  };
}

export default function UserDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    per_page: 10,
    current_page: 1,
    last_page: 1,
  });
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    past: 0,
    totalSpent: 0,
  });
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchBookings();
    }
  }, [isAuthenticated, isLoading, currentPage]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      api.get('/credits/balance').then((r) => setCreditsBalance(r.data?.balance ?? 0)).catch(() => setCreditsBalance(0));
    }
  }, [isAuthenticated, isLoading]);

  const fetchBookings = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await api.get('/bookings', {
        params: { per_page: 10, page: currentPage }
      });
      
      // Gérer la pagination Laravel (structure: { data: [...], current_page, total, etc. })
      let bookingsData: Booking[] = [];
      
      if (response && response.data) {
        // Cas 1: Réponse paginée Laravel { data: [...], current_page, ... }
        if (response.data.data && Array.isArray(response.data.data)) {
          bookingsData = response.data.data;
          setPagination({
            total: response.data.total || 0,
            per_page: response.data.per_page || 10,
            current_page: response.data.current_page || 1,
            last_page: response.data.last_page || 1,
          });
        }
        // Cas 2: Tableau direct
        else if (Array.isArray(response.data)) {
          bookingsData = response.data;
          setPagination({
            total: response.data.length,
            per_page: 10,
            current_page: 1,
            last_page: 1,
          });
        }
        // Cas 3: Objet avec propriété data
        else if (response.data && typeof response.data === 'object') {
          // Essayer de trouver un tableau dans l'objet
          for (const key in response.data) {
            if (Array.isArray(response.data[key])) {
              bookingsData = response.data[key];
              setPagination({
                total: bookingsData.length,
                per_page: 10,
                current_page: 1,
                last_page: 1,
              });
              break;
            }
          }
        }
      }
      
      setBookings(bookingsData);

      // Calculer les statistiques
      const now = new Date();
      const upcoming = bookingsData.filter((b: Booking) => 
        new Date(b.check_in) >= now && b.status === 'confirmed'
      );
      const past = bookingsData.filter((b: Booking) => 
        new Date(b.check_out) < now && b.status === 'confirmed'
      );
      const totalSpent = bookingsData
        .filter((b: Booking) => b.status === 'confirmed')
        .reduce((sum: number, b: Booking) => sum + parseFloat(b.total_price.toString()), 0);

      setStats({
        total: bookingsData.length,
        upcoming: upcoming.length,
        past: past.length,
        totalSpent,
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Erreur lors du chargement des données';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Vérification de l'authentification..." size="lg" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="card text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Vous devez être connecté pour accéder à cette page.
            </p>
            <Link href="/auth/login" className="btn-primary inline-block">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Chargement de votre tableau de bord..." size="lg" />
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
    confirmed: { label: 'Confirmée', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
    cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mon espace</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Bienvenue, {user?.name} ! 👋
            </p>
          </div>
          <button
            onClick={fetchBookings}
            className="btn-outline text-sm inline-flex items-center gap-2"
            title="Recharger les données"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>

        {/* Navigation espace membre */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link href="/bookings" className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
            <Calendar className="w-4 h-4" /> Mes réservations
          </Link>
          <Link href="/dashboard/user/inbox" className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-700 hover:border-primary hover:text-primary transition-colors">
            <MessageSquare className="w-4 h-4" /> Messages
          </Link>
          <Link href="/accommodations" className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-700 hover:border-primary hover:text-primary transition-colors">
            <Compass className="w-4 h-4" /> Explorer la Côte d&apos;Ivoire
          </Link>
        </div>

        {error && (
          <ErrorDisplay 
            error={error} 
            onRetry={fetchBookings}
            type="error"
          />
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total réservations</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="w-10 h-10 text-primary opacity-50" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avoirs disponibles</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {creditsBalance !== null ? formatPrice(creditsBalance) : '—'} FCFA
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Utilisables pour une prochaine réservation</p>
              </div>
              <Wallet className="w-10 h-10 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">À venir</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.upcoming}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600 dark:text-green-400 opacity-50" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Passées</p>
                <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{stats.past}</p>
              </div>
              <Users className="w-10 h-10 text-gray-600 dark:text-gray-400 opacity-50" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total dépensé</p>
                <p className="text-3xl font-bold text-primary">{formatPrice(stats.totalSpent)} FCFA</p>
              </div>
              <Star className="w-10 h-10 text-primary opacity-50" />
            </div>
          </div>
        </div>

        {/* Réservations récentes */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Mes réservations</h2>
            {bookings.length > 0 && (
              <Link href="/bookings" className="text-primary hover:underline flex items-center gap-1 text-sm">
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {!error && bookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Vous n'avez aucune réservation pour le moment.
              </p>
              <Link href="/accommodations" className="btn-primary inline-block">
                Explorer les hébergements
              </Link>
            </div>
          ) : !error ? (
            <div className="space-y-4">
              {bookings.slice(0, 5).map((booking) => {
                const isPast = new Date(booking.check_out) < new Date();
                const needsPayment = booking.payment_status === 'pending' && !isPast;
                
                return (
                  <div
                    key={booking.id}
                    className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="flex-1"
                      >
                        <h3 className="font-semibold text-lg mb-2">{booking.accommodation.name}</h3>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(booking.check_in).toLocaleDateString('fr-FR')} - {new Date(booking.check_out).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {booking.guests} voyageur{booking.guests > 1 ? 's' : ''}
                          </span>
                          <span>{booking.accommodation.city}</span>
                        </div>
                      </Link>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
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
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end gap-1">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusLabels[booking.status]?.color || ''}`}>
                              {statusLabels[booking.status]?.label || booking.status}
                            </span>
                            {booking.payment_status && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                booking.payment_status === 'paid'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : booking.payment_status === 'failed'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                              }`}>
                                {booking.payment_status === 'paid' ? 'Payé' :
                                 booking.payment_status === 'failed' ? 'Échec' :
                                 'En attente'}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-primary">
                              {formatPrice(booking.total_price)} FCFA
                            </div>
                          </div>
                        </div>
                        {needsPayment && (
                          <Link
                            href={`/bookings/${booking.id}/payment`}
                            className="btn-primary inline-flex items-center gap-2 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <CreditCard className="w-4 h-4" />
                            Payer maintenant
                          </Link>
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
          ) : null}
        </div>

        {/* Analytics */}
        <div className="mt-8">
          <AnalyticsDashboard />
        </div>
      </main>
    </div>
  );
}

