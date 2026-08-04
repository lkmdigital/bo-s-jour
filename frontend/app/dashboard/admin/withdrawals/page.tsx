'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { isAdmin } from '@/lib/userUtils';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { formatPrice } from '@/lib/utils';
import { Wallet, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  processed_by?: { id: number; name: string } | null;
}

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [items, setItems] = useState<WithdrawalRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [modalRequest, setModalRequest] = useState<WithdrawalRequestItem | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin(user))) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && isAdmin(user)) {
      fetchData();
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/withdrawal-requests', { params: { per_page: 100 } });
      const data = response.data?.data ?? response.data ?? [];
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
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
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du traitement');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin(user)) {
    return null;
  }

  const statusConfig = {
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', Icon: Clock },
    approved: { label: 'Approuvée', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', Icon: CheckCircle },
    rejected: { label: 'Refusée', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', Icon: XCircle },
  };

  const pendingCount = items.filter((i) => i.status === 'pending').length;

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wallet className="w-8 h-8 text-primary" />
            Demandes de retrait
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Approuver ou refuser les demandes de retrait des hôtes
          </p>
          {pendingCount > 0 && (
            <p className="mt-2 text-amber-600 dark:text-amber-400 font-medium">
              {pendingCount} demande(s) en attente
            </p>
          )}
        </div>

        {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

        <div className="card overflow-hidden">
          {items.length === 0 ? (
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
                  {items.map((req) => {
                    const config = statusConfig[req.status];
                    const Icon = config.Icon;
                    return (
                      <tr key={req.id} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <div>
                              <span className="font-medium">{req.host?.name ?? `Hôte #${req.host_id}`}</span>
                              {req.host?.email && (
                                <span className="block text-sm text-gray-500">{req.host.email}</span>
                              )}
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
                              <button
                                type="button"
                                onClick={() => openModal(req, 'approve')}
                                className="text-green-600 hover:text-green-700 dark:text-green-400 font-medium text-sm"
                              >
                                Approuver
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                type="button"
                                onClick={() => openModal(req, 'reject')}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 font-medium text-sm"
                              >
                                Refuser
                              </button>
                            </div>
                          )}
                          {req.status !== 'pending' && req.processed_at && (
                            <span className="text-xs text-gray-500">
                              Traitée le {format(new Date(req.processed_at), 'dd MMM yyyy', { locale: fr })}
                            </span>
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

        {/* Modal Approuver / Refuser */}
        {modalRequest && actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModal}>
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
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
      </main>
    </div>
  );
}
