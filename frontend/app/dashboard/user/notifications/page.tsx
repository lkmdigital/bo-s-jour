'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import MemberAside from '@/components/dashboard/user/MemberAside';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Bell, CheckCircle2, XCircle, Clock, Mail, CheckCheck } from 'lucide-react';

interface Notif {
  id: string;
  type: string | null;
  message: string | null;
  booking_id?: number | null;
  read_at: string | null;
  created_at: string;
}

const ICONS: Record<string, typeof Bell> = {
  booking_confirmed: CheckCircle2,
  booking_cancelled: XCircle,
  booking_reminder: Clock,
};
const COLORS: Record<string, string> = {
  booking_confirmed: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
  booking_cancelled: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  booking_reminder: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function MemberNotificationsPage() {
  const router = useRouter();
  const t = useTranslations('member.pages.notifications');
  const { isAuthenticated, isLoading } = useAuthStore();
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/user/notifications');
  }, [isAuthenticated, isLoading, router]);

  const load = () => {
    api.get('/me/notifications')
      .then((r) => { setItems(r.data?.data ?? []); setUnread(r.data?.unread_count ?? 0); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);

  const markOne = async (n: Notif) => {
    if (n.read_at) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    setUnread((u) => Math.max(0, u - 1));
    api.post(`/me/notifications/${n.id}/read`).catch(() => {});
  };

  const markAll = async () => {
    if (unread === 0) return;
    setMarking(true);
    try {
      await api.post('/me/notifications/read-all');
      setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
      setUnread(0);
    } finally {
      setMarking(false);
    }
  };

  if (isLoading || (loading && isAuthenticated)) return <LoadingSpinner message="Chargement de vos notifications…" size="lg" />;
  if (!isAuthenticated) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
          </div>
          {unread > 0 && (
            <button onClick={markAll} disabled={marking} className="btn-outline text-sm inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-50">
              <CheckCheck className="w-4 h-4" /> Tout marquer comme lu
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center">
            <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Aucune notification pour le moment.</p>
            <p className="text-sm text-gray-400 mt-1">Vos confirmations et messages apparaîtront ici.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const Icon = (n.type && ICONS[n.type]) || Mail;
              const color = (n.type && COLORS[n.type]) || 'text-primary bg-primary/5';
              const content = (
                <div
                  onClick={() => markOne(n)}
                  className={`rounded-2xl border p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                    n.read_at ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800' : 'border-primary/30 bg-primary/5'
                  }`}
                >
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={n.read_at ? 'text-sm text-gray-700 dark:text-gray-300' : 'text-sm font-medium text-gray-900 dark:text-white'}>{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{fmt(n.created_at)}</p>
                  </div>
                  {!n.read_at && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                </div>
              );
              return n.booking_id ? (
                <Link key={n.id} href={`/bookings/${n.booking_id}`} onClick={() => markOne(n)} className="block">
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
          </div>
        )}
      </div>

      <MemberAside />
    </div>
  );
}
