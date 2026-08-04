'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import KpiCard from '@/components/dashboard/host/KpiCard';
import { formatPrice } from '@/lib/utils';
import {
  Users,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarCheck,
  Repeat,
  Percent,
  DollarSign,
  HandCoins,
  Hourglass,
  ArrowLeftRight,
  Sun,
  CalendarRange,
  CalendarDays,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdminStats {
  users: { total: number };
  accommodations: { total: number; published: number; pending: number; rejected: number; disabled: number; removed: number };
  bookings: { total: number; confirmed: number; cancelled: number; pending: number };
  accounting: { commissions_reversed: number; platform_commissions_total: number; platform_commissions_pending: number; platform_commissions_paid: number };
  revenue: { period: number; all_time: number; period_days: number; today: number; this_month: number; this_year: number };
  kpis: { occupancy_rate: number };
}

interface DailyPoint {
  date: string;
  users: number;
  bookings: number;
  accommodations: number;
  revenue: number;
}

interface StatusPoint {
  status: string;
  count: number;
}

interface RegionPoint {
  city: string;
  bookings_count: number;
  revenue: number;
}

interface TopAccommodation {
  id: number;
  name: string;
  city: string;
  bookings_count: number;
  revenue: number;
}

interface MonthlyRevenuePoint {
  month: string;
  revenue: number;
  commissions: number;
}

interface OccupancyPoint {
  month: string;
  occupancy_rate: number;
}

const STATUS_LABELS: Record<string, string> = {
  published: 'Vérifiés',
  pending: 'En conformité',
  rejected: 'Documents manquants',
  disabled: 'Désactivés',
  removed: 'Suspendus',
  unavailable: 'Indisponibles',
  renovation: 'En rénovation',
};

const PIE_COLORS = ['#22c55e', '#f97316', '#FF0000', '#343434', '#9ca3af', '#4B5F5A'];

const monthLabel = (m: string) => format(new Date(`${m}-01`), 'MMM', { locale: fr });

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [statusDist, setStatusDist] = useState<StatusPoint[]>([]);
  const [regions, setRegions] = useState<RegionPoint[]>([]);
  const [topAccommodations, setTopAccommodations] = useState<TopAccommodation[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenuePoint[]>([]);
  const [occupancyTrend, setOccupancyTrend] = useState<OccupancyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard/stats'),
      api.get('/admin/dashboard/daily-activity', { params: { period: 30 } }),
      api.get('/admin/dashboard/accommodation-status'),
      api.get('/admin/dashboard/bookings-by-region'),
      api.get('/admin/dashboard/top-accommodations', { params: { limit: 5 } }),
      api.get('/admin/dashboard/monthly-revenue-trend'),
      api.get('/admin/dashboard/occupancy-trend'),
    ])
      .then(([statsRes, dailyRes, statusRes, regionsRes, topRes, monthlyRes, occupancyRes]) => {
        setStats(statsRes.data?.data ?? null);
        setDaily(dailyRes.data?.data ?? []);
        setStatusDist(statusRes.data?.data ?? []);
        setRegions(regionsRes.data?.data ?? []);
        setTopAccommodations(topRes.data?.data ?? []);
        setMonthlyRevenue(monthlyRes.data?.data ?? []);
        setOccupancyTrend(occupancyRes.data?.data ?? []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Erreur lors du chargement du tableau de bord'))
      .finally(() => setLoading(false));
  }, []);

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

  if (!stats) return null;

  const conversionRate = stats.bookings.total > 0 ? Math.round((stats.bookings.confirmed / stats.bookings.total) * 1000) / 10 : 0;
  const verifiedRatio = stats.accommodations.total > 0 ? Math.round((stats.accommodations.published / stats.accommodations.total) * 100) : 0;
  const nonCompliant = stats.accommodations.rejected + stats.accommodations.disabled;

  const last7Days = daily.slice(-7).map((d) => ({ ...d, dayLabel: format(new Date(d.date), 'EEE', { locale: fr }) }));
  const statusChartData = statusDist.map((s) => ({ name: STATUS_LABELS[s.status] ?? s.status, value: s.count }));
  const monthlyRevenueData = monthlyRevenue.map((m) => ({ ...m, monthLabel: monthLabel(m.month) }));
  const occupancyData = occupancyTrend.map((m) => ({ ...m, monthLabel: monthLabel(m.month) }));
  const maxRegionBookings = regions[0]?.bookings_count || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau de bord</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })} · Vue globale
          </p>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-bosejour-red text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-bosejour-red animate-pulse" />
          En direct
        </span>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Principes des KPI</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Users} label="Utilisateurs totaux" value={stats.users.total.toLocaleString('fr-FR')} />
          <KpiCard icon={Building2} label="Hôtels inscrits" value={String(stats.accommodations.total)} />
          <KpiCard icon={CheckCircle2} label="Hôtels vérifiés" value={String(stats.accommodations.published)} change={verifiedRatio} />
          <KpiCard icon={Clock} label="En attente de validation" value={String(stats.accommodations.pending)} />
          <KpiCard icon={AlertTriangle} label="Non conforme" value={String(nonCompliant)} />
          <KpiCard icon={CalendarCheck} label="Réservations" value={stats.bookings.total.toLocaleString('fr-FR')} />
          <KpiCard icon={Repeat} label="Taux de conversion" value={`${conversionRate}%`} />
          <KpiCard icon={Percent} label="Taux d'occupation" value={`${stats.kpis.occupancy_rate}%`} />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Finance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={DollarSign} label="Chiffre d'affaires" value={`${formatPrice(stats.revenue.all_time)} FCFA`} />
          <KpiCard icon={HandCoins} label="Commissions perçues" value={`${formatPrice(stats.accounting.platform_commissions_paid)} FCFA`} />
          <KpiCard icon={Hourglass} label="Commissions en attente" value={`${formatPrice(stats.accounting.platform_commissions_pending)} FCFA`} />
          <KpiCard icon={ArrowLeftRight} label="Reversements aux hôtes" value={`${formatPrice(stats.accounting.commissions_reversed)} FCFA`} />
          <KpiCard icon={Sun} label="Revenus du jour" value={`${formatPrice(stats.revenue.today)} FCFA`} />
          <KpiCard icon={CalendarRange} label="Revenus du mois" value={`${formatPrice(stats.revenue.this_month)} FCFA`} />
          <KpiCard icon={CalendarDays} label="Revenus annuels" value={`${formatPrice(stats.revenue.this_year)} FCFA`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">Réservations par jour</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">7 derniers jours</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dayLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="bookings" fill="#FF0000" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">Statut des établissements</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Répartition actuelle</p>
          {statusChartData.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Pas encore de données</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} isAnimationActive={false}>
                  {statusChartData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">Chiffre d'affaires et commissions</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">12 derniers mois</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyRevenueData}>
              <defs>
                <linearGradient id="adminRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF0000" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#FF0000" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => `${formatPrice(Number(v))} FCFA`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" name="Chiffre d'affaires" stroke="#FF0000" fill="url(#adminRevenueGradient)" strokeWidth={2} isAnimationActive={false} />
              <Line type="monotone" dataKey="commissions" name="Commissions" stroke="#343434" strokeWidth={2} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">Taux d'occupation moyen</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">12 derniers mois, tous établissements publiés</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={occupancyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v: any) => `${v}%`} />
              <Line type="monotone" dataKey="occupancy_rate" stroke="#FF0000" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">Nouveaux utilisateurs et établissements</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">30 derniers jours</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d: any) => format(new Date(d), 'dd/MM')} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip labelFormatter={(d: any) => format(new Date(d), 'dd MMM yyyy', { locale: fr })} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="users" name="Utilisateurs" fill="#FF0000" isAnimationActive={false} />
              <Bar dataKey="accommodations" name="Établissements" fill="#343434" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white">Réservations par région</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Réservations confirmées, par ville</p>
          {regions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Pas encore de données</p>
          ) : (
            <div className="space-y-3">
              {regions.map((r) => {
                const pct = Math.max(4, Math.round((r.bookings_count / maxRegionBookings) * 100));
                return (
                  <div key={r.city} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-sm text-gray-700 dark:text-gray-300 truncate">{r.city}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full bg-bosejour-red rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-sm font-semibold text-gray-900 dark:text-white text-right">{r.bookings_count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white">Top établissements</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Par chiffre d'affaires (réservations confirmées)</p>
        {topAccommodations.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Pas encore de données</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                  <th className="text-left py-2 px-3">Établissement</th>
                  <th className="text-left py-2 px-3">Ville</th>
                  <th className="text-right py-2 px-3">Réservations</th>
                  <th className="text-right py-2 px-3">Chiffre d'affaires</th>
                </tr>
              </thead>
              <tbody>
                {topAccommodations.map((acc) => (
                  <tr key={acc.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{acc.name}</td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400">{acc.city}</td>
                    <td className="py-2 px-3 text-right">{acc.bookings_count}</td>
                    <td className="py-2 px-3 text-right font-semibold text-bosejour-red">{formatPrice(acc.revenue)} FCFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
