'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import MemberAside from '@/components/dashboard/user/MemberAside';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatPrice } from '@/lib/utils';
import {
  Building2, Users, UserPlus, Trash2, Pencil, Check, X, Loader2,
  Briefcase, TrendingUp, Download, MapPin, Calendar, Award,
} from 'lucide-react';

interface Collaborator {
  id: number;
  email: string;
  name: string | null;
  department: string | null;
  spending_limit: string | number | null;
  status: 'invited' | 'active' | 'suspended';
  collaborator_user?: { id: number; name: string; email: string; avatar?: string } | null;
}

interface Overview {
  is_owner: boolean;
  is_collaborator: boolean;
  company: {
    company_name?: string; company_vat?: string; company_rccm?: string; company_tax_number?: string;
    company_unique_id?: string; company_sector?: string; company_address?: string; company_city?: string;
    company_country?: string; company_billing_email?: string; owner_name?: string;
  } | null;
  collaborators: Collaborator[];
}

interface RewardTierInfo { revenue_threshold: number; reward_label: string; remaining?: number }
interface CorporateLoyalty {
  year: number;
  revenue_total: number;
  current_tier: RewardTierInfo | null;
  next_tier: RewardTierInfo | null;
  last_year_reward: { year: number; revenue_total: number; reward_label: string | null } | null;
}
interface ExpenseMonth { month: string; count: number; total: number; paid: number }
interface ExpenseDepartment { department: string; count: number; total: number }
interface ExpenseBooking {
  id: number; confirmation_code?: string;
  accommodation?: { id: number; name: string; city: string } | null;
  traveler?: { id: number; name: string; email: string } | null;
  check_in: string; check_out: string; total_price: number; amount_paid: number; status: string;
  department?: string | null; company_service?: string | null; company_project?: string | null; created_at: string;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  invited: { label: 'Invitation envoyée', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  active: { label: 'Actif', cls: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
  suspended: { label: 'Suspendu', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function MemberCompanyPage() {
  const router = useRouter();
  const t = useTranslations('member.pages.company');
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loyalty, setLoyalty] = useState<CorporateLoyalty | null>(null);
  const [expenses, setExpenses] = useState<{ total: number; count: number; by_month: ExpenseMonth[]; by_department: ExpenseDepartment[]; bookings: ExpenseBooking[] } | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState('');
  const [inviteLimit, setInviteLimit] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteErr, setInviteErr] = useState<string | null>(null);

  const [editingLimit, setEditingLimit] = useState<number | null>(null);
  const [limitDraft, setLimitDraft] = useState('');
  const [editingDepartment, setEditingDepartment] = useState<number | null>(null);
  const [departmentDraft, setDepartmentDraft] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/user/entreprise');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && user.traveler_type !== 'corporate') {
      router.push('/dashboard/user');
    }
  }, [isAuthenticated, isLoading, user, router]);

  const load = () => {
    Promise.all([
      api.get('/me/corporate/overview').then((r) => r.data).catch(() => null),
      api.get('/me/corporate/loyalty').then((r) => r.data).catch(() => null),
      api.get('/me/corporate/expenses', { params: { months: 6 } }).then((r) => r.data).catch(() => null),
    ]).then(([ov, loy, exp]) => {
      setOverview(ov);
      setLoyalty(loy);
      setExpenses(exp);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (!isAuthenticated || isLoading || user?.traveler_type !== 'corporate') return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, user?.traveler_type]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteErr(null);
    setInviteBusy(true);
    try {
      await api.post('/me/corporate/collaborators', {
        email: inviteEmail,
        name: inviteName || undefined,
        department: inviteDepartment || undefined,
        spending_limit: inviteLimit ? Number(inviteLimit) : undefined,
      });
      setInviteEmail(''); setInviteName(''); setInviteDepartment(''); setInviteLimit(''); setShowInvite(false);
      load();
    } catch (err: any) {
      setInviteErr(err.response?.data?.message || err.response?.data?.errors?.email?.[0] || "Impossible d'ajouter ce collaborateur.");
    } finally {
      setInviteBusy(false);
    }
  };

  const saveLimit = async (id: number) => {
    await api.put(`/me/corporate/collaborators/${id}`, { spending_limit: limitDraft ? Number(limitDraft) : null });
    setEditingLimit(null);
    load();
  };

  const saveDepartment = async (id: number) => {
    await api.put(`/me/corporate/collaborators/${id}`, { department: departmentDraft || '' });
    setEditingDepartment(null);
    load();
  };

  const removeCollaborator = async (id: number) => {
    if (!confirm('Retirer ce collaborateur ? Il ne pourra plus réserver au nom de votre entreprise.')) return;
    await api.delete(`/me/corporate/collaborators/${id}`);
    load();
  };

  const toggleSuspend = async (c: Collaborator) => {
    await api.put(`/me/corporate/collaborators/${c.id}`, { status: c.status === 'suspended' ? 'active' : 'suspended' });
    load();
  };

  if (isLoading || (loading && isAuthenticated) || user?.traveler_type !== 'corporate') {
    return <LoadingSpinner message="Chargement de votre espace entreprise…" size="lg" />;
  }
  if (!isAuthenticated) return null;

  const company = overview?.company;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>

        {/* Infos entreprise */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center flex-shrink-0"><Building2 className="w-5 h-5" /></span>
              <div>
                <h2 className="font-bold">{company?.company_name || 'Entreprise'}</h2>
                <p className="text-xs text-gray-500">{company?.company_sector || 'Informations société'}</p>
              </div>
            </div>
            <Link href="/dashboard/user/profil" className="btn-outline text-sm inline-flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Modifier
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Adresse</p>
              <p className="text-gray-700 dark:text-gray-300">{[company?.company_address, company?.company_city, company?.company_country].filter(Boolean).join(', ') || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">E-mail de facturation</p>
              <p className="text-gray-700 dark:text-gray-300">{company?.company_billing_email || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">N° TVA</p>
              <p className="text-gray-700 dark:text-gray-300">{company?.company_vat || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">RCCM</p>
              <p className="text-gray-700 dark:text-gray-300">{company?.company_rccm || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Numéro de Compte Contribuable</p>
              <p className="text-gray-700 dark:text-gray-300">{company?.company_tax_number || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Identifiant Unique</p>
              <p className="text-gray-700 dark:text-gray-300">{company?.company_unique_id || '—'}</p>
            </div>
          </div>
        </section>

        {/* Programme Corporate — progression CA annuel */}
        {loyalty && (
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0"><Award className="w-5 h-5" /></span>
              <div>
                <h2 className="font-bold">Programme Corporate {loyalty.year}</h2>
                <p className="text-xs text-gray-500">Récompenses selon le chiffre d&apos;affaires annuel de l&apos;entreprise</p>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4 mb-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(loyalty.revenue_total)} F</p>
              <p className="text-xs text-gray-500 mt-0.5">Chiffre d&apos;affaires réalisé depuis le 1er janvier</p>
            </div>

            {loyalty.current_tier && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                🎉 Palier atteint : <strong>{loyalty.current_tier.reward_label}</strong>
              </p>
            )}

            {loyalty.next_tier ? (
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                  <span>Prochain palier : {loyalty.next_tier.reward_label}</span>
                  <span>{formatPrice(loyalty.next_tier.remaining ?? 0)} F restants</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, (loyalty.revenue_total / loyalty.next_tier.revenue_threshold) * 100))}%` }}
                  />
                </div>
              </div>
            ) : loyalty.current_tier ? (
              <p className="text-xs text-gray-500">Tous les paliers de l&apos;année sont atteints — félicitations !</p>
            ) : null}

            {loyalty.last_year_reward && (
              <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                Bilan {loyalty.last_year_reward.year} : {formatPrice(loyalty.last_year_reward.revenue_total)} F de CA —{' '}
                {loyalty.last_year_reward.reward_label || "aucun palier atteint"}
              </p>
            )}
          </section>
        )}

        {/* Collaborateurs */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><Users className="w-5 h-5" /></span>
              <div>
                <h2 className="font-bold">Collaborateurs</h2>
                <p className="text-xs text-gray-500">Autorisés à réserver au nom de l&apos;entreprise</p>
              </div>
            </div>
            <button onClick={() => setShowInvite((v) => !v)} className="btn-outline text-sm inline-flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Ajouter
            </button>
          </div>

          {showInvite && (
            <form onSubmit={invite} className="mb-5 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input required type="email" placeholder="E-mail du collaborateur" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                <input placeholder="Nom (facultatif)" value={inviteName} onChange={(e) => setInviteName(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input placeholder="Département (facultatif)" value={inviteDepartment} onChange={(e) => setInviteDepartment(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                <input type="number" min={0} placeholder="Limite de dépenses mensuelle en FCFA (facultatif)" value={inviteLimit} onChange={(e) => setInviteLimit(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
              {inviteErr && <p className="text-sm text-red-600 dark:text-red-400">{inviteErr}</p>}
              <div className="flex items-center gap-2">
                <button type="submit" disabled={inviteBusy} className="btn-primary text-sm disabled:opacity-50 inline-flex items-center gap-2">
                  {inviteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Envoyer l&apos;invitation
                </button>
                <button type="button" onClick={() => setShowInvite(false)} className="text-sm text-gray-500 hover:underline">Annuler</button>
              </div>
              <p className="text-xs text-gray-400">
                S&apos;il a déjà un compte bo séjour, il est rattaché immédiatement. Sinon, il reçoit un e-mail
                d&apos;invitation et sera rattaché automatiquement dès son inscription avec cette adresse.
              </p>
            </form>
          )}

          {(overview?.collaborators.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Aucun collaborateur pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {overview!.collaborators.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex-wrap">
                  <span className="w-9 h-9 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {(c.name || c.email)[0]?.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{c.collaborator_user?.name || c.name || c.email}</p>
                    <p className="text-xs text-gray-500">{c.email}</p>
                  </div>

                  {editingDepartment === c.id ? (
                    <div className="flex items-center gap-1.5">
                      <input autoFocus value={departmentDraft} onChange={(e) => setDepartmentDraft(e.target.value)}
                        placeholder="Sans département"
                        className="w-32 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs outline-none focus:border-primary" />
                      <button onClick={() => saveDepartment(c.id)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingDepartment(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingDepartment(c.id); setDepartmentDraft(c.department || ''); }}
                      className="text-xs text-gray-500 hover:text-primary whitespace-nowrap">
                      {c.department || 'Sans département'}
                    </button>
                  )}

                  {editingLimit === c.id ? (
                    <div className="flex items-center gap-1.5">
                      <input autoFocus type="number" min={0} value={limitDraft} onChange={(e) => setLimitDraft(e.target.value)}
                        placeholder="Sans limite"
                        className="w-32 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs outline-none focus:border-primary" />
                      <button onClick={() => saveLimit(c.id)} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingLimit(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingLimit(c.id); setLimitDraft(c.spending_limit ? String(c.spending_limit) : ''); }}
                      className="text-xs text-gray-500 hover:text-primary whitespace-nowrap">
                      {c.spending_limit ? `Limite : ${formatPrice(Number(c.spending_limit))} F/mois` : 'Sans limite définie'}
                    </button>
                  )}

                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_LABEL[c.status]?.cls}`}>
                    {STATUS_LABEL[c.status]?.label}
                  </span>

                  {c.status !== 'invited' && (
                    <button onClick={() => toggleSuspend(c)} title={c.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
                      className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5">
                      {c.status === 'suspended' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  )}
                  <button onClick={() => removeCollaborator(c.id)} title="Retirer" className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Dépenses professionnelles */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><TrendingUp className="w-5 h-5" /></span>
              <div>
                <h2 className="font-bold">Dépenses professionnelles</h2>
                <p className="text-xs text-gray-500">Réservations de l&apos;entreprise sur les 6 derniers mois</p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  const response = await api.get('/me/corporate/expenses/export', {
                    params: { months: 12 },
                    responseType: 'blob',
                  });
                  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = blobUrl;
                  link.download = `depenses-corporate-${new Date().toISOString().slice(0, 10)}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  window.URL.revokeObjectURL(blobUrl);
                } catch (err) {
                  console.error('Erreur export CSV', err);
                }
              }}
              className="btn-outline text-xs inline-flex items-center gap-1.5 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Exporter (CSV)
            </button>
          </div>

          {!expenses || expenses.count === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Aucune réservation professionnelle sur cette période.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{expenses.count}</p>
                  <p className="text-xs text-gray-500 mt-1">Réservation{expenses.count > 1 ? 's' : ''}</p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(expenses.total)} F</p>
                  <p className="text-xs text-gray-500 mt-1">Montant total</p>
                </div>
              </div>

              {expenses.by_month.length > 1 && (
                <div className="space-y-1.5 mb-5">
                  {expenses.by_month.map((m) => (
                    <div key={m.month} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">{monthLabel(m.month)}</span>
                      <span className="text-gray-900 dark:text-white font-medium">{m.count} rés. · {formatPrice(m.total)} F</span>
                    </div>
                  ))}
                </div>
              )}

              {expenses.by_department.length > 1 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Par département</p>
                  <div className="space-y-1.5">
                    {expenses.by_department.map((d) => (
                      <div key={d.department} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
                        <span className="text-gray-600 dark:text-gray-400">{d.department}</span>
                        <span className="text-gray-900 dark:text-white font-medium">{d.count} rés. · {formatPrice(d.total)} F</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {expenses.bookings.slice(0, 10).map((b) => (
                  <Link key={b.id} href={`/bookings/${b.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-primary/40 transition-colors">
                    <Briefcase className="w-4 h-4 text-secondary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{b.accommodation?.name || '—'}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {b.accommodation?.city}</span>
                        <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" /> {fmt(b.check_in)}</span>
                        {b.traveler?.name && <span>· {b.traveler.name}</span>}
                        {(b.company_service || b.company_project) && <span>· {[b.company_service, b.company_project].filter(Boolean).join(' / ')}</span>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(b.total_price)} F</p>
                      <Link href={`/bookings/${b.id}#receipt`} className="text-xs text-primary hover:underline inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Download className="w-3 h-3" /> Facture
                      </Link>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <MemberAside />
    </div>
  );
}
