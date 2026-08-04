'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/components/common/ConfirmContext';
import { isAdmin, isController } from '@/lib/userUtils';
import api from '@/lib/api';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Home,
  FileCheck2,
  Calendar,
} from 'lucide-react';

interface AdminNote {
  id: number;
  note: string;
  visibility: 'admin' | 'gerant' | 'admin_gerant';
  is_important: boolean;
  created_at: string;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
}

interface HostValidationHistory {
  id: number;
  action: string;
  comment?: string | null;
  internal_notes?: string | null;
  validation_data?: Record<string, any> | null;
  created_at: string;
  validator?: {
    id: number;
    name: string;
    email: string;
  };
}

interface AccommodationSummary {
  id: number;
  name: string;
  city: string;
  status: string;
}

interface HostDetails {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  establishment_name?: string | null;
  accommodation_type?: string | null;
  phone_fixed?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  facebook_page?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  country?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  id_document_path?: string | null;
  id_document_recto_path?: string | null;
  id_document_verso_path?: string | null;
  proof_of_address_path?: string | null;
  business_license_path?: string | null;
  rccm_document_path?: string | null;
  tax_document_path?: string | null;
  profile_completed: boolean;
  profile_verified: boolean;
  compliance_status?: 'conforme' | 'non_conforme';
  compliance_requirements?: Record<string, { label: string; ok: boolean }>;
  profile_verified_at?: string | null;
  verification_notes?: string | null;
  created_at: string;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  login_count?: number | null;
  host_validation_history?: HostValidationHistory[];
  admin_notes?: AdminNote[];
  accommodations?: AccommodationSummary[];
}

function buildFileUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Laravel storage path or relative path
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.bosejour.ci/api';
  const base = apiBase.replace(/\/api\/?$/, '');
  if (path.startsWith('/')) {
    return `${base}${path}`;
  }
  return `${base}/storage/${path}`;
}

