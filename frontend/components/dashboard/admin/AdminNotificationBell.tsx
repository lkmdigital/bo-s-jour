'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import NotificationBell, { type BellItem } from '@/components/common/NotificationBell';

/** Tâches en attente pour l'admin : chaque ligne ouvre la page à traiter. */
export default function AdminNotificationBell() {
  const [items, setItems] = useState<BellItem[]>([]);

  const load = () => {
    const push = (list: BellItem[], id: string, n: number, one: string, many: string, href: string) => {
      if (n > 0) list.push({ id, title: n > 1 ? many.replace('{n}', String(n)) : one, href, unread: true });
    };
    Promise.allSettled([
      api.get('/admin/dashboard/stats'),
      api.get('/admin/reviews', { params: { moderation_status: 'pending', per_page: 1 } }),
      api.get('/admin/testimonials'),
      api.get('/admin/withdrawal-requests', { params: { status: 'pending', per_page: 1 } }),
    ]).then(([stats, reviews, testimonials, withdrawals]) => {
      const list: BellItem[] = [];
      const s = stats.status === 'fulfilled' ? stats.value.data?.data : null;
      push(list, 'acc', s?.accommodations?.pending ?? 0, '1 établissement à valider', '{n} établissements à valider', '/dashboard/admin/accommodations');
      push(list, 'hosts', s?.hosts?.pending ?? 0, '1 partenaire à valider', '{n} partenaires à valider', '/dashboard/admin/hosts');
      const rv = reviews.status === 'fulfilled' ? reviews.value.data : null;
      push(list, 'reviews', rv?.total ?? rv?.pagination?.total ?? (Array.isArray(rv?.data) ? rv.data.length : 0), '1 avis à modérer', '{n} avis à modérer', '/dashboard/admin/reviews');
      const tm = testimonials.status === 'fulfilled' ? testimonials.value.data?.data ?? [] : [];
      push(list, 'testimonials', tm.filter((t: { is_published: boolean }) => !t.is_published).length, '1 avis boséjour à valider', '{n} avis boséjour à valider', '/dashboard/admin/decouvertes');
      const wd = withdrawals.status === 'fulfilled' ? withdrawals.value.data : null;
      push(list, 'withdrawals', wd?.pagination?.total ?? wd?.total ?? 0, '1 demande de retrait', '{n} demandes de retrait', '/dashboard/admin/paiements');
      setItems(list);
    });
  };

  useEffect(load, []);

  return (
    <NotificationBell
      items={items}
      count={items.length}
      emptyLabel="Rien à traiter pour le moment"
      onOpen={load}
    />
  );
}
