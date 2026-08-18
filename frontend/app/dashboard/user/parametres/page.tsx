'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import MemberAside from '@/components/dashboard/user/MemberAside';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  UserCog,
  ShieldCheck,
  Bell,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

interface SettingsCard {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const CARDS: SettingsCard[] = [
  {
    href: '/dashboard/user/profil',
    icon: UserCog,
    title: 'Profil',
    description: 'Photo, informations personnelles et préférences de voyage.',
  },
  {
    href: '/dashboard/user/parametres/securite',
    icon: ShieldCheck,
    title: 'Sécurité',
    description: 'Mot de passe et double authentification.',
  },
  {
    href: '/dashboard/user/parametres/notifications',
    icon: Bell,
    title: 'Notifications',
    description: 'E-mail, WhatsApp, SMS — comment être prévenu(e).',
  },
  {
    href: '/dashboard/user/parametres/apparence',
    icon: Sparkles,
    title: 'Apparence',
    description: 'Thème, langue, taille du texte et densité d\'affichage.',
  },
  {
    href: '/dashboard/user/parametres/recherche',
    icon: SlidersHorizontal,
    title: 'Recherche & navigation',
    description: 'Tri par défaut, format des prix et page d\'accueil.',
  },
];

export default function MemberSettingsPage() {
  const router = useRouter();
  const t = useTranslations('member.pages.settings');
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/user/parametres');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return <LoadingSpinner message="Chargement de vos paramètres…" size="lg" />;
  if (!isAuthenticated) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:border-primary/50 hover:shadow-md transition-all flex flex-col"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                  {card.title}
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <MemberAside />
    </div>
  );
}
