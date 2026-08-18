'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  Settings,
  Languages,
  Globe2,
  BookText,
  Receipt,
  Users,
  SlidersHorizontal,
  CreditCard,
  MessageSquareText,
  Scale,
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
    href: '/dashboard/admin/settings/langues',
    icon: Languages,
    title: 'Langues',
    description: 'Langues proposées aux voyageurs (français, anglais).',
  },
  {
    href: '/dashboard/admin/settings/regional',
    icon: Globe2,
    title: 'Paramètres régionaux',
    description: "Devise, nom de l'application et coordonnées de support.",
  },
  {
    href: '/dashboard/admin/settings/traductions',
    icon: BookText,
    title: 'Traductions',
    description: "Portée actuelle de la traduction de l'espace membre.",
  },
  {
    href: '/dashboard/admin/settings/taxes',
    icon: Receipt,
    title: 'Taxes de séjour',
    description: 'TVA, commission plateforme et taxe de séjour.',
  },
  {
    href: '/dashboard/admin/settings/utilisateurs',
    icon: Users,
    title: 'Utilisateurs',
    description: "Équipe interne : rôles et permissions d'administration.",
  },
  {
    href: '/dashboard/admin/settings/avance',
    icon: SlidersHorizontal,
    title: 'Réglages avancés',
    description: 'Maintenance, thème, réservations, intégrations API.',
  },
  {
    href: '/dashboard/admin/settings/facturation',
    icon: CreditCard,
    title: 'Facturation',
    description: 'Moyens de paiement, paiement différé, identité de facturation.',
  },
  {
    href: '/dashboard/admin/settings/modeles',
    icon: MessageSquareText,
    title: 'Modèles',
    description: 'Message WhatsApp automatique et e-mails transactionnels.',
  },
  {
    href: '/dashboard/admin/juridique?doc=cgv',
    icon: Scale,
    title: 'Conditions générales de vente',
    description: 'CGV, CGU et politique de confidentialité.',
  },
];

export default function AdminSettingsHubPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
          <Settings className="w-6 h-6 text-primary" />
          Paramètres
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Configuration générale de la plateforme, par module.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 hover:border-primary/50 hover:shadow-md transition-all flex flex-col"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                  {card.title}
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.description}</p>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
