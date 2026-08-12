import { create } from 'zustand';

export type Locale = 'fr' | 'en';

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** À appeler une seule fois après le montage (useEffect) pour appliquer la langue
   *  mémorisée sans provoquer de désaccord d'hydratation SSR/client (le rendu serveur
   *  et le premier rendu client restent tous deux en 'fr' par défaut). */
  hydrateLocale: () => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: 'fr',
  setLocale: (l) => {
    if (typeof window !== 'undefined') localStorage.setItem('locale', l);
    set({ locale: l });
  },
  hydrateLocale: () => {
    if (typeof window === 'undefined') return;
    const v = localStorage.getItem('locale');
    if (v === 'en') set({ locale: 'en' });
  },
}));
