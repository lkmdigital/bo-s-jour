'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  UserCog, UserPlus, Trash2, Check, X, Loader2, ShieldCheck,
} from 'lucide-react';

interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: 'administrateur' | 'receptionniste' | 'comptabilite' | 'commercial' | 'housekeeping' | 'maintenance';
  permissions: string[] | null;
  status: 'invited' | 'active' | 'suspended';
  invited_at: string | null;
  accepted_at: string | null;
  collaborator_user?: { id: number; name: string; email: string; avatar?: string } | null;
}

const ROLE_LABELS: Record<string, string> = {
  administrateur: 'Administrateur',
  receptionniste: 'Réceptionniste',
  comptabilite: 'Comptabilité',
  commercial: 'Commercial',
  housekeeping: 'Housekeeping',
  maintenance: 'Maintenance',
};

// Miroir de HostStaff::PERMISSIONS / PERMISSION_LABELS / DEFAULT_PERMISSIONS_BY_ROLE côté
// backend (app/Models/HostStaff.php) — garder les deux synchronisés.
const PERMISSIONS = [
  'property', 'rooms', 'calendar', 'reservations', 'clients', 'reviews',
  'promotions', 'finances', 'documents', 'staff', 'marketing', 'stats', 'ai',
];

const PERMISSION_LABELS: Record<string, string> = {
  property: 'Mes établissements',
  rooms: 'Chambres et tarifs',
  calendar: 'Calendrier',
  reservations: 'Réservations',
  clients: 'Clients',
  reviews: 'Avis',
  promotions: 'Promotions',
  finances: 'Finances',
  documents: 'Documents',
  staff: 'Personnel',
  marketing: 'Commercialisation',
  stats: 'Statistiques',
  ai: 'Assistant IA',
};

