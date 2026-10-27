'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { RotateCcw, X } from 'lucide-react';
import { isAdmin } from '@/lib/userUtils';
import { useAdminAssistantStore } from '@/stores/adminAssistantStore';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { useAuthStore } from '@/stores/authStore';
import AdminAssistantChat from './AdminAssistantChat';
import BoOrb from './BoOrb';

/*
 * Bo dans l'espace admin : pastille flottante sur toutes les pages du tableau de bord, qui ouvre
 * la conversation avec l'assistant IA administrateur (mêmes outils que la page « Renseignement IA »,
 * dont elle partage la conversation).
 *
 * N'existe que si le module IA est activé, et seulement pour un administrateur : la route serveur
 * refuse les contrôleurs. Sur la page « Renseignement IA » elle s'efface, la page étant déjà Bo en grand.
 */

const AI_PAGE = '/dashboard/admin/renseignement-ia';

export default function AdminAssistant() {
  const pathname = usePathname() ?? '';
  const aiEnabled = useAppSettingsStore((s) => s.aiEnabled);
  const { user } = useAuthStore();
  const { messages, loading, reset } = useAdminAssistantStore();

  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // Une conversation ne survit pas au changement de compte.
  useEffect(() => {
    reset();
  }, [user?.id, reset]);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  if (!aiEnabled || !isAdmin(user) || pathname.startsWith(AI_PAGE)) return null;

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Demandez à Bo, l'assistant IA administrateur"
          className="group fixed bottom-4 right-4 z-40 flex items-center gap-2.5 rounded-full bg-white p-1.5 shadow-[0_10px_30px_-8px_rgba(0,0,0,.45)] ring-1 ring-black/5 transition-transform duration-200 hover:scale-[1.03] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-primary dark:bg-gray-900 dark:ring-white/10 md:bottom-6 md:right-6 md:pr-5"
        >
          <BoOrb size={44} state={loading ? 'thinking' : 'idle'} />
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-[11px] text-gray-500 dark:text-gray-400">Assistant admin</span>
            <span className="block text-sm font-bold text-gray-900 dark:text-white">Demandez à Bo</span>
          </span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Bo, l'assistant IA administrateur"
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
          }}
          className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-white dark:bg-gray-900 md:inset-auto md:bottom-6 md:right-6 md:h-[min(42rem,calc(100dvh-3rem))] md:w-[26rem] md:rounded-3xl md:border md:border-gray-200 md:shadow-2xl md:dark:border-gray-700"
        >
          <header className="flex items-center gap-3 border-b border-gray-100 px-3 py-3 dark:border-gray-800">
            <BoOrb size={40} state={loading ? 'thinking' : 'idle'} />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold leading-tight text-gray-900 dark:text-white">Bo</h2>
              <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Assistant IA administrateur
              </p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={reset}
                disabled={loading}
                aria-label="Nouvelle conversation"
                title="Nouvelle conversation"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <RotateCcw className="h-[18px] w-[18px]" />
              </button>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Fermer la conversation avec Bo"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary dark:text-white dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <AdminAssistantChat variant="panel" />
        </section>
      )}
    </>
  );
}
