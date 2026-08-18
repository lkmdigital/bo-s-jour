'use client';

import { useThemeStore } from '@/stores/themeStore';
import HostSettingsPageHeader from '@/components/dashboard/host/HostSettingsPageHeader';
import { Sparkles, Sun, Moon } from 'lucide-react';

export default function HostAppearanceSettingsPage() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <HostSettingsPageHeader
        icon={Sparkles}
        title="Apparence"
        description="Thème clair ou sombre pour votre espace partenaire."
      />

      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
        <p className="text-sm font-medium mb-3">Thème de l&apos;application</p>
        <div className="grid grid-cols-2 gap-3 max-w-xs">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-colors ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
          >
            <Sun className="w-5 h-5" />
            <span className="text-xs font-medium">Clair</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-colors ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
          >
            <Moon className="w-5 h-5" />
            <span className="text-xs font-medium">Sombre</span>
          </button>
        </div>
      </section>
    </div>
  );
}
