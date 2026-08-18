'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Map, Building2, Star, CalendarCheck, Globe2 } from 'lucide-react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { MapAccommodation } from '@/components/dashboard/admin/TourismMap';

const TourismMap = dynamic(() => import('@/components/dashboard/admin/TourismMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  ),
});

interface CityStat {
  city: string;
  accommodations_count: number;
  avg_rating: number | null;
  avg_price: number;
  total_reviews: number;
  bookings_count: number;
}

interface TypeStat {
  type: string;
  count: number;
}

interface StatsData {
  summary: {
    total_published: number;
    total_cities: number;
    platform_avg_rating: number | null;
    total_confirmed_bookings: number;
    top_city: string | null;
  };
  by_city: CityStat[];
  by_type: TypeStat[];
}

const TYPE_LABELS: Record<string, string> = {
  hotel: 'Hôtel',
  lodge: 'Écolodge',
  guesthouse: "Maison d'hôtes",
  apartment: 'Résidence',
  other: 'Autre',
};

function formatFCFA(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F';
}

export default function AdminTourismPage() {
  const [accommodations, setAccommodations] = useState<MapAccommodation[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/tourism/map').then((r) => setAccommodations(r.data?.data ?? [])).catch(() => setAccommodations([])).finally(() => setMapLoading(false));
    api.get('/admin/tourism/stats').then((r) => setStats(r.data)).catch(() => setStats(null)).finally(() => setStatsLoading(false));
  }, []);

  const maxCityCount = Math.max(1, ...(stats?.by_city.map((c) => c.accommodations_count) ?? [1]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Map className="w-6 h-6 text-primary" /> Base touristique
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Cartographie des établissements et statistiques de la plateforme bo séjour.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-400 flex items-start gap-2">
        <Globe2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
        Ces statistiques portent uniquement sur les établissements et réservations de la plateforme bo séjour — ce
        ne sont pas des statistiques officielles du tourisme ivoirien, aucune source gouvernementale n&apos;étant
        connectée ici.
      </div>

      {/* Résumé */}
      {statsLoading ? (
        <LoadingSpinner />
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Établissements</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.summary.total_published}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 flex items-center gap-1"><Globe2 className="w-3.5 h-3.5" /> Villes</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.summary.total_cities}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 flex items-center gap-1"><Star className="w-3.5 h-3.5" /> Note moyenne</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.summary.platform_avg_rating?.toFixed(1) ?? '–'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 flex items-center gap-1"><CalendarCheck className="w-3.5 h-3.5" /> Réservations</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.summary.total_confirmed_bookings}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500">Ville la plus représentée</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{stats.summary.top_city ?? '–'}</p>
          </div>
        </div>
      ) : null}

      {/* Carte */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Cartographie des établissements</h2>
        {mapLoading ? (
          <div className="h-[480px] rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : accommodations.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-8 text-center text-sm text-gray-500">
            Aucun établissement géolocalisé publié pour le moment.
          </div>
        ) : (
          <>
            <TourismMap accommodations={accommodations} />
            <p className="text-xs text-gray-400 flex items-center gap-3">
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Mis en avant</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-black inline-block" /> Standard</span>
              · {accommodations.length} établissement{accommodations.length > 1 ? 's' : ''} affiché{accommodations.length > 1 ? 's' : ''}
            </p>
          </>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Par ville */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Répartition par ville</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            {statsLoading ? (
              <LoadingSpinner />
            ) : !stats || stats.by_city.length === 0 ? (
              <p className="text-sm text-gray-500">Pas encore de données.</p>
            ) : (
              <div className="space-y-3">
                {stats.by_city.map((c) => (
                  <div key={c.city}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">{c.city}</span>
                      <span className="text-xs text-gray-500">
                        {c.accommodations_count} étab. · {formatFCFA(c.avg_price)}/nuit
                        {c.avg_rating ? ` · ${c.avg_rating.toFixed(1)}★` : ''}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(c.accommodations_count / maxCityCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Par type */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Répartition par type</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            {statsLoading ? (
              <LoadingSpinner />
            ) : !stats || stats.by_type.length === 0 ? (
              <p className="text-sm text-gray-500">Pas encore de données.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {stats.by_type.map((t) => (
                  <div key={t.type} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{t.count}</p>
                    <p className="text-xs text-gray-500">{TYPE_LABELS[t.type] ?? t.type}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
