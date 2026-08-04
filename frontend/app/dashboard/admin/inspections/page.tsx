'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { isAdminOrController } from '@/lib/userUtils';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';
import { isController, isAdmin } from '@/lib/userUtils';
import {
  FileCheck,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Play,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface Inspection {
  id: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  result?: 'approved' | 'rejected' | 'pending_review';
  score?: number;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  accommodation?: {
    id: number;
    name: string;
    city: string;
  };
  inspector?: {
    id: number;
    name: string;
  };
  created_at: string;
}

export default function AdminInspectionsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    per_page: 15,
    current_page: 1,
    last_page: 1,
  });

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user || (!isAdmin(user) && !isController(user)))) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user && (isAdmin(user) || isController(user))) {
      fetchInspections();
    }
  }, [isAuthenticated, user, currentPage, statusFilter, resultFilter, search]);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {
        page: currentPage,
        per_page: 15,
      };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (resultFilter !== 'all') params.result = resultFilter;

      const response = await api.get('/admin/inspections', { params });
      setInspections(response.data.data || []);
      setPagination(response.data.pagination || {
        total: 0,
        per_page: 15,
        current_page: 1,
        last_page: 1,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des inspections');
      console.error('Error fetching inspections:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          Planifiée
        </span>
      ),
      in_progress: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          En cours
        </span>
      ),
      completed: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Complétée
        </span>
      ),
      cancelled: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
          Annulée
        </span>
      ),
    };
    return badges[status as keyof typeof badges] || badges.scheduled;
  };

  const getResultBadge = (result?: string) => {
    if (!result) return null;
    const badges = {
      approved: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Approuvée
        </span>
      ),
      rejected: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Rejetée
        </span>
      ),
      pending_review: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          En révision
        </span>
      ),
    };
    return badges[result as keyof typeof badges];
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

  if (!isAuthenticated || !user || !isAdminOrController(user)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Gestion des Inspections
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Suivez et gérez les inspections sur site
            </p>
          </div>
          <div className="flex gap-3">
            {(isAdmin(user) || isController(user)) && (
              <Link href="/dashboard/admin/inspections/new" className="btn-primary">
                Nouvelle inspection
              </Link>
            )}
            {/* Les contrôleurs ne voient pas le bouton "Retour au dashboard" */}
            {isAdmin(user) && (
              <Link href="/dashboard/admin" className="btn-secondary">
                Retour au dashboard
              </Link>
            )}
          </div>
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
                  placeholder="Rechercher par établissement, contrôleur..."
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
                <option value="scheduled">Planifiées</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Complétées</option>
                <option value="cancelled">Annulées</option>
              </select>
            </div>
            <div>
              <select
                value={resultFilter}
                onChange={(e) => {
                  setResultFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">Tous les résultats</option>
                <option value="approved">Approuvées</option>
                <option value="rejected">Rejetées</option>
                <option value="pending_review">En révision</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des inspections */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Établissement
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Contrôleur
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Statut
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Résultat
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Score
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {inspections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Aucune inspection trouvée
                    </td>
                  </tr>
                ) : (
                  inspections.map((inspection) => (
                    <tr
                      key={inspection.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {inspection.accommodation?.name || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {inspection.accommodation?.city || ''}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {inspection.inspector?.name || 'N/A'}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(inspection.status)}
                      </td>
                      <td className="py-4 px-4">
                        {getResultBadge(inspection.result)}
                      </td>
                      <td className="py-4 px-4">
                        {inspection.score !== null && inspection.score !== undefined ? (
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {inspection.score.toFixed(1)}/100
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {inspection.scheduled_at
                            ? new Date(inspection.scheduled_at).toLocaleDateString('fr-FR')
                            : new Date(inspection.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Link
                          href={`/dashboard/admin/inspections/${inspection.id}`}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
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
      </main>
    </div>
  );
}

