'use client';

import Link from 'next/link';
import { BarChart3, Megaphone, ArrowRight } from 'lucide-react';
import EstablishmentHubList from '@/components/dashboard/host/EstablishmentHubList';

export default function HostStatsHubPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-bosejour-red" />
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Analyses détaillées</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Retrouvez les indicateurs complets (RevPAR, tendances, top hébergements)
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/host/analytics"
          className="inline-flex items-center gap-1 text-sm font-semibold text-bosejour-red"
        >
          Voir les analyses <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Megaphone className="w-8 h-8 text-bosejour-red" />
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Commercialisation</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Codes promo, offres et mises en avant pour doper vos réservations
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/host/promotions"
          className="inline-flex items-center gap-1 text-sm font-semibold text-bosejour-red"
        >
          Gérer mes promotions <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <EstablishmentHubList
        title="Statistiques par établissement"
        description="Choisissez un établissement pour voir ses statistiques détaillées"
        actionHref={(id) => `/dashboard/host/accommodations/${id}/stats`}
        actionLabel="Voir les statistiques"
      />
    </div>
  );
}
