import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SearchSession {
  search?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: number;
  city?: string;
  type?: string;
}

interface SearchStore {
  session: SearchSession | null;
  setSearchSession: (params: SearchSession) => void;
  clearSearchSession: () => void;
  getSearchSession: () => SearchSession | null;
}

const STORAGE_KEY = 'search-session';

// Retour client 2026-09-15 : "quand un utilisateur arrive sur la plateforme,
// il faut que ce soit la date du jour par défaut qu'il voit" — cette session
// est persistée indéfiniment (localStorage, via `persist`) et lue telle
// quelle par la barre de recherche de l'accueil, la fiche établissement et
// le tunnel de réservation. Sans garde-fou, une date choisie il y a
// plusieurs jours/semaines finissait par être dans le passé et se
// réappliquait quand même comme sélection par défaut ("La date d'arrivée
// doit être aujourd'hui ou dans le futur" au moment de réserver, sans que
// rien à l'écran n'explique pourquoi).
function isPastDateString(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

function sanitizeSession(session: SearchSession | null): SearchSession | null {
  if (!session || !isPastDateString(session.checkIn)) return session;
  const { checkIn, checkOut, ...rest } = session;
  return Object.keys(rest).length > 0 ? rest : null;
}

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      session: null,

      setSearchSession: (params) => {
        const session: SearchSession = {};
        // Une arrivée déjà passée n'est jamais enregistrée : elle ne
        // représente pas une intention de recherche valable à conserver.
        if (params.checkIn && !isPastDateString(params.checkIn)) {
          session.checkIn = params.checkIn;
          if (params.checkOut) session.checkOut = params.checkOut;
        }
        if (params.guests != null && params.guests > 0) session.guests = params.guests;
        if (params.rooms != null && params.rooms > 0) session.rooms = params.rooms;
        if (params.search) session.search = params.search;
        if (params.city) session.city = params.city;
        if (params.type) session.type = params.type;
        set({ session: Object.keys(session).length > 0 ? session : null });
      },

      clearSearchSession: () => set({ session: null }),

      getSearchSession: () => get().session,
    }),
    {
      name: STORAGE_KEY,
      // Nettoie une session déjà persistée AVANT ce correctif (localStorage
      // d'un visiteur revenant après plusieurs jours) : sans ça, le correctif
      // ci-dessus (qui n'empêche que les FUTURES sauvegardes) ne réparerait
      // jamais les dates déjà périmées en stock chez les visiteurs existants.
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.session = sanitizeSession(state.session);
        }
      },
    }
  )
);
