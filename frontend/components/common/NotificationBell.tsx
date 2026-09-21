'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

export interface BellItem {
  id: string | number;
  title: string;
  text?: string;
  href: string;
  unread?: boolean;
  date?: string;
}

/**
 * Cloche de notifications (menu déroulant). Retour client 2026-09-21 : les
 * icônes de notification ne faisaient rien / n'affichaient aucune notification.
 */
export default function NotificationBell({
  items,
  count,
  seeAllHref,
  seeAllLabel = 'Tout voir',
  emptyLabel = 'Aucune notification',
  onOpen,
}: {
  items: BellItem[];
  count: number;
  seeAllHref?: string;
  seeAllLabel?: string;
  emptyLabel?: string;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => { setOpen((o) => { if (!o) onOpen?.(); return !o; }); }}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Bell className="w-5 h-5 text-gray-500 dark:text-gray-300" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-bosejour-red text-white text-[10px] font-semibold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 font-semibold text-sm text-gray-900 dark:text-white">
            Notifications
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">{emptyLabel}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((it) => (
                <li key={it.id}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${it.unread ? 'bg-primary/5' : ''}`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{it.title}</p>
                    {it.text && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{it.text}</p>}
                    {it.date && <p className="text-[11px] text-gray-400 mt-1">{it.date}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {seeAllHref && (
            <Link
              href={seeAllHref}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-center text-sm font-medium text-primary border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              {seeAllLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
