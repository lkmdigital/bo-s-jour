'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice } from '@/lib/utils';

interface AnalyticsData {
  total_bookings?: number;
  confirmed_bookings?: number;
  total_revenue?: number;
  occupancy_rate?: number;
  monthly_revenue?: Array<{ month: string; revenue: number }>;
  top_accommodations?: Array<any>;
  // Admin stats
  total_users?: number;
  total_hosts?: number;
  total_accommodations?: number;
  subscription_revenue?: number;
  cities?: Array<{ city: string; count: number }>;
}

export default function AnalyticsDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<AnalyticsData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      let endpoint = '/analytics/traveler';
      if (user?.role === 'host') {
        endpoint = '/analytics/host';
      } else if (user?.role === 'admin') {
        endpoint = '/analytics/admin';
      }

      const response = await api.get(endpoint);
      setData(response.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des statistiques...</div>;
  }

  const isHost = user?.role === 'host';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tableau de bord analytique</h2>

      {isHost && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total réservations</p>
            <p className="text-3xl font-bold">{data.total_bookings || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Réservations confirmées</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {data.confirmed_bookings || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Revenus totaux</p>
            <p className="text-3xl font-bold text-primary">
              {formatPrice(data.total_revenue || 0)} FCFA
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Taux d'occupation</p>
            <p className="text-3xl font-bold">
              {data.occupancy_rate?.toFixed(1) || 0}%
            </p>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total utilisateurs</p>
            <p className="text-3xl font-bold">{data.total_users || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total partenaires</p>
            <p className="text-3xl font-bold">{data.total_hosts || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total hébergements</p>
            <p className="text-3xl font-bold">{data.total_accommodations || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Revenus abonnements</p>
            <p className="text-3xl font-bold text-primary">
              {formatPrice(data.subscription_revenue || 0)} FCFA
            </p>
          </div>
        </div>
      )}

      {data.monthly_revenue && data.monthly_revenue.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Revenus mensuels</h3>
          <div className="space-y-2">
            {data.monthly_revenue.map((item) => (
              <div key={item.month} className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">{item.month}</span>
                <span className="font-medium">{formatPrice(item.revenue)} FCFA</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.top_accommodations && data.top_accommodations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Hébergements les plus performants</h3>
          <div className="space-y-3">
            {data.top_accommodations.map((acc, index) => (
              <div key={acc.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <div>
                  <span className="font-medium mr-2">#{index + 1}</span>
                  <span>{acc.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">{acc.bookings_count || 0} réservations</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatPrice(acc.bookings_sum_total_price || 0)} FCFA
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.cities && data.cities.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Villes actives</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {data.cities.map((city) => (
              <div key={city.city} className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <p className="font-medium">{city.city}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{city.count} hébergements</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

