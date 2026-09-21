'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import api from '@/lib/api';

/**
 * Retour client 2026-09-21 : un voyageur sans compte qui a perdu son lien de
 * consultation retrouve sa réservation avec son numéro et l'e-mail utilisé.
 */
export default function FindBookingPage() {
  const router = useRouter();
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/bookings/lookup', { reference: reference.trim(), email: email.trim() });
      router.push(`/bookings/${res.data.access_token}`);
    } catch (err: any) {
      setError(
        err.response?.status === 429
          ? 'Trop de tentatives. Réessayez dans une minute.'
          : err.response?.data?.message || 'Impossible de retrouver cette réservation.'
      );
      setLoading(false);
    }
  };

  const field =
    'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 sm:py-16">
        <div className="max-w-md mx-auto card">
          <h1 className="text-2xl font-bold mb-2">Retrouver ma réservation</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Saisissez le numéro de votre réservation (ou votre code boséjour) et l&apos;adresse e-mail utilisée lors de la
            réservation. Vous retrouverez votre réservation, votre reçu et pourrez les imprimer.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="ref" className="block text-sm font-medium mb-1.5">Numéro de réservation ou code boséjour</label>
              <input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex : BS-2026-000042" required className={field} />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">Adresse e-mail</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" required className={field} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={loading || !reference.trim() || !email.trim()} className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50">
              <Search className="w-4 h-4" />
              {loading ? 'Recherche…' : 'Retrouver ma réservation'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
