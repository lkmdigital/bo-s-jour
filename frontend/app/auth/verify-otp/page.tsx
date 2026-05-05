'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/lib/auth';
import { isController, isAdmin } from '@/lib/userUtils';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { FadeIn, SlideUp } from '@/components/common/animations';
import { oneSignal } from '@/lib/oneSignal';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    // Récupérer user_id depuis query params ou sessionStorage
    const paramId = searchParams.get('user_id');
    if (paramId) {
      setUserId(Number(paramId));
    } else if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('otp_user_id');
      if (stored) setUserId(Number(stored));
    }
  }, [searchParams]);

  const handleDigitChange = (index: number, value: string) => {
    // Accepter uniquement les chiffres
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Avancer automatiquement au champ suivant
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] ?? '';
    }
    setCode(newCode);
    const nextEmpty = newCode.findIndex((d) => !d);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Veuillez saisir le code à 6 chiffres complet.');
      return;
    }
    if (!userId) {
      setError('Session expirée. Veuillez vous reconnecter.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { user, token } = await authService.verifyEmailOtp(userId, fullCode);

      // Mettre à jour le store
      useAuthStore.setState({ user, token, isAuthenticated: true });

      try {
        const freshUser = await authService.getCurrentUser();
        if (freshUser) {
          useAuthStore.setState({ user: freshUser });
          if (freshUser.id) {
            oneSignal.loginUser(freshUser.id);
            oneSignal.setTags({ role: freshUser.role ?? 'user' });
            if (freshUser.email) oneSignal.syncEmail(freshUser.email);
          }
        }
      } catch {}

      // Nettoyer le sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('otp_user_id');
      }

      // Redirection selon le rôle
      const activeUser = useAuthStore.getState().user ?? user;

      if (isController(activeUser)) {
        router.push('/dashboard/admin/inspections');
        return;
      }

      if (activeUser?.role === 'host') {
        router.push('/dashboard/host');
      } else if (isAdmin(activeUser)) {
        router.push('/dashboard/admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.errors?.code?.[0] ||
          err.response?.data?.message ||
          'Code invalide ou expiré.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setSuccess(null);

    try {
      const storedEmail =
        typeof window !== 'undefined' ? sessionStorage.getItem('otp_email') : null;

      if (!storedEmail) {
        setError('Session expirée. Veuillez vous reconnecter.');
        return;
      }

      const { default: api } = await import('@/lib/api');
      await api.post('/auth/send-otp', { email: storedEmail });

      setSuccess('Un nouveau code a été envoyé à votre adresse email.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du renvoi du code.');
    } finally {
      setResending(false);
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Vérification par email</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Saisissez le code à 6 chiffres envoyé à votre adresse email.
                </p>
              </div>
            </FadeIn>

            {error && (
              <FadeIn>
                <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-2.5 sm:p-3 rounded-lg mb-4 text-xs sm:text-sm break-words animate-pulse-slow">
                  {error}
                </div>
              </FadeIn>
            )}

            {success && (
              <FadeIn>
                <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-2.5 sm:p-3 rounded-lg mb-4 text-xs sm:text-sm break-words">
                  {success}
                </div>
              </FadeIn>
            )}

            <FadeIn delay={0.3}>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-3 text-center">
                    Code de vérification
                  </label>
                  <div className="flex gap-2 sm:gap-3 justify-center" onPaste={handlePaste}>
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                        aria-label={`Chiffre ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || code.join('').length !== 6}
                  className="w-full btn-primary disabled:opacity-50 text-sm sm:text-base py-2 sm:py-2.5"
                >
                  {loading ? 'Vérification...' : 'Vérifier le code'}
                </button>
              </form>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="mt-6 text-center space-y-3">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Vous n&apos;avez pas reçu le code ?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-primary hover:underline transition-colors disabled:opacity-50 font-medium"
                  >
                    {resending ? 'Envoi en cours...' : 'Renvoyer le code'}
                  </button>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Le code expire dans 10 minutes.
                </p>
              </div>
            </FadeIn>
          </div>
        </SlideUp>
      </main>
      <Footer />
    </div>
  );
}

export default function VerifyOtpPage() {
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
      <VerifyOtpContent />
    </Suspense>
  );
}
