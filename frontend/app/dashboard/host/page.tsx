'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import KpiCard from '@/components/dashboard/host/KpiCard';
import { formatPrice, getRoomCategoryLabel } from '@/lib/utils';
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
  Rocket,
  Compass,
  ArrowRight,
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


const PIE_COLORS = ['#FF0000', '#343434', '#4B5F5A', '#F7E8C6', '#EE233C'];

export default function HostDashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<HostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accommodationCount, setAccommodationCount] = useState<number | null>(null);
  const [expertMode, setExpertMode] = useState(false);

  useEffect(() => {
    api
      .get('/analytics/host')
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(err.response?.data?.message || 'Erreur lors du chargement du tableau de bord');
      })
      .finally(() => setLoading(false));

    api
      .get('/accommodations/my')
      .then((res) => setAccommodationCount(Array.isArray(res.data) ? res.data.length : 0))
      .catch(() => setAccommodationCount(null));

    if (typeof window !== 'undefined' && sessionStorage.getItem('host_expert_mode') === '1') {
      setExpertMode(true);
    }
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

  // Prise en main (brief Extranet Partenaire, Étape 6) : un hôte sans établissement
  // voit un écran d'accueil dédié plutôt qu'un tableau de bord vide, sauf s'il a
  // choisi le mode expert pour cette session.
  if (accommodationCount === 0 && !expertMode) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-950 text-white rounded-2xl p-8 sm:p-12 text-center">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 text-primary mb-4">
            <Rocket className="w-7 h-7" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Bienvenue {user?.name?.split(' ')[0] ?? ''} 👋</h1>
          <p className="text-gray-300 max-w-lg mx-auto mb-1">
            Votre compte est prêt. Il ne reste plus qu'à configurer votre établissement pour commencer à recevoir des
            réservations.
          </p>
          <div className="max-w-xs mx-auto mt-6 mb-2">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Configuration de l&apos;établissement</span><span>0%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '2%' }} />
            </div>
          </div>
          <Link
            href="/dashboard/host/accommodations/new"
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base mt-6"
          >
            Commencer la configuration <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-gray-400 mt-3">Sauvegarde automatique à chaque étape — vous pouvez reprendre plus tard.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card">
            <p className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <Rocket className="w-4 h-4 text-primary" /> Mode guidé
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Recommandé si c&apos;est votre première fois. Un parcours pas-à-pas : informations, photos, chambres,
              tarifs, politiques.
            </p>
            <Link href="/dashboard/host/accommodations/new" className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1">
              Démarrer <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="card">
            <p className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <Compass className="w-4 h-4 text-secondary" /> Mode expert
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Vous connaissez déjà bo séjour ? Accédez directement à tous les menus de l&apos;Extranet.
            </p>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') sessionStorage.setItem('host_expert_mode', '1');
                setExpertMode(true);
              }}
              className="text-sm text-secondary font-medium hover:underline inline-flex items-center gap-1"
            >
              Accéder au tableau de bord <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const revenueByRoomType = (data.revenue_by_room_type || []).map((r) => ({
    name: getRoomCategoryLabel(r.room_category),
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
