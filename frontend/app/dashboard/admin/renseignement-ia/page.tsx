'use client';

import { RotateCcw } from 'lucide-react';
import AiModuleGate from '@/components/ai/AiModuleGate';
import AdminAssistantChat from '@/components/ai/AdminAssistantChat';
import BoOrb from '@/components/ai/BoOrb';
import { useAdminAssistantStore } from '@/stores/adminAssistantStore';

// Module IA : la page ne s'affiche que si l'assistant IA est activé par l'admin
// (Paramètres > Réglages avancés) et qu'une clé API est renseignée.
export default function AdminRenseignementIaPage() {
  return (
    <AiModuleGate>
      <AdminRenseignementIaPageContent />
    </AiModuleGate>
  );
}

// Bo en pleine page : même interface que la bulle de l'espace admin et de l'assistant voyageur,
// et même conversation que la bulle (adminAssistantStore).
function AdminRenseignementIaPageContent() {
  const { messages, loading, reset } = useAdminAssistantStore();

  return (
    <section
      aria-label="Renseignement IA — Bo, l'assistant IA administrateur"
      className="flex h-[calc(100dvh-8rem)] min-h-[34rem] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <BoOrb size={44} state={loading ? 'thinking' : 'idle'} />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-tight text-gray-900 dark:text-white">Renseignement IA</h1>
          <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Bo, assistant IA administrateur
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={reset}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-700 hover:border-primary hover:text-primary disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
          >
            <RotateCcw className="h-4 w-4" /> Nouvelle conversation
          </button>
        )}
      </header>

      <AdminAssistantChat variant="page" />
    </section>
  );
}
