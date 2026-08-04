'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import KpiCard from '@/components/dashboard/host/KpiCard';
import { formatPrice } from '@/lib/utils';
import {
  CalendarCheck,
  CalendarRange,
  Percent,
  BedDouble,
  Coins,
  Wallet,
  TrendingUp,
  Star,
  Gauge,
  HandCoins,
  Repeat,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

interface HostAnalytics {
  bookings_today: number;
  bookings_this_month: number;
  occupancy_rate: number;
  available_rooms_now: number;
  daily_revenue?: number;
  monthly_revenue_current?: number;
  annual_revenue: number;
  average_rating: number;
  score_bosejour: number;
  conversion_rate: number;
  monthly_revenue?: Array<{ month: string; revenue: number }>;
  revenue_by_room_type: Array<{ room_category: string; revenue: number }>;
  occupancy_by_week: Array<{ week_label: string; occupancy_rate: number }>;
  kpis?: { average_price_per_room: number };
  accounting?: { commissions_due: number; commissions_reversed: number };
}

const ROOM_CATEGORY_LABELS: Record<string, string> = {
  single: 'Simple',
  double: 'Double',
  twin: 'Jumelle',
  triple: 'Triple',
  pmr: 'PMR',
  suite: 'Suite',
  other: 'Autre',
  autre: 'Autre',
};

const PIE_COLORS = ['#FF0000', '#343434', '#4B5F5A', '#F7E8C6', '#EE233C'];

export default function HostDashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<HostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/analytics/host')
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(err.response?.data?.message || 'Erreur lors du chargement du tableau de bord');
      })
      .finally(() => setLoading(false));
  }, []);

  // Recharts (ResponsiveContainer) mesure parfois une largeur de 0 au premier rendu
  // dans une grille/flex avant que la mise en page ne soit stabilisée. On force un
  // recalcul juste après l'affichage des données pour garantir l'affichage des graphes.
  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    return () => clearTimeout(timer);
  }, [data]);

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay error={error} onDismiss={() => setError(null)} />;
  }

  if (!data) return null;

  const revenueByRoomType = (data.revenue_by_room_type || []).map((r) => ({
    name: ROOM_CATEGORY_LABELS[r.room_category] || r.room_category,
    value: r.revenue,
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bonjour {user?.name?.split(' ')[0] ?? ''} 👋</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Bienvenue dans votre espace partenaire Bosejour</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Vue d&apos;ensemble</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={CalendarCheck} label="Réservations aujourd'hui" value={String(data.bookings_today)} />
          <KpiCard icon={CalendarRange} label="Réservations ce mois" value={String(data.bookings_this_month)} />
          <KpiCard icon={Percent} label="Taux d'occupation" value={`${data.occupancy_rate}%`} />
          <KpiCard icon={BedDouble} label="Chambres disponibles" value={String(data.available_rooms_now)} />

          <KpiCard
            icon={Coins}
            label="Tarif moyen (ADR)"
            value={`${formatPrice(data.kpis?.average_price_per_room || 0)} FCFA`}
          />
          <KpiCard icon={Wallet} label="Revenus aujourd'hui" value={`${formatPrice(data.daily_revenue || 0)} FCFA`} />
          <KpiCard
            icon={TrendingUp}
            label="Revenus ce mois"
            value={`${formatPrice(data.monthly_revenue_current || 0)} FCFA`}
          />
          <KpiCard icon={TrendingUp} label="Revenus annuels" value={`${formatPrice(data.annual_revenue)} FCFA`} />

          <KpiCard
            icon={Star}
            label="Note moyenne"
            value={data.average_rating ? `${data.average_rating.toFixed(1)}/5` : '—'}
          />
          <KpiCard icon={Gauge} label="Score Bosejour" value={`${data.score_bosejour}%`} />
          <KpiCard
            icon={HandCoins}
            label="Commissions reversées"
            value={`${formatPrice(data.accounting?.commissions_reversed || 0)} FCFA`}
          />
          <KpiCard icon={Repeat} label="Taux de conversion" value={`${data.conversion_rate}%`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">Revenus mensuels</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Tendance sur les 12 derniers mois</p>
          {(data.monthly_revenue || []).length === 0 ? (
            <div className="h-[260px] flex items-center justify-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Pas encore de données</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.monthly_revenue || []}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF0000" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FF0000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 'auto']} allowDecimals={false} />
                <Tooltip formatter={(v: any) => `${formatPrice(Number(v))} FCFA`} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#FF0000"
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">Revenus par type de chambre</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Réservations confirmées</p>
          {revenueByRoomType.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Pas encore de données</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={revenueByRoomType}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label
                  isAnimationActive={false}
                >
                  {revenueByRoomType.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${formatPrice(Number(v))} FCFA`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white">Taux d&apos;occupation par semaine</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">4 dernières semaines</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.occupancy_by_week || []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week_label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
            <Tooltip formatter={(v: any) => `${v}%`} />
            <Bar dataKey="occupancy_rate" fill="#343434" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
