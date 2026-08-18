'use client';

import { BookText, CheckCircle2, Circle } from 'lucide-react';
import SettingsPageShell from '@/components/dashboard/admin/SettingsPageShell';

const TRANSLATED = [
  'Menu et navigation de l\'espace membre',
  'Titres et sous-titres des pages membre',
  'Sélecteur de langue (FR / EN)',
];

const NOT_TRANSLATED = [
  'Formulaires de réservation',
  'Descriptions des hébergements (saisies par les hôtes)',
  'E-mails et messages WhatsApp automatiques',
  'Espace partenaire (hôtes)',
];

export default function AdminTranslationsSettingsPage() {
  return (
    <SettingsPageShell
      icon={BookText}
      title="Traductions"
      description="Portée actuelle de la traduction FR / EN de la plateforme."
    >
      <section className="card space-y-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          bo séjour est disponible en français et en anglais. La traduction couvre aujourd&apos;hui
          la structure de l&apos;espace membre voyageur ; le contenu détaillé (formulaires,
          descriptions saisies par les hôtes) reste en français pour le moment.
        </p>

        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-600" /> Traduit
          </h2>
          <ul className="space-y-1.5 pl-1">
            {TRANSLATED.map((item) => (
              <li key={item} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
            <Circle className="w-4 h-4 text-gray-400" /> Pas encore traduit
          </h2>
          <ul className="space-y-1.5 pl-1">
            {NOT_TRANSLATED.map((item) => (
              <li key={item} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
          Les textes de l&apos;interface sont gérés dans le code de l&apos;application (fichiers de
          traduction FR / EN) — un éditeur en ligne n&apos;est pas encore disponible dans ce module.
        </p>
      </section>
    </SettingsPageShell>
  );
}
