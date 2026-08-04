'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useConfirm } from '@/components/common/ConfirmContext';
import { useToast } from '@/components/common/ToastContext';
import { isAdmin } from '@/lib/userUtils';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import { formatPrice } from '@/lib/utils';
import {
  ArrowLeft,
  Building2,
  Bed,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  MapPin,
  DollarSign,
  FileText,
  History,
  ClipboardCheck,
  Phone,
  Mail,
  MessageCircle,
  Globe,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const getStorageUrl = (relativePath?: string | null) => {
  if (!relativePath) return '';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.bosejour.ci/api';
  try {
    const url = new URL(apiUrl);
    url.pathname = url.pathname.replace(/\/api\/?$/, '');
    return `${url.origin}/storage/${relativePath}`;
  } catch {
    return `https://api.bosejour.ci/storage/${relativePath}`;
  }
};

interface Room {
  id: number;
  name: string;
  type: string;
  description?: string;
  capacity: number;
  price_per_night: number;
  bedrooms: number;
  bathrooms: number;
  quantity?: number;
  is_active: boolean;
  surface_area?: number;
  room_category?: string;
  room_subcategory?: string;
  images?: Array<{ id: number; full_url: string; is_primary: boolean }>;
  primary_image_url?: string;
}

interface Host {
  id: number;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  establishment_name?: string;
  rccm?: string;
  cnps_number?: string;
  tax_account_number?: string;
  id_type?: string;
  id_number?: string;
  id_document_path?: string;
  id_document_recto_path?: string;
  id_document_verso_path?: string;
  business_license_path?: string;
  rccm_document_path?: string;
  tax_document_path?: string;
}

interface AuditLog {
  id: number;
  action: string;
  status_before?: string;
  status_after?: string;
  reason?: string;
  notes?: string;
  created_at: string;
  user?: { name: string };
}

interface AdminNoteItem {
  id: number;
  note: string;
  visibility: string;
  is_important: boolean;
  created_at: string;
  creator?: { name: string };
}

interface InspectionItem {
  id: number;
  status: string;
  result?: string;
  score?: number;
  scheduled_at?: string;
  completed_at?: string;
  observations?: string;
  inspector?: { name: string };
}

interface Accommodation {
  id: number;
  name: string;
  type: string;
  city: string;
  address: string;
  description?: string;
  status: string;
  compliance_status?: 'conforme' | 'non_conforme';
  compliance_requirements?: Record<string, { label: string; ok: boolean }>;
  price_per_night: number;
  latitude?: number;
  longitude?: number;
  star_rating?: number;
  standing?: string;
  check_in_time?: string;
  check_out_time?: string;
  host?: Host;
  auditLogs?: AuditLog[];
  adminNotes?: AdminNoteItem[];
  inspections?: InspectionItem[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  published: { label: 'Publié', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  disabled: { label: 'Désactivé', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  removed: { label: 'Retiré', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' },
  unavailable: { label: 'Indisponible', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  renovation: { label: 'En rénovation', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
};

const TABS = [
  { key: 'apercu', label: 'Aperçu', icon: Building2 },
  { key: 'informations', label: 'Informations', icon: MapPin },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'historique', label: 'Historique', icon: History },
  { key: 'inspections', label: 'Inspections', icon: ClipboardCheck },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function AdminAccommodationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const accommodationId = params.id as string;
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const [accommodation, setAccommodation] = useState<Accommodation | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>('apercu');
  const confirmAction = useConfirm();
  const { showError } = useToast();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !isAdmin(user)) {
      router.push('/dashboard/admin');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user && isAdmin(user)) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accommodationId, isAuthenticated, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const accResponse = await api.get(`/admin/accommodations/${accommodationId}`);
      setAccommodation(accResponse.data?.data || accResponse.data);
      const roomsResponse = await api.get(`/admin/accommodations/${accommodationId}/rooms`);
      setRooms(roomsResponse.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (roomId: number) => {
    const ok = await confirmAction({
      title: 'Changer le statut de la chambre',
      message: 'Voulez-vous changer le statut de cette chambre ?',
      confirmLabel: 'Oui',
      cancelLabel: 'Annuler',
    });
    if (!ok) return;
    try {
      setActionLoading(roomId);
      await api.post(`/admin/accommodations/${accommodationId}/rooms/${roomId}/toggle-status`);
      await fetchData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (roomId: number) => {
    const ok = await confirmAction({
      title: 'Supprimer la chambre',
      message: 'Êtes-vous sûr de vouloir supprimer cette chambre ? Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      setActionLoading(roomId);
      await api.delete(`/admin/accommodations/${accommodationId}/rooms/${roomId}`);
      await fetchData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !user || !isAdmin(user)) {
    return null;
  }

  if (error || !accommodation) {
    return <ErrorDisplay error={error || 'Établissement introuvable'} />;
  }

  const activeRooms = rooms.filter((r) => r.is_active);
  const inactiveRooms = rooms.filter((r) => !r.is_active);
  const statusConfig = STATUS_LABELS[accommodation.status] ?? { label: accommodation.status, color: 'bg-gray-100 text-gray-700' };
  const host = accommodation.host;

  const documents = host
    ? [
        { label: "Pièce d'identité (recto)", path: host.id_document_path || host.id_document_recto_path },
        { label: "Pièce d'identité (verso)", path: host.id_document_verso_path },
        { label: 'RCCM / Registre de commerce', path: host.rccm_document_path },
        { label: "Licence d'exploitation", path: host.business_license_path },
        { label: 'Document fiscal', path: host.tax_document_path },
      ].filter((d) => d.path)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/admin/accommodations"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-bosejour-red mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux établissements
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{accommodation.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {accommodation.city}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {accommodation.type}
              </span>
              {host && (
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {host.name}
                </span>
              )}
              {accommodation.star_rating && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  {accommodation.star_rating} étoiles
                </span>
              )}
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>{statusConfig.label}</span>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  accommodation.compliance_status === 'conforme'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {accommodation.compliance_status === 'conforme' ? 'Conforme' : 'Non conforme'}
              </span>
            </div>
          </div>
          <Link
            href={`/accommodations/${accommodation.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Eye className="w-4 h-4" />
            Voir la fiche publique
          </Link>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px inline-flex items-center gap-2 whitespace-nowrap transition-colors ${
              tab === key ? 'border-bosejour-red text-bosejour-red' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {key === 'historique' && (accommodation.auditLogs?.length ?? 0) > 0 && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 rounded-full">{accommodation.auditLogs?.length}</span>
            )}
            {key === 'inspections' && (accommodation.inspections?.length ?? 0) > 0 && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 rounded-full">{accommodation.inspections?.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'apercu' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-3">
              <Bed className="w-8 h-8 text-bosejour-red" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total chambres</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{rooms.length}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Actives</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeRooms.length}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Inactives</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{inactiveRooms.length}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Prix moyen</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {rooms.length > 0 ? formatPrice(rooms.reduce((sum, r) => sum + r.price_per_night, 0) / rooms.length) : '0'} FCFA
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Chambres ({rooms.length})</h2>
            {rooms.length === 0 ? (
              <p className="text-center py-8 text-gray-500 dark:text-gray-400">Aucune chambre pour cet établissement</p>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => {
                  const primaryImage = room.images?.find((img) => img.is_primary) || room.images?.[0];
                  const imageUrl = primaryImage?.full_url || room.primary_image_url;
                  return (
                    <div key={room.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-4 flex gap-4">
                      {imageUrl && (
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
                          <Image src={imageUrl} alt={room.name} fill className="object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{room.name}</h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${
                              room.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {room.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {room.capacity} pers. · {formatPrice(room.price_per_night)} FCFA/nuit · {room.quantity || 1} chambre{room.quantity && room.quantity > 1 ? 's' : ''}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleToggleStatus(room.id)}
                            disabled={actionLoading === room.id}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              room.is_active
                                ? 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            } disabled:opacity-50`}
                          >
                            {room.is_active ? <EyeOff className="w-3.5 h-3.5 inline mr-1" /> : <Eye className="w-3.5 h-3.5 inline mr-1" />}
                            {room.is_active ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            onClick={() => handleDelete(room.id)}
                            disabled={actionLoading === room.id}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'informations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Informations générales</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-400">Description</dt>
                <dd className="text-gray-800 dark:text-gray-200 mt-0.5">{accommodation.description || '—'}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-gray-400">Adresse</dt>
                  <dd className="text-gray-800 dark:text-gray-200">{accommodation.address || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Ville</dt>
                  <dd className="text-gray-800 dark:text-gray-200">{accommodation.city}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Coordonnées GPS</dt>
                  <dd className="text-gray-800 dark:text-gray-200">
                    {accommodation.latitude && accommodation.longitude ? `${accommodation.latitude}, ${accommodation.longitude}` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">Standing</dt>
                  <dd className="text-gray-800 dark:text-gray-200">{accommodation.standing || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Arrivée</dt>
                  <dd className="text-gray-800 dark:text-gray-200">{accommodation.check_in_time || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Départ</dt>
                  <dd className="text-gray-800 dark:text-gray-200">{accommodation.check_out_time || '—'}</dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Contacts du gérant</h2>
            {host ? (
              <dl className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-800 dark:text-gray-200">{host.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-800 dark:text-gray-200">{host.email}</span>
                </div>
                {host.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-800 dark:text-gray-200">{host.phone}</span>
                  </div>
                )}
                {host.whatsapp && (
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-800 dark:text-gray-200">{host.whatsapp}</span>
                  </div>
                )}
                {host.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-800 dark:text-gray-200">{host.website}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div>
                    <dt className="text-gray-400">RCCM</dt>
                    <dd className="text-gray-800 dark:text-gray-200">{host.rccm || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">N° contribuable</dt>
                    <dd className="text-gray-800 dark:text-gray-200">{host.tax_account_number || '—'}</dd>
                  </div>
                </div>
              </dl>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Aucun gérant associé</p>
            )}
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Documents légaux</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Documents fournis par le gérant lors de son inscription</p>
          {documents.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucun document fourni</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <a
                  key={doc.label}
                  href={getStorageUrl(doc.path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden hover:border-bosejour-red transition-colors"
                >
                  <div className="relative h-32 bg-gray-50 dark:bg-gray-900">
                    <Image src={getStorageUrl(doc.path)} alt={doc.label} fill className="object-cover" />
                  </div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 p-2 group-hover:text-bosejour-red">{doc.label}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'historique' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Historique des modifications</h2>
          {!accommodation.auditLogs || accommodation.auditLogs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune action enregistrée</p>
          ) : (
            <ul className="space-y-3">
              {accommodation.auditLogs.map((log) => (
                <li key={log.id} className="border-l-2 border-bosejour-red/40 pl-4 py-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {log.action}
                    {log.status_before && log.status_after && (
                      <span className="text-gray-500 dark:text-gray-400 font-normal"> — {log.status_before} → {log.status_after}</span>
                    )}
                  </p>
                  {log.reason && <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">Motif : {log.reason}</p>}
                  {log.notes && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{log.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {log.user?.name ?? 'Système'} · {format(new Date(log.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {accommodation.adminNotes && accommodation.adminNotes.length > 0 && (
            <>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-8 mb-4">Notes internes</h2>
              <ul className="space-y-3">
                {accommodation.adminNotes.map((note) => (
                  <li key={note.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                    <p className="text-sm text-gray-800 dark:text-gray-200">{note.note}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {note.creator?.name ?? 'Admin'} · {format(new Date(note.created_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === 'inspections' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Historique des inspections</h2>
          {!accommodation.inspections || accommodation.inspections.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune inspection réalisée</p>
          ) : (
            <ul className="space-y-3">
              {accommodation.inspections.map((inspection) => (
                <li key={inspection.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-gray-900 dark:text-white capitalize">{inspection.status}</span>
                    {inspection.result && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          inspection.result === 'approved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {inspection.result === 'approved' ? 'Conforme' : inspection.result}
                      </span>
                    )}
                  </div>
                  {inspection.observations && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{inspection.observations}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {inspection.inspector?.name ?? '—'}
                    {inspection.completed_at && ` · ${format(new Date(inspection.completed_at), 'dd MMM yyyy', { locale: fr })}`}
                    {inspection.score !== undefined && ` · Score : ${inspection.score}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
