'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import MemberAside from '@/components/dashboard/user/MemberAside';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatPrice } from '@/lib/utils';
import { Wallet, CheckCircle2, Clock, XCircle, Search } from 'lucide-react';

interface Credit {
  id: number;
  amount: number;
  currency: string;
  status: 'available' | 'used' | 'expired';
  source_type: string;
  expires_at: string | null;
  used_at: string | null;
  note: string | null;
  source_booking?: { id: number; check_in: string; check_out: string; accommodation?: { name: string } } | null;
}

const SOURCE_LABEL: Record<string, string> = {
  cancellation: 'Annulation',
  manual: 'Avoir accordé',
  promotion: 'Promotion',
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function StatusBadge({ status }: { status: Credit['status'] }) {
  if (status === 'available') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5" /> Disponible
      </span>
    );
  }
  if (status === 'used') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        <Clock className="w-3.5 h-3.5" /> Utilisé
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
      <XCircle className="w-3.5 h-3.5" /> Expiré
    </span>
  );
}

export default function MemberCreditsPage() {
  const router = useRouter();
  const t = useTranslations('member.pages.credits');
  const { isAuthenticated, isLoading } = useAuthStore();
  const [balance, setBalance] = useState(0);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/user/avoirs');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    api.get('/credits')
      .then((r) => {
        setBalance(r.data?.balance ?? 0);
        const list = r.data?.credits?.data ?? r.data?.credits ?? [];
        setCredits(Array.isArray(list) ? list : []);
      })
      .catch(() => { setBalance(0); setCredits([]); })
      .finally(() => setLoading(false));
  }, [isAuthenticated, isLoading]);

  if (isLoading || (loading && isAuthenticated)) return <LoadingSpinner message="Chargement de vos avoirs…" size="lg" />;
  if (!isAuthenticated) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>

        {/* Solde */}
        <div className="rounded-2xl bg-gray-900 text-white p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-300 flex items-center gap-2"><Wallet className="w-4 h-4" /> Solde disponible</p>
            <p className="text-3xl font-bold mt-1">{formatPrice(balance)} F</p>
          </div>
          {balance > 0 && (
            <Link href="/dashboard/user/recherche" className="btn-primary text-sm inline-flex items-center gap-2 whitespace-nowrap">
              <Search className="w-4 h-4" /> Rechercher un séjour
            </Link>
          )}
        </div>
        {balance > 0 && (
          <p className="text-xs text-gray-400 -mt-3">
            L&apos;application de votre avoir sur une prochaine réservation est actuellement gérée par notre équipe —
            contactez le support depuis votre réservation pour en bénéficier.
          </p>
        )}

        {/* Liste */}
        {credits.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center">
            <Wallet className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Vous n&apos;avez aucun avoir pour le moment.</p>
            <p className="text-sm text-gray-400 mt-1">
              Un avoir est créé automatiquement lorsqu&apos;une annulation y ouvre droit selon la politique de l&apos;établissement.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {credits.map((c) => (
              <div key={c.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white">{formatPrice(c.amount)} {c.currency === 'XOF' ? 'F' : c.currency}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {SOURCE_LABEL[c.source_type] || c.source_type}
                      {c.source_booking?.accommodation?.name && ` · ${c.source_booking.accommodation.name}`}
                    </p>
                    {c.note && <p className="text-xs text-gray-400 mt-1">{c.note}</p>}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2 text-xs text-gray-400">
                  {c.source_booking && (
                    <Link href={`/bookings/${c.source_booking.id}`} className="hover:text-primary">Voir la réservation d&apos;origine</Link>
                  )}
                  {c.expires_at && c.status === 'available' && <span>Expire le {fmt(c.expires_at)}</span>}
                  {c.used_at && <span>Utilisé le {fmt(c.used_at)}</span>}
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
