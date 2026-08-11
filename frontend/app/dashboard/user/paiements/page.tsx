'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import MemberAside from '@/components/dashboard/user/MemberAside';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatPrice } from '@/lib/utils';
import { CreditCard, Wallet, FileText, Hash } from 'lucide-react';

interface Payment {
  id: number;
  amount: number;
  status: string;
  purpose?: string;
  payment_method?: string;
  reference?: string;
  transaction_id?: string;
  paid_at?: string | null;
  created_at?: string;
  booking_id?: number;
  accommodation?: { name: string; city: string } | null;
}

const METHOD_LABELS: Record<string, string> = {
  'wave-ci': 'Wave', 'orange-ci': 'Orange Money', 'visa-mastercard': 'Visa / Mastercard', 'djamo': 'Djamo',
};
const STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Payé', cls: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
  pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  failed: { label: 'Échoué', cls: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
  refunded: { label: 'Remboursé', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
};
const PURPOSE: Record<string, string> = {
  full: 'Paiement intégral', guarantee: '1ère nuitée garantie', deposit: 'Acompte',
};

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function MemberPaymentsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/user/paiements');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    api.get('/me/payments')
      .then((r) => { setPayments(r.data?.data ?? []); setTotalPaid(r.data?.total_paid ?? 0); })
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, isLoading]);

  if (isLoading || (loading && isAuthenticated)) return <LoadingSpinner message="Chargement de vos paiements…" size="lg" />;
  if (!isAuthenticated) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Paiements</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Historique de vos paiements, reçus et remboursements.</p>
        </div>

        {/* Total réglé */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
          <span className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><Wallet className="w-6 h-6" /></span>
          <div>
            <p className="text-sm text-gray-500">Total réglé</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(totalPaid)} XOF</p>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center">
            <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">Aucun paiement pour le moment.</p>
            <Link href="/dashboard/user/reservations" className="btn-primary inline-block">Voir mes réservations</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{p.accommodation?.name || `Réservation #${p.booking_id ?? ''}`}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {PURPOSE[p.purpose || ''] || 'Paiement'}
                      {p.payment_method && <> · {METHOD_LABELS[p.payment_method] || p.payment_method}</>}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span>{fmtDate(p.paid_at || p.created_at)}</span>
                      {p.reference && <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" />{p.reference}</span>}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatPrice(p.amount)} XOF</p>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS[p.status]?.cls || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS[p.status]?.label || p.status}
                    </span>
                  </div>

                  {p.booking_id && (
                    <Link href={`/bookings/${p.booking_id}#receipt`} title="Voir le reçu" className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </Link>
                  )}
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
