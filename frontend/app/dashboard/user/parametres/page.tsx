'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useAppearanceStore, TextScale, PriceFormat, Density, DefaultSort, LandingPage } from '@/stores/appearanceStore';
import { useLocaleStore, Locale } from '@/stores/localeStore';
import { resolveImageUrl } from '@/lib/utils';
import MemberAside from '@/components/dashboard/user/MemberAside';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  Lock, ShieldCheck, Bell, Loader2, CheckCircle2, KeyRound, Copy, Eye, EyeOff, ArrowRight,
  Sun, Moon, UserCog, Pencil, Type, Sparkles, RotateCcw, Banknote, Rows3, SortAsc, Home as HomeIcon, Languages,
} from 'lucide-react';

function Card({ icon: Icon, title, subtitle, children }: { icon: any; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
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

export default function MemberSettingsPage() {
  const router = useRouter();
  const t = useTranslations('member.pages.settings');
  const tLang = useTranslations('member.language');
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { locale, setLocale } = useLocaleStore();
  const {
    reduceMotion, textScale, priceFormat, density, resultsPerPage, defaultSort, landingPage,
    setReduceMotion, setTextScale, setPriceFormat, setDensity, setResultsPerPage, setDefaultSort, setLandingPage,
    reset: resetAppearance,
  } = useAppearanceStore();
  const [loading, setLoading] = useState(true);

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

  // Notifications
  const [notif, setNotif] = useState({ notif_email: true, notif_whatsapp: true, notif_sms: false });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/user/parametres');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    Promise.all([
      api.get('/two-factor/status').then((r) => r.data).catch(() => ({ enabled: false })),
      api.get('/me').then((r) => r.data?.user ?? r.data).catch(() => null),
    ]).then(([status, me]) => {
      setTwoFA(status);
      if (me) setNotif({ notif_email: !!me.notif_email, notif_whatsapp: !!me.notif_whatsapp, notif_sms: !!me.notif_sms });
      setLoading(false);
    });
  }, [isAuthenticated, isLoading]);

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

  const saveNotif = async (next: typeof notif) => {
    setNotif(next);
    setNotifSaving(true);
    setNotifMsg(null);
    try {
      await api.put('/me/profile', next);
      setNotifMsg('Préférences enregistrées ✓');
      setTimeout(() => setNotifMsg(null), 2500);
    } catch {
      setNotifMsg("Échec de l'enregistrement.");
    } finally {
      setNotifSaving(false);
    }
  };

  if (isLoading || (loading && isAuthenticated)) return <LoadingSpinner message="Chargement de vos paramètres…" size="lg" />;
  if (!isAuthenticated) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>

        {/* Personnalisation : apparence de l'app + accès au profil */}
        <Card icon={UserCog} title="Personnalisation" subtitle="Votre application et votre profil, à votre image">
          <div className="space-y-6">
            {/* Apparence */}
            <div>
              <p className="text-sm font-medium mb-2">Apparence de l&apos;application</p>
              <div className="grid grid-cols-2 gap-3 max-w-xs">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-colors ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                >
                  <Sun className="w-5 h-5" />
                  <span className="text-xs font-medium">Clair</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-colors ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                >
                  <Moon className="w-5 h-5" />
                  <span className="text-xs font-medium">Sombre</span>
                </button>
              </div>
            </div>

            {/* Langue */}
            <div className="pt-5 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium mb-2 flex items-center gap-2"><Languages className="w-4 h-4" /> {tLang('label')}</p>
              <div className="grid grid-cols-2 gap-3 max-w-xs">
                {([
                  { key: 'fr' as Locale, label: tLang('french') },
                  { key: 'en' as Locale, label: tLang('english') },
                ]).map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setLocale(o.key)}
                    className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${locale === o.key ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{tLang('scopeNote')}</p>
            </div>

            {/* Taille du texte */}
            <div className="pt-5 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium mb-2 flex items-center gap-2"><Type className="w-4 h-4" /> Taille du texte</p>
              <div className="grid grid-cols-3 gap-3 max-w-sm">
                {([
                  { key: 'normal' as TextScale, label: 'Normal', size: 'text-sm' },
                  { key: 'large' as TextScale, label: 'Grand', size: 'text-base' },
                  { key: 'larger' as TextScale, label: 'Très grand', size: 'text-lg' },
                ]).map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setTextScale(o.key)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-colors ${textScale === o.key ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                  >
                    <span className={`${o.size} font-bold`}>Aa</span>
                    <span className="text-xs font-medium">{o.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Animations */}
            <div className="pt-5 border-t border-gray-100 dark:border-gray-700">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="w-4 h-4" /> Réduire les animations
                </span>
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={(e) => setReduceMotion(e.target.checked)}
                  className="w-5 h-5 accent-[#FF0000]"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">Désactive les transitions et effets de défilement pour un confort de lecture accru.</p>
            </div>

            {/* Densité d'affichage */}
            <div className="pt-5 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium mb-2 flex items-center gap-2"><Rows3 className="w-4 h-4" /> Densité d&apos;affichage</p>
              <div className="grid grid-cols-2 gap-3 max-w-xs">
                {([
                  { key: 'comfortable' as Density, label: 'Confortable' },
                  { key: 'compact' as Density, label: 'Compacte' },
                ]).map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setDensity(o.key)}
                    className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${density === o.key ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Resserre l&apos;espacement des cartes de votre espace membre.</p>
            </div>

            {/* Format des prix */}
            <div className="pt-5 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium mb-2 flex items-center gap-2"><Banknote className="w-4 h-4" /> Format des prix</p>
              <div className="grid grid-cols-2 gap-3 max-w-xs">
                <button
                  type="button"
                  onClick={() => setPriceFormat('standard')}
                  className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${priceFormat === 'standard' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                >
                  195 000 F
                </button>
                <button
                  type="button"
                  onClick={() => setPriceFormat('compact')}
                  className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${priceFormat === 'compact' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                >
                  195K F
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">S&apos;applique aux prochaines pages consultées.</p>
            </div>

            {/* Recherche : tri par défaut + résultats par page */}
            <div className="pt-5 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2"><SortAsc className="w-4 h-4" /> Tri par défaut</p>
                <select
                  value={defaultSort}
                  onChange={(e) => setDefaultSort(e.target.value as DefaultSort)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="recommended">Recommandés</option>
                  <option value="price_asc">Prix croissant</option>
                  <option value="price_desc">Prix décroissant</option>
                  <option value="rating">Mieux notés</option>
                </select>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Résultats par page</p>
                <select
                  value={resultsPerPage}
                  onChange={(e) => setResultsPerPage(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value={9}>9</option>
                  <option value={12}>12</option>
                  <option value={18}>18</option>
                </select>
              </div>
            </div>

            {/* Page d'accueil après connexion */}
            <div className="pt-5 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium mb-2 flex items-center gap-2"><HomeIcon className="w-4 h-4" /> Page d&apos;accueil après connexion</p>
              <select
                value={landingPage}
                onChange={(e) => setLandingPage(e.target.value as LandingPage)}
                className="w-full max-w-xs px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="home">Accueil du site</option>
                <option value="dashboard">Tableau de bord</option>
                <option value="reservations">Mes réservations</option>
                <option value="recherche">Recherche</option>
              </select>
            </div>

            {/* Réinitialiser */}
            <div className="pt-5 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => { resetAppearance(); setTheme('light'); }}
                className="text-sm text-gray-500 hover:text-primary inline-flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Réinitialiser l&apos;apparence par défaut
              </button>
            </div>

            {/* Profil */}
            <div className="pt-5 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4">
              <span className="relative w-14 h-14 rounded-full overflow-hidden bg-primary flex-shrink-0 flex items-center justify-center text-white font-bold">
                {user?.avatar ? (
                  <Image src={resolveImageUrl(user.avatar) || user.avatar} alt={user?.name || 'Profil'} fill className="object-cover" />
                ) : (
                  (user?.name || 'BS').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{user?.name || 'Mon profil'}</p>
                <p className="text-xs text-gray-500">Photo, informations personnelles, préférences de voyage…</p>
              </div>
              <Link href="/dashboard/user/profil" className="btn-outline text-sm inline-flex items-center gap-2 flex-shrink-0">
                <Pencil className="w-4 h-4" /> Personnaliser
              </Link>
            </div>
          </div>
        </Card>

        {/* Mot de passe */}
        <Card icon={Lock} title="Mot de passe">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Changez régulièrement votre mot de passe pour sécuriser votre compte.</p>
          <Link href="/dashboard/user/profil#securite" className="btn-outline text-sm inline-flex items-center gap-2">
            Gérer mon mot de passe <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>

        {/* 2FA */}
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
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none pr-10" />
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
                      className="w-32 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm tracking-widest text-center focus:border-primary focus:ring-1 focus:ring-primary outline-none"
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

        {/* Notifications */}
        <Card icon={Bell} title="Notifications" subtitle="Comment souhaitez-vous être prévenu(e) ?">
          <div className="space-y-3">
            {[
              { k: 'notif_email' as const, label: 'E-mail' },
              { k: 'notif_whatsapp' as const, label: 'WhatsApp' },
              { k: 'notif_sms' as const, label: 'SMS' },
            ].map((n) => (
              <label key={n.k} className="flex items-center justify-between text-sm">
                <span>{n.label}</span>
                <input
                  type="checkbox"
                  checked={notif[n.k]}
                  disabled={notifSaving}
                  onChange={(e) => saveNotif({ ...notif, [n.k]: e.target.checked })}
                  className="w-5 h-5 accent-[#FF0000]"
                />
              </label>
            ))}
          </div>
          {notifMsg && <p className="text-xs text-green-600 dark:text-green-400 mt-3">{notifMsg}</p>}
        </Card>
      </div>

      <MemberAside />
    </div>
  );
}
