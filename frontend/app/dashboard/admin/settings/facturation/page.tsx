'use client';

import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import SettingsPageShell from '@/components/dashboard/admin/SettingsPageShell';

interface PaymentMethodRow {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
}

export default function AdminBillingSettingsPage() {
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [deferredPaymentEnabled, setDeferredPaymentEnabled] = useState(true);
  const [billingCompanyName, setBillingCompanyName] = useState('');
  const [billingRccm, setBillingRccm] = useState('');
  const [billingNcc, setBillingNcc] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/payment-methods'),
      api.get('/settings/admin'),
    ])
      .then(([methodsRes, settingsRes]) => {
        setMethods(methodsRes.data?.data ?? []);
        const s = settingsRes.data || {};
        setDeferredPaymentEnabled(typeof s.deferred_payment_enabled === 'boolean' ? s.deferred_payment_enabled : true);
        setBillingCompanyName(s.billing_company_name ?? '');
        setBillingRccm(s.billing_rccm ?? '');
        setBillingNcc(s.billing_ncc ?? '');
        setBillingAddress(s.billing_address ?? '');
      })
      .catch(() => showError('Erreur lors du chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMethod = async (method: PaymentMethodRow) => {
    setTogglingId(method.id);
    try {
      await api.put(`/admin/payment-methods/${method.id}`, { is_active: !method.is_active });
      setMethods((prev) => prev.map((m) => (m.id === method.id ? { ...m, is_active: !m.is_active } : m)));
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setTogglingId(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings/admin', {
        deferred_payment_enabled: deferredPaymentEnabled,
        billing_company_name: billingCompanyName.trim() || null,
        billing_rccm: billingRccm.trim() || null,
        billing_ncc: billingNcc.trim() || null,
        billing_address: billingAddress.trim() || null,
      });
      showSuccess('Facturation enregistrée');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPageShell
      icon={CreditCard}
      title="Facturation"
      description="Moyens de paiement proposés au voyageur, paiement différé et identité de facturation de la plateforme."
    >
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          <section className="card">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Moyens de paiement</h2>
            <p className="text-sm text-gray-500 mb-4">
              Gérés par la passerelle Malia Pay — activez ou masquez leur mise en avant sur la plateforme.
            </p>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {methods.map((m) => (
                <div key={m.id} className="py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{m.name}</span>
                  <button
                    type="button"
                    disabled={togglingId === m.id}
                    onClick={() => toggleMethod(m)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full disabled:opacity-50 ${m.is_active ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${m.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
              {methods.length === 0 && (
                <p className="text-sm text-gray-500 py-3">Aucun moyen de paiement configuré.</p>
              )}
            </div>
          </section>

          <section className="card">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Paiement différé</h2>
              <button
                type="button"
                onClick={() => setDeferredPaymentEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${deferredPaymentEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${deferredPaymentEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Autorise les entreprises à réserver avec règlement différé (sur facture) plutôt qu&apos;un paiement immédiat en ligne.
            </p>
          </section>

          <section className="card space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Identité de facturation</h2>
            <p className="text-sm text-gray-500 -mt-2">
              Utilisée comme en-tête sur les futurs justificatifs et factures générés par la plateforme.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Raison sociale</label>
                <input type="text" value={billingCompanyName} onChange={(e) => setBillingCompanyName(e.target.value)}
                  placeholder="bo séjour SARL"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">RCCM</label>
                <input type="text" value={billingRccm} onChange={(e) => setBillingRccm(e.target.value)}
                  placeholder="CI-ABJ-2025-B-00000"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">NCC</label>
                <input type="text" value={billingNcc} onChange={(e) => setBillingNcc(e.target.value)}
                  placeholder="0000000 A"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Adresse</label>
                <input type="text" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Cocody, Abidjan, Côte d'Ivoire"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm" />
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </SettingsPageShell>
  );
}
