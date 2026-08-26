'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatPrice } from '@/lib/utils';
import { Award, Users, TrendingUp, Tag, Wallet, Percent, ArrowRight, Building2 } from 'lucide-react';

interface AccommodationRef {
  id: number;
  name: string;
  joined_at: string | null;
}

interface TopAdvantage {
  label: string;
  count: number;
  total_cost: number;
}

interface LoyaltyStats {
  participating: boolean;
  total_accommodations?: number;
  period_months?: number;
  members_bookings_count?: number;
  revenue_generated?: number;
  advantage_cost?: number;
  net_revenue?: number;
  conversion_rate?: number;
  roi_estimated?: number | null;
  top_advantages?: TopAdvantage[];
  accommodations: AccommodationRef[];
}

export default function HostLoyaltyPage() {
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/host/loyalty/stats')
      .then((r) => setStats(r.data?.data ?? null))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner message="Chargement du programme de fidélité…" size="lg" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Award className="w-6 h-6 text-bosejour-red" /> Programme de fidélité
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Performances du Programme Membre bo séjour sur vos établissements participants.
        </p>
      </div>

      {!stats || !stats.participating ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-8 text-center">
          <Award className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Aucun établissement participant</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
            Rejoignez le programme de fidélité bo séjour depuis la fiche d&apos;un établissement pour
            attirer les membres fidèles et suivre ici vos performances (réservations, chiffre
            d&apos;affaires, coût des avantages, ROI estimé).
          </p>
          <Link href="/dashboard/host/property" className="btn-primary text-sm inline-flex items-center gap-2">
            Gérer mes établissements <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Réservations membres', value: stats.members_bookings_count ?? 0, icon: Users },
              { label: "Chiffre d'affaires généré", value: `${formatPrice(stats.revenue_generated ?? 0)} F`, icon: TrendingUp },
              { label: 'Coût des avantages', value: `${formatPrice(stats.advantage_cost ?? 0)} F`, icon: Tag },
              { label: 'Chiffre d\'affaires net', value: `${formatPrice(stats.net_revenue ?? 0)} F`, icon: Wallet },
              { label: 'Taux de conversion', value: `${stats.conversion_rate ?? 0}%`, icon: Percent },
              { label: 'ROI estimé', value: stats.roi_estimated != null ? `x${stats.roi_estimated}` : '—', icon: Award },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <s.icon className="w-4 h-4 text-bosejour-red mb-1.5 opacity-70" />
                <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Sur les {stats.period_months ?? 6} derniers mois. Le ROI estimé est indicatif (chiffre
            d&apos;affaires net généré pour chaque FCFA d&apos;avantage accordé).
          </p>

          {/* Avantages les plus utilisés */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Avantages les plus utilisés</h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              {(stats.top_advantages?.length ?? 0) === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 p-8 text-center">
                  Aucun avantage fidélité utilisé sur cette période.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {stats.top_advantages!.map((a) => (
                    <div key={a.label} className="p-4 flex items-center justify-between gap-3">
                      <p className="font-medium text-gray-900 dark:text-white">{a.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {a.count} utilisation{a.count > 1 ? 's' : ''} · {formatPrice(a.total_cost)} F
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Établissements */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-bosejour-red" /> Établissements
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {stats.accommodations.map((a) => (
                  <div key={a.id} className="p-4 flex items-center justify-between gap-3">
                    <p className="font-medium text-gray-900 dark:text-white">{a.name}</p>
                    {a.joined_at ? (
                      <span className="text-xs text-green-700 dark:text-green-400">Participant</span>
                    ) : (
                      <Link href={`/dashboard/host/accommodations/${a.id}/edit`} className="text-xs text-primary hover:underline">
                        Rejoindre le programme
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
