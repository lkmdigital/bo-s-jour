'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { isAdminOrController, isController } from '@/lib/userUtils';
import Logo from '@/components/common/Logo';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, user, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Déjà connecté en tant que staff → aller au tableau de bord
  useEffect(() => {
    if (isAuthenticated && isAdminOrController(user)) {
      router.replace(isController(user) ? '/dashboard/admin/inspections' : '/dashboard/admin');
    }
  }, [isAuthenticated, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      const currentUser = useAuthStore.getState().user;
      if (!isAdminOrController(currentUser)) {
        await useAuthStore.getState().logout();
        setError("Accès réservé au personnel bo séjour. Utilisez le portail voyageurs/partenaires.");
        setLoading(false);
        return;
      }
      router.push(isController(currentUser) ? '/dashboard/admin/inspections' : '/dashboard/admin');
    } catch (err: any) {
      if (err?.requires_email_otp) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('otp_user_id', String(err.user_id));
          sessionStorage.setItem('otp_email', email);
        }
        router.push(`/auth/verify-otp?user_id=${err.user_id}`);
        return;
      }
      setError(err?.response?.data?.message || err?.message || 'Identifiants invalides.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <Logo href={undefined} variant="white" size="lg" />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Espace administrateur</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">Portail réservé au personnel bo séjour.</p>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-[#EE233C] text-sm px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">E-mail professionnel</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bosejour.ci"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2.5 pl-10 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2.5 pl-10 pr-10 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label="Afficher le mot de passe"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour au site bo séjour
          </Link>
        </div>
      </div>
    </div>
  );
}
