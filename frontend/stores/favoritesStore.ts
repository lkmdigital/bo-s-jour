import { create } from 'zustand';
import api from '@/lib/api';

interface FavoritesState {
  ids: number[];
  loaded: boolean;
  loading: boolean;
  fetchIds: () => Promise<void>;
  isFavorite: (id: number | string) => boolean;
  toggle: (id: number | string) => Promise<boolean>; // renvoie le nouvel état (true = favori)
  reset: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: [],
  loaded: false,
  loading: false,

  fetchIds: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const res = await api.get('/favorites/ids');
      const ids: number[] = (res.data?.ids || []).map((n: number | string) => Number(n));
      set({ ids, loaded: true });
    } catch {
      // non connecté ou erreur : on laisse la liste vide
      set({ loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  isFavorite: (id) => get().ids.includes(Number(id)),

  toggle: async (id) => {
    const numId = Number(id);
    const wasFav = get().ids.includes(numId);

    // Mise à jour optimiste
    set({ ids: wasFav ? get().ids.filter((x) => x !== numId) : [...get().ids, numId] });

    try {
      if (wasFav) {
        await api.delete(`/favorites/${numId}`);
      } else {
        await api.post('/favorites', { accommodation_id: numId });
      }
      return !wasFav;
    } catch (err) {
      // Rollback en cas d'échec
      set({ ids: wasFav ? [...get().ids, numId] : get().ids.filter((x) => x !== numId) });
      throw err;
    }
  },

  reset: () => set({ ids: [], loaded: false }),
}));
