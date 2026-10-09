import { create } from 'zustand';
import api from '@/lib/api';

export type EventTheme = 'default' | 'noel' | 'nouvel_an' | 'paques';

interface AppSettingsStore {
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  eventTheme: EventTheme;
  appName: string;
  currency: string;
  whatsappVerificationEnabled: boolean;
  /** Module IA activé par l'admin ET clé API renseignée : condition d'affichage de tout ce qui touche à l'IA */
  aiEnabled: boolean;
  /** L'assistant voyageur répond aussi aux visiteurs non connectés */
  aiGuestEnabled: boolean;
  loaded: boolean;
  fetchSettings: () => Promise<void>;
}

const VALID_THEMES: EventTheme[] = ['default', 'noel', 'nouvel_an', 'paques'];

export const useAppSettingsStore = create<AppSettingsStore>((set) => ({
  maintenanceEnabled: false,
  maintenanceMessage: '',
  eventTheme: 'default',
  appName: 'boséjour',
  currency: 'XOF',
  whatsappVerificationEnabled: false,
  aiEnabled: false,
  aiGuestEnabled: false,
  loaded: false,

  fetchSettings: async () => {
    try {
      const res = await api.get('/settings/public');
      const d = res.data || {};
      set({
        maintenanceEnabled: !!d.maintenance_enabled,
        maintenanceMessage: d.maintenance_message || '',
        eventTheme: VALID_THEMES.includes(d.theme_mode) ? d.theme_mode : 'default',
        appName: d.app_name || 'boséjour',
        currency: d.app_currency || 'XOF',
        whatsappVerificationEnabled: !!d.whatsapp_verification_enabled,
        aiEnabled: !!d.ai_enabled,
        aiGuestEnabled: !!d.ai_guest_enabled,
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },
}));
