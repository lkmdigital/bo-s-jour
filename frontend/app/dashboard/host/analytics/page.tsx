'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import DateRangeFilter, { useDefaultDateRange } from '@/components/common/DateRangeFilter';
import Link from 'next/link';
import {
  Calendar,
  TrendingUp,
  DollarSign,
  Home,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  AlertCircle,
} from 'lucide-react';

interface AccommodationStats {
  id: number;
  name: string;
  city: string;
  type: string;
  status: string;
  total_bookings: number;
  total_revenue: number;
  daily_bookings?: number;
  daily_revenue?: number;
  weekly_bookings?: number;
  weekly_revenue?: number;
  monthly_bookings?: number;
  monthly_revenue?: number;
  period_bookings?: number;
  period_revenue?: number;
}

interface AnalyticsData {
  total_bookings: number;
  confirmed_bookings: number;
  pending_bookings: number;
  upcoming_bookings: number;
  total_revenue: number;
  revenue_this_month: number;
  revenue_last_month: number;
  revenue_growth: number;
  daily_revenue?: number;
  weekly_revenue?: number;
  monthly_revenue_current?: number;
  occupancy_rate: number;
  accommodations: {
    total: number;
    published: number;
    pending: number;
    rejected: number;
  };
  top_accommodations?: Array<{
    id: number;
    name: string;
    bookings_sum_total_price: number;
    bookings_count: number;
  }>;
  accommodations_stats?: AccommodationStats[];
  monthly_revenue?: Array<{
    month: string;
    revenue: number;
  }>;
}

const typeLabels: Record<string, string> = {
  hotel: 'Hôtel',
  lodge: 'Lodge',
  guesthouse: "Maison d'hôtes",
  apartment: 'Appartement',
};

export default function HostAnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const defaultRange = useDefaultDateRange(30);
  const [dateRange, setDateRange] = useState(defaultRange);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'host')) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'host') {
      fetchData();
    }
  }, [isAuthenticated, user, dateRange.from, dateRange.to]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/analytics/host', {
        params: { from_date: dateRange.from, to_date: dateRange.to },
      });
      setAnalytics(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des analyses');
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

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <ErrorDisplay error={error} onDismiss={() => setError(null)} />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-600 dark:text-gray-400">Aucune donnée analytique disponible.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-primary">Analyses & performances</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Visualisez l'évolution de vos revenus, de vos réservations et des performances de vos établissements.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <DateRangeFilter
              from={dateRange.from}
              to={dateRange.to}
              onRangeChange={(from, to) => setDateRange({ from, to })}
              label="Période"
            />
            <Link href="/dashboard/host" className="btn-secondary text-sm">
              Retour au tableau de bord
            </Link>
          </div>
        </div>

        {/* Revenus (période) */}
        <div className="mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Revenus</p>
                <p className="text-3xl font-bold text-primary">
                  {formatPrice(analytics.total_revenue)} FCFA
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Période du {dateRange.from} au {dateRange.to}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-primary opacity-50" />
            </div>
          </div>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Réservations</p>
                <p className="text-3xl font-bold">{analytics.total_bookings}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {analytics.confirmed_bookings} confirmées
                </p>
              </div>
              <Calendar className="w-10 h-10 text-primary opacity-50" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Hébergements</p>
                <p className="text-3xl font-bold">{analytics.accommodations.total}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {analytics.accommodations.published} publiés
                </p>
              </div>
              <Home className="w-10 h-10 text-primary opacity-50" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Taux d'occupation</p>
                <p className="text-3xl font-bold">{analytics.occupancy_rate.toFixed(1)}%</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {analytics.upcoming_bookings} à venir
                </p>
              </div>
              <BarChart3 className="w-10 h-10 text-primary opacity-50" />
            </div>
          </div>
        </div>

        {/* Statistiques des statuts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Hébergements publiés</p>
                <p className="text-3xl font-bold text-green-600">
                  {analytics.accommodations.published}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="card border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">En attente de validation</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {analytics.accommodations.pending}
                </p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500 opacity-50" />
            </div>
          </div>

          <div className="card border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rejetés</p>
                <p className="text-3xl font-bold text-red-600">
                  {analytics.accommodations.rejected}
                </p>
              </div>
              <XCircle className="w-10 h-10 text-red-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Alertes */}
        {analytics.pending_bookings > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <p className="text-yellow-800 dark:text-yellow-400">
                Vous avez <strong>{analytics.pending_bookings}</strong> réservation(s) en attente de confirmation
              </p>
            </div>
            <Link
              href="/dashboard/host/bookings/requests"
              className="btn-primary text-sm"
            >
              Voir les demandes
            </Link>
          </div>
        )}

        {analytics.accommodations.pending > 0 && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-blue-800 dark:text-blue-400">
              Vous avez <strong>{analytics.accommodations.pending}</strong> hébergement(s) en attente de validation par l'administrateur
            </p>
          </div>
        )}

        {/* Revenus par établissement */}
        {analytics.accommodations_stats && analytics.accommodations_stats.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Revenus par établissement</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {analytics.accommodations_stats
                .sort((a, b) => (b.period_revenue ?? b.total_revenue) - (a.period_revenue ?? a.total_revenue))
                .map((acc) => (
                  <Link
                    key={acc.id}
                    href={`/dashboard/host/accommodations/${acc.id}/stats`}
                    className="card hover:shadow-lg transition-all border-l-4 border-primary cursor-pointer hover:border-primary-dark hover:scale-[1.02] group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">{acc.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {typeLabels[acc.type] || acc.type} • {acc.city}
                          </p>
                        </div>
                        <BarChart3 className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Revenus (période)</p>
                          <p className="text-2xl font-bold text-primary">
                            {formatPrice(acc.period_revenue ?? acc.total_revenue)} FCFA
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {(acc.period_bookings ?? acc.total_bookings)} réservation{(acc.period_bookings ?? acc.total_bookings) !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}