export default function AdminHostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const [host, setHost] = useState<HostDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const confirmAction = useConfirm();

  const hostId = params.id as string;

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (isController(user)) {
        router.push('/dashboard/admin/inspections');
        return;
      }
      if (!isAdmin(user)) {
        router.push('/auth/login');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user && isAdmin(user) && hostId) {
      fetchHost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, hostId]);

  const fetchHost = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/admin/hosts/${hostId}`);
      setHost(res.data.data || res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des détails de l’hôte');
    } finally {
      setLoading(false);
    }
  };

  const validateHost = async () => {
    if (!host) return;
    const ok = await confirmAction({
      title: "Valider le profil d'hôte",
      message: "Valider ce profil d'hôte ?",
      confirmLabel: 'Valider',
      cancelLabel: 'Annuler',
    });
    if (!ok) return;
    try {
      setActionLoading(true);
      await api.post(`/admin/hosts/${host.id}/validate`, {});
      await fetchHost();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la validation de l'hôte");
    } finally {
      setActionLoading(false);
    }
  };

  const rejectHost = async () => {
    if (!host) return;
    const comment = window.prompt('Motif du refus :');
    if (!comment || !comment.trim()) return;
    try {
      setActionLoading(true);
      await api.post(`/admin/hosts/${host.id}/reject`, { comment });
      await fetchHost();
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors du rejet de l'hôte");
    } finally {
      setActionLoading(false);
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

  if (!isAuthenticated || !user || !isAdmin(user) || !host) {
    return null;
  }

  const documents = [
    {
      label: "Pièce d'identité (recto)",
      path: host.id_document_recto_path,
    },
    {
      label: "Pièce d'identité (verso)",
      path: host.id_document_verso_path,
    },
    {
      label: "Pièce d'identité (scan unique)",
      path: host.id_document_path,
    },
    {
      label: "Justificatif de domicile",
      path: host.proof_of_address_path,
    },
    {
      label: 'Registre de commerce / Licence',
      path: host.business_license_path,
    },
    {
      label: 'Document RCM',
      path: host.rccm_document_path,
    },
    {
      label: 'Document contribuable',
      path: host.tax_document_path,
    },
  ].filter((d) => d.path);

  const primaryIdDoc = buildFileUrl(host.id_document_recto_path || host.id_document_path);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/admin/hosts"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour à la liste des hôtes
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {!host.profile_verified && (
              <>
                <button
                  type="button"
                  onClick={validateHost}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Valider l&apos;hôte
                </button>
                <button
                  type="button"
                  onClick={rejectHost}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Refuser l&apos;hôte
                </button>
              </>
            )}
          </div>
        </div>

        {error && <ErrorDisplay error={error} onDismiss={() => setError(null)} />}

        {/* En-tête host */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="card lg:col-span-2">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {host.name}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Hôte depuis le{' '}
                  {new Date(host.created_at).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <div className="flex flex-wrap gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {host.email}
                  </span>
                  {host.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {host.phone}
                    </span>
                  )}
                  {host.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {host.city}
                      {host.country ? `, ${host.country}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Statut & validation */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Statut du profil
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Compte</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    host.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {host.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Profil complété</span>
                <span className="inline-flex items-center gap-1 text-xs">
                  {host.profile_completed ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">Oui</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-600 dark:text-yellow-400">Incomplet</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Profil vérifié</span>
                <span className="inline-flex items-center gap-1 text-xs">
                  {host.profile_verified ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">Validé</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-600 dark:text-yellow-400">En attente</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Conformité</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    host.compliance_status === 'conforme'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}
                >
                  {host.compliance_status === 'conforme' ? 'Conforme' : 'Non conforme'}
                </span>
              </div>
              {host.profile_verified_at && (
                <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4 mt-0.5" />
                  <span>
                    Vérifié le{' '}
                    {new Date(host.profile_verified_at).toLocaleString('fr-FR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Infos établissement & activité */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="card lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              Informations établissement
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">
                  Nom de l&apos;établissement
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {host.establishment_name || 'Non renseigné'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">
                  Type d&apos;hébergement
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {host.accommodation_type || 'Non renseigné'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">
                  Téléphone fixe
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {host.phone_fixed || 'Non renseigné'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">
                  WhatsApp
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {host.whatsapp || 'Non renseigné'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">
                  Site web
                </p>
                {host.website ? (
                  <a
                    href={host.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline break-all"
                  >
                    {host.website}
                  </a>
                ) : (
                  <p className="font-medium text-gray-900 dark:text-white">Non renseigné</p>
                )}
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">
                  Page Facebook
                </p>
                {host.facebook_page ? (
                  <a
                    href={host.facebook_page}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline break-all"
                  >
                    {host.facebook_page}
                  </a>
                ) : (
                  <p className="font-medium text-gray-900 dark:text-white">Non renseigné</p>
                )}
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase mb-1">
                  Adresse postale
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {host.address_line1 || host.address_line2
                    ? `${host.address_line1 ?? ''} ${host.address_line2 ?? ''}`.trim()
                    : 'Non renseigné'}
                  {host.city && (
                    <>
                      <br />
                      {host.city}
                      {host.country ? `, ${host.country}` : ''}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-primary" />
              Activité de connexion
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Connexions</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {host.login_count ?? 0}
                </span>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Dernière connexion</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {host.last_login_at
                    ? new Date(host.last_login_at).toLocaleString('fr-FR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Jamais'}
                </p>
                {host.last_login_ip && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    IP: {host.last_login_ip}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bloc documents */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Documents de vérification
          </h2>
          {documents.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Aucun document n&apos;a été téléchargé pour cet hôte.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc, index) => {
                const url = buildFileUrl(doc.path);
                return (
                  <div
                    key={`${doc.label}-${index}`}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg flex items-start gap-3"
                  >
                    <div className="mt-1">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {doc.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 break-all mt-1">
                        {doc.path}
                      </p>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                        >
                          Voir / Télécharger
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {host.verification_notes && (
            <div className="mt-4 p-3 border border-yellow-200 dark:border-yellow-700 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-sm text-yellow-800 dark:text-yellow-300">
              <p className="font-semibold mb-1">Notes de vérification</p>
              <p className="whitespace-pre-line">{host.verification_notes}</p>
            </div>
          )}

          {host.compliance_requirements && (
            <div className="mt-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="font-semibold mb-2 text-sm text-gray-900 dark:text-white">
                Contrôles de conformité
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {Object.entries(host.compliance_requirements).map(([key, req]) => (
                  <div key={key} className="flex items-center justify-between gap-3 p-2 rounded bg-gray-50 dark:bg-gray-900/40">
                    <span className="text-gray-700 dark:text-gray-300">{req.label}</span>
                    <span className={req.ok ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                      {req.ok ? 'OK' : 'Manquant'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Établissements de l’hôte */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" />
            Établissements de l’hôte
          </h2>
          {!host.accommodations || host.accommodations.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Aucun établissement n&apos;est encore rattaché à cet hôte.
            </p>
          ) : (
            <div className="space-y-3">
              {host.accommodations.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{acc.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {acc.city} • {acc.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/accommodations/${acc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-xs"
                    >
                      Voir côté public
                    </Link>
                    <Link
                      href={`/dashboard/admin/accommodations/${acc.id}`}
                      className="btn-primary text-xs"
                    >
                      Gérer
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique de validation & notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Historique de validation
            </h2>
            {!host.host_validation_history || host.host_validation_history.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Aucun historique de validation n&apos;est disponible pour cet hôte.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                {host.host_validation_history
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                  )
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/40"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {entry.action}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(entry.created_at).toLocaleString('fr-FR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {entry.validator && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Par {entry.validator.name} ({entry.validator.email})
                        </p>
                      )}
                      {entry.comment && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                          {entry.comment}
                        </p>
                      )}
                      {entry.internal_notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 whitespace-pre-line">
                          Notes internes : {entry.internal_notes}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Notes internes
            </h2>
            {!host.admin_notes || host.admin_notes.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Aucune note interne n&apos;a encore été enregistrée pour cet hôte.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                {host.admin_notes
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                  )
                  .map((note) => (
                    <div
                      key={note.id}
                      className={`p-3 border rounded-lg ${
                        note.is_important
                          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {note.creator
                            ? `${note.creator.name} • ${new Date(
                                note.created_at,
                              ).toLocaleString('fr-FR')}`
                            : new Date(note.created_at).toLocaleString('fr-FR')}
                        </span>
                        <span className="text-[10px] uppercase text-gray-500 dark:text-gray-400">
                          {note.visibility}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">
                        {note.note}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

