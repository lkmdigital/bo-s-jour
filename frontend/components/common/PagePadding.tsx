'use client';

import { usePathname } from 'next/navigation';

export default function PagePadding({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  // Les espaces partenaire et admin ont leur propre shell (sidebar + topbar sticky)
  // et ne doivent pas hériter du padding prévu pour l'ancien Header fixe / la nav
  // mobile du reste du site.
  const hasOwnShell =
    pathname?.startsWith('/dashboard/host') ||
    pathname?.startsWith('/dashboard/admin') ||
    pathname?.startsWith('/dashboard/user');

  if (hasOwnShell) {
    return <>{children}</>;
  }

  return (
    <div className={`pb-20 md:pb-0 ${isHome ? '' : 'pt-20'}`}>
      {children}
    </div>
  );
}
