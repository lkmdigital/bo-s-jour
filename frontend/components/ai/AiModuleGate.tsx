'use client';

import type { ReactNode } from 'react';
import { useAppSettingsStore } from '@/stores/appSettingsStore';

/**
 * N'affiche son contenu que si le module IA est activé (interrupteur admin + clé API).
 * Sert aux pages IA elles-mêmes : les liens qui y mènent sont déjà masqués, ce garde-fou
 * couvre l'accès direct par l'adresse.
 */
export default function AiModuleGate({ children }: { children: ReactNode }) {
  const aiEnabled = useAppSettingsStore((s) => s.aiEnabled);
  const loaded = useAppSettingsStore((s) => s.loaded);

  if (!loaded) return null;
  if (!aiEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-gray-500 dark:text-gray-400">
        <p className="text-sm">L&apos;assistant IA n&apos;est pas activé sur la plateforme.</p>
      </div>
    );
  }
  return <>{children}</>;
}
