'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { isAdminOrController } from '@/lib/userUtils';
import { useToast } from '@/components/common/ToastContext';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { formatPrice } from '@/lib/utils';
import DateRangeFilter, { useDefaultDateRange } from '@/components/common/DateRangeFilter';
import { DollarSign, TrendingUp, Calendar, Settings, BarChart3, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Commission {
  id: number;
  booking_amount: number;
  commission_rate: number;
  commission_amount: number;
  host_amount: number;
  status: string;
  created_at: string;
  booking: {
    id: number;
    accommodation: {
      name: string;
    };
  };
  host: {
    id: number;
    name: string;
  };
}

interface RevenueData {
  statistics: {
    total_commissions: number;
    paid_commissions: number;
    pending_commissions: number;
    total_bookings: number;
    daily_commissions?: number;
    daily_bookings?: number;
    weekly_commissions?: number;
    weekly_bookings?: number;
    monthly_commissions?: number;
    monthly_bookings?: number;
  };
  monthly_revenue: Array<{
    year: number;
    month: number;
    total: number;
    bookings?: number;
  }>;
  commissions: {
    data: Commission[];
    current_page: number;
    total: number;
    per_page: number;
  };
}

export default function AdminComptabilitePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commissionRate, setCommissionRate] = useState<number>(10);
  const [updatingRate, setUpdatingRate] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [newRate, setNewRate] = useState<string>('10');
  const { showError, showWarning } = useToast();
  const defaultRange = useDefaultDateRange(30);
  const [dateRange, setDateRange] = useState(defaultRange);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdminOrController(user))) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && isAdminOrController(user)) {
      fetchData();
      fetchCommissionRate();
    }
  }, [isAuthenticated, user, dateRange.from, dateRange.to]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/revenue/admin', {
        params: { from_date: dateRange.from, to_date: dateRange.to },
      });
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des revenus');
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissionRate = async () => {
    try {
      const response = await api.get('/revenue/commission-rate');
      setCommissionRate(response.data.commission_rate);
      setNewRate(response.data.commission_rate.toString());
    } catch (err) {
      console.error('Error fetching commission rate:', err);
    }
  };

  const updateCommissionRate = async () => {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      showWarning('Le taux doit être entre 0 et 100');
      return;
    }

    setUpdatingRate(true);
    try {
      await api.put('/revenue/commission-rate', { commission_rate: rate });
      setCommissionRate(rate);
      setShowRateModal(false);
      await fetchData(); // Rafraîchir les données
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setUpdatingRate(false);
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

  if (!isAuthenticated || !isAdminOrController(user)) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Comptabilité</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Commissions et revenus de la plateforme
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <DateRangeFilter
              from={dateRange.from}
              to={dateRange.to}
              onRangeChange={(from, to) => setDateRange({ from, to })}
              label="Période"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  const response = await api.get('/revenue/admin/export', {
                    params: { from_date: dateRange.from, to_date: dateRange.to },
                    responseType: 'blob',
                  });
                  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = blobUrl;
                  link.download = `commissions-${new Date().toISOString().slice(0, 10)}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  window.URL.revokeObjectURL(blobUrl);
                } catch (err) {
                  console.error('Erreur export CSV', err);
                }
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary"
            >
              <Download className="w-4 h-4" /> Exporter (CSV)
            </button>
            <button
              onClick={() => setShowRateModal(true)}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Taux de commission: {commissionRate}%
            </button>
          </div>
        </div>

        {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

        {data && (
          <>
            {/* Statistiques principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Commissions totales</p>
                    <p className="text-3xl font-bold text-primary">
                      {formatPrice(data.statistics.total_commissions)} FCFA
                    </p>
                  </div>
                  <DollarSign className="w-10 h-10 text-primary opacity-50" />
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Commissions payées</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {formatPrice(data.statistics.paid_commissions)} FCFA
                    </p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-600 dark:text-green-400 opacity-50" />
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">En attente</p>
                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {formatPrice(data.statistics.pending_commissions)} FCFA
                    </p>
                  </div>
                  <Calendar className="w-10 h-10 text-yellow-600 dark:text-yellow-400 opacity-50" />
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total réservations</p>
                    <p className="text-3xl font-bold">{data.statistics.total_bookings}</p>
                  </div>
                  <Calendar className="w-10 h-10 text-primary opacity-50" />
                </div>
              </div>
            </div>

            {/* Revenus par période */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Commissions journalières</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {formatPrice(data.statistics.daily_commissions || 0)} FCFA
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {data.statistics.daily_bookings || 0} réservation{data.statistics.daily_bookings !== 1 ? 's' : ''} aujourd'hui
                    </p>
                  </div>
                  <Calendar className="w-10 h-10 text-blue-500 opacity-50" />
                </div>
              </div>

              <div className="card border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Commissions hebdomadaires</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {formatPrice(data.statistics.weekly_commissions || 0)} FCFA
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {data.statistics.weekly_bookings || 0} réservation{data.statistics.weekly_bookings !== 1 ? 's' : ''} (7 jours)
                    </p>
                  </div>
                  <BarChart3 className="w-10 h-10 text-purple-500 opacity-50" />
                </div>
              </div>

              <div className="card border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Commissions mensuelles</p>
                    <p className="text-3xl font-bold text-green-600">
                      {formatPrice(data.statistics.monthly_commissions || 0)} FCFA
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {data.statistics.monthly_bookings || 0} réservation{data.statistics.monthly_bookings !== 1 ? 's' : ''} ce mois
                    </p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-500 opacity-50" />
                </div>
              </div>
            </div>

            {/* Liste des commissions */}
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Historique des commissions</h2>
              {data.commissions.data.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">Aucune commission</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Hébergement</th>
                        <th className="text-left py-3 px-4">Hôte</th>
                        <th className="text-right py-3 px-4">Montant réservation</th>
                        <th className="text-right py-3 px-4">Commission ({commissionRate}%)</th>
                        <th className="text-right py-3 px-4">Montant hôte</th>
                        <th className="text-center py-3 px-4">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.commissions.data.map((commission) => (
                        <tr key={commission.id} className="border-b border-gray-200 dark:border-gray-700">
                          <td className="py-3 px-4">
                            {format(new Date(commission.created_at), 'dd MMM yyyy', { locale: fr })}
                          </td>
                          <td className="py-3 px-4">{commission.booking.accommodation.name}</td>
                          <td className="py-3 px-4">{commission.host.name}</td>
                          <td className="py-3 px-4 text-right">
                            {formatPrice(commission.booking_amount)} FCFA
                          </td>
                          <td className="py-3 px-4 text-right text-primary font-semibold">
                            {formatPrice(commission.commission_amount)} FCFA
                          </td>
                          <td className="py-3 px-4 text-right">
                            {formatPrice(commission.host_amount)} FCFA
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              commission.status === 'paid'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : commission.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                              {commission.status === 'paid' ? 'Payée' :
                               commission.status === 'pending' ? 'En attente' : 'Annulée'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal pour modifier le taux de commission */}
        {showRateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Modifier le taux de commission</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Taux de commission (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Taux actuel: {commissionRate}%
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRateModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={updateCommissionRate}
                    disabled={updatingRate}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {updatingRate ? 'Mise à jour...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
