'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/common/Logo';
import { useAuthStore } from '@/stores/authStore';
import {
  Home, Search, Calendar, Heart, Zap, CreditCard, MessageSquare, MessagesSquare,
  User as UserIcon, FileText, Compass, Globe2, Settings, HelpCircle,
  Gift, Bell, Menu, X, LogOut,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard/user', icon: Home },
  { label: 'Rechercher', href: '/accommodations', icon: Search },
  { label: 'Mes réservations', href: '/bookings', icon: Calendar },
  { label: 'Favoris', href: '/favorites', icon: Heart },
  { label: 'Programme Membre', href: '/dashboard/user/programme', icon: Zap },
  { label: 'Paiements', href: '/dashboard/user/paiements', icon: CreditCard },
  { label: 'Avis', href: '/dashboard/user/avis', icon: MessageSquare },
  { label: 'Messages', href: '/dashboard/user/inbox', icon: MessagesSquare },
  { label: 'Mon profil', href: '/dashboard/user/profil', icon: UserIcon },
  { label: 'Documents', href: '/dashboard/user/documents', icon: FileText },
  { label: 'Mes voyages', href: '/dashboard/user/voyages', icon: Compass },
  { label: 'Découvrir', href: '/dashboard/user/decouvrir', icon: Globe2 },
  { label: 'Paramètres', href: '/dashboard/user/parametres', icon: Settings },
  { label: 'Aide & Support', href: '/dashboard/user/aide', icon: HelpCircle },
];

function initials(name?: string) {
  if (!name) return 'BS';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');

  const isActive = (href: string) =>
    href === '/dashboard/user' ? pathname === href : pathname?.startsWith(href);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/accommodations?destination=${encodeURIComponent(q)}` : '/accommodations');
  };

  const SidebarNav = () => (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map(({ label, href, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              active
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top navbar */}
      <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 px-4">
        <button
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <Logo size="sm" href="/" className="flex-shrink-0" />

        {/* Recherche */}
        <form onSubmit={onSearch} className="flex-1 max-w-xl hidden sm:block sm:ml-6 lg:ml-10">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un hôtel, une ville, une destination…"
              className="w-full pl-4 pr-11 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
            <button type="submit" aria-label="Rechercher" className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <Link href="/dashboard/user/programme" className="hidden md:inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-primary">
            <Gift className="w-5 h-5" /> Offres
          </Link>
          <Link href="/dashboard/user/notifications" className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" aria-label="Notifications">
            <Bell className="w-5 h-5" />
          </Link>
          <Link href="/favorites" className="hidden md:inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-primary">
            <Heart className="w-5 h-5" /> Favoris
          </Link>

          <div className="flex items-center gap-2 pl-2 sm:pl-3 sm:border-l border-gray-200 dark:border-gray-700">
            <div className="text-right hidden sm:block leading-tight">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[140px]">{user?.name || 'Mon espace'}</p>
              <p className="text-xs text-gray-400">Espace membre</p>
            </div>
            <span className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {initials(user?.name)}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <SidebarNav />
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="mt-auto m-3 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <LogOut className="w-5 h-5" /> Déconnexion
          </button>
        </aside>

        {/* Sidebar mobile (overlay) */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="relative w-64 bg-white dark:bg-gray-800 h-full overflow-y-auto shadow-xl flex flex-col">
              <SidebarNav />
              <button
                onClick={() => { logout(); router.push('/'); }}
                className="mt-auto m-3 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <LogOut className="w-5 h-5" /> Déconnexion
              </button>
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
