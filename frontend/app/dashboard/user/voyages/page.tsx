'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import MemberAside from '@/components/dashboard/user/MemberAside';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Compass, MapPin, Calendar, Star } from 'lucide-react';

interface Booking {
  id: number;
  check_in: string;
  check_out: string;
  status: string;
  accommodation?: { name: string; city: string };
}

function nights(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}
function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function MemberTripsPage() {
  const router = useRouter();
  const t = useTranslations('member.pages.trips');
  const { isAuthenticated, isLoading } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/user/voyages');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    api.get('/bookings', { params: { per_page: 100 } })
      .then((r) => {
        const d = r.data;
        setBookings(Array.isArray(d) ? d : d?.data && Array.isArray(d.data) ? d.data : []);
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, isLoading]);

  const trips = useMemo(() => {
    const now = new Date();
    return bookings
      .filter((b) => b.status === 'completed' || (b.status === 'confirmed' && new Date(b.check_out) < now))
      .sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime());
  }, [bookings]);

  const byYear = useMemo(() => {
    const m = new Map<string, Booking[]>();
    for (const t of trips) {
      const y = String(new Date(t.check_in).getFullYear());
      if (!m.has(y)) m.set(y, []);
      m.get(y)!.push(t);
    }
    return [...m.entries()];
  }, [trips]);

  const stats = useMemo(() => {
    const cities = new Set(trips.map((t) => t.accommodation?.city).filter(Boolean));
    const totalNights = trips.reduce((s, t) => s + nights(t.check_in, t.check_out), 0);
    return { count: trips.length, cities: cities.size, totalNights };
  }, [trips]);

  if (isLoading || (loading && isAuthenticated)) return <LoadingSpinner message="Chargement de vos voyages…" size="lg" />;
  if (!isAuthenticated) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>

        {/* Stats réelles */}
        {trips.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.count}</p>
              <p className="text-xs text-gray-500 mt-1">Séjour{stats.count > 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <p className="text-2xl font-bold text-secondary">{stats.cities}</p>
              <p className="text-xs text-gray-500 mt-1">Ville{stats.cities > 1 ? 's' : ''} visitée{stats.cities > 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalNights}</p>
              <p className="text-xs text-gray-500 mt-1">Nuit{stats.totalNights > 1 ? 's' : ''}</p>
            </div>
          </div>
        )}

        {trips.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center">
            <Compass className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">Votre carnet de voyage est vide pour le moment.</p>
            <Link href="/dashboard/user/recherche" className="btn-primary inline-block">Préparer mon premier séjour</Link>
          </div>
        ) : (
          <div className="space-y-8">
            {byYear.map(([year, items]) => (
              <div key={year}>
                <h2 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-3">{year}</h2>
                <div className="space-y-3">
                  {items.map((t) => (
                    <Link key={t.id} href={`/bookings/${t.id}`} className="block rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:border-primary transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white truncate">{t.accommodation?.name}</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-4 h-4 text-primary" /> {t.accommodation?.city}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Calendar className="w-4 h-4" /> {fmt(t.check_in)} – {fmt(t.check_out)} · {nights(t.check_in, t.check_out)} nuit{nights(t.check_in, t.check_out) > 1 ? 's' : ''}</p>
                        </div>
                        <Star className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MemberAside />
    </div>
  );
}
