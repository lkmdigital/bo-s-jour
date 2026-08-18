'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  TrendingUp,
  Building2,
  Users,
  CalendarCheck,
  Wallet,
  CreditCard,
  Star,
  ShieldCheck,
  ClipboardCheck,
  Gift,
  Award,
  Megaphone,
  Map,
  BrainCircuit,
  Settings,
  Scale,
  History,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import Logo from '@/components/common/Logo';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  badgeKey?: keyof Counts;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface Counts {
  accommodations?: number;
  reservations?: number;
  reviews?: number;
  compliance?: number;
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      { href: '/dashboard/admin', label: 'Tableau de bord', icon: LayoutGrid },
      { href: '/dashboard/admin/strategique', label: 'Tableau stratégique', icon: TrendingUp },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { href: '/dashboard/admin/accommodations', label: 'Établissements', icon: Building2, badgeKey: 'accommodations' },
      { href: '/dashboard/admin/users', label: 'Utilisateurs', icon: Users },
      { href: '/dashboard/admin/reservations', label: 'Réservations', icon: CalendarCheck, badgeKey: 'reservations' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/dashboard/admin/comptabilite', label: 'Comptabilité', icon: Wallet },
      { href: '/dashboard/admin/paiements', label: 'Paiements', icon: CreditCard },
    ],
  },
  {
    title: 'Qualité',
    items: [
      { href: '/dashboard/admin/reviews', label: 'Avis clients', icon: Star, badgeKey: 'reviews' },
      { href: '/dashboard/admin/conformite', label: 'Conformité', icon: ShieldCheck, badgeKey: 'compliance' },
      { href: '/dashboard/admin/inspections', label: 'Inspections', icon: ClipboardCheck },
    ],
  },
  {
    title: 'Croissance',
    items: [
      { href: '/dashboard/admin/promotions', label: 'Promotions', icon: Gift },
      { href: '/dashboard/admin/programme', label: 'Membre du programme', icon: Award },
      { href: '/dashboard/admin/commercialisation', label: 'Commercialisation', icon: Megaphone },
    ],
  },
  {
    title: 'Données',
    items: [
      { href: '/dashboard/admin/base-touristique', label: 'Base touristique', icon: Map },
      { href: '/dashboard/admin/renseignement-ia', label: 'Renseignement IA', icon: BrainCircuit },
    ],
  },
  {
    title: 'Système',
    items: [
      { href: '/dashboard/admin/settings', label: 'Paramètres', icon: Settings },
      { href: '/dashboard/admin/juridique', label: 'Juridique', icon: Scale },
      { href: '/dashboard/admin/journal-activite', label: "Journal d'activité", icon: History },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [counts, setCounts] = useState<Counts>({});

  useEffect(() => {
    api
      .get('/admin/dashboard/stats')
      .then((res) => {
        const data = res.data?.data;
        if (!data) return;
        setCounts({
          accommodations: data.accommodations?.total,
          reservations: data.bookings?.pending,
          compliance: data.accommodations?.pending,
        });
      })
      .catch(() => {});
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard/admin') return pathname === href;
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-5 border-b border-white/10">
        <Logo href="/dashboard/admin" size="sm" variant="white" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 border border-white/15 rounded-full px-2 py-1 shrink-0">
          Admin
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badgeKey }) => {
                const active = isActive(href);
                const badgeValue = badgeKey ? counts[badgeKey] : undefined;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active ? 'bg-bosejour-red text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate flex-1">{label}</span>
                    {typeof badgeValue === 'number' && badgeValue > 0 && (
                      <span
                        className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                          active ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-300'
                        }`}
                      >
                        {badgeValue}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-bosejour-red/20 text-bosejour-red flex items-center justify-center font-bold text-sm shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{user?.name ?? 'Super administrateur'}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} title="Déconnexion" className="p-2 rounded-lg hover:bg-white/10 shrink-0">
            <LogOut className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-30 p-2 rounded-lg bg-black text-white shadow-md"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 bg-black text-gray-300 h-screen self-start sticky top-0">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-80 max-w-[85vw] bg-black text-gray-300 flex flex-col">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-white/10 z-10"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
