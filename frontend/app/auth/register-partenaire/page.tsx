'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Header from '@/components/common/Header';
import { Building2, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  accept_terms: boolean;
}

const EMPTY: FormState = {
  first_name: '', last_name: '', email: '', phone: '', password: '', password_confirmation: '', accept_terms: false,
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

function RegisterPartnerContent() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

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
        phone: form.phone,
        password: form.password,
        password_confirmation: form.password_confirmation,
        accept_terms: form.accept_terms,
      };
      const res = await api.post('/auth/register-partner-light', payload);

      if (res.data?.requires_email_otp && res.data.user_id) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('otp_user_id', String(res.data.user_id));
          sessionStorage.setItem('otp_email', form.email);
        }
        router.push(`/auth/verify-otp?user_id=${res.data.user_id}`);
        return;
      }
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-xl">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-3">
            <Building2 className="w-6 h-6" />
          </span>
          <h1 className="text-3xl font-bold">Créer mon espace partenaire</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Nom, téléphone, e-mail et mot de passe suffisent pour démarrer. Vous configurerez votre
            établissement (photos, tarifs, politiques…) juste après, à votre rythme.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Prénoms" required>
                <input className={inputCls} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
              </Field>
              <Field label="Nom" required>
                <input className={inputCls} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
              </Field>
            </div>
            <Field label="Adresse e-mail" required>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </Field>
            <Field label="Téléphone" required hint="Servira de référence pour votre établissement">
              <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
            </Field>
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

          <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Un code de vérification vous sera envoyé par e-mail pour activer votre compte.
            </p>
          </div>

          <label className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.accept_terms}
              onChange={(e) => set('accept_terms', e.target.checked)}
            />
            J&apos;accepte les <Link href="/cgv" className="text-primary hover:underline">conditions générales</Link> et la politique de commission de bo séjour.
          </label>

          {error && (
            <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Création…</>) : 'Créer mon espace partenaire'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Vous avez déjà un compte ?{' '}
            <Link href="/auth/login?type=partenaire" className="text-primary font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}

export default function RegisterPartnerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <RegisterPartnerContent />
    </Suspense>
  );
}
