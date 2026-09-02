'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { isController, isAdmin } from '@/lib/userUtils';
import { useToast } from '@/components/common/ToastContext';
import { useValidation } from '@/components/common/ValidationContext';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';
import {
  UserCheck,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  FileText,
  Home,
  Ban,
} from 'lucide-react';
import Link from 'next/link';

interface ComplianceRequirement {
  key: string;
  label: string;
  ok?: boolean;
  info?: string;
}

interface Host {
  id: number;
  name: string;
  email: string;
  phone?: string;
  establishment_name?: string;
  profile_verified: boolean;
  profile_verified_at?: string;
  compliance_status?: 'conforme' | 'non_conforme';
  compliance_requirements?: ComplianceRequirement[];
  status: 'active' | 'inactive' | 'blocked' | 'suspended';
  created_at: string;
  host_validation_history?: Array<{
    id: number;
    action: string;
    comment?: string;
    created_at: string;
    validator?: {
      name: string;
    };
  }>;
}

export default function AdminHostsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    per_page: 15,
    current_page: 1,
    last_page: 1,
  });
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showActionModal, setShowActionModal] = useState<{
    type: 'validate' | 'reject' | 'suspend' | null;
    hostId: number | null;
  }>({ type: null, hostId: null });
  const [actionComment, setActionComment] = useState('');
  const [actionInternalNotes, setActionInternalNotes] = useState('');
  const { showError, showWarning, showSuccess } = useToast();
  const showValidation = useValidation();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Rediriger les contrôleurs vers leur page d'inspections
      if (isController(user)) {
        router.push('/dashboard/admin/inspections');
        return;
      }
      // Rediriger les non-admins vers la page de login
      if (!isAdmin(user)) {
        router.push('/auth/login');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user && isAdmin(user)) {
      fetchHosts();
    }
  }, [isAuthenticated, user, currentPage, statusFilter, verifiedFilter, search]);

  const fetchHosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {
        page: currentPage,
        per_page: 15,
      };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (verifiedFilter !== 'all') params.profile_verified = verifiedFilter === 'verified';

      const response = await api.get('/admin/hosts', { params });
      setHosts(response.data.data || []);
      setPagination(response.data.pagination || {
        total: 0,
        per_page: 15,
        current_page: 1,
        last_page: 1,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des hôtes');
      console.error('Error fetching hosts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (type: 'validate' | 'reject' | 'suspend', hostId: number) => {
    if (type === 'reject' && !actionComment.trim()) {
      showWarning('Veuillez indiquer un motif de rejet');
      return;
    }

    const host = hosts.find(h => h.id === hostId);

    // Si validation et hôte non conforme, afficher un avertissement mais permettre la validation
    if (type === 'validate' && host?.compliance_status === 'non_conforme') {
      showValidation({
        title: 'Valider un profil non conforme',
        message: 'Cet hôte est validé mais son profil reste non conforme. Ses établissements afficheront la mention "Profil non conforme". L\'hôte est invité à compléter ses documents manquants.',
        requirements: host?.compliance_requirements || [],
        complianceStatus: 'non_conforme',
        variant: 'warning',
        actionLabel: 'Valider quand même',
        cancelLabel: 'Annuler',
        onAction: () => executeValidation(hostId),
      });
      return;
    }

    // Si validation normale (conforme), exécuter directement
    if (type === 'validate') {
      executeValidation(hostId);
      return;
    }

    // Pour les autres actions (reject, suspend)
    executeAction(type, hostId);
  };

  const executeValidation = async (hostId: number) => {
    try {
      setActionLoading(hostId);
      const response = await api.post(`/admin/hosts/${hostId}/validate`, {
        comment: actionComment || undefined,
        internal_notes: actionInternalNotes || undefined,
      });
      setShowActionModal({ type: null, hostId: null });
      setActionComment('');
      setActionInternalNotes('');

      // Afficher un message approprié selon le statut de conformité
      if (response.data.compliance_status === 'non_conforme') {
        showWarning('Hôte validé mais profil non conforme - documents manquants');
      } else {
        showSuccess('Hôte validé avec succès');
      }

      fetchHosts();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la validation');
    } finally {
      setActionLoading(null);
    }
  };

  const executeAction = async (type: 'reject' | 'suspend', hostId: number) => {
    try {
      setActionLoading(hostId);
      const endpoint = type === 'reject' ? 'reject' : 'suspend';
      await api.post(`/admin/hosts/${hostId}/${endpoint}`, {
        comment: actionComment || undefined,
        internal_notes: actionInternalNotes || undefined,
      });
      setShowActionModal({ type: null, hostId: null });
      setActionComment('');
      setActionInternalNotes('');
      fetchHosts();
      showSuccess(type === 'reject' ? 'Hôte rejeté' : 'Hôte suspendu');
    } catch (err: any) {
      showError(err.response?.data?.message || `Erreur lors de l'action ${type}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Actif
        </span>
      ),
      inactive: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
          Inactif
        </span>
      ),
      blocked: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Bloqué
        </span>
      ),
      suspended: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Suspendu
        </span>
      ),
    };
    return badges[status as keyof typeof badges] || badges.inactive;
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

  if (!isAuthenticated || !user || !isAdmin(user)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Gestion des Hôtes
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Validez, rejetez ou suspendez les hôtes de la plateforme
            </p>
          </div>
          <Link href="/dashboard/admin" className="btn-secondary">
            Retour au dashboard
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Filtres et recherche */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, établissement..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
                <option value="blocked">Bloqués</option>
                <option value="suspended">Suspendus</option>
              </select>
            </div>
            <div>
              <select
                value={verifiedFilter}
                onChange={(e) => {
                  setVerifiedFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">Tous</option>
                <option value="verified">Validés</option>
                <option value="pending">En attente</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des hôtes */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Hôte
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Établissement
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Statut
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Validation
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {hosts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Aucun hôte trouvé
                    </td>
                  </tr>
                ) : (
                  hosts.map((host) => (
                    <tr
                      key={host.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {host.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {host.email}
                          </p>
                          {host.phone && (
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {host.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {host.establishment_name || 'Non renseigné'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(host.status)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-2">
                          {host.profile_verified ? (
                            <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle className="w-3 h-3" />
                              Validé
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                              <Clock className="w-3 h-3" />
                              En attente
                            </span>
                          )}
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              host.compliance_status === 'conforme'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {host.compliance_status === 'conforme' ? 'Conforme' : 'Non conforme'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/admin/hosts/${host.id}`}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {!host.profile_verified && (
                            <>
                              <button
                                onClick={() => setShowActionModal({ type: 'validate', hostId: host.id })}
                                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                title="Valider"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setShowActionModal({ type: 'reject', hostId: host.id })}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="Rejeter"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {host.profile_verified && host.status === 'active' && (
                            <button
                              onClick={() => setShowActionModal({ type: 'suspend', hostId: host.id })}
                              className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors"
                              title="Suspendre"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.last_page > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={pagination.current_page}
                totalPages={pagination.last_page}
                onPageChange={setCurrentPage}
                totalItems={pagination.total}
                itemsPerPage={pagination.per_page}
              />
            </div>
          )}
        </div>

        {/* Modal d'action */}
        {showActionModal.type && showActionModal.hostId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                {showActionModal.type === 'validate' && 'Valider l\'hôte'}
                {showActionModal.type === 'reject' && 'Rejeter l\'hôte'}
                {showActionModal.type === 'suspend' && 'Suspendre l\'hôte'}
              </h3>
              
              <div className="space-y-4">
                {showActionModal.type === 'reject' && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Motif de rejet <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={actionComment}
                      onChange={(e) => setActionComment(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Indiquez le motif du rejet..."
                      required
                    />
                  </div>
                )}
                
                {(showActionModal.type === 'validate' || showActionModal.type === 'suspend') && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Commentaire (optionnel)
                    </label>
                    <textarea
                      value={actionComment}
                      onChange={(e) => setActionComment(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Commentaire..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Notes internes (optionnel)
                  </label>
                  <textarea
                    value={actionInternalNotes}
                    onChange={(e) => setActionInternalNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Notes visibles uniquement par les admins..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowActionModal({ type: null, hostId: null });
                    setActionComment('');
                    setActionInternalNotes('');
                  }}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleAction(showActionModal.type!, showActionModal.hostId!)}
                  disabled={actionLoading === showActionModal.hostId || (showActionModal.type === 'reject' && !actionComment.trim())}
                  className={`flex-1 ${
                    showActionModal.type === 'validate' ? 'btn-primary' :
                    showActionModal.type === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-yellow-600 hover:bg-yellow-700'
                  } text-white disabled:opacity-50`}
                >
                  {actionLoading === showActionModal.hostId ? 'Traitement...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

