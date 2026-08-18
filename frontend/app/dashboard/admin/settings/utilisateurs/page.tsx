'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Shield, ExternalLink, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import SettingsPageShell from '@/components/dashboard/admin/SettingsPageShell';

interface RoleOption {
  id: number;
  name: string;
  display_name: string;
  description?: string;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  roles?: RoleOption[];
}

export default function AdminTeamSettingsPage() {
  const { showError, showSuccess } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/users', { params: { role: 'admin', per_page: 100 } }),
      api.get('/admin/users/roles'),
    ])
      .then(([usersRes, rolesRes]) => {
        setMembers(usersRes.data?.data ?? []);
        setAvailableRoles(rolesRes.data?.data ?? []);
      })
      .catch(() => showError('Erreur lors du chargement de l\'équipe'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SettingsPageShell
      icon={Users}
      title="Utilisateurs"
      description="Équipe interne bo séjour : comptes disposant d'un accès d'administration et leurs rôles."
    >
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-400">
            Un nouveau membre de l&apos;équipe doit d&apos;abord créer un compte administrateur depuis{' '}
            <Link href="/dashboard/admin/users/new" className="underline font-medium">
              Utilisateurs → Nouvel utilisateur
            </Link>
            . Ses rôles peuvent ensuite être ajustés ici.
          </div>

          <section className="card p-0 overflow-hidden">
            {members.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 p-6 text-center">
                Aucun compte administrateur trouvé.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {members.map((m) => (
                  <div key={m.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{m.name}</p>
                      <p className="text-sm text-gray-500 truncate">{m.email}</p>
                      {m.roles && m.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {m.roles.map((r) => (
                            <span
                              key={r.id}
                              className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                            >
                              {r.display_name || r.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1">Aucun rôle RBAC assigné (accès admin complet par défaut)</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => setEditingMember(m)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <Shield className="w-4 h-4" /> Rôles
                      </button>
                      <Link
                        href={`/dashboard/admin/users/${m.id}`}
                        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary"
                      >
                        Voir <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {editingMember && (
        <RoleEditorModal
          member={editingMember}
          availableRoles={availableRoles}
          onClose={() => setEditingMember(null)}
          onSaved={() => { setEditingMember(null); load(); showSuccess('Rôles mis à jour'); }}
          onError={(msg) => showError(msg)}
        />
      )}
    </SettingsPageShell>
  );
}

function RoleEditorModal({
  member,
  availableRoles,
  onClose,
  onSaved,
  onError,
}: {
  member: TeamMember;
  availableRoles: RoleOption[];
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [selected, setSelected] = useState<number[]>((member.roles ?? []).map((r) => r.id));
  const [saving, setSaving] = useState(false);

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/users/${member.id}/roles`, { role_ids: selected });
      onSaved();
    } catch (err: any) {
      onError(err.response?.data?.message || 'Erreur lors de l\'enregistrement des rôles');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">Rôles — {member.name}</h2>
            <p className="text-sm text-gray-500">{member.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {availableRoles.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun rôle disponible.</p>
          ) : (
            availableRoles.map((role) => (
              <label
                key={role.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(role.id)}
                  onChange={() => toggle(role.id)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{role.display_name || role.name}</p>
                  {role.description && (
                    <p className="text-xs text-gray-500">{role.description}</p>
                  )}
                </div>
              </label>
            ))
          )}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full btn-primary mt-5 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? 'Enregistrement…' : 'Enregistrer les rôles'}
        </button>
      </div>
    </div>
  );
}
