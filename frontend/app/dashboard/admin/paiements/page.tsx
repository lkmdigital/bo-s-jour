'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { isAdminOrController } from '@/lib/userUtils';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Pagination from '@/components/common/Pagination';
import DateRangeFilter, { useDefaultDateRange } from '@/components/common/DateRangeFilter';
import { formatPrice } from '@/lib/utils';
import { CreditCard, Wallet, CheckCircle, XCircle, Clock, User, DollarSign, Gift, Download, Plus, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PaymentItem {
  id: number;
  amount: number;
  purpose: string;
  status: 'completed' | 'failed';
  payment_method: string | null;
  payment_reference: string | null;
  created_at: string;
  user?: { id: number; name: string; email: string };
  booking?: {
    id: number;
    accommodation?: { id: number; name: string; host?: { id: number; name: string } };
  };
}

interface PaymentsSummary {
  total_completed: number;
  total_failed: number;
  total_refunded: number;
  count_completed: number;
  count_failed: number;
  by_method: {
    'wave-ci': number;
    'orange-ci': number;
    'mtn-ci': number;
    'moov-ci': number;
    'visa-mastercard': number;
    djamo: number;
  };
}

const methodCards: Array<{ key: keyof PaymentsSummary['by_method']; label: string; color: string }> = [
  { key: 'wave-ci', label: 'Wave', color: 'text-blue-600 dark:text-blue-400' },
  { key: 'orange-ci', label: 'Orange Money', color: 'text-orange-600 dark:text-orange-400' },
  { key: 'mtn-ci', label: 'MTN Money', color: 'text-amber-500 dark:text-amber-400' },
  { key: 'moov-ci', label: 'Moov Money', color: 'text-sky-600 dark:text-sky-400' },
  { key: 'visa-mastercard', label: 'Carte bancaire', color: 'text-purple-600 dark:text-purple-400' },
  { key: 'djamo', label: 'Djamo', color: 'text-indigo-600 dark:text-indigo-400' },
];

interface WithdrawalRequestItem {
  id: number;
  host_id: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  payment_method: string | null;
  payment_reference: string | null;
  host_note: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  host?: { id: number; name: string; email: string };
}

interface ClientCreditItem {
  id: number;
  amount: number;
  currency: string;
  status: 'available' | 'used' | 'expired';
  source_type: string;
  expires_at: string | null;
  used_at: string | null;
  note: string | null;
  created_at: string;
  user?: { id: number; name: string; email: string };
  source_booking?: { id: number; accommodation?: { id: number; name: string } };
}

const creditStatusConfig: Record<string, { label: string; color: string }> = {
  available: { label: 'Disponible', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  used: { label: 'Utilisé', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  expired: { label: 'Expiré', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
};

const creditSourceLabels: Record<string, string> = {
  cancellation: 'Annulation',
  manual: 'Manuel',
  promotion: 'Promotion',
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  completed: { label: 'Payé', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  failed: { label: 'Échoué', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
};

const purposeLabels: Record<string, string> = {
  full: 'Paiement intégral',
  deposit: 'Acompte',
  guarantee: 'Garantie',
};

/** Format compact type "38,2 M" pour les cartes de résumé. */
function formatCompactFcfa(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} k`;
  }
  return amount.toLocaleString('fr-FR');
}

export default function AdminPaiementsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [tab, setTab] = useState<'transactions' | 'withdrawals' | 'credits'>('transactions');

  // Transactions
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [purposeFilter, setPurposeFilter] = useState('all');
  const defaultRange = useDefaultDateRange(30);
  const [dateRange, setDateRange] = useState(defaultRange);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, per_page: 20, current_page: 1, last_page: 1 });

  // Demandes de retrait
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequestItem[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const [withdrawalsError, setWithdrawalsError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [modalRequest, setModalRequest] = useState<WithdrawalRequestItem | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  // Avoirs
  const [credits, setCredits] = useState<ClientCreditItem[]>([]);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [creditsError, setCreditsError] = useState<string | null>(null);
  const [creditsSummary, setCreditsSummary] = useState<{ total_available: number; total_used: number; count_available: number } | null>(null);

  // Nouveau reversement (admin)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ host_id: '', amount: '', payment_method: 'wave-ci', payment_reference: '', admin_note: '' });
  const [hostSearch, setHostSearch] = useState('');
  const [hostResults, setHostResults] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [selectedHost, setSelectedHost] = useState<{ id: number; name: string; email: string } | null>(null);

  // Reçu imprimable
  const [receipt, setReceipt] = useState<{ type: 'payment' | 'withdrawal'; item: PaymentItem | WithdrawalRequestItem } | null>(null);

  const downloadCsv = async (url: string, params: Record<string, any>, filename: string) => {
    try {
      const response = await api.get(url, { params, responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Erreur export CSV', err);
    }
  };

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdminOrController(user))) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && isAdminOrController(user)) {
      fetchPayments();
    }
  }, [isAuthenticated, user, statusFilter, methodFilter, purposeFilter, dateRange.from, dateRange.to, search, currentPage]);

  useEffect(() => {
    if (isAuthenticated && isAdminOrController(user) && tab === 'withdrawals') {
      fetchWithdrawals();
    }
  }, [isAuthenticated, user, tab]);

  useEffect(() => {
    if (isAuthenticated && isAdminOrController(user) && tab === 'credits') {
      fetchCredits();
    }
  }, [isAuthenticated, user, tab]);

  useEffect(() => {
    if (!showCreateModal || hostSearch.trim().length < 2) {
      setHostResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      api.get('/admin/users', { params: { role: 'host', search: hostSearch, per_page: 5 } })
        .then((res) => setHostResults(res.data?.data ?? res.data ?? []))
        .catch(() => setHostResults([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [hostSearch, showCreateModal]);

  const fetchCredits = async () => {
    try {
      setLoadingCredits(true);
      setCreditsError(null);
      const response = await api.get('/admin/payments/credits', { params: { per_page: 100 } });
      setCredits(response.data.data || []);
      setCreditsSummary(response.data.summary || null);
    } catch (err: any) {
      setCreditsError(err.response?.data?.message || 'Erreur lors du chargement des avoirs');
    } finally {
      setLoadingCredits(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      setPaymentsError(null);
      const params: any = { page: currentPage, per_page: 20, from_date: dateRange.from, to_date: dateRange.to };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (methodFilter !== 'all') params.payment_method = methodFilter;
      if (purposeFilter !== 'all') params.purpose = purposeFilter;
      if (search) params.search = search;
      const response = await api.get('/admin/payments', { params });
      setPayments(response.data.data || []);
      setSummary(response.data.summary || null);
      setPagination(response.data.pagination || { total: 0, per_page: 20, current_page: 1, last_page: 1 });
    } catch (err: any) {
      setPaymentsError(err.response?.data?.message || 'Erreur lors du chargement des transactions');
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      setLoadingWithdrawals(true);
      setWithdrawalsError(null);
      const response = await api.get('/admin/withdrawal-requests', { params: { per_page: 100 } });
      const data = response.data?.data ?? response.data ?? [];
      setWithdrawals(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setWithdrawalsError(err.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setLoadingWithdrawals(false);
    }
  };

  const openModal = (req: WithdrawalRequestItem, action: 'approve' | 'reject') => {
    setModalRequest(req);
    setActionType(action);
    setAdminNote('');
  };

  const closeModal = () => {
    setModalRequest(null);
    setActionType(null);
    setAdminNote('');
  };

  const handleApproveReject = async () => {
    if (!modalRequest || !actionType) return;
    setProcessingId(modalRequest.id);
    try {
      const path = `/admin/withdrawal-requests/${modalRequest.id}/${actionType}`;
      await api.post(path, { admin_note: adminNote.trim() || undefined });
      closeModal();
      await fetchWithdrawals();
    } catch (err: any) {
      setWithdrawalsError(err.response?.data?.message || 'Erreur lors du traitement');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateWithdrawal = async () => {
    setCreateError(null);
    if (!createForm.host_id || !createForm.amount || !createForm.payment_method) {
      setCreateError('Hôte, montant et méthode sont requis.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/admin/withdrawal-requests', {
        host_id: Number(createForm.host_id),
        amount: Number(createForm.amount),
        payment_method: createForm.payment_method,
        payment_reference: createForm.payment_reference || undefined,
        admin_note: createForm.admin_note || undefined,
      });
      setShowCreateModal(false);
      setCreateForm({ host_id: '', amount: '', payment_method: 'wave-ci', payment_reference: '', admin_note: '' });
      setSelectedHost(null);
      setHostSearch('');
      await fetchWithdrawals();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Erreur lors de la création du reversement');
    } finally {
      setCreating(false);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateError(null);
    setCreateForm({ host_id: '', amount: '', payment_method: 'wave-ci', payment_reference: '', admin_note: '' });
    setSelectedHost(null);
    setHostSearch('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdminOrController(user)) {
    return null;
  }

  const withdrawalStatusConfig = {
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', Icon: Clock },
    approved: { label: 'Approuvée', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', Icon: CheckCircle },
    rejected: { label: 'Refusée', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', Icon: XCircle },
  };
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending').length;

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-primary" />
            Paiements
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Transactions voyageurs et demandes de retrait des hôtes
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Encaissé ({summary.count_completed})</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatPrice(summary.total_completed)} FCFA</p>
                </div>
                <DollarSign className="w-9 h-9 text-green-600 dark:text-green-400 opacity-50" />
              </div>
            </div>
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Échoués ({summary.count_failed})</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatPrice(summary.total_failed)} FCFA</p>
                </div>
                <XCircle className="w-9 h-9 text-red-600 dark:text-red-400 opacity-50" />
              </div>
            </div>
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
            {methodCards.map(({ key, label, color }) => (
              <div key={key} className="card text-center py-4">
                <p className={`text-xl font-bold ${color}`} title={`${formatPrice(summary.by_method[key])} FCFA`}>
                  {formatCompactFcfa(summary.by_method[key])}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
              </div>
            ))}
            <div className="card text-center py-4">
              <p className="text-xl font-bold text-red-600 dark:text-red-400" title={`${formatPrice(summary.total_refunded)} FCFA`}>
                {formatCompactFcfa(summary.total_refunded)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Remboursements</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setTab('transactions')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === 'transactions' ? 'border-primary text-primary' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Transactions
          </button>
          <button
            type="button"
            onClick={() => setTab('withdrawals')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5 ${
              tab === 'withdrawals' ? 'border-primary text-primary' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            Demandes de retrait
            {pendingWithdrawals > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold">{pendingWithdrawals}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('credits')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5 ${
              tab === 'credits' ? 'border-primary text-primary' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Gift className="w-4 h-4" />
            Avoirs
          </button>
        </div>

        {tab === 'transactions' && (
          <>
            <div className="card mb-6 space-y-4">
              <input
                type="text"
                placeholder="Rechercher par référence, voyageur..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="completed">Payé</option>
                  <option value="failed">Échoué</option>
                </select>
                <select
                  value={methodFilter}
                  onChange={(e) => { setMethodFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">Tous les moyens</option>
                  <option value="wave-ci">Wave</option>
                  <option value="orange-ci">Orange Money</option>
                  <option value="djamo">Djamo</option>
                  <option value="visa-mastercard">Visa / Mastercard</option>
                </select>
                <select
                  value={purposeFilter}
                  onChange={(e) => { setPurposeFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">Tous les types</option>
                  <option value="full">Paiement intégral</option>
                  <option value="deposit">Acompte</option>
                  <option value="guarantee">Garantie</option>
                </select>
              </div>
              <DateRangeFilter
                from={dateRange.from}
                to={dateRange.to}
                onRangeChange={(from, to) => { setDateRange({ from, to }); setCurrentPage(1); }}
              />
            </div>

            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => downloadCsv('/admin/payments/export', {
                  status: statusFilter !== 'all' ? statusFilter : undefined,
                  payment_method: methodFilter !== 'all' ? methodFilter : undefined,
                  purpose: purposeFilter !== 'all' ? purposeFilter : undefined,
                  from_date: dateRange.from,
                  to_date: dateRange.to,
                  search: search || undefined,
                }, `transactions-${new Date().toISOString().slice(0, 10)}.csv`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary"
              >
                <Download className="w-4 h-4" /> Exporter (CSV)
              </button>
            </div>

            {paymentsError && <ErrorDisplay error={paymentsError} onDismiss={() => setPaymentsError(null)} />}

            <div className="card overflow-hidden">
              {loadingPayments ? (
                <div className="py-12"><LoadingSpinner /></div>
              ) : payments.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 p-4">Aucune transaction</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Voyageur</th>
                        <th className="text-left py-3 px-4">Établissement</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-left py-3 px-4">Méthode</th>
                        <th className="text-right py-3 px-4">Montant</th>
                        <th className="text-center py-3 px-4">Statut</th>
                        <th className="text-right py-3 px-4">Reçu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => {
                        const config = paymentStatusConfig[p.status] || paymentStatusConfig.pending;
                        return (
                          <tr key={p.id} className="border-b border-gray-200 dark:border-gray-700">
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {format(new Date(p.created_at), 'dd MMM yyyy', { locale: fr })}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium">{p.user?.name ?? '—'}</span>
                              {p.user?.email && <span className="block text-xs text-gray-500">{p.user.email}</span>}
                            </td>
                            <td className="py-3 px-4">{p.booking?.accommodation?.name ?? '—'}</td>
                            <td className="py-3 px-4 text-sm">{purposeLabels[p.purpose] || p.purpose}</td>
                            <td className="py-3 px-4 text-sm capitalize">{p.payment_method?.replace(/-/g, ' ') ?? '—'}</td>
                            <td className="py-3 px-4 text-right font-semibold">{formatPrice(p.amount)} FCFA</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>{config.label}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setReceipt({ type: 'payment', item: p })}
                                className="text-gray-500 hover:text-primary"
                                title="Voir le reçu"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {pagination.last_page > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={pagination.current_page}
                  totalPages={pagination.last_page}
                  totalItems={pagination.total}
                  itemsPerPage={pagination.per_page}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}

        {tab === 'withdrawals' && (
          <>
            <div className="flex justify-end gap-4 mb-4">
              <button
                type="button"
                onClick={() => downloadCsv('/admin/withdrawal-requests/export', {}, `reversements-${new Date().toISOString().slice(0, 10)}.csv`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary"
              >
                <Download className="w-4 h-4" /> Exporter (CSV)
              </button>
              <button
                type="button"
                onClick={() => { setCreateError(null); setShowCreateModal(true); }}
                className="btn-primary inline-flex items-center gap-1.5 text-sm py-2 px-4"
              >
                <Plus className="w-4 h-4" /> Nouveau reversement
              </button>
            </div>

            {withdrawalsError && <ErrorDisplay error={withdrawalsError} onDismiss={() => setWithdrawalsError(null)} />}

            <div className="card overflow-hidden">
              {loadingWithdrawals ? (
                <div className="py-12"><LoadingSpinner /></div>
              ) : withdrawals.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 p-4">Aucune demande de retrait</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left py-3 px-4">Hôte</th>
                        <th className="text-right py-3 px-4">Montant</th>
                        <th className="text-center py-3 px-4">Statut</th>
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-right py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((req) => {
                        const config = withdrawalStatusConfig[req.status];
                        const Icon = config.Icon;
                        return (
                          <tr key={req.id} className="border-b border-gray-200 dark:border-gray-700">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <div>
                                  <span className="font-medium">{req.host?.name ?? `Hôte #${req.host_id}`}</span>
                                  {req.host?.email && <span className="block text-sm text-gray-500">{req.host.email}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold">{formatPrice(req.amount)} FCFA</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm ${config.color}`}>
                                <Icon className="w-4 h-4" />
                                {config.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {format(new Date(req.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {req.status === 'pending' && (
                                <div className="flex items-center justify-end gap-2">
                                  <button type="button" onClick={() => openModal(req, 'approve')} className="text-green-600 hover:text-green-700 dark:text-green-400 font-medium text-sm">
                                    Approuver
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  <button type="button" onClick={() => openModal(req, 'reject')} className="text-red-600 hover:text-red-700 dark:text-red-400 font-medium text-sm">
                                    Refuser
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  <button type="button" onClick={() => setReceipt({ type: 'withdrawal', item: req })} className="text-gray-500 hover:text-primary" title="Voir le reçu">
                                    <Printer className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              {req.status !== 'pending' && (
                                <div className="flex items-center justify-end gap-2">
                                  {req.processed_at && (
                                    <span className="text-xs text-gray-500">
                                      Traitée le {format(new Date(req.processed_at), 'dd MMM yyyy', { locale: fr })}
                                    </span>
                                  )}
                                  <button type="button" onClick={() => setReceipt({ type: 'withdrawal', item: req })} className="text-gray-500 hover:text-primary" title="Voir le reçu">
                                    <Printer className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'credits' && (
          <>
            {creditsSummary && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avoirs disponibles ({creditsSummary.count_available})</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatPrice(creditsSummary.total_available)} FCFA</p>
                    </div>
                    <Gift className="w-9 h-9 text-green-600 dark:text-green-400 opacity-50" />
                  </div>
                </div>
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avoirs utilisés</p>
                      <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{formatPrice(creditsSummary.total_used)} FCFA</p>
                    </div>
                    <CheckCircle className="w-9 h-9 text-gray-400 opacity-50" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => downloadCsv('/admin/payments/credits/export', {}, `avoirs-${new Date().toISOString().slice(0, 10)}.csv`)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary"
              >
                <Download className="w-4 h-4" /> Exporter (CSV)
              </button>
            </div>

            {creditsError && <ErrorDisplay error={creditsError} onDismiss={() => setCreditsError(null)} />}

            <div className="card overflow-hidden">
              {loadingCredits ? (
                <div className="py-12"><LoadingSpinner /></div>
              ) : credits.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 p-4">Aucun avoir</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left py-3 px-4">Client</th>
                        <th className="text-left py-3 px-4">Source</th>
                        <th className="text-right py-3 px-4">Montant</th>
                        <th className="text-center py-3 px-4">Statut</th>
                        <th className="text-left py-3 px-4">Expire le</th>
                      </tr>
                    </thead>
                    <tbody>
                      {credits.map((c) => {
                        const config = creditStatusConfig[c.status] || creditStatusConfig.available;
                        return (
                          <tr key={c.id} className="border-b border-gray-200 dark:border-gray-700">
                            <td className="py-3 px-4">
                              <span className="font-medium">{c.user?.name ?? '—'}</span>
                              {c.user?.email && <span className="block text-xs text-gray-500">{c.user.email}</span>}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {creditSourceLabels[c.source_type] || c.source_type}
                              {c.source_booking?.accommodation?.name && (
                                <span className="block text-xs text-gray-500">{c.source_booking.accommodation.name}</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold">{formatPrice(c.amount)} {c.currency}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>{config.label}</span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {c.expires_at ? format(new Date(c.expires_at), 'dd MMM yyyy', { locale: fr }) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal Approuver / Refuser */}
        {modalRequest && actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModal}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-2">
                {actionType === 'approve' ? 'Approuver la demande' : 'Refuser la demande'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {formatPrice(modalRequest.amount)} FCFA — {modalRequest.host?.name ?? `Hôte #${modalRequest.host_id}`}
              </p>
              {modalRequest.host_note && (
                <p className="text-sm text-gray-500 mb-2">Note de l&apos;hôte : {modalRequest.host_note}</p>
              )}
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note admin (optionnel)
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={2}
                placeholder="Réf. virement, motif..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleApproveReject}
                  disabled={processingId === modalRequest.id}
                  className={actionType === 'approve' ? 'btn-primary' : 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg'}
                >
                  {processingId === modalRequest.id ? 'Traitement...' : actionType === 'approve' ? 'Approuver' : 'Refuser'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nouveau reversement */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeCreateModal}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Nouveau reversement</h3>

              {createError && <ErrorDisplay error={createError} onDismiss={() => setCreateError(null)} />}

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hôte</label>
              {selectedHost ? (
                <div className="flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-3 bg-gray-50 dark:bg-gray-900/40">
                  <span className="text-sm">{selectedHost.name} — {selectedHost.email}</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedHost(null); setCreateForm((f) => ({ ...f, host_id: '' })); }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Changer
                  </button>
                </div>
              ) : (
                <div className="mb-3">
                  <input
                    type="text"
                    value={hostSearch}
                    onChange={(e) => setHostSearch(e.target.value)}
                    placeholder="Rechercher un hôte par nom ou email..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  />
                  {hostResults.length > 0 && (
                    <div className="mt-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      {hostResults.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            setSelectedHost(h);
                            setCreateForm((f) => ({ ...f, host_id: String(h.id) }));
                            setHostResults([]);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                        >
                          {h.name} — {h.email}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Montant (FCFA)</label>
              <input
                type="number"
                min="1"
                value={createForm.amount}
                onChange={(e) => setCreateForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 mb-3"
              />

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Méthode</label>
              <select
                value={createForm.payment_method}
                onChange={(e) => setCreateForm((f) => ({ ...f, payment_method: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 mb-3"
              >
                <option value="wave-ci">Wave</option>
                <option value="orange-ci">Orange Money</option>
                <option value="djamo">Djamo</option>
                <option value="visa-mastercard">Virement / Carte</option>
              </select>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Référence (optionnel)</label>
              <input
                type="text"
                value={createForm.payment_reference}
                onChange={(e) => setCreateForm((f) => ({ ...f, payment_reference: e.target.value }))}
                placeholder="N° de transaction, réf. virement..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 mb-3"
              />

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note admin (optionnel)</label>
              <textarea
                value={createForm.admin_note}
                onChange={(e) => setCreateForm((f) => ({ ...f, admin_note: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 mb-4"
              />

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeCreateModal} className="btn-secondary">
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreateWithdrawal}
                  disabled={creating}
                  className="btn-primary disabled:opacity-50"
                >
                  {creating ? 'Création...' : 'Créer le reversement'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Reçu imprimable */}
        {receipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setReceipt(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="print-receipt">
                <h3 className="text-xl font-bold mb-1">bo séjour</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {receipt.type === 'payment' ? 'Reçu de paiement' : 'Reçu de reversement'}
                </p>
                {receipt.type === 'payment' ? (() => {
                  const p = receipt.item as PaymentItem;
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Référence</span><span className="font-medium">{p.payment_reference ?? '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{format(new Date(p.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Voyageur</span><span className="font-medium">{p.user?.name ?? '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Établissement</span><span className="font-medium">{p.booking?.accommodation?.name ?? '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium">{purposeLabels[p.purpose] || p.purpose}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Méthode</span><span className="font-medium capitalize">{p.payment_method?.replace(/-/g, ' ') ?? '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Statut</span><span className="font-medium">{paymentStatusConfig[p.status]?.label ?? p.status}</span></div>
                      <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-base font-bold"><span>Montant</span><span>{formatPrice(p.amount)} FCFA</span></div>
                    </div>
                  );
                })() : (() => {
                  const w = receipt.item as WithdrawalRequestItem;
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Référence</span><span className="font-medium">{w.payment_reference ?? '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{format(new Date(w.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Hôte</span><span className="font-medium">{w.host?.name ?? `Hôte #${w.host_id}`}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Méthode</span><span className="font-medium capitalize">{w.payment_method?.replace(/-/g, ' ') ?? '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Statut</span><span className="font-medium">{withdrawalStatusConfig[w.status]?.label ?? w.status}</span></div>
                      {w.admin_note && <div className="flex justify-between"><span className="text-gray-500">Note</span><span className="font-medium">{w.admin_note}</span></div>}
                      <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-base font-bold"><span>Montant</span><span>{formatPrice(w.amount)} FCFA</span></div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex gap-2 justify-end mt-6 no-print">
                <button type="button" onClick={() => setReceipt(null)} className="btn-secondary">
                  Fermer
                </button>
                <button type="button" onClick={() => window.print()} className="btn-primary inline-flex items-center gap-1.5">
                  <Printer className="w-4 h-4" /> Imprimer / PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
