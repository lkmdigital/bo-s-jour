'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Header from '@/components/common/Header';
import { useAuthStore } from '@/stores/authStore';
import { User, Building2, Eye, EyeOff, Loader2, CheckCircle2, Info } from 'lucide-react';

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone: string;
  whatsapp: string;
  whatsappSame: boolean;
  residence_country: string;
  residence_city: string;
  nationality: string;
  traveler_type: 'individual' | 'corporate';
  company_name: string;
  company_vat: string;
  company_address: string;
  company_city: string;
  company_country: string;
  company_service: string;
  company_project: string;
  company_billing_email: string;
  accept_terms: boolean;
  referral_code: string;
}

const EMPTY: FormState = {
  first_name: '', last_name: '', email: '', password: '', password_confirmation: '',
  phone: '', whatsapp: '', whatsappSame: true,
  residence_country: '', residence_city: '', nationality: '',
  traveler_type: 'individual',
  company_name: '', company_vat: '', company_address: '', company_city: '', company_country: '',
  company_service: '', company_project: '', company_billing_email: '',
  accept_terms: false,
  referral_code: '',
};

function Field({
  label, children, required, hint,
}: { label: string; children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}

const inputCls =
  'w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors';

function RegisterContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { setToken, setUser } = useAuthStore();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Préremplissage depuis un compte invité existant (réservations passées).
  const tryPrefill = async (email: string) => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    try {
      const res = await api.get('/auth/guest-prefill', { params: { email } });
      if (res.data?.found && res.data.prefill) {
        const p = res.data.prefill;
        setForm((f) => ({
          ...f,
          first_name: f.first_name || p.first_name || '',
          last_name: f.last_name || p.last_name || '',
          phone: f.phone || p.phone || '',
          whatsapp: f.whatsapp || p.whatsapp || '',
          whatsappSame: (p.whatsapp || p.phone) ? p.whatsapp === p.phone : f.whatsappSame,
          residence_country: f.residence_country || p.residence_country || '',
          residence_city: f.residence_city || p.residence_city || '',
          nationality: f.nationality || p.nationality || '',
          traveler_type: p.traveler_type === 'corporate' ? 'corporate' : f.traveler_type,
          company_name: f.company_name || p.company_name || '',
          company_vat: f.company_vat || p.company_vat || '',
          company_address: f.company_address || p.company_address || '',
          company_billing_email: f.company_billing_email || p.company_billing_email || '',
        }));
        setPrefilled(true);
      }
    } catch {
      /* pas de préremplissage : on ignore */
    }
  };

  // À l'arrivée : email éventuel passé en query (lien d'activation / login), et type
  useEffect(() => {
    const email = params.get('email');
    if (params.get('type') === 'corporate') set('traveler_type', 'corporate');
    if (email) {
      set('email', email);
      tryPrefill(email);
    }
    const ref = params.get('ref');
    if (ref) set('referral_code', ref.toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (form.password !== form.password_confirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (!form.accept_terms) {
      setError('Vous devez accepter les conditions générales.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        phone: form.phone,
        whatsapp: form.whatsappSame ? form.phone : form.whatsapp,
        residence_country: form.residence_country || undefined,
        residence_city: form.residence_city || undefined,
        nationality: form.nationality || undefined,
        traveler_type: form.traveler_type,
        company_name: form.company_name || undefined,
        company_vat: form.company_vat || undefined,
        company_address: form.company_address || undefined,
        company_city: form.company_city || undefined,
        company_country: form.company_country || undefined,
        company_service: form.company_service || undefined,
        company_project: form.company_project || undefined,
        company_billing_email: form.company_billing_email || undefined,
        accept_terms: form.accept_terms,
        referral_code: form.referral_code.trim() || undefined,
      };
      const res = await api.post('/auth/register-traveler', payload);

      // Vérification e-mail obligatoire : on redirige vers la saisie du code OTP.
      if (res.data?.requires_email_otp && res.data.user_id) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('otp_user_id', String(res.data.user_id));
          sessionStorage.setItem('otp_email', form.email);
        }
        router.push(`/auth/verify-otp?user_id=${res.data.user_id}`);
        return;
      }

      // Repli (si un token est renvoyé) : connexion directe.
      const { token, user } = res.data || {};
      if (token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          if (user) localStorage.setItem('user', JSON.stringify(user));
        }
        setToken(token);
        if (user) setUser(user);
      }
      const redirect = params.get('redirect');
      router.push(redirect ? decodeURIComponent(redirect) : '/dashboard/user');
    } catch (err: any) {
      const data = err.response?.data;
      setError(
        data?.errors?.email?.[0] ||
          data?.message ||
          "Impossible de créer le compte. Vérifiez vos informations."
      );
      setLoading(false);
    }
  };

  const isCorporate = form.traveler_type === 'corporate';

  // Bloc "Personne / coordonnées" réutilisé, avec libellés adaptés au contexte.
  const contactBlock = (personLabel: string) => (
    <div className="card space-y-4">
      <h2 className="text-lg font-bold">{personLabel}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Prénoms" required>
          <input className={inputCls} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
        </Field>
        <Field label="Nom" required>
          <input className={inputCls} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
        </Field>
      </div>
      <Field label="Adresse e-mail" required>
        <input
          type="email"
          className={inputCls}
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          onBlur={(e) => tryPrefill(e.target.value)}
          required
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Téléphone" required hint="Utilisé pour WhatsApp et SMS">
          <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
        </Field>
        <div>
          <Field label="Numéro WhatsApp">
            <input
              className={inputCls}
              value={form.whatsappSame ? form.phone : form.whatsapp}
              onChange={(e) => set('whatsapp', e.target.value)}
              disabled={form.whatsappSame}
            />
          </Field>
          <label className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={form.whatsappSame} onChange={(e) => set('whatsappSame', e.target.checked)} />
            Identique au téléphone
          </label>
        </div>
      </div>
    </div>
  );

  const residenceBlock = (
    <div className="card space-y-4">
      <h2 className="text-lg font-bold">Résidence</h2>
      <p className="text-xs text-gray-500 -mt-2 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5" /> Aide bo séjour à mieux vous connaître (statistiques touristiques).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Pays de résidence">
          <input className={inputCls} value={form.residence_country} onChange={(e) => set('residence_country', e.target.value)} placeholder="Côte d'Ivoire" />
        </Field>
        <Field label="Ville de résidence">
          <input className={inputCls} value={form.residence_city} onChange={(e) => set('residence_city', e.target.value)} placeholder="Abidjan" />
        </Field>
        <Field label="Nationalité">
          <input className={inputCls} value={form.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="Ivoirienne" />
        </Field>
      </div>
    </div>
  );

  const passwordBlock = (
    <div className="card space-y-4">
      <h2 className="text-lg font-bold">Mot de passe</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Mot de passe" required hint="8 caractères minimum">
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              className={inputCls}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
            />
            <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>
        <Field label="Confirmer le mot de passe" required>
          <input
            type={showPwd ? 'text' : 'password'}
            className={inputCls}
            value={form.password_confirmation}
            onChange={(e) => set('password_confirmation', e.target.value)}
            required
          />
        </Field>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">
            {isCorporate ? 'Créer mon espace corporate' : 'Créer mon espace voyageur'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isCorporate
              ? "Renseignez votre entreprise et les coordonnées du voyageur. La facturation sera établie au nom de l'entreprise."
              : 'Quelques informations suffisent. Vous compléterez le reste plus tard depuis votre espace.'}
          </p>
        </div>

        {prefilled && (
          <div className="mb-6 rounded-2xl border border-secondary/30 bg-secondary/5 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Nous avons retrouvé les informations de vos réservations précédentes et pré-rempli le
              formulaire. Vérifiez-les et définissez votre mot de passe.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type de voyageur */}
          <div className="card">
            <h2 className="text-lg font-bold mb-4">Vous voyagez…</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => set('traveler_type', 'individual')}
                className={`p-4 border-2 rounded-2xl text-left transition-all flex items-center gap-3 ${
                  !isCorporate ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                }`}
              >
                <User className="w-6 h-6 text-primary" />
                <span>
                  <span className="block font-semibold text-sm">À titre personnel</span>
                  <span className="block text-xs text-gray-500">Voyageur particulier</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => set('traveler_type', 'corporate')}
                className={`p-4 border-2 rounded-2xl text-left transition-all flex items-center gap-3 ${
                  isCorporate ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                }`}
              >
                <Building2 className="w-6 h-6 text-primary" />
                <span>
                  <span className="block font-semibold text-sm">Pour une entreprise</span>
                  <span className="block text-xs text-gray-500">Voyageur corporate</span>
                </span>
              </button>
            </div>
          </div>

          {isCorporate ? (
            /* ---------- Parcours CORPORATE : entreprise → responsable → facturation ---------- */
            <>
              <div className="card space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Votre entreprise</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Ces informations seront conservées dans votre profil pour vos réservations professionnelles.
                  </p>
                </div>
                <Field label="Nom de l'entreprise" required>
                  <input className={inputCls} value={form.company_name} onChange={(e) => set('company_name', e.target.value)} required />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="N° TVA / Contribuable">
                    <input className={inputCls} value={form.company_vat} onChange={(e) => set('company_vat', e.target.value)} />
                  </Field>
                  <Field label="Adresse de l'entreprise">
                    <input className={inputCls} value={form.company_address} onChange={(e) => set('company_address', e.target.value)} />
                  </Field>
                  <Field label="Ville">
                    <input className={inputCls} value={form.company_city} onChange={(e) => set('company_city', e.target.value)} />
                  </Field>
                  <Field label="Pays">
                    <input className={inputCls} value={form.company_country} onChange={(e) => set('company_country', e.target.value)} />
                  </Field>
                  <Field label="Service / Département" hint="Facultatif">
                    <input className={inputCls} value={form.company_service} onChange={(e) => set('company_service', e.target.value)} />
                  </Field>
                  <Field label="Code projet interne" hint="Facultatif">
                    <input className={inputCls} value={form.company_project} onChange={(e) => set('company_project', e.target.value)} />
                  </Field>
                </div>
              </div>

              {contactBlock('Voyageur / responsable du compte')}

              <div className="card space-y-4">
                <h2 className="text-lg font-bold">Facturation</h2>
                <Field label="E-mail de facturation" hint="Si différent de l'e-mail du responsable ci-dessus">
                  <input
                    type="email"
                    className={inputCls}
                    value={form.company_billing_email}
                    onChange={(e) => set('company_billing_email', e.target.value)}
                    placeholder="comptabilite@entreprise.com"
                  />
                </Field>
              </div>
            </>
          ) : (
            /* ---------- Parcours PARTICULIER : infos perso → résidence ---------- */
            <>
              {contactBlock('Vos informations')}
              {residenceBlock}
            </>
          )}

          {passwordBlock}

          <Field label="Code de parrainage" hint="Un ami vous a invité ? Renseignez son code pour que vous receviez tous les deux un bonus de points.">
            <input
              className={inputCls + ' max-w-xs uppercase'}
              value={form.referral_code}
              onChange={(e) => set('referral_code', e.target.value.toUpperCase())}
              placeholder="Ex : ABC12345"
            />
          </Field>

          {/* CGV + erreur + submit */}
          <label className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.accept_terms}
              onChange={(e) => set('accept_terms', e.target.checked)}
            />
            J&apos;accepte les <Link href="/cgv" className="text-primary hover:underline">conditions générales</Link> et la politique de confidentialité.
          </label>

          {error && (
            <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Création…</>
            ) : (
              isCorporate ? 'Créer mon espace corporate' : 'Créer mon espace'
            )}
          </button>

          <p className="text-center text-sm text-gray-500">
            Vous avez déjà un compte ?{' '}
            <Link href="/auth/login?type=voyageur" className="text-primary font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <RegisterContent />
    </Suspense>
  );
}
