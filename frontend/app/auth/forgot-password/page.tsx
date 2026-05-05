'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { authService } from '@/lib/auth';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { FadeIn, SlideUp } from '@/components/common/animations';

interface ForgotPasswordFormData {
  email: string;
}

function ForgotPasswordContent() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    setError(null);

    try {
      await authService.forgotPassword(data.email);
      setSubmitted(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Une erreur est survenue. Veuillez réessayer.'
      );
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
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Mot de passe oublié</h1>
                {!submitted && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Entrez votre adresse email et nous vous enverrons un lien de réinitialisation.
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

            {submitted ? (
              <FadeIn delay={0.2}>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 mb-4">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
                    Email envoyé !
                  </h2>
                  <p className="text-sm text-green-700 dark:text-green-400 mb-4">
                    Si un compte est associé à cette adresse email, vous recevrez un lien de
                    réinitialisation dans quelques minutes.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Pensez à vérifier votre dossier spam.
                  </p>
                </div>

                <div className="mt-6 text-center">
                  <Link
                    href="/auth/login"
                    className="text-sm text-primary hover:underline transition-colors font-medium"
                  >
                    ← Retour à la connexion
                  </Link>
                </div>
              </FadeIn>
            ) : (
              <FadeIn delay={0.3}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                      Adresse email
                    </label>
                    <input
                      type="email"
                      {...register('email', { required: 'Email requis' })}
                      className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      placeholder="votre@email.com"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs sm:text-sm mt-1 break-words">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary disabled:opacity-50 text-sm sm:text-base py-2 sm:py-2.5"
                  >
                    {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/auth/login"
                    className="text-sm text-primary hover:underline transition-colors"
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

export default function ForgotPasswordPage() {
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
      <ForgotPasswordContent />
    </Suspense>
  );
}
