'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import MemberAside from '@/components/dashboard/user/MemberAside';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { resolveImageUrl } from '@/lib/utils';
import { FileText, ReceiptText, ShieldCheck, ExternalLink, KeyRound, Calendar, MapPin, Upload } from 'lucide-react';

interface Booking {
  id: number;
  check_in: string;
  check_out: string;
  status: string;
  payment_status?: string;
  confirmation_code?: string | null;
  booking_number?: string | null;
  accommodation?: { name: string; city: string };
}

interface Identity {
  submitted: boolean;
  verified: boolean;
  id_type?: string | null;
  id_number?: string | null;
  recto_url?: string | null;
  verso_url?: string | null;
}

function fmt(d?: string) {
  return d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

export default function MemberDocumentsPage() {
  const router = useRouter();
  const t = useTranslations('member.pages.documents');
  const { isAuthenticated, isLoading } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/user/documents');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    Promise.all([
      api.get('/bookings', { params: { per_page: 100 } }).then((r) => {
        const d = r.data;
        return Array.isArray(d) ? d : d?.data && Array.isArray(d.data) ? d.data : [];
      }).catch(() => []),
      api.get('/me/identity').then((r) => r.data).catch(() => null),
    ]).then(([bk, id]) => {
      setBookings(bk);
      setIdentity(id);
      setLoading(false);
    });
  }, [isAuthenticated, isLoading]);

  // Documents disponibles : bons (confirmées/terminées) + reçus (payées)
  const docs = useMemo(
    () => bookings.filter((b) => ['confirmed', 'completed'].includes(b.status) || b.payment_status === 'paid'),
    [bookings]
  );

  if (isLoading || (loading && isAuthenticated)) return <LoadingSpinner message="Chargement de vos documents…" size="lg" />;
  if (!isAuthenticated) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>

        {/* Bons & reçus */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Bons de réservation & reçus</h2>
          {docs.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center">
              <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">Aucun document pour le moment.</p>
              <Link href="/dashboard/user/recherche" className="btn-primary inline-block">Rechercher un séjour</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((b) => {
                const hasVoucher = ['confirmed', 'completed'].includes(b.status);
                const hasReceipt = b.payment_status === 'paid';
                return (
                  <div key={b.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white truncate">{b.accommodation?.name || `Réservation #${b.id}`}</h3>
                        {b.booking_number && (
                          <p className="text-xs text-gray-400 mt-0.5">N° {b.booking_number}</p>
                        )}
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-4 h-4 text-primary" /> {b.accommodation?.city}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Calendar className="w-4 h-4" /> {fmt(b.check_in)} – {fmt(b.check_out)}</p>
                        {b.confirmation_code && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><KeyRound className="w-3 h-3" /> Code : <span className="font-mono font-semibold text-gray-600 dark:text-gray-300">{b.confirmation_code}</span></p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 flex-shrink-0">
                        {hasVoucher && (
                          <Link href={`/bookings/${b.id}#receipt`} className="btn-outline text-sm inline-flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Bon
                          </Link>
                        )}
                        {hasReceipt && (
                          <Link href={`/bookings/${b.id}#receipt`} className="btn-primary text-sm inline-flex items-center gap-2">
                            <ReceiptText className="w-4 h-4" /> Reçu
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Pièces d'identité */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Pièces d&apos;identité</h2>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
            {identity?.submitted ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></span>
                  <div>
                    <p className="font-semibold">{identity.id_type || 'Pièce'} {identity.id_number ? `· ${identity.id_number}` : ''}</p>
                    <span className={`text-xs font-medium ${identity.verified ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {identity.verified ? 'Vérifiée' : 'En attente de vérification'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {identity.recto_url && (
                    <a href={resolveImageUrl(identity.recto_url) || identity.recto_url} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm inline-flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" /> Voir le recto
                    </a>
                  )}
                  {identity.verso_url && (
                    <a href={resolveImageUrl(identity.verso_url) || identity.verso_url} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm inline-flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" /> Voir le verso
                    </a>
                  )}
                  <Link href="/dashboard/user/profil" className="text-sm text-primary hover:underline inline-flex items-center gap-1 px-2 py-2">Gérer</Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <ShieldCheck className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">Aucune pièce d&apos;identité enregistrée.</p>
                <Link href="/dashboard/user/profil" className="btn-primary inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Ajouter une pièce
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>

      <MemberAside />
    </div>
  );
}