const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  administrateur: PERMISSIONS,
  receptionniste: ['calendar', 'reservations', 'clients'],
  comptabilite: ['finances', 'documents', 'stats'],
  commercial: ['promotions', 'marketing', 'reviews', 'stats'],
  housekeeping: ['calendar', 'rooms', 'reservations'],
  maintenance: ['rooms', 'property'],
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  invited: { label: 'Invitation envoyée', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  active: { label: 'Actif', cls: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
  suspended: { label: 'Suspendu', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
};

export default function HostStaffPage() {
  const { user } = useAuthStore();
  const isStaff = !!user?.staff_owner_id;
  const canManage = !isStaff || user?.staff_role === 'administrateur';

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('receptionniste');
  const [invitePermissions, setInvitePermissions] = useState<string[]>(DEFAULT_PERMISSIONS_BY_ROLE.receptionniste);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteErr, setInviteErr] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get('/host/staff')
      .then((r) => setStaff(r.data))
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger le personnel.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (canManage) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  const handleRoleChange = (role: string) => {
    setInviteRole(role);
    // Présélection pratique selon le poste — reste entièrement modifiable ci-dessous.
    setInvitePermissions(DEFAULT_PERMISSIONS_BY_ROLE[role] || []);
  };

  const togglePermission = (key: string) =>
    setInvitePermissions((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));

  const resetInviteForm = () => {
    setInviteName(''); setInviteEmail(''); setInvitePhone('');
    setInviteRole('receptionniste');
    setInvitePermissions(DEFAULT_PERMISSIONS_BY_ROLE.receptionniste);
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteErr(null);
    setInviteBusy(true);
    try {
      await api.post('/host/staff', {
        name: inviteName,
        email: inviteEmail,
        phone: invitePhone || undefined,
        role: inviteRole,
        permissions: invitePermissions,
      });
      resetInviteForm();
      setShowInvite(false);
      load();
    } catch (err: any) {
      setInviteErr(err.response?.data?.message || err.response?.data?.errors?.email?.[0] || "Impossible d'ajouter ce collaborateur.");
    } finally {
      setInviteBusy(false);
    }
  };

  const toggleSuspend = async (m: StaffMember) => {
    await api.put(`/host/staff/${m.id}`, { status: m.status === 'suspended' ? 'active' : 'suspended' });
    load();
  };

  const remove = async (m: StaffMember) => {
    if (!confirm(`Retirer ${m.name} de votre équipe ? Son accès sera coupé immédiatement.`)) return;
    await api.delete(`/host/staff/${m.id}`);
    load();
  };

  if (!canManage) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <span className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mx-auto mb-4">
          <UserCog className="w-7 h-7" />
        </span>
        <h1 className="text-xl font-bold mb-2">Personnel</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Réservé au propriétaire du compte ou à un collaborateur avec le rôle Administrateur.
        </p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner message="Chargement de l'équipe…" size="lg" />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Personnel</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Invitez des collaborateurs (réceptionniste, comptabilité, commercial, housekeeping, maintenance)
          pour gérer vos établissements à vos côtés.
        </p>
      </div>

      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <UserCog className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-bold">Équipe</h2>
              <p className="text-xs text-gray-500">Accès et rôles de vos collaborateurs</p>
            </div>
          </div>
          <button onClick={() => setShowInvite((v) => !v)} className="btn-outline text-sm inline-flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Inviter
          </button>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

        {showInvite && (
          <form onSubmit={invite} className="mb-5 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input required placeholder="Nom complet" value={inviteName} onChange={(e) => setInviteName(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              <input required type="email" placeholder="E-mail" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Téléphone (facultatif)" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              <select value={inviteRole} onChange={(e) => handleRoleChange(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                Menus accessibles
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PERMISSIONS.map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer px-2.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary/50 bg-white dark:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={invitePermissions.includes(key)}
                      onChange={() => togglePermission(key)}
                      className="accent-primary rounded"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{PERMISSION_LABELS[key]}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Présélection selon le poste — cochez ou décochez librement. « Tableau de bord » reste toujours accessible.
              </p>
            </div>

            {inviteErr && <p className="text-sm text-red-600 dark:text-red-400">{inviteErr}</p>}
            <div className="flex items-center gap-2">
              <button type="submit" disabled={inviteBusy} className="btn-primary text-sm disabled:opacity-50 inline-flex items-center gap-2">
                {inviteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Envoyer l&apos;invitation
              </button>
              <button type="button" onClick={() => setShowInvite(false)} className="text-sm text-gray-500 hover:underline">Annuler</button>
            </div>
            <p className="text-xs text-gray-400">
              S&apos;il a déjà un compte bo séjour, une invitation lui est tout de même envoyée pour créer son
              accès collaborateur (distinct de son compte voyageur). Il ne verra que les menus cochés
              ci-dessus et n&apos;a jamais accès à vos coordonnées bancaires ni aux retraits.
            </p>
          </form>
        )}

        {staff.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">Aucun collaborateur pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {staff.map((m) => (
              <div key={m.id} className="p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="w-9 h-9 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {(m.collaborator_user?.name || m.name)[0]?.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{m.collaborator_user?.name || m.name}</p>
                    <p className="text-xs text-gray-500">{m.email}{m.phone ? ` · ${m.phone}` : ''}</p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary whitespace-nowrap">
                    {ROLE_LABELS[m.role] || m.role}
                  </span>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_LABEL[m.status]?.cls}`}>
                    {STATUS_LABEL[m.status]?.label}
                  </span>

                  {m.status !== 'invited' && (
                    <button onClick={() => toggleSuspend(m)} title={m.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
                      className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5">
                      {m.status === 'suspended' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  )}
                  <button onClick={() => remove(m)} title="Retirer" className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {m.permissions && m.permissions.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2 pl-12">
                    Accès : {m.permissions.map((p) => PERMISSION_LABELS[p] || p).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 text-sm text-blue-800 dark:text-blue-300">
        <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p>
          Vos collaborateurs voient et gèrent les mêmes établissements que vous, mais uniquement les menus que
          vous cochez à l&apos;invitation sont visibles dans leur espace. Les coordonnées bancaires et les
          demandes de retrait restent réservées au propriétaire du compte, quel que soit le rôle.
        </p>
      </div>
    </div>
  );
}
