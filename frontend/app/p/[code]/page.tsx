'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';

/**
 * Lien court d'un ambassadeur (/p/CODE) : c'est lui que le QR code encode. La page compte le scan depuis le navigateur du
 * visiteur (un aperçu de lien WhatsApp ou Facebook n'exécute pas la page, il n'est donc pas compté), puis envoie vers
 * l'inscription avec le code prérempli. En cas d'échec, le visiteur n'est jamais bloqué : il arrive quand même à l'inscription.
 */
export default function AmbassadorShortLinkPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = String(params?.code ?? '').toUpperCase();

  useEffect(() => {
    let cancelled = false;
    const fallback = /^[A-Z0-9]{1,20}$/.test(code) ? `/auth/register?ref=${encodeURIComponent(code)}` : '/auth/register';

    api
      .post('/referral/click', { code })
      .then((res) => !cancelled && router.replace(res.data?.redirect || fallback))
      .catch(() => !cancelled && router.replace(fallback));

    return () => {
      cancelled = true;
    };
  }, [code, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-600 dark:text-gray-300">
      <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden />
      <p className="text-sm">Ouverture de votre invitation boséjour…</p>
    </main>
  );
}
