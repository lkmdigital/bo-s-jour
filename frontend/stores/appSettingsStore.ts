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
  loaded: boolean;
  fetchSettings: () => Promise<void>;
}

const VALID_THEMES: EventTheme[] = ['default', 'noel', 'nouvel_an', 'paques'];

export const useAppSettingsStore = create<AppSettingsStore>((set) => ({
  maintenanceEnabled: false,
  maintenanceMessage: '',
  eventTheme: 'default',
  appName: 'Bosejour',
  currency: 'XOF',
  whatsappVerificationEnabled: false,
  loaded: false,

  fetchSettings: async () => {
    try {
      const res = await api.get('/settings/public');
      const d = res.data || {};
      set({
        maintenanceEnabled: !!d.maintenance_enabled,
        maintenanceMessage: d.maintenance_message || '',
        eventTheme: VALID_THEMES.includes(d.theme_mode) ? d.theme_mode : 'default',
        appName: d.app_name || 'Bosejour',
        currency: d.app_currency || 'XOF',
        whatsappVerificationEnabled: !!d.whatsapp_verification_enabled,
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },
}));
