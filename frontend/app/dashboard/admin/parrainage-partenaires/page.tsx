'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Download, PauseCircle, PlayCircle, QrCode, UserPlus } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Ambassador {
  id: number;
  code: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  status: 'active_account' | 'pending_account';
  invited_email: string | null;
  invited_phone: string | null;
  user: { id: number; name: string; email: string; phone: string | null } | null;
  link: string;
  stats: {
    clicks: number;
    signups: number;
    signups_validated: number;
    bookings: number;
    points_awarded: number;
    conversion_signup: number | null;
    conversion_booking: number | null;
  };
}

const pct = (v: number | null) => (v === null ? '—' : `${v} %`);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

const inputCls =
  'w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none';

export default function AdminAmbassadorsPage() {
  const { showError, showSuccess } = useToast();
  const [rows, setRows] = useState<Ambassador[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: '', phone: '', display_name: '', code: '' });

  const load = useCallback(() => {
    api.get('/admin/referral-partners')
      .then((res) => setRows(res.data.data))
      .catch(() => showError('Impossible de charger les ambassadeurs'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(load, [load]);

  const designate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() && !form.phone.trim()) {
      showError("Indiquez l'e-mail ou le numéro WhatsApp de l'ambassadeur.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/admin/referral-partners', {
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        display_name: form.display_name.trim() || undefined,
        code: form.code.trim() || undefined,
      });
      showSuccess(
        res.data.data.status === 'pending_account'
          ? "Ambassadeur désigné. Il retrouvera son QR code et ses points dès qu'il créera son compte avec cet e-mail ou ce numéro."
          : 'Ambassadeur désigné : son espace est déjà actif.'
      );
      setForm({ email: '', phone: '', display_name: '', code: '' });
      load();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      showError((errors && (Object.values(errors)[0] as string[])[0]) || err.response?.data?.message || "Erreur lors de la désignation");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row: Ambassador) => {
    try {
      await api.put(`/admin/referral-partners/${row.id}`, { is_active: !row.is_active });
      showSuccess(row.is_active ? 'Ambassadeur suspendu' : 'Ambassadeur réactivé');
      load();
    } catch {
      showError('Erreur lors de la mise à jour');
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('Lien copié.');
    } catch {
      showError('Impossible de copier automatiquement.');
    }
  };

  // Export CSV (séparateur « ; » et BOM : s'ouvre directement dans Excel en français)
  const exportCsv = () => {
    const head = ['Identifiant', 'Nom affiché', 'Code', 'Compte', 'E-mail', 'Téléphone', 'Enregistré le', 'Statut', 'Visiteurs uniques', 'Inscriptions', 'Inscriptions validées', 'Réservations', 'Conversion inscriptions (%)', 'Conversion réservations (%)', 'Points attribués'];
    const lines = rows.map((r) => [
      r.id, r.display_name ?? '', r.code, r.status === 'active_account' ? (r.user?.name ?? '') : 'Pas encore inscrit',
      r.user?.email ?? r.invited_email ?? '', r.user?.phone ?? r.invited_phone ?? '', fmtDate(r.created_at), r.is_active ? 'Actif' : 'Suspendu',
      r.stats.clicks, r.stats.signups, r.stats.signups_validated, r.stats.bookings,
      r.stats.conversion_signup ?? '', r.stats.conversion_booking ?? '', r.stats.points_awarded,
    ]);
    const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = '﻿' + [head, ...lines].map((l) => l.map(esc).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `parrainage-partenaires-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <QrCode className="w-6 h-6 text-primary" /> Parrainage Partenaires
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            Ambassadeurs externes (restaurateurs, influenceurs) qui recrutent des clients avec un QR code et un lien traçable : 50 points à l&apos;inscription
            validée du client, 50 points à sa première réservation confirmée, et 5&nbsp;% de remise offerts au client sur sa première nuitée.
          </p>
        </div>
        <button onClick={exportCsv} disabled={rows.length === 0} className="btn-outline inline-flex items-center gap-2 text-sm disabled:opacity-50">
          <Download className="w-4 h-4" /> Exporter (Excel / CSV)
        </button>
      </div>

      <form onSubmit={designate} className="card space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><UserPlus className="w-4 h-4 text-primary" /> Désigner un ambassadeur</h2>
        <p className="text-xs text-gray-500 -mt-2">
          Pas besoin qu&apos;il ait déjà un compte : indiquez son e-mail et/ou son numéro WhatsApp. Il retrouvera son QR code, son lien et les points déjà gagnés
          dès qu&apos;il créera son compte avec cet e-mail ou ce numéro.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="block mb-1 font-medium">E-mail</span>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ambassadeur@exemple.com" />
          </label>
          <label className="block text-sm">
            <span className="block mb-1 font-medium">Numéro WhatsApp</span>
            <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+225 07 01 02 03 04" />
          </label>
          <label className="block text-sm">
            <span className="block mb-1 font-medium">Nom affiché <span className="text-gray-400 font-normal">(facultatif)</span></span>
            <input className={inputCls} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Restaurant Chez Mama" />
          </label>
          <label className="block text-sm">
            <span className="block mb-1 font-medium">Code <span className="text-gray-400 font-normal">(facultatif, 4 à 20 lettres ou chiffres)</span></span>
            <input
              className={inputCls + ' uppercase'}
              value={form.code}
              maxLength={20}
              onChange={(e) => setForm({ ...form, code: e.target.value.replace(/[^A-Za-z0-9]/g, '') })}
              placeholder="Généré automatiquement si vide"
            />
          </label>
        </div>
        <button type="submit" disabled={saving} className="btn-primary text-sm">
          {saving ? 'Enregistrement…' : "Désigner l'ambassadeur"}
        </button>
      </form>

      {loading ? (
        <LoadingSpinner />
      ) : rows.length === 0 ? (
        <p className="card text-sm text-gray-500 text-center">Aucun ambassadeur pour le moment.</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="p-3">Ambassadeur</th>
                <th className="p-3">Code</th>
                <th className="p-3 text-right">Visiteurs</th>
                <th className="p-3 text-right">Inscrits</th>
                <th className="p-3 text-right">Réservations</th>
                <th className="p-3 text-right">Conversion</th>
                <th className="p-3 text-right">Points</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 align-top">
                  <td className="p-3">
                    <p className="font-medium text-gray-900 dark:text-white">{r.display_name || r.user?.name || 'Ambassadeur'}</p>
                    <p className="text-xs text-gray-500">{r.user?.email ?? r.invited_email ?? r.invited_phone}</p>
                    <p className="text-xs mt-0.5">
                      {r.status === 'pending_account' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">En attente de son inscription</span>
                      ) : r.is_active ? (
                        <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">Actif</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">Suspendu</span>
                      )}
                      <span className="text-gray-400 ml-2">depuis le {fmtDate(r.created_at)}</span>
                    </p>
                  </td>
                  <td className="p-3">
                    <code className="font-mono text-xs font-semibold">{r.code}</code>
                    <button onClick={() => copy(r.link)} className="ml-2 text-gray-400 hover:text-primary align-middle" aria-label="Copier le lien">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </td>
                  <td className="p-3 text-right tabular-nums">{r.stats.clicks}</td>
                  <td className="p-3 text-right tabular-nums">
                    {r.stats.signups_validated}
                    {r.stats.signups > r.stats.signups_validated && <span className="block text-xs text-gray-400">{r.stats.signups - r.stats.signups_validated} à valider</span>}
                  </td>
                  <td className="p-3 text-right tabular-nums">{r.stats.bookings}</td>
                  <td className="p-3 text-right text-xs text-gray-500">
                    <span className="block">{pct(r.stats.conversion_signup)} inscrits</span>
                    <span className="block">{pct(r.stats.conversion_booking)} réservent</span>
                  </td>
                  <td className="p-3 text-right tabular-nums font-semibold">{r.stats.points_awarded}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => toggle(r)} className="text-gray-400 hover:text-primary" aria-label={r.is_active ? 'Suspendre' : 'Réactiver'} title={r.is_active ? 'Suspendre' : 'Réactiver'}>
                      {r.is_active ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
