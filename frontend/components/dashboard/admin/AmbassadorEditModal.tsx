'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';

export interface EditableAmbassador {
  id: number;
  code: string;
  display_name: string | null;
  notes: string | null;
  status: 'active_account' | 'pending_account';
  invited_email: string | null;
  invited_phone: string | null;
}

interface Props {
  ambassador: EditableAmbassador;
  onClose: () => void;
  onSaved: () => void;
}

const inputCls =
  'w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none';

/** Modification d'un ambassadeur : nom affiché, code, notes internes et, tant qu'il n'a pas de compte, son e-mail / numéro WhatsApp. */
export default function AmbassadorEditModal({ ambassador, onClose, onSaved }: Props) {
  const { showError, showSuccess } = useToast();
  const pending = ambassador.status === 'pending_account';
  const [form, setForm] = useState({
    display_name: ambassador.display_name ?? '',
    code: ambassador.code,
    notes: ambassador.notes ?? '',
    email: ambassador.invited_email ?? '',
    phone: ambassador.invited_phone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const codeChanged = form.code.trim().toUpperCase() !== ambassador.code;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        display_name: form.display_name.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (codeChanged) payload.code = form.code.trim();
      if (pending) {
        payload.invited_email = form.email.trim() || null;
        payload.invited_phone = form.phone.trim() || null;
      }
      await api.put(`/admin/referral-partners/${ambassador.id}`, payload);
      showSuccess('Ambassadeur modifié');
      onSaved();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      showError((errors && (Object.values(errors)[0] as string[])[0]) || err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-label="Modifier l'ambassadeur" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 p-6 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Modifier l&apos;ambassadeur</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fermer"><X className="w-5 h-5" /></button>
        </div>

        <label className="block text-sm">
          <span className="block mb-1 font-medium">Nom affiché</span>
          <input className={inputCls} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Restaurant Chez Mama" maxLength={255} />
          <span className="block text-xs text-gray-400 mt-1">Imprimé sur l&apos;affiche (« Invitation de … ») et montré aux clients qui s&apos;inscrivent.</span>
        </label>

        <label className="block text-sm">
          <span className="block mb-1 font-medium">Code</span>
          <input
            className={inputCls + ' uppercase font-mono'}
            value={form.code}
            maxLength={20}
            onChange={(e) => setForm({ ...form, code: e.target.value.replace(/[^A-Za-z0-9]/g, '') })}
          />
          {codeChanged && (
            <span className="mt-2 flex gap-2 text-xs rounded-lg bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Changer le code rend <strong>inutilisables</strong> les affiches, QR codes et liens déjà imprimés ou partagés : ils ne mèneront plus à son invitation.
                Les clients déjà rattachés ne sont pas touchés. Retéléchargez ensuite l&apos;affiche.
              </span>
            </span>
          )}
        </label>

        {pending && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="block mb-1 font-medium">E-mail</span>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="block mb-1 font-medium">Numéro WhatsApp</span>
              <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <p className="sm:col-span-2 text-xs text-gray-400 -mt-1">Pas encore inscrit : il retrouvera son espace dès qu&apos;un compte vérifié portera cet e-mail ou ce numéro.</p>
          </div>
        )}

        <label className="block text-sm">
          <span className="block mb-1 font-medium">Notes internes <span className="text-gray-400 font-normal">(administrateurs uniquement)</span></span>
          <textarea className={inputCls + ' resize-y'} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value.slice(0, 5000) })} />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-outline text-sm">Annuler</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  );
}
