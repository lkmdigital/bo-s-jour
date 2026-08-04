'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { isController, isAdmin } from '@/lib/userUtils';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  Calendar,
  DollarSign,
  FileCheck,
} from 'lucide-react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import DateRangeFilter, { useDefaultDateRange } from '@/components/common/DateRangeFilter';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DailyActivity {
  date: string;
  users: number;
  bookings: number;
  accommodations: number;
  revenue: number;
}

interface HostPerformance {
  id: number;
  name: string;
  establishment_name?: string;
  accommodations_count: number;
  bookings_count: number;
  total_reviews: number;
}

interface StatusDistribution {
  status: string;
  count: number;
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { theme } = useThemeStore();
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [hostPerformance, setHostPerformance] = useState<HostPerformance[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const defaultRange = useDefaultDateRange(30);
  const [dateRange, setDateRange] = useState(defaultRange);

  const isDark = theme === 'dark';
  const tooltipStyle = {
    backgroundColor: isDark ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)',
    border: isDark ? '1px solid rgb(75, 85, 99)' : '1px solid rgb(229, 231, 235)',
    borderRadius: '8px',
  };
  const tooltipLabelStyle = {
    color: isDark ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Rediriger les contrôleurs vers leur page d'inspections
      if (isController(user)) {
        router.push('/dashboard/admin/inspections');
        return;
      }
      // Rediriger les non-admins vers la page de login
      if (!isAdmin(user)) {
        router.push('/auth/login');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user && isAdmin(user)) {
      fetchAnalytics();
    }
  }, [isAuthenticated, user, dateRange.from, dateRange.to]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [activityRes, performanceRes, distributionRes] = await Promise.all([
        api.get('/admin/dashboard/daily-activity', {
          params: { from_date: dateRange.from, to_date: dateRange.to },
        }),
        api.get('/admin/dashboard/host-performance', { params: { limit: 10 } }),
        api.get('/admin/dashboard/accommodation-status'),
      ]);

      setDailyActivity(activityRes.data.data || []);
      setHostPerformance(performanceRes.data.data || []);
      setStatusDistribution(distributionRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des analytics');
      console.error('Error fetching analytics:', err);
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

  if (!isAuthenticated || !user || !isAdmin(user)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Analytics & Statistiques
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Analysez les performances de la plateforme
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <DateRangeFilter
              from={dateRange.from}
              to={dateRange.to}
              onRangeChange={(from, to) => setDateRange({ from, to })}
              label="Période"
            />
            <Link href="/dashboard/admin" className="btn-secondary">
              Retour au dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Graphique d'activité journalière - Line Chart */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Activité Journalière
            </h2>
          </div>
          {dailyActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={dailyActivity.map(day => ({
                  ...day,
                  date: new Date(day.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                }))}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
                <XAxis 
                  dataKey="date" 
                  className="text-gray-600 dark:text-gray-400"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis 
                  className="text-gray-600 dark:text-gray-400"
                  tick={{ fill: 'currentColor' }}
                />
                <Tooltip 
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Utilisateurs"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="bookings" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Réservations"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="accommodations" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Établissements"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Revenus (FCFA)"
                  dot={{ r: 4 }}
                  yAxisId="revenue"
                />
                <YAxis 
                  yAxisId="revenue" 
                  orientation="right"
                  className="text-gray-600 dark:text-gray-400"
                  tick={{ fill: 'currentColor' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-96 flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performances des hôtes - Bar Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Performances des Hôtes
              </h2>
            </div>
            {hostPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={hostPerformance.map(host => {
                    const fullName = host.establishment_name || host.name;
                    return {
                      name: fullName.length > 15 ? fullName.substring(0, 15) + '...' : fullName,
                      réservations: host.bookings_count,
                      établissements: host.accommodations_count,
                      avis: host.total_reviews,
                    };
                  })}
                  margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    className="text-gray-600 dark:text-gray-400"
                    tick={{ fill: 'currentColor', fontSize: 12 }}
                  />
                  <YAxis 
                    className="text-gray-600 dark:text-gray-400"
                    tick={{ fill: 'currentColor' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--bg-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'var(--text-color)' }}
                  />
                  <Legend />
                  <Bar dataKey="réservations" fill="#3b82f6" name="Réservations" />
                  <Bar dataKey="établissements" fill="#10b981" name="Établissements" />
                  <Bar dataKey="avis" fill="#f59e0b" name="Avis" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-96 flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
              </div>
            )}
          </div>

          {/* Répartition des statuts - Pie Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Répartition des Statuts
              </h2>
            </div>
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={statusDistribution.map(item => ({
                      name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
                      value: item.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Legend 
                    formatter={(value) => {
                      const item = statusDistribution.find(d => d.status.toLowerCase() === value.toLowerCase());
                      return `${value} (${item?.count || 0})`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-96 flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

