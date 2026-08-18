'use client';

import Link from 'next/link';
import { ArrowLeft, type LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
}

/** En-tête commun aux sous-pages de Paramètres (espace partenaire) — la garde
 * d'authentification hôte est déjà assurée par app/dashboard/host/layout.tsx. */
export default function HostSettingsPageHeader({ icon: Icon, title, description }: Props) {
  return (
    <div className="mb-6">
      <Link
        href="/dashboard/host/settings"
        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Paramètres
      </Link>

      <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
        <Icon className="w-6 h-6 text-primary" />
        {title}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}
