'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/components/common/ConfirmContext';
import { useToast } from '@/components/common/ToastContext';
import { isController, isAdmin } from '@/lib/userUtils';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  Ban,
  Unlock,
  Edit,
  Eye,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive' | 'blocked' | 'suspended';
  blocked_at?: string;
  blocked_by?: number;
  block_reason?: string;
  last_login_at?: string;
  login_count: number;
  created_at: string;
  roles?: Array<{ id: number; name: string; display_name: string }>;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    per_page: 15,
    current_page: 1,
    last_page: 1,
  });
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const confirmAction = useConfirm();
  const { showError } = useToast();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Rediriger les contrôleurs vers leur page d'inspections (vérification via RBAC)
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
      fetchUsers();
    }
  }, [isAuthenticated, user, currentPage, statusFilter, roleFilter, search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {
        page: currentPage,
        per_page: 15,
      };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (roleFilter !== 'all') params.role = roleFilter;

      const response = await api.get('/admin/users', { params });
      setUsers(response.data.data || []);
      setPagination(response.data.pagination || {
        total: 0,
        per_page: 15,
        current_page: 1,
        last_page: 1,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des utilisateurs');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (userId: number) => {
    const ok = await confirmAction({
      title: 'Bloquer l\'utilisateur',
      message: 'Êtes-vous sûr de vouloir bloquer cet utilisateur ?',
      confirmLabel: 'Bloquer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      setActionLoading(userId);
      await api.post(`/admin/users/${userId}/block`, {
        reason: 'Bloqué par un administrateur',
      });
      fetchUsers();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors du blocage');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (userId: number) => {
    try {
      setActionLoading(userId);
      await api.post(`/admin/users/${userId}/unblock`);
      fetchUsers();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors du déblocage');
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

  const getRoleBadge = (role: string) => {
    const badges = {
      user: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          Utilisateur
        </span>
      ),
      host: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Hôte
        </span>
      ),
      admin: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
          Admin
        </span>
      ),
      super_admin: (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Super Admin
        </span>
      ),
    };
    return badges[role as keyof typeof badges] || badges.user;
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Gestion des Utilisateurs
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gérez tous les utilisateurs de la plateforme
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin/users/new"
              className="btn-primary"
            >
              Créer un utilisateur
            </Link>
            <Link
              href="/dashboard/admin"
              className="btn-secondary"
            >
              Retour au dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Filtres et recherche */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, téléphone..."
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
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">Tous les rôles</option>
                <option value="user">Utilisateur</option>
                <option value="host">Hôte</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>

        {/* Liste des utilisateurs */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Utilisateur
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Rôle
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Statut
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Dernière connexion
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                ) : (
                  users.map((userItem) => (
                    <tr
                      key={userItem.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {userItem.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {userItem.email}
                          </p>
                          {userItem.phone && (
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {userItem.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getRoleBadge(userItem.role)}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(userItem.status)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {userItem.last_login_at
                            ? new Date(userItem.last_login_at).toLocaleDateString('fr-FR')
                            : 'Jamais'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {userItem.login_count} connexion{userItem.login_count > 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/admin/users/${userItem.id}`}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {userItem.status === 'blocked' ? (
                            <button
                              onClick={() => handleUnblock(userItem.id)}
                              disabled={actionLoading === userItem.id}
                              className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-50"
                              title="Débloquer"
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlock(userItem.id)}
                              disabled={actionLoading === userItem.id}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                              title="Bloquer"
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
      </main>
    </div>
  );
}

