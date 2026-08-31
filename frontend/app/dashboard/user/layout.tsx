'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import Logo from '@/components/common/Logo';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { resolveImageUrl } from '@/lib/utils';
import {
  Home, Search, Calendar, Heart, Zap, CreditCard, MessageSquare, MessagesSquare,
  User as UserIcon, FileText, Compass, Globe2, Settings, HelpCircle,
  Gift, Bell, LogOut, Wallet, Building2, Sparkles,
} from 'lucide-react';

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  corporateOnly?: boolean;
}

const NAV: NavItem[] = [
  { labelKey: 'dashboard', href: '/dashboard/user', icon: Home },
  { labelKey: 'search', href: '/dashboard/user/recherche', icon: Search },
  { labelKey: 'reservations', href: '/dashboard/user/reservations', icon: Calendar },
  { labelKey: 'favorites', href: '/favorites', icon: Heart },
  { labelKey: 'loyaltyProgram', href: '/dashboard/user/programme', icon: Zap },
  // Module IA masqué le 2026-08-27 en attendant un échange avec le client (voir page.tsx correspondante)
  // { labelKey: 'aiAssistant', href: '/dashboard/user/ai', icon: Sparkles },
  { labelKey: 'payments', href: '/dashboard/user/paiements', icon: CreditCard },
  { labelKey: 'credits', href: '/dashboard/user/avoirs', icon: Wallet },
  { labelKey: 'company', href: '/dashboard/user/entreprise', icon: Building2, corporateOnly: true },
  { labelKey: 'reviews', href: '/dashboard/user/avis', icon: MessageSquare },
  { labelKey: 'messages', href: '/dashboard/user/inbox', icon: MessagesSquare },
  { labelKey: 'profile', href: '/dashboard/user/profil', icon: UserIcon },
  { labelKey: 'documents', href: '/dashboard/user/documents', icon: FileText },
  { labelKey: 'trips', href: '/dashboard/user/voyages', icon: Compass },
  { labelKey: 'discover', href: '/dashboard/user/decouvrir', icon: Globe2 },
  { labelKey: 'settings', href: '/dashboard/user/parametres', icon: Settings },
  { labelKey: 'help', href: '/dashboard/user/aide', icon: HelpCircle },
];

function initials(name?: string) {
  if (!name) return 'BS';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

// NB (audit sécurité 2026-08) : contrairement aux layouts admin/host, ce layout ne redirige pas
// lui-même les visiteurs non authentifiés — c'est volontaire : /dashboard/user/aide, /decouvrir
// et /recherche sont des pages publiques par design (contenu générique, navigables sans compte),
// et /dashboard/user/[section] est un simple placeholder "bientôt disponible" sans donnée réelle.
// Chaque page réellement sensible (réservations, paiements, profil, documents, etc.) a donc sa
// propre garde (if (!isLoading && !isAuthenticated) router.push('/auth/login')) — vérifié : les
// 13 pages concernées l'ont toutes. Toute NOUVELLE page affichant des données de compte doit
// reproduire cette garde individuellement, ce layout ne la fournit pas automatiquement.
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const tNav = useTranslations('member.nav');
  const tNavbar = useTranslations('member.navbar');
  const { user, isAuthenticated, logout } = useAuthStore();
  const [query, setQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/me/notifications')
      .then((r) => setUnreadCount(r.data?.unread_count ?? 0))
      .catch(() => {});
  }, [isAuthenticated, pathname]);

  const isActive = (href: string) =>
    href === '/dashboard/user' ? pathname === href : pathname?.startsWith(href);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/accommodations?destination=${encodeURIComponent(q)}` : '/accommodations');
  };

  const isCorporate = user?.traveler_type === 'corporate';

  const SidebarNav = () => (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.filter((item) => !item.corporateOnly || isCorporate).map(({ labelKey, href, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              active
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {tNav(labelKey)}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top navbar */}
      <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-stretch">
        {/* Zone logo = largeur de la sidebar (avec séparateur aligné sur celle-ci) */}
        <div className="flex items-center gap-2 px-4 md:w-64 md:flex-shrink-0 md:border-r border-gray-200 dark:border-gray-700">
          <Logo size="md" href="/" className="flex-shrink-0" />
        </div>

        {/* Zone contenu : recherche centrée + actions à droite */}
        <div className="flex-1 flex items-center gap-4 px-4 sm:px-6 min-w-0">
          <div className="flex-1 hidden sm:block" />

          <form onSubmit={onSearch} className="w-full max-w-xl hidden sm:block">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tNavbar('searchPlaceholder')}
                className="w-full pl-4 pr-11 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              <button type="submit" aria-label="Rechercher" className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="flex-1 flex items-center justify-end gap-1 sm:gap-3">
            <Link href="/dashboard/user/programme" className="hidden md:inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-primary">
              <Gift className="w-5 h-5" /> {tNavbar('offers')}
            </Link>
            <Link href="/dashboard/user/notifications" className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" aria-label="Notifications">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-semibold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/favorites" className="hidden md:inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-primary">
              <Heart className="w-5 h-5" /> {tNavbar('favorites')}
            </Link>

            <div className="flex items-center gap-2 pl-2 sm:pl-3 sm:border-l border-gray-200 dark:border-gray-700">
              <div className="text-right hidden sm:block leading-tight">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[140px]">{user?.name || tNavbar('memberSpace')}</p>
                <p className="text-xs text-gray-400">{tNavbar('memberSpace')}</p>
              </div>
              <Link href="/dashboard/user/profil" title="Mon profil" className="flex-shrink-0">
                {user?.avatar ? (
                  <span className="relative w-9 h-9 rounded-full overflow-hidden block bg-gray-100 dark:bg-gray-700">
                    <Image src={resolveImageUrl(user.avatar) || user.avatar} alt={user?.name || 'Profil'} fill className="object-cover" />
                  </span>
                ) : (
                  <span className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                    {initials(user?.name)}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex w-64 flex-shrink-0 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <SidebarNav />
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="mt-auto m-3 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <LogOut className="w-5 h-5" /> {tNavbar("logout")}
          </button>
        </aside>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 bg-[#FAF7F1] dark:bg-gray-950">{children}</main>
      </div>
    </div>
  );
}
