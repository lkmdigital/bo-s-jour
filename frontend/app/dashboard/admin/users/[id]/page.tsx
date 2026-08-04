'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/components/common/ConfirmContext';
import { useToast } from '@/components/common/ToastContext';
import { KeyRound, Trash2 } from 'lucide-react';
import { isController, isAdmin } from '@/lib/userUtils';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Ban,
  Unlock,
  Edit,
  ArrowLeft,
  Activity,
  Building2,
  BookOpen,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

interface UserDetail {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive' | 'blocked' | 'suspended';
  blocked_at?: string;
  blocked_by?: number;
  block_reason?: string;
  blocked_by_user?: {
    id: number;
    name: string;
    email: string;
  };
  last_login_at?: string;
  last_login_ip?: string;
  login_count: number;
  created_at: string;
  updated_at: string;
  // Documents d'identité
  id_type?: string;
  id_number?: string;
  id_document_path?: string;
  id_document_recto_path?: string;
  id_document_verso_path?: string;
  roles?: Array<{
    id: number;
    name: string;
    display_name: string;
    permissions?: Array<{
      id: number;
      name: string;
      description: string;
    }>;
  }>;
  activity_logs?: Array<{
    id: number;
    action: string;
    description: string;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
  }>;
  accommodations?: Array<{
    id: number;
    name: string;
    type: string;
    city: string;
    status: string;
  }>;
  bookings?: Array<{
    id: number;
    accommodation_id: number;
    check_in: string;
    check_out: string;
    status: string;
    total_price: number;
  }>;
}

