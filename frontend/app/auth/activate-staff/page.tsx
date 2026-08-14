'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, UserCog, ArrowLeft, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface InvitationInfo {
  name: string;
  email: string;
  role: string;
  role_label: string;
  owner_name: string;
}

function ActivateStaffContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const { setToken, setUser } = useAuthStore();

  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [invalid, setInvalid] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setInvalid(true); setChecking(false); return; }
    api.get('/auth/staff-invitation', { params: { token } })
      .then((r) => setInfo(r.data))
      .catch(() => setInvalid(true))
      .finally(() => setChecking(false));
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/activate-staff', {
        token,
        password,
        password_confirmation: confirm,
      });
      const { token: authToken, user } = res.data || {};
      if (authToken) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', authToken);
          if (user) localStorage.setItem('user', JSON.stringify(user));
        }
        setToken(authToken);
        if (user) setUser(user);
      }
      router.push('/dashboard/host');
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { message?: string } } };
      setError(e2.response?.data?.message || "Impossible d'activer cet accès. Le lien a peut-être expiré.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-10 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <UserCog className="w-6 h-6 text-primary" />
            </div>

            {checking ? (
              <p className="text-sm text-gray-500 py-8 text-center">Vérification de votre invitation…</p>
            ) : invalid || !info ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lien invalide</h1>
                <p className="text-sm text-gray-500 mt-2 mb-6">
                  Ce lien d&apos;invitation est invalide ou a déjà été utilisé. Demandez au propriétaire de
                  l&apos;établissement de vous envoyer une nouvelle invitation.
                </p>
                <Link href="/auth/login" className="btn-primary w-full inline-flex justify-center">Se connecter</Link>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activez votre accès</h1>
                <p className="text-sm text-gray-500 mt-1 mb-6">
                  <strong>{info.owner_name}</strong> vous invite en tant que <strong>{info.role_label}</strong>.
                  Choisissez un mot de passe pour accéder à son espace bo séjour.
                </p>

                {error && (
                  <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-[#EE233C] text-sm px-4 py-3">{error}</div>
                )}

                <div className="mb-4 rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">{info.name}</p>
                  <p className="text-gray-500">{info.email}</p>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">Mot de passe</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type={show ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder="Au moins 8 caractères"
                        className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2.5 pl-10 pr-10 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
                      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label="Afficher le mot de passe">
                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">Confirmer le mot de passe</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type={show ? 'text' : 'password'} required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2.5 pl-10 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full inline-flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {loading ? 'Activation…' : 'Activer mon accès'}
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="text-center mt-6">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors">
              <ArrowLeft className="w-4 h-4" /> Retour au site
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ActivateStaffPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ActivateStaffContent />
    </Suspense>
  );
}
