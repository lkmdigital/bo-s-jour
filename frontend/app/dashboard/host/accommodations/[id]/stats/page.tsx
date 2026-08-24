'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import { 
  ArrowLeft,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Bed
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AccommodationStats {
  accommodation: {
    id: number;
    name: string;
    type: string;
    city: string;
    status: string;
  };
  total_bookings: number;
  confirmed_bookings: number;
  pending_bookings: number;
  upcoming_bookings: number;
  total_revenue: number;
  daily_revenue: number;
  daily_bookings: number;
  weekly_revenue: number;
  weekly_bookings: number;
  monthly_revenue: number;
  monthly_bookings: number;
  revenue_last_month: number;
  revenue_growth: number;
  monthly_revenue_trend: Array<{
    month: string;
    revenue: number;
    bookings: number;
  }>;
  recent_bookings: Array<{
    id: number;
    check_in: string;
    check_out: string;
    guests: number;
    total_price: number;
    status: string;
    created_at: string;
    user: {
      name: string;
      email: string;
    } | null;
    room: {
      name: string;
      type: string;
    } | null;
  }>;
}

const typeLabels: Record<string, string> = {
  hotel: 'Hôtel',
  lodge: 'Lodge',
  guesthouse: 'Maison d\'hôtes',
  apartment: 'Appartement',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' },
  confirmed: { label: 'Confirmée', color: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400' },
};

export default function AccommodationStatsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [stats, setStats] = useState<AccommodationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const accommodationId = params?.id as string;

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'host')) {
      router.push('/auth/login');
      return;
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'host' && accommodationId && !isLoading) {
      fetchStats();
    }
  }, [isAuthenticated, user, accommodationId, isLoading]);

  const fetchStats = async () => {
    if (!accommodationId) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching stats for accommodation:', accommodationId);
      const url = `/analytics/host/accommodation/${accommodationId}`;
      console.log('API URL:', url);
      const response = await api.get(url);
      console.log('Stats response:', response.data);
      setStats(response.data);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      console.error('Error URL:', err.config?.url);
      console.error('Error status:', err.response?.status);
      console.error('Error data:', err.response?.data);
      
      if (err.response?.status === 404) {
        setError(`La route API n'existe pas encore sur le serveur. Veuillez déployer les dernières modifications du backend. URL: ${err.config?.url}`);
      } else {
        setError(err.response?.data?.message || err.message || 'Erreur lors du chargement des statistiques');
      }
    } finally {
      setLoading(false);
    }
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

  if (error && !stats) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-4">
            <Link
              href="/dashboard/host"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au tableau de bord
            </Link>
          </div>
          <ErrorDisplay error={error} onDismiss={() => {
            setError(null);
            fetchStats();
          }} />
          <button
            onClick={fetchStats}
            className="btn-primary mt-4"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!stats && !loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-4">
            <Link
              href="/dashboard/host"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au tableau de bord
            </Link>
          </div>
          <div className="card text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Aucune statistique disponible pour cet établissement
            </p>
            <button
              onClick={fetchStats}
              className="btn-primary"
            >
              Recharger
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sécurité TypeScript : on s'assure que stats est défini avant de l'utiliser
  if (!stats) {
    return null;
  }

  return (
    <div className="min-h-screen">
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/host"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au tableau de bord
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-primary mb-2">
                {stats.accommodation.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {typeLabels[stats.accommodation.type] || stats.accommodation.type} • {stats.accommodation.city}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/dashboard/host/accommodations/${stats.accommodation.id}/rooms`}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <Bed className="w-5 h-5" />
                Gérer les chambres
              </Link>
              <Link
                href={`/dashboard/host/accommodations/${stats.accommodation.id}/edit`}
                className="btn-primary text-center"
              >
                Modifier l'établissement
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <ErrorDisplay error={error} onDismiss={() => setError(null)} />
        )}

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Chiffre d&apos;affaires</p>
                <p className="text-3xl font-bold text-primary">
                  {formatPrice(stats.total_revenue)} FCFA
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {stats.confirmed_bookings} réservation{stats.confirmed_bookings > 1 ? 's' : ''} confirmée{stats.confirmed_bookings > 1 ? 's' : ''}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-primary opacity-50" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Réservations</p>
                <p className="text-3xl font-bold">{stats.total_bookings}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {stats.pending_bookings} en attente
                </p>
              </div>
              <Calendar className="w-10 h-10 text-primary opacity-50" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">À venir</p>
                <p className="text-3xl font-bold">{stats.upcoming_bookings}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Prochaines 30 jours
                </p>
              </div>
              <Clock className="w-10 h-10 text-primary opacity-50" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Croissance</p>
                <p className={`text-3xl font-bold flex items-center gap-1 ${
                  stats.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.revenue_growth >= 0 ? (
                    <TrendingUp className="w-6 h-6" />
                  ) : (
                    <TrendingDown className="w-6 h-6" />
                  )}
                  {Math.abs(stats.revenue_growth).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  vs mois dernier
                </p>
              </div>
              <BarChart3 className="w-10 h-10 text-primary opacity-50" />
            </div>
          </div>
        </div>

        {/* Revenus par période */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Revenus journaliers</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatPrice(stats.daily_revenue)} FCFA
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {stats.daily_bookings} réservation{stats.daily_bookings > 1 ? 's' : ''} aujourd'hui
                </p>
              </div>
              <Calendar className="w-10 h-10 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="card border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Revenus hebdomadaires</p>
                <p className="text-3xl font-bold text-purple-600">
                  {formatPrice(stats.weekly_revenue)} FCFA
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {stats.weekly_bookings} réservation{stats.weekly_bookings > 1 ? 's' : ''} (7 jours)
                </p>
              </div>
              <BarChart3 className="w-10 h-10 text-purple-500 opacity-50" />
            </div>
          </div>

          <div className="card border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Revenus mensuels</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatPrice(stats.monthly_revenue)} FCFA
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {stats.monthly_bookings} réservation{stats.monthly_bookings > 1 ? 's' : ''} ce mois
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Tendance mensuelle */}
        {stats.monthly_revenue_trend && stats.monthly_revenue_trend.length > 0 && (
          <div className="card mb-8">
            <h2 className="text-2xl font-bold mb-4">Tendance des revenus (6 derniers mois)</h2>
            <div className="space-y-3">
              {stats.monthly_revenue_trend.map((item) => (
                <div key={item.month} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <p className="font-semibold">
                      {format(new Date(item.month + '-01'), 'MMMM yyyy', { locale: fr })}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.bookings} réservation{item.bookings > 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="text-xl font-bold text-primary">
                    {formatPrice(item.revenue)} FCFA
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Réservations récentes */}
        {stats.recent_bookings && stats.recent_bookings.length > 0 && (
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Réservations récentes</h2>
            <div className="space-y-4">
              {stats.recent_bookings.map((booking) => {
                const statusConfig = statusLabels[booking.status] || statusLabels.pending;
                return (
                  <div
                    key={booking.id}
                    className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                          {booking.user && (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {booking.user.name}
                            </span>
                          )}
                        </div>
                        {booking.room && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {booking.room.name} ({booking.room.type})
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/dashboard/host/bookings/${booking.id}`}
                        className="btn-secondary text-sm flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </Link>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Arrivée</p>
                        <p className="font-medium">
                          {format(new Date(booking.check_in), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Départ</p>
                        <p className="font-medium">
                          {format(new Date(booking.check_out), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Voyageurs</p>
                        <p className="font-medium flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {booking.guests}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Montant</p>
                        <p className="font-bold text-primary">
                          {formatPrice(booking.total_price)} FCFA
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

