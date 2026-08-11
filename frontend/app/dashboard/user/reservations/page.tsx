'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import MemberAside from '@/components/dashboard/user/MemberAside';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatPrice } from '@/lib/utils';
import { MapPin, Calendar, Pencil, Download, Trash2, CreditCard, Search } from 'lucide-react';

interface Booking {
  id: number;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: string;
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  accommodation: { id: number; name: string; city: string };
}

type Tab = 'upcoming' | 'past' | 'cancelled';

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  confirmed: { label: 'Confirmée', cls: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
  cancelled: { label: 'Annulée', cls: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
  completed: { label: 'Terminée', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function MemberReservationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('upcoming');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/user/reservations');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    (async () => {
      try {
        const res = await api.get('/bookings', { params: { per_page: 100 } });
        const data = res.data;
        const list: Booking[] = Array.isArray(data) ? data : data?.data && Array.isArray(data.data) ? data.data : [];
        setBookings(list);
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, isLoading]);

  const { upcoming, past, cancelled } = useMemo(() => {
    const now = new Date();
    const up: Booking[] = [];
    const pa: Booking[] = [];
    const ca: Booking[] = [];
    for (const b of bookings) {
      if (b.status === 'cancelled') ca.push(b);
      else if (b.status === 'completed' || new Date(b.check_out) < now) pa.push(b);
      else up.push(b);
    }
    up.sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime());
    pa.sort((a, b) => new Date(b.check_out).getTime() - new Date(a.check_out).getTime());
    ca.sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());
    return { upcoming: up, past: pa, cancelled: ca };
  }, [bookings]);

  const list = tab === 'upcoming' ? upcoming : tab === 'past' ? past : cancelled;

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'upcoming', label: 'À venir', count: upcoming.length },
    { key: 'past', label: 'Passées', count: past.length },
    { key: 'cancelled', label: 'Annulées', count: cancelled.length },
  ];

  if (isLoading || (loading && isAuthenticated)) {
    return <LoadingSpinner message="Chargement de vos réservations…" size="lg" />;
  }
  if (!isAuthenticated) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mes réservations</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez vos réservations actuelles et passées</p>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-200 dark:border-gray-700 flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 -mb-px text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {t.label}{t.count > 0 && <span className="ml-1.5 text-xs text-gray-400">({t.count})</span>}
            </button>
          ))}
        </div>

        {/* Liste */}
        {list.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center">
            <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {tab === 'upcoming' ? 'Aucune réservation à venir.' : tab === 'past' ? 'Aucun séjour passé.' : 'Aucune réservation annulée.'}
            </p>
            {tab === 'upcoming' && (
              <Link href="/dashboard/user/recherche" className="btn-primary inline-flex items-center gap-2">
                <Search className="w-4 h-4" /> Rechercher un séjour
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((b) => {
              const isFuture = new Date(b.check_out) >= new Date();
              const needsPayment = b.payment_status === 'pending' && b.status !== 'cancelled' && isFuture;
              const canCancel = (b.status === 'pending' || b.status === 'confirmed') && isFuture;

              return (
                <div key={b.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Établissement + dates */}
                    <Link href={`/bookings/${b.id}`} className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate">{b.accommodation?.name}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-4 h-4 text-primary" /> {b.accommodation?.city}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-4 h-4" /> {fmt(b.check_in)} – {fmt(b.check_out)}
                      </p>
                    </Link>

                    {/* Montant */}
                    <div className="md:text-right">
                      <p className="text-xs text-gray-400">Montant</p>
                      <p className="font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatPrice(b.total_price)} XOF</p>
                    </div>

                    {/* Statut */}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${STATUS[b.status]?.cls || ''}`}>
                      {STATUS[b.status]?.label || b.status}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Link href={`/bookings/${b.id}`} title="Gérer / modifier" className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <Link href={`/bookings/${b.id}#receipt`} title="Télécharger le bon / reçu" className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors">
                        <Download className="w-4 h-4" />
                      </Link>
                      {canCancel && (
                        <Link href={`/bookings/${b.id}/cancel`} title="Annuler la réservation" className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {needsPayment && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm text-amber-600 dark:text-amber-400">Paiement en attente pour confirmer cette réservation.</p>
                      <Link href={`/bookings/${b.id}/payment`} className="btn-primary text-sm inline-flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Payer maintenant
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MemberAside />
    </div>
  );
}
