'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { authService } from '@/lib/auth';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { FadeIn, SlideUp } from '@/components/common/animations';

interface ResetPasswordFormData {
  password: string;
  password_confirmation: string;
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>();

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token || !email) {
      setError('Lien de réinitialisation invalide. Veuillez demander un nouveau lien.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authService.resetPassword(token, email, data.password, data.password_confirmation);
      setSuccess(true);

      // Rediriger vers login après 3 secondes
      setTimeout(() => {
        router.push('/auth/login?reset=success');
      }, 3000);
    } catch (err: any) {
      const validationErrors = err.response?.data?.errors;
      if (validationErrors?.token) {
        setError(validationErrors.token[0]);
      } else if (validationErrors?.password) {
        setError(validationErrors.password[0]);
      } else {
        setError(
          err.response?.data?.message ||
            'Une erreur est survenue. Veuillez réessayer.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-6 sm:py-12">
          <SlideUp delay={0.1}>
            <div className="max-w-md mx-auto card text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                <svg className="w-7 h-7 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold mb-2">Lien invalide</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Ce lien de réinitialisation est invalide ou a expiré.
              </p>
              <Link href="/auth/forgot-password" className="btn-primary text-sm">
                Demander un nouveau lien
              </Link>
            </div>
          </SlideUp>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-6 sm:py-12">
        <SlideUp delay={0.1}>
          <div className="max-w-md mx-auto card">
            <FadeIn delay={0.2}>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Nouveau mot de passe</h1>
                {!success && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Choisissez un mot de passe sécurisé d&apos;au moins 8 caractères.
                  </p>
                )}
              </div>
            </FadeIn>

            {error && (
              <FadeIn>
                <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-2.5 sm:p-3 rounded-lg mb-4 text-xs sm:text-sm break-words animate-pulse-slow">
                  {error}
                </div>
              </FadeIn>
            )}

            {success ? (
              <FadeIn delay={0.2}>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 mb-4">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
                    Mot de passe réinitialisé !
                  </h2>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Votre mot de passe a été mis à jour avec succès. Vous allez être redirigé vers
                    la page de connexion.
                  </p>
                </div>

                <div className="mt-6 text-center">
                  <Link
                    href="/auth/login"
                    className="text-sm text-primary hover:underline transition-colors font-medium"
                  >
                    Se connecter maintenant →
                  </Link>
                </div>
              </FadeIn>
            ) : (
              <FadeIn delay={0.3}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        {...register('password', {
                          required: 'Mot de passe requis',
                          minLength: { value: 8, message: 'Minimum 8 caractères' },
                        })}
                        className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-10 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        title={showPassword ? 'Masquer' : 'Afficher'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        {...register('password_confirmation', {
                          required: 'Confirmation requise',
                          validate: (value) =>
                            value === watch('password') || 'Les mots de passe ne correspondent pas',
                        })}
                        className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 pr-10 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        title={showConfirm ? 'Masquer' : 'Afficher'}
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password_confirmation && (
                      <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">
                        {errors.password_confirmation.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary disabled:opacity-50 text-sm sm:text-base py-2 sm:py-2.5"
                  >
                    {loading ? 'Réinitialisation...' : 'Réinitialiser mon mot de passe'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/auth/login"
                    className="text-sm text-gray-500 hover:text-primary hover:underline transition-colors"
                  >
                    ← Retour à la connexion
                  </Link>
                </div>
              </FadeIn>
            )}
          </div>
        </SlideUp>
      </main>
      <Footer />
    </div>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}
