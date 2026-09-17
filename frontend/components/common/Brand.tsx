interface BrandProps {
  className?: string;
  /** Couleur du "séjour" quand le fond est sombre (le "bo" reste rouge partout). */
  variant?: 'dark' | 'light';
}

/**
 * Rendu "boséjour" en texte simple (titres, mentions de marque) — reprend les
 * couleurs de la charte (bo en rouge, séjour en noir/blanc) sans prétendre
 * reproduire le "o" fusionné dans le "b" du logo (voir Logo.tsx) : ce
 * graphisme est dessiné à la main, impossible à recréer avec du texte.
 * Retour client 2026-09-16.
 */
export default function Brand({ className = '', variant = 'dark' }: BrandProps) {
  return (
    <span className={className}>
      <span className="text-primary">bo</span>
      <span className={variant === 'light' ? 'text-white' : 'text-black dark:text-white'}>séjour</span>
    </span>
  );
}