const getStorageUrl = (relativePath: string) => {
  if (!relativePath) return '';
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || 'https://api.bosejour.ci/api';
  try {
    const url = new URL(apiUrl);
    url.pathname = url.pathname.replace(/\/api\/?$/, '');
    return `${url.origin}/storage/${relativePath}`;
  } catch {
    return `https://api.bosejour.ci/storage/${relativePath}`;
  }
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const confirmAction = useConfirm();
  const { showError, showSuccess } = useToast();

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
    if (isAuthenticated && user && isAdmin(user) && userId) {
      fetchUserDetail();
      fetchActivityLogs();
    }
  }, [isAuthenticated, user, userId]);

  const fetchUserDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/admin/users/${userId}`);
      setUserDetail(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des détails');
      console.error('Error fetching user detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const response = await api.get(`/admin/users/${userId}/activity-logs`);
      setActivityLogs(response.data.data?.data || []);
    } catch (err: any) {
      console.error('Error fetching activity logs:', err);
    }
  };

  const handleBlock = async () => {
    const ok = await confirmAction({
      title: 'Bloquer l\'utilisateur',
      message: 'Êtes-vous sûr de vouloir bloquer cet utilisateur ?',
      confirmLabel: 'Bloquer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      setActionLoading(true);
      await api.post(`/admin/users/${userId}/block`, {
        reason: 'Bloqué par un administrateur',
      });
      fetchUserDetail();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors du blocage');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblock = async () => {
    try {
      setActionLoading(true);
      await api.post(`/admin/users/${userId}/unblock`);
      fetchUserDetail();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors du déblocage');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const ok = await confirmAction({
      title: 'Réinitialiser le mot de passe',
      message: `Envoyer un lien de réinitialisation de mot de passe à ${userDetail?.email} ?`,
      confirmLabel: 'Envoyer',
      cancelLabel: 'Annuler',
    });
    if (!ok) return;

    try {
      setActionLoading(true);
      const res = await api.post(`/admin/users/${userId}/reset-password`);
      showSuccess(res.data?.message || 'Lien de réinitialisation envoyé');
    } catch (err: any) {
      showError(err.response?.data?.message || "Erreur lors de l'envoi du lien");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmAction({
      title: "Supprimer définitivement l'utilisateur",
      message: `Êtes-vous sûr de vouloir supprimer définitivement ${userDetail?.name} ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      setActionLoading(true);
      await api.delete(`/admin/users/${userId}`);
      showSuccess('Utilisateur supprimé définitivement');
      router.push('/dashboard/admin/users');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la suppression');
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
          <CheckCircle className="w-4 h-4" />
          Actif
        </span>
      ),
      inactive: (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 flex items-center gap-1">
          <Clock className="w-4 h-4" />
          Inactif
        </span>
      ),
      blocked: (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
          <Ban className="w-4 h-4" />
          Bloqué
        </span>
      ),
      suspended: (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center gap-1">
          <XCircle className="w-4 h-4" />
          Suspendu
        </span>
      ),
    };
    return badges[status as keyof typeof badges] || badges.inactive;
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      user: (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          Utilisateur
        </span>
      ),
      host: (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Hôte
        </span>
      ),
      admin: (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
          Admin
        </span>
      ),
      super_admin: (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
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

  if (!userDetail) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="container mx-auto px-4 py-8">
          <div className="card">
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">
              {error || 'Utilisateur non trouvé'}
            </p>
            <Link href="/dashboard/admin/users" className="btn-secondary text-center block w-fit mx-auto">
              Retour à la liste
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/admin/users"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Détails de l'utilisateur
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Informations complètes et historique
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {userDetail.status === 'blocked' ? (
              <button
                onClick={handleUnblock}
                disabled={actionLoading}
                className="btn-secondary flex items-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                Débloquer
              </button>
            ) : (
              <button
                onClick={handleBlock}
                disabled={actionLoading}
                className="btn-secondary flex items-center gap-2 text-red-600 dark:text-red-400"
              >
                <Ban className="w-4 h-4" />
                Bloquer
              </button>
            )}
            <button
              onClick={handleResetPassword}
              disabled={actionLoading}
              className="btn-secondary flex items-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              Réinitialiser le mot de passe
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="btn-secondary flex items-center gap-2 text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
            <Link href="/dashboard/admin/users" className="btn-secondary">
              Retour à la liste
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations personnelles */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations personnelles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Nom complet</label>
                  <p className="text-gray-900 dark:text-white font-medium">{userDetail.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <p className="text-gray-900 dark:text-white">{userDetail.email}</p>
                </div>
                {userDetail.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      Téléphone
                    </label>
                    <p className="text-gray-900 dark:text-white">{userDetail.phone}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Type de document d'identité
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {userDetail.id_type || 'Non renseigné'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Numéro de la pièce
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {userDetail.id_number || 'Non renseigné'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Rôle principal</label>
                  <div className="mt-1">{getRoleBadge(userDetail.role)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Statut</label>
                  <div className="mt-1">{getStatusBadge(userDetail.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Date d'inscription
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(userDetail.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Documents d'identité */}
            {(userDetail.id_type || userDetail.id_number || userDetail.id_document_path || userDetail.id_document_recto_path || userDetail.id_document_verso_path) && (
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documents d'identité
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userDetail.id_type && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Type de document</label>
                      <p className="text-gray-900 dark:text-white font-medium">{userDetail.id_type}</p>
                    </div>
                  )}
                  {userDetail.id_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Numéro de la pièce</label>
                      <p className="text-gray-900 dark:text-white font-medium">{userDetail.id_number}</p>
                    </div>
                  )}
                </div>
                
                {/* Affichage des documents */}
                <div className="mt-6 space-y-4">
                  {userDetail.id_document_path && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                        Document d'identité (Passeport/Autre)
                      </label>
                      <div className="relative w-full max-w-md h-48 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <a
                          href={getStorageUrl(userDetail.id_document_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full h-full"
                        >
                          <Image
                            src={getStorageUrl(userDetail.id_document_path)}
                            alt="Document d'identité"
                            fill
                            className="object-contain cursor-pointer hover:opacity-80 transition-opacity"
                          />
                        </a>
                      </div>
                      <a
                        href={getStorageUrl(userDetail.id_document_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Voir le document complet
                      </a>
                    </div>
                  )}
                  
                  {(userDetail.id_document_recto_path || userDetail.id_document_verso_path) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userDetail.id_document_recto_path && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                            Recto (CNI/Permis)
                          </label>
                          <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <a
                              href={getStorageUrl(userDetail.id_document_recto_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full h-full"
                            >
                              <Image
                                src={getStorageUrl(userDetail.id_document_recto_path)}
                                alt="Recto du document"
                                fill
                                className="object-contain cursor-pointer hover:opacity-80 transition-opacity"
                              />
                            </a>
                          </div>
                          <a
                            href={getStorageUrl(userDetail.id_document_recto_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-flex items-center gap-1"
                          >
                            <ImageIcon className="w-4 h-4" />
                            Voir en grand
                          </a>
                        </div>
                      )}
                      
                      {userDetail.id_document_verso_path && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                            Verso (CNI/Permis)
                          </label>
                          <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <a
                              href={getStorageUrl(userDetail.id_document_verso_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full h-full"
                            >
                              <Image
                                src={getStorageUrl(userDetail.id_document_verso_path)}
                                alt="Verso du document"
                                fill
                                className="object-contain cursor-pointer hover:opacity-80 transition-opacity"
                              />
                            </a>
                          </div>
                          <a
                            href={getStorageUrl(userDetail.id_document_verso_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-flex items-center gap-1"
                          >
                            <ImageIcon className="w-4 h-4" />
                            Voir en grand
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Informations de connexion */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Informations de connexion
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Dernière connexion</label>
                  <p className="text-gray-900 dark:text-white">
                    {userDetail.last_login_at
                      ? new Date(userDetail.last_login_at).toLocaleString('fr-FR')
                      : 'Jamais connecté'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Nombre de connexions</label>
                  <p className="text-gray-900 dark:text-white">{userDetail.login_count}</p>
                </div>
                {userDetail.last_login_ip && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Dernière IP</label>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">{userDetail.last_login_ip}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Informations de blocage */}
            {userDetail.status === 'blocked' && (
              <div className="card border-l-4 border-red-500">
                <h2 className="text-xl font-semibold text-red-900 dark:text-red-400 mb-4 flex items-center gap-2">
                  <Ban className="w-5 h-5" />
                  Informations de blocage
                </h2>
                <div className="space-y-3">
                  {userDetail.blocked_at && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Date de blocage</label>
                      <p className="text-gray-900 dark:text-white">
                        {new Date(userDetail.blocked_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  )}
                  {userDetail.blocked_by_user && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Bloqué par</label>
                      <p className="text-gray-900 dark:text-white">
                        {userDetail.blocked_by_user.name} ({userDetail.blocked_by_user.email})
                      </p>
                    </div>
                  )}
                  {userDetail.block_reason && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Raison</label>
                      <p className="text-gray-900 dark:text-white">{userDetail.block_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rôles et permissions */}
            {userDetail.roles && userDetail.roles.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Rôles et permissions
                </h2>
                <div className="space-y-4">
                  {userDetail.roles.map((role) => (
                    <div key={role.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">{role.display_name || role.name}</span>
                      </div>
                      {role.permissions && role.permissions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {role.permissions.map((permission) => (
                            <span
                              key={permission.id}
                              className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            >
                              {permission.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Établissements (si hôte) */}
            {userDetail.role === 'host' && userDetail.accommodations && userDetail.accommodations.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Établissements ({userDetail.accommodations.length})
                </h2>
                <div className="space-y-2">
                  {userDetail.accommodations.map((accommodation) => (
                    <Link
                      key={accommodation.id}
                      href={`/dashboard/admin/accommodations`}
                      className="block p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{accommodation.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {accommodation.city} • {accommodation.type}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          accommodation.status === 'published' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : accommodation.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {accommodation.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Réservations */}
            {userDetail.bookings && userDetail.bookings.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Réservations ({userDetail.bookings.length})
                </h2>
                <div className="space-y-2">
                  {userDetail.bookings.slice(0, 10).map((booking) => (
                    <div
                      key={booking.id}
                      className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            Réservation #{booking.id}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(booking.check_in).toLocaleDateString('fr-FR')} - {new Date(booking.check_out).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatPrice(booking.total_price)} FCFA
                          </p>
                          <span className={`text-xs px-2 py-1 rounded ${
                            booking.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : booking.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {userDetail.bookings.length > 10 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center pt-2">
                      + {userDetail.bookings.length - 10} autres réservations
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Historique des activités */}
            {activityLogs.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Historique des activités
                </h2>
                <div className="space-y-3">
                  {activityLogs.slice(0, 20).map((log) => (
                    <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{log.description || log.action}</p>
                          {log.ip_address && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              IP: {log.ip_address}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-500 ml-4">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activityLogs.length > 20 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center pt-2">
                      + {activityLogs.length - 20} autres activités
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Colonne latérale - Statistiques rapides */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistiques</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Connexions totales</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{userDetail.login_count}</p>
                </div>
                {userDetail.accommodations && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Établissements</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{userDetail.accommodations.length}</p>
                  </div>
                )}
                {userDetail.bookings && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Réservations</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{userDetail.bookings.length}</p>
                  </div>
                )}
                {userDetail.roles && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Rôles assignés</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{userDetail.roles.length}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

