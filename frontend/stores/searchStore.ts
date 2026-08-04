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

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      session: null,

      setSearchSession: (params) => {
        const session: SearchSession = {};
        if (params.checkIn) session.checkIn = params.checkIn;
        if (params.checkOut) session.checkOut = params.checkOut;
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
    { name: STORAGE_KEY }
  )
);
