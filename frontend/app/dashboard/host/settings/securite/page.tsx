'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/lib/api';
import HostSettingsPageHeader from '@/components/dashboard/host/HostSettingsPageHeader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  ShieldCheck, Lock, KeyRound, Copy, Eye, EyeOff, Loader2, CheckCircle2,
} from 'lucide-react';

function Card({ icon: Icon, title, subtitle, children }: { icon: any; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5" /></span>
        <div>
          <h2 className="font-bold">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function HostSecuritySettingsPage() {
  const [loading, setLoading] = useState(true);

  // Mot de passe
  const [pwd, setPwd] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);

  // 2FA
  const [twoFA, setTwoFA] = useState<{ enabled: boolean } | null>(null);
  const [setupData, setSetupData] = useState<{ secret: string; qr_code_url: string } | null>(null);
  const [code, setCode] = useState('');
  const [twoFABusy, setTwoFABusy] = useState(false);
  const [twoFAErr, setTwoFAErr] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disablePwd, setDisablePwd] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [showDisablePwd, setShowDisablePwd] = useState(false);

  useEffect(() => {
    api.get('/two-factor/status')
      .then((r) => setTwoFA(r.data))
      .catch(() => setTwoFA({ enabled: false }))
      .finally(() => setLoading(false));
  }, []);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdErr(null); setPwdMsg(null);
    if (pwd.password.length < 8) { setPwdErr('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return; }
    if (pwd.password !== pwd.password_confirmation) { setPwdErr('Les mots de passe ne correspondent pas.'); return; }
    setPwdSaving(true);
    try {
      await api.post('/me/password', pwd);
      setPwdMsg('Mot de passe modifié ✓');
      setPwd({ current_password: '', password: '', password_confirmation: '' });
      setTimeout(() => setPwdMsg(null), 3000);
    } catch (err: any) {
      setPwdErr(err.response?.data?.errors?.current_password?.[0] || err.response?.data?.message || 'Échec de la modification.');
    } finally {
      setPwdSaving(false);
    }
  };

  const startSetup = async () => {
    setTwoFAErr(null);
    setTwoFABusy(true);
    try {
      const res = await api.post('/two-factor/setup');
      setSetupData(res.data);
    } catch (err: any) {
      setTwoFAErr(err.response?.data?.message || "Impossible de démarrer l'activation.");
    } finally {
      setTwoFABusy(false);
    }
  };

  const confirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData) return;
    setTwoFAErr(null);
    setTwoFABusy(true);
    try {
      const res = await api.post('/two-factor/enable', { secret: setupData.secret, code });
      setRecoveryCodes(res.data?.recovery_codes ?? []);
      setTwoFA({ enabled: true });
      setSetupData(null);
      setCode('');
    } catch (err: any) {
      setTwoFAErr(err.response?.data?.errors?.code?.[0] || err.response?.data?.message || 'Code incorrect.');
    } finally {
      setTwoFABusy(false);
    }
  };

  const disable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFAErr(null);
    setTwoFABusy(true);
    try {
      await api.post('/two-factor/disable', { password: disablePwd });
      setTwoFA({ enabled: false });
      setShowDisableForm(false);
      setDisablePwd('');
    } catch (err: any) {
      setTwoFAErr(err.response?.data?.errors?.password?.[0] || err.response?.data?.message || 'Mot de passe incorrect.');
    } finally {
      setTwoFABusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <HostSettingsPageHeader
        icon={ShieldCheck}
        title="Sécurité"
        description="Mot de passe et double authentification pour votre compte partenaire."
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <Card icon={Lock} title="Mot de passe">
            <form onSubmit={changePassword} className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium mb-1.5">Mot de passe actuel</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={pwd.current_password}
                    onChange={(e) => setPwd((s) => ({ ...s, current_password: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm pr-10"
                  />
                  <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Nouveau mot de passe</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={pwd.password}
                  onChange={(e) => setPwd((s) => ({ ...s, password: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">8 caractères minimum</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Confirmer</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={pwd.password_confirmation}
                  onChange={(e) => setPwd((s) => ({ ...s, password_confirmation: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              {pwdErr && <p className="text-sm text-red-600 dark:text-red-400">{pwdErr}</p>}
              {pwdMsg && <p className="text-sm text-green-600 dark:text-green-400">{pwdMsg}</p>}
              <button type="submit" disabled={pwdSaving} className="btn-primary text-sm disabled:opacity-50">
                {pwdSaving ? 'Enregistrement…' : 'Modifier le mot de passe'}
              </button>
            </form>
          </Card>

          <Card icon={ShieldCheck} title="Double authentification" subtitle="Ajoute une étape de vérification à la connexion">
            {recoveryCodes ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-300 text-sm">Double authentification activée</p>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-1">Conservez ces codes de secours en lieu sûr — chacun ne fonctionne qu&apos;une fois.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {recoveryCodes.map((c) => (
                    <div key={c} className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">{c}</div>
                  ))}
                </div>
                <button onClick={() => setRecoveryCodes(null)} className="btn-primary text-sm">J&apos;ai noté mes codes</button>
              </div>
            ) : twoFA?.enabled ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">Activée</span>
                </div>
                {!showDisableForm ? (
                  <button onClick={() => setShowDisableForm(true)} className="text-sm text-red-600 dark:text-red-400 hover:underline">Désactiver la double authentification</button>
                ) : (
                  <form onSubmit={disable2FA} className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Confirmez votre mot de passe pour désactiver.</p>
                    <div className="relative max-w-xs">
                      <input type={showDisablePwd ? 'text' : 'password'} value={disablePwd} onChange={(e) => setDisablePwd(e.target.value)} required
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm pr-10" />
                      <button type="button" onClick={() => setShowDisablePwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showDisablePwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {twoFAErr && <p className="text-sm text-red-600 dark:text-red-400">{twoFAErr}</p>}
                    <div className="flex items-center gap-2">
                      <button type="submit" disabled={twoFABusy} className="btn-outline text-sm text-red-600 border-red-300 hover:bg-red-50 disabled:opacity-50">
                        {twoFABusy ? 'Désactivation…' : 'Confirmer la désactivation'}
                      </button>
                      <button type="button" onClick={() => { setShowDisableForm(false); setTwoFAErr(null); }} className="text-sm text-gray-500 hover:underline">Annuler</button>
                    </div>
                  </form>
                )}
              </div>
            ) : setupData ? (
              <form onSubmit={confirmEnable} className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Scannez ce QR code avec Google Authenticator (ou une app compatible), puis saisissez le code à 6 chiffres généré.
                </p>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="p-3 bg-white rounded-xl border border-gray-200 flex-shrink-0">
                    <QRCodeSVG value={setupData.qr_code_url} size={140} />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Clé manuelle (si le scan échoue)</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 break-all">{setupData.secret}</code>
                        <button type="button" onClick={() => navigator.clipboard?.writeText(setupData.secret)} title="Copier" className="p-1.5 text-gray-400 hover:text-primary">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Code de vérification</label>
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        className="w-32 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm tracking-widest text-center"
                      />
                    </div>
                  </div>
                </div>
                {twoFAErr && <p className="text-sm text-red-600 dark:text-red-400">{twoFAErr}</p>}
                <div className="flex items-center gap-2">
                  <button type="submit" disabled={twoFABusy || code.length !== 6} className="btn-primary text-sm disabled:opacity-50 inline-flex items-center gap-2">
                    {twoFABusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Vérification…</> : 'Activer'}
                  </button>
                  <button type="button" onClick={() => { setSetupData(null); setTwoFAErr(null); }} className="text-sm text-gray-500 hover:underline">Annuler</button>
                </div>
              </form>
            ) : (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Non activée. Ajoutez une couche de sécurité supplémentaire avec une application d&apos;authentification.</p>
                {twoFAErr && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{twoFAErr}</p>}
                <button onClick={startSetup} disabled={twoFABusy} className="btn-outline text-sm inline-flex items-center gap-2 disabled:opacity-50">
                  <KeyRound className="w-4 h-4" /> {twoFABusy ? 'Chargement…' : 'Activer la double authentification'}
                </button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
