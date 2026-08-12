'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { ArrowRight, Bell, Sparkles, CheckCircle2, XCircle, Clock, Mail } from 'lucide-react';

interface Notif {
  id: string;
  type: string | null;
  message: string | null;
  created_at: string;
  read_at: string | null;
}

const ICONS: Record<string, typeof Bell> = {
  booking_confirmed: CheckCircle2,
  booking_cancelled: XCircle,
  booking_reminder: Clock,
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// Colonne droite persistante de l'espace membre : Programme Membre (à venir),
// Notifications (vraies données via /me/notifications), Assistant IA (à venir).
export default function MemberAside() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/me/notifications')
      .then((r) => { setNotifs((r.data?.data ?? []).slice(0, 3)); setUnread(r.data?.unread_count ?? 0); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    <aside className="space-y-6">
      {/* Programme Membre */}
      <div className="bg-gray-900 text-white rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Programme Membre</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">Bientôt</span>
        </div>
        <p className="text-sm text-gray-300">
          Niveaux de fidélité, points et récompenses exclusives arrivent prochainement.
        </p>
        <Link href="/dashboard/user/programme" className="inline-flex items-center gap-1 text-sm text-primary-light mt-4 hover:underline">
          En savoir plus <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" /> Notifications
            {unread > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary text-white">{unread}</span>}
          </h3>
          {notifs.length > 0 && (
            <Link href="/dashboard/user/notifications" className="text-xs text-primary hover:underline">Tout voir</Link>
          )}
        </div>

        {!loaded ? null : notifs.length === 0 ? (
          <div className="text-center py-6">
            <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Aucune notification pour le moment.</p>
            <p className="text-xs text-gray-400 mt-1">Vos confirmations et messages apparaîtront ici.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifs.map((n) => {
              const Icon = (n.type && ICONS[n.type]) || Mail;
              return (
                <Link key={n.id} href={n.type?.startsWith('booking') ? '/dashboard/user/reservations' : '/dashboard/user/notifications'} className="flex items-start gap-2.5 text-sm">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${n.read_at ? 'text-gray-400' : 'text-primary'}`} />
                  <span>
                    <span className={n.read_at ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white font-medium'}>{n.message}</span>
                    <span className="block text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Assistant IA — Bientôt */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-primary/20 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="leading-tight">
            <h3 className="font-bold text-sm">Assistant IA bo séjour</h3>
            <span className="text-[10px] font-semibold text-primary">BIENTÔT</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Bientôt, votre assistant vous proposera des recommandations d&apos;hébergements personnalisées
          selon vos goûts et vos voyages.
        </p>
      </div>
    </aside>
  );
}
