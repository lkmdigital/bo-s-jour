import { create } from 'zustand';

export type TextScale = 'normal' | 'large' | 'larger';

interface AppearanceState {
  reduceMotion: boolean;
  textScale: TextScale;
  setReduceMotion: (v: boolean) => void;
  setTextScale: (v: TextScale) => void;
  reset: () => void;
}

function readBool(key: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(key) === '1';
}
function readScale(): TextScale {
  if (typeof window === 'undefined') return 'normal';
  const v = localStorage.getItem('text_scale');
  return v === 'large' || v === 'larger' ? v : 'normal';
}

export const useAppearanceStore = create<AppearanceState>((set) => ({
  reduceMotion: readBool('reduce_motion'),
  textScale: readScale(),

  setReduceMotion: (v) => {
    if (typeof window !== 'undefined') localStorage.setItem('reduce_motion', v ? '1' : '0');
    set({ reduceMotion: v });
  },

  setTextScale: (v) => {
    if (typeof window !== 'undefined') localStorage.setItem('text_scale', v);
    set({ textScale: v });
  },

  reset: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('reduce_motion');
      localStorage.removeItem('text_scale');
    }
    set({ reduceMotion: false, textScale: 'normal' });
  },
}));
