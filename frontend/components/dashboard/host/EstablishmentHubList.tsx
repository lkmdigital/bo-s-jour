'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { Building2, ArrowRight, Plus } from 'lucide-react';

interface Accommodation {
  id: number;
  name: string;
  city: string;
  status: string;
  images?: Array<{ id: number; url: string; is_primary?: boolean }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  published: { label: 'Publié', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  unavailable: { label: 'Indisponible', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  renovation: { label: 'En rénovation', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
};

interface Props {
  title: string;
  description: string;
  /** Construit l'URL cible pour un établissement donné */
  actionHref: (accommodationId: number) => string;
  actionLabel: string;
}

export default function EstablishmentHubList({ title, description, actionHref, actionLabel }: Props) {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/accommodations/my', { params: { per_page: 50 } })
      .then((res) => {
        const items = res.data?.data ?? res.data ?? [];
        setAccommodations(Array.isArray(items) ? items : []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Erreur lors du chargement'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        </div>
        <Link
          href="/dashboard/host/accommodations/new"
          className="bg-bosejour-red hover:opacity-90 text-white font-semibold py-2 px-4 rounded-lg inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter un établissement
        </Link>
      </div>

      {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

      {accommodations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-10 text-center">
          <Building2 className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Vous n&apos;avez pas encore d&apos;établissement.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accommodations.map((acc) => {
            const status = STATUS_LABELS[acc.status] ?? { label: acc.status, color: 'bg-gray-100 text-gray-700' };
            const image = acc.images?.find((i) => i.is_primary) ?? acc.images?.[0];
            return (
              <Link
                key={acc.id}
                href={actionHref(acc.id)}
                className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="h-32 bg-gray-100 dark:bg-gray-900 relative">
                  {image?.url ? (
                    <Image src={image.url} alt={acc.name} fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Building2 className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{acc.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${status.color}`}>{status.label}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{acc.city}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-bosejour-red">
                    {actionLabel}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
