'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatPrice, resolveImageUrl } from '@/lib/utils';
import {
  Calendar, TrendingUp, CheckCircle2, Wallet, ArrowRight, MapPin,
  MessageSquare, FileText, Sparkles, CreditCard,
} from 'lucide-react';

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
    images?: Array<{ url: string }>;
  };
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'En attente', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  confirmed: { label: 'Confirmée', cls: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  cancelled: { label: 'Annulée', cls: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  completed: { label: 'Terminée', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

function nights(a: string, b: string) {
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

export default function UserDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    (async () => {
      try {
        const res = await api.get('/bookings', { params: { per_page: 50 } });
        const data = res.data;
        const list: Booking[] = Array.isArray(data) ? data : data?.data && Array.isArray(data.data) ? data.data : [];
        setBookings(list);
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    })();
    api.get('/credits/balance').then((r) => setCreditsBalance(r.data?.balance ?? 0)).catch(() => setCreditsBalance(0));
  }, [isAuthenticated, isLoading]);

  const { total, upcoming, past, nextReservation } = useMemo(() => {
    const now = new Date();
    const up = bookings.filter((b) => new Date(b.check_in) >= now && b.status === 'confirmed');
    const pastC = bookings.filter((b) => new Date(b.check_out) < now && (b.status === 'confirmed' || b.status === 'completed'));
    const next = [...up].sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime())[0] || null;
    return { total: bookings.length, upcoming: up.length, past: pastC.length, nextReservation: next };
  }, [bookings]);

  if (isLoading || (loading && isAuthenticated)) {
    return <LoadingSpinner message="Chargement de votre espace…" size="lg" />;
  }
  if (!isAuthenticated) return null;

  const firstName = user?.name?.split(' ')[0] || '';

  const statCards = [
    { label: 'Réservations Total', value: total, icon: Calendar, color: 'text-primary' },
    { label: 'À venir', value: upcoming, icon: TrendingUp, color: 'text-green-600 dark:text-green-400' },
    { label: 'Séjours effectués', value: past, icon: CheckCircle2, color: 'text-gray-700 dark:text-gray-300' },
    {
      label: 'Avoirs disponibles',
      value: creditsBalance !== null ? `${formatPrice(creditsBalance)} F` : '—',
      icon: Wallet, color: 'text-green-600 dark:text-green-400',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Salutation */}
      <div>
        <h1 className="text-3xl font-bold">Bonjour {firstName} 👋</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Bienvenue dans votre espace membre bo séjour.</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
              <Icon className={`w-6 h-6 ${color} opacity-60`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prochaine réservation */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Prochaine réservation</h2>
            <Link href="/bookings" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              Voir toutes mes réservations <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {nextReservation ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className="relative w-full sm:w-56 h-40 sm:h-auto bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0">
                  {nextReservation.accommodation.images?.[0]?.url ? (
                    <Image
                      src={resolveImageUrl(nextReservation.accommodation.images[0].url) || nextReservation.accommodation.images[0].url}
                      alt={nextReservation.accommodation.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/40">
                      <Calendar className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <div className="flex-1 p-5">
                  <h3 className="text-lg font-bold">{nextReservation.accommodation.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-4 h-4 text-primary" /> {nextReservation.accommodation.city}
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-gray-400">Arrivée</p>
                      <p className="font-semibold">{new Date(nextReservation.check_in).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Départ</p>
                      <p className="font-semibold">
                        {new Date(nextReservation.check_out).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        <span className="text-gray-400 font-normal"> ({nights(nextReservation.check_in, nextReservation.check_out)} nuits)</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="text-xs text-gray-400">Montant total</p>
                      <p className="text-xl font-bold text-primary">{formatPrice(nextReservation.total_price)} FCFA</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS[nextReservation.status]?.cls || ''}`}>
                      {STATUS[nextReservation.status]?.label || nextReservation.status}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <Link href={`/bookings/${nextReservation.id}`} className="btn-outline text-sm inline-flex items-center justify-center gap-2 flex-1">
                      <MessageSquare className="w-4 h-4" /> Contacter l&apos;hôtel
                    </Link>
                    <Link href={`/bookings/${nextReservation.id}#receipt`} className="btn-primary text-sm inline-flex items-center justify-center gap-2 flex-1">
                      <FileText className="w-4 h-4" /> Voir le bon
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">Aucune réservation à venir.</p>
              <Link href="/accommodations" className="btn-primary inline-block">Explorer les hébergements</Link>
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          {/* Programme Membre (à venir — pas de données de fidélité fabriquées) */}
          <div className="bg-gray-900 text-white rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Programme Membre</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">Bientôt</span>
            </div>
            <p className="text-sm text-gray-300">
              Niveaux de fidélité, points et récompenses exclusives arrivent prochainement.
            </p>
            <Link href="/dashboard/user/programme" className="inline-flex items-center gap-1 text-sm text-primary-light mt-4 hover:underline">
              En savoir plus <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Avoirs */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-green-500" />
              <h3 className="font-bold">Mes avoirs</h3>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {creditsBalance !== null ? `${formatPrice(creditsBalance)} FCFA` : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Utilisables pour une prochaine réservation.</p>
          </div>

          {/* Raccourci paiements */}
          <Link href="/bookings" className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-3 hover:border-primary transition-colors">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </span>
            <div>
              <p className="font-semibold text-sm">Paiements en attente</p>
              <p className="text-xs text-gray-500">Régler une réservation</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
