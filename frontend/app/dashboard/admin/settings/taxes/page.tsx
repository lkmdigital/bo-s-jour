'use client';

import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import SettingsPageShell from '@/components/dashboard/admin/SettingsPageShell';

export default function AdminTaxesSettingsPage() {
  const { showError, showSuccess, showWarning } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCommission, setSavingCommission] = useState(false);

  const [commissionRate, setCommissionRate] = useState('10');
  const [vatRate, setVatRate] = useState('18');
  const [touristTaxEnabled, setTouristTaxEnabled] = useState(false);
  const [touristTaxMode, setTouristTaxMode] = useState<'fixed' | 'percentage'>('fixed');
  const [touristTaxAmount, setTouristTaxAmount] = useState('0');

  useEffect(() => {
    Promise.all([
      api.get('/settings/admin'),
      api.get('/revenue/commission-rate').catch(() => ({ data: { commission_rate: 10 } })),
    ])
      .then(([settingsRes, commissionRes]) => {
        const s = settingsRes.data || {};
        setVatRate(String(s.vat_rate ?? 18));
        setTouristTaxEnabled(!!s.tourist_tax_enabled);
        setTouristTaxMode(s.tourist_tax_mode === 'percentage' ? 'percentage' : 'fixed');
        setTouristTaxAmount(String(s.tourist_tax_amount ?? 0));
        setCommissionRate(String(commissionRes.data?.commission_rate ?? 10));
      })
      .catch(() => showError('Erreur lors du chargement'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveCommission = async () => {
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 8 || rate > 10) {
      showWarning('Le taux de commission doit être entre 8 et 10');
      return;
    }
    setSavingCommission(true);
    try {
      await api.put('/revenue/commission-rate', { commission_rate: rate });
      showSuccess('Commission enregistrée');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur');
    } finally {
      setSavingCommission(false);
    }
  };

  const save = async () => {
    const vat = parseFloat(vatRate);
    const taxAmount = parseFloat(touristTaxAmount);
    if (isNaN(vat) || vat < 0 || vat > 100) {
      showWarning('La TVA doit être un pourcentage valide (0 à 100)');
      return;
    }
    if (touristTaxEnabled && (isNaN(taxAmount) || taxAmount < 0)) {
      showWarning('Le montant de la taxe de séjour est invalide');
      return;
    }
    setSaving(true);
    try {
      await api.put('/settings/admin', {
        vat_rate: vat,
        tourist_tax_enabled: touristTaxEnabled,
        tourist_tax_mode: touristTaxMode,
        tourist_tax_amount: isNaN(taxAmount) ? 0 : taxAmount,
      });
      showSuccess('Taxes enregistrées');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPageShell
      icon={Receipt}
      title="Taxes de séjour"
      description="TVA, commission plateforme et taxe de séjour appliquées aux réservations."
    >
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          <section className="card space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Commission plateforme</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Taux (%)</label>
                <input
                  type="number"
                  min={8}
                  max={10}
                  step={0.1}
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                />
                <p className="text-xs text-gray-500 mt-1">Valeur autorisée : 8 à 10%</p>
              </div>
              <button onClick={saveCommission} disabled={savingCommission} className="btn-primary">
                {savingCommission ? '…' : 'Enregistrer'}
              </button>
            </div>
          </section>

          <section className="card space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">TVA</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Taux de TVA (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
            </div>
          </section>

          <section className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Taxe de séjour</h2>
              <button
                type="button"
                onClick={() => setTouristTaxEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  touristTaxEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    touristTaxEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {touristTaxEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Mode</label>
                  <select
                    value={touristTaxMode}
                    onChange={(e) => setTouristTaxMode(e.target.value as 'fixed' | 'percentage')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="fixed">Montant fixe (par voyageur / nuit)</option>
                    <option value="percentage">Pourcentage du prix du séjour</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {touristTaxMode === 'fixed' ? 'Montant (FCFA)' : 'Taux (%)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={touristTaxMode === 'fixed' ? 1 : 0.1}
                    value={touristTaxAmount}
                    onChange={(e) => setTouristTaxAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-gray-400">
              Enregistrée ici pour référence ; son application automatique au calcul du prix des
              réservations n&apos;est pas encore branchée.
            </p>
          </section>

          <div className="flex justify-end">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement…' : 'Enregistrer TVA et taxe de séjour'}
            </button>
          </div>
        </div>
      )}
    </SettingsPageShell>
  );
}
