'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/stores/authStore';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { FadeIn, SlideUp } from '@/components/common/animations';
import { isController, isAdmin } from '@/lib/userUtils';
import { authService } from '@/lib/auth';

interface LoginFormData {
  email: string;
  password: string;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);

    try {
      await login(data.email, data.password);

      // Récupérer l'utilisateur connecté avec les rôles RBAC (déjà chargés par le store)
      const currentUser = useAuthStore.getState().user;

      // Les contrôleurs sont toujours redirigés vers la page des inspections (vérification via RBAC)
      if (isController(currentUser)) {
        router.push('/dashboard/admin/inspections');
        return;
      }

      // Vérifier s'il y a un paramètre redirect (sauf pour les contrôleurs)
      const redirectPath = searchParams.get('redirect');

      if (redirectPath) {
        router.push(decodeURIComponent(redirectPath));
      } else {
        if (currentUser?.role === 'host') {
          router.push('/dashboard/host');
        } else if (isAdmin(currentUser)) {
          router.push('/dashboard/admin');
        } else {
          router.push('/');
        }
      }
    } catch (err: any) {
      if (err.requires_email_otp) {
        // Stocker user_id et email pour la page OTP
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('otp_user_id', String(err.user_id));
          sessionStorage.setItem('otp_email', data.email);
        }
        router.push(`/auth/verify-otp?user_id=${err.user_id}`);
      } else if (err.requires_2fa) {
        setError('Authentification à deux facteurs activée. Cette fonctionnalité sera disponible prochainement. Veuillez contacter le support pour désactiver temporairement le 2FA.');
      } else {
        setError(err.response?.data?.message || err.message || 'Erreur lors de la connexion');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-6 sm:py-12">
        <SlideUp delay={0.1}>
          <div className="max-w-md mx-auto card">
            <FadeIn delay={0.2}>
              <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center break-words">Accéder à mon espace</h1>
            </FadeIn>

            {error && (
              <FadeIn>
                <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-2.5 sm:p-3 rounded-lg mb-4 text-xs sm:text-sm break-words animate-pulse-slow">
                  {error}
                </div>
              </FadeIn>
            )}

            <FadeIn delay={0.3}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Email</label>
              <input
                type="email"
                {...register('email', { required: 'Email requis' })}
                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                placeholder="votre@email.com"
              />
              {errors.email && (
                <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: 'Mot de passe requis' })}
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-10 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">{errors.password.message}</p>
              )}
              <div className="text-right mt-1">
                <Link href="/auth/forgot-password" className="text-xs sm:text-sm text-primary hover:underline transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 text-sm sm:text-base py-2 sm:py-2.5"
            >
              {loading ? 'Accès en cours...' : 'Accéder à mon espace'}
            </button>
            </form>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                {/* Connexion avec Google et Microsoft désactivée
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-xs sm:text-sm">
                    <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">Ou continuer avec</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => authService.redirectToOAuth('google')}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="hidden sm:inline">Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => authService.redirectToOAuth('microsoft')}
                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 23 23" fill="none">
                      <path fill="#F25022" d="M0 0h11v11H0z"/>
                      <path fill="#00A4EF" d="M12 0h11v11H12z"/>
                      <path fill="#7FBA00" d="M0 12h11v11H0z"/>
                      <path fill="#FFB900" d="M12 12h11v11H12z"/>
                    </svg>
                    <span className="hidden sm:inline">Microsoft</span>
                  </button>
                </div>
                */}

                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">
                    Pas encore de compte ?{' '}
                    <Link href="/auth/register" className="text-primary hover:underline transition-colors">
                      Créer mon espace
                    </Link>
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </SlideUp>
      </main>
      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-6 sm:py-12">
          <p className="text-center text-gray-600 dark:text-gray-400">Chargement...</p>
        </main>
        <Footer />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

