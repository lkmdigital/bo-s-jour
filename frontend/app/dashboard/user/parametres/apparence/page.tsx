'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useAppearanceStore, TextScale, Density } from '@/stores/appearanceStore';
import { useLocaleStore, Locale } from '@/stores/localeStore';
import MemberAside from '@/components/dashboard/user/MemberAside';
import MemberSettingsPageHeader from '@/components/dashboard/user/MemberSettingsPageHeader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Sparkles, Sun, Moon, Type, Rows3, Languages, RotateCcw } from 'lucide-react';

export default function MemberAppearanceSettingsPage() {
  const router = useRouter();
  const tLang = useTranslations('member.language');
  const { isAuthenticated, isLoading } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { locale, setLocale } = useLocaleStore();
  const {
    reduceMotion, textScale, density,
    setReduceMotion, setTextScale, setDensity,
    reset: resetAppearance,
  } = useAppearanceStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/user/parametres/apparence');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return <LoadingSpinner message="Chargement…" size="lg" />;
  if (!isAuthenticated) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6 max-w-2xl">
        <MemberSettingsPageHeader
          icon={Sparkles}
          title="Apparence"
          description="Personnalisez l'affichage de votre espace membre."
        />

        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          {/* Thème */}
          <div>
            <p className="text-sm font-medium mb-2">Thème</p>
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
          </div>

          {/* Langue */}
          <div className="pt-5 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm font-medium mb-2 flex items-center gap-2"><Languages className="w-4 h-4" /> {tLang('label')}</p>
            <div className="grid grid-cols-2 gap-3 max-w-xs">
              {([
                { key: 'fr' as Locale, label: tLang('french') },
                { key: 'en' as Locale, label: tLang('english') },
              ]).map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setLocale(o.key)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${locale === o.key ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{tLang('scopeNote')}</p>
          </div>

          {/* Taille du texte */}
          <div className="pt-5 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm font-medium mb-2 flex items-center gap-2"><Type className="w-4 h-4" /> Taille du texte</p>
            <div className="grid grid-cols-3 gap-3 max-w-sm">
              {([
                { key: 'normal' as TextScale, label: 'Normal', size: 'text-sm' },
                { key: 'large' as TextScale, label: 'Grand', size: 'text-base' },
                { key: 'larger' as TextScale, label: 'Très grand', size: 'text-lg' },
              ]).map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setTextScale(o.key)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-colors ${textScale === o.key ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                >
                  <span className={`${o.size} font-bold`}>Aa</span>
                  <span className="text-xs font-medium">{o.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Animations */}
          <div className="pt-5 border-t border-gray-100 dark:border-gray-700">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="w-4 h-4" /> Réduire les animations
              </span>
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(e) => setReduceMotion(e.target.checked)}
                className="w-5 h-5 accent-[#FF0000]"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">Désactive les transitions et effets de défilement pour un confort de lecture accru.</p>
          </div>

          {/* Densité d'affichage */}
          <div className="pt-5 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm font-medium mb-2 flex items-center gap-2"><Rows3 className="w-4 h-4" /> Densité d&apos;affichage</p>
            <div className="grid grid-cols-2 gap-3 max-w-xs">
              {([
                { key: 'comfortable' as Density, label: 'Confortable' },
                { key: 'compact' as Density, label: 'Compacte' },
              ]).map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setDensity(o.key)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${density === o.key ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Resserre l&apos;espacement des cartes de votre espace membre.</p>
          </div>

          {/* Réinitialiser */}
          <div className="pt-5 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => { resetAppearance(); setTheme('light'); }}
              className="text-sm text-gray-500 hover:text-primary inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Réinitialiser l&apos;apparence par défaut
            </button>
          </div>
        </section>
      </div>

      <MemberAside />
    </div>
  );
}
