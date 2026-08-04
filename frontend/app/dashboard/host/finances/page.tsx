'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { formatPrice } from '@/lib/utils';
import DateRangeFilter, { useDefaultDateRange } from '@/components/common/DateRangeFilter';
import { DollarSign, TrendingUp, Calendar, Wallet, Clock, Send, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Revenue {
  id: number;
  booking_amount: number;
  commission_rate: number;
  commission_amount: number;
  host_amount: number;
  status: string;
  created_at: string;
  booking: { id: number; accommodation: { name: string } };
}

interface RevenueData {
  statistics: {
    total_revenue: number;
    available_balance?: number;
    awaiting_checkin?: number;
    paid_revenue: number;
    pending_revenue: number;
    total_bookings: number;
  };
  revenues: { data: Revenue[] };
}

interface WithdrawalRequest {
  id: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  payment_reference: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
}

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', Icon: Clock },
  approved: { label: 'Approuvée', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', Icon: CheckCircle },
  rejected: { label: 'Refusée', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', Icon: XCircle },
};

export default function HostFinancesPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'retraits' ? 'retraits' : 'revenus';
  const [tab, setTab] = useState<'revenus' | 'retraits'>(initialTab);

  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [balance, setBalance] = useState<{ available_balance: number } | null>(null);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const defaultRange = useDefaultDateRange(30);
  const [dateRange, setDateRange] = useState(defaultRange);

  const [amount, setAmount] = useState('');
  const [hostNote, setHostNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [revenueRes, balanceRes, requestsRes] = await Promise.all([
        api.get('/revenue/host', { params: { from_date: dateRange.from, to_date: dateRange.to } }),
        api.get('/host/withdrawal-requests/balance'),
        api.get('/host/withdrawal-requests'),
      ]);
      setRevenueData(revenueRes.data);
      setBalance(balanceRes.data);
      setRequests(Array.isArray(requestsRes.data?.data) ? requestsRes.data.data : requestsRes.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des données financières');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to]);

  const available = balance?.available_balance ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(amount.replace(/\s/g, ''), 10);
    if (isNaN(num) || num <= 0) {
      setSubmitError('Montant invalide');
      return;
    }
    if (num > available) {
      setSubmitError('Le montant ne peut pas dépasser le solde disponible');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post('/host/withdrawal-requests', { amount: num, host_note: hostNote.trim() || undefined });
      setAmount('');
      setHostNote('');
      await fetchAll();
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Erreur lors de la demande');
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finances</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Revenus, commissions et demandes de retrait</p>
        </div>
        {tab === 'revenus' && (
          <DateRangeFilter
            from={dateRange.from}
            to={dateRange.to}
            onRangeChange={(from, to) => setDateRange({ from, to })}
            label="Période"
          />
        )}
      </div>

      {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['revenus', 'retraits'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-bosejour-red text-bosejour-red'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            {t === 'revenus' ? 'Revenus' : 'Demandes de retrait'}
          </button>
        ))}
      </div>

      {tab === 'revenus' && revenueData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Chiffre d&apos;affaires</p>
                  <p className="text-2xl font-bold text-bosejour-red">{formatPrice(revenueData.statistics.total_revenue)} FCFA</p>
                </div>
                <DollarSign className="w-8 h-8 text-bosejour-red opacity-50" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Revenus payés</p>
                  <p className="text-2xl font-bold text-green-600">{formatPrice(revenueData.statistics.paid_revenue)} FCFA</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">En attente</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatPrice(revenueData.statistics.pending_revenue)} FCFA</p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-600 opacity-50" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Solde disponible</p>
                  <p className="text-2xl font-bold text-bosejour-red">{formatPrice(available)} FCFA</p>
                </div>
                <Wallet className="w-8 h-8 text-bosejour-red opacity-50" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Historique des revenus</h2>
            {revenueData.revenues.data.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Aucun revenu pour cette période</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">Hébergement</th>
                      <th className="text-right py-2 px-3">Montant</th>
                      <th className="text-right py-2 px-3">Commission</th>
                      <th className="text-right py-2 px-3">Votre revenu</th>
                      <th className="text-center py-2 px-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueData.revenues.data.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 px-3">{format(new Date(r.created_at), 'dd MMM yyyy', { locale: fr })}</td>
                        <td className="py-2 px-3">{r.booking.accommodation.name}</td>
                        <td className="py-2 px-3 text-right">{formatPrice(r.booking_amount)} FCFA</td>
                        <td className="py-2 px-3 text-right text-red-600">-{formatPrice(r.commission_amount)} FCFA</td>
                        <td className="py-2 px-3 text-right font-semibold text-bosejour-red">{formatPrice(r.host_amount)} FCFA</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              r.status === 'paid'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : r.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}
                          >
                            {r.status === 'paid' ? 'Payé' : r.status === 'pending' ? 'En attente' : 'Annulé'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'retraits' && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <Send className="w-5 h-5" />
              Nouvelle demande de retrait
            </h2>
            {available <= 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                Votre solde disponible est de 0 FCFA. Les montants sont débloqués après l&apos;enregistrement de l&apos;arrivée du client (code réservation).
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Montant (FCFA)
                  </label>
                  <input
                    id="amount"
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 50000"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label htmlFor="host_note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Note (optionnel)
                  </label>
                  <textarea
                    id="host_note"
                    value={hostNote}
                    onChange={(e) => setHostNote(e.target.value)}
                    rows={2}
                    placeholder="Coordonnées bancaires ou précision..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                  />
                </div>
                {submitError && <p className="text-sm text-red-600">{submitError}</p>}
                <button
                  type="submit"
                  disabled={submitting || available <= 0}
                  className="bg-bosejour-red hover:opacity-90 text-white font-semibold py-2 px-4 rounded-lg inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Envoi...' : 'Demander un retrait'}
                </button>
              </form>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Historique des demandes</h2>
            {requests.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Aucune demande de retrait</p>
            ) : (
              <ul className="space-y-3">
                {requests.map((req) => {
                  const config = statusConfig[req.status];
                  const Icon = config.Icon;
                  return (
                    <li
                      key={req.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-gray-400" />
                        <span className="font-semibold">{formatPrice(req.amount)} FCFA</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${config.color}`}>{config.label}</span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(req.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                        {req.processed_at && <> · Traitée le {format(new Date(req.processed_at), 'dd MMM yyyy', { locale: fr })}</>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
