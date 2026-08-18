'use client';

import Link from 'next/link';
import {
  Settings,
  UserCog,
  ShieldCheck,
  Bell,
  Sparkles,
  Users,
  Wallet,
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
    href: '/dashboard/host/profile',
    icon: UserCog,
    title: 'Profil & documents',
    description: 'Identité, coordonnées et pièces justificatives de votre compte partenaire.',
  },
  {
    href: '/dashboard/host/settings/securite',
    icon: ShieldCheck,
    title: 'Sécurité',
    description: 'Mot de passe et double authentification.',
  },
  {
    href: '/dashboard/host/settings/notifications',
    icon: Bell,
    title: 'Notifications',
    description: 'E-mail, WhatsApp, SMS — comment être prévenu.',
  },
  {
    href: '/dashboard/host/settings/apparence',
    icon: Sparkles,
    title: 'Apparence',
    description: "Thème clair ou sombre pour l'espace partenaire.",
  },
  {
    href: '/dashboard/host/staff',
    icon: Users,
    title: 'Personnel',
    description: 'Collaborateurs invités et permissions par menu.',
  },
  {
    href: '/dashboard/host/finances',
    icon: Wallet,
    title: 'Coordonnées bancaires',
    description: 'Compte utilisé pour vos retraits.',
  },
];

export default function HostSettingsHubPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
          <Settings className="w-6 h-6 text-primary" />
          Paramètres
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Réglages de votre compte partenaire, par module.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    </div>
  );
}
