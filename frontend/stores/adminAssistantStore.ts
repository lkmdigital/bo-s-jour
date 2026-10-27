import { create } from 'zustand';
import api from '@/lib/api';

/*
 * Conversation avec Bo dans l'espace admin. Partagée entre la bulle flottante et la page
 * « Renseignement IA » : on commence une question dans l'une, on la poursuit dans l'autre.
 * Rien n'est enregistré côté serveur ; seuls les derniers échanges lui sont renvoyés pour garder le fil.
 */

const HISTORY_SENT = 10;

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Message d'erreur : affiché, mais pas renvoyé au serveur comme historique */
  local?: boolean;
}

interface AdminAssistantStore {
  messages: AssistantMessage[];
  loading: boolean;
  /** Heure du premier message, affichée en tête de conversation */
  startedAt: string;
  ask: (question: string) => Promise<void>;
  reset: () => void;
}

export const useAdminAssistantStore = create<AdminAssistantStore>((set, get) => ({
  messages: [],
  loading: false,
  startedAt: '',

  ask: async (raw) => {
    const text = raw.trim();
    const { loading, messages } = get();
    if (text.length < 3 || loading) return;

    const history = messages.filter((m) => !m.local).slice(-HISTORY_SENT).map(({ role, content }) => ({ role, content }));
    set({
      messages: [...messages, { role: 'user', content: text }],
      loading: true,
      startedAt: messages.length === 0 ? new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : get().startedAt,
    });

    try {
      const res = await api.post('/admin/ai/ask', { question: text, history });
      set((s) => ({ messages: [...s.messages, { role: 'assistant', content: res.data?.data?.answer || 'Aucune réponse.' }] }));
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      const status = e.response?.status;
      const content =
        status === 403
          ? 'Cet assistant est réservé aux administrateurs.'
          : e.response?.data?.message ||
            (status === 429
              ? 'Vous posez des questions un peu vite. Patientez une minute, puis réessayez.'
              : "Bo n'a pas pu répondre. Réessayez dans un instant.");
      set((s) => ({ messages: [...s.messages, { role: 'assistant', content, local: true }] }));
    } finally {
      set({ loading: false });
    }
  },

  reset: () => set({ messages: [], loading: false, startedAt: '' }),
}));
