'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Building2,
  BedDouble,
  CalendarDays,
  BookOpen,
  Users,
  Star,
  Gift,
  Wallet,
  FileText,
  UserCog,
  BarChart3,
  Award,
  Sparkles,
  HelpCircle,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  // "Commercialisation" n'est plus un onglet séparé : accessible depuis Statistiques
  // (carte "Commercialisation" -> /dashboard/host/promotions).
  { href: '/dashboard/host', label: 'Tableau de bord', icon: LayoutGrid },
  { href: '/dashboard/host/property', label: 'Mes établissements', icon: Building2 },
  { href: '/dashboard/host/rooms', label: 'Chambres et tarifs', icon: BedDouble },
  { href: '/dashboard/host/calendar', label: 'Calendrier', icon: CalendarDays },
  { href: '/dashboard/host/reservations', label: 'Réservations', icon: BookOpen },
  { href: '/dashboard/host/clients', label: 'Clients', icon: Users },
  { href: '/dashboard/host/reviews', label: 'Avis', icon: Star },
  { href: '/dashboard/host/promotions', label: 'Promotions', icon: Gift },
  { href: '/dashboard/host/finances', label: 'Finances', icon: Wallet },
  { href: '/dashboard/host/documents', label: 'Documents', icon: FileText },
  { href: '/dashboard/host/staff', label: 'Personnel', icon: UserCog },
  { href: '/dashboard/host/stats', label: 'Statistiques', icon: BarChart3 },
  { href: '/dashboard/host/programme', label: 'Programme fidélité', icon: Award },
  { href: '/dashboard/host/ai', label: 'Assistant IA', icon: Sparkles },
];

// Clé de permission (host_staff.permissions / users.staff_permissions, choisie
// individuellement par le propriétaire à l'invitation — voir /dashboard/host/staff)
// associée à chaque item du menu. "Tableau de bord" n'a pas de clé : toujours accessible.
// Miroir de HostStaff::PERMISSIONS côté backend (app/Models/HostStaff.php).
const NAV_ITEM_PERMISSION: Record<string, string> = {
  '/dashboard/host/property': 'property',
  '/dashboard/host/rooms': 'rooms',
  '/dashboard/host/calendar': 'calendar',
  '/dashboard/host/reservations': 'reservations',
  '/dashboard/host/clients': 'clients',
  '/dashboard/host/reviews': 'reviews',
  '/dashboard/host/promotions': 'promotions',
  '/dashboard/host/finances': 'finances',
  '/dashboard/host/documents': 'documents',
  '/dashboard/host/staff': 'staff',
  '/dashboard/host/stats': 'stats',
  '/dashboard/host/programme': 'stats',
  '/dashboard/host/ai': 'ai',
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();

  const isActive = (href: string) => {
    if (href === '/dashboard/host') return pathname === href;
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  // Un collaborateur "Administrateur" sans liste explicite (compte activé avant
  // l'introduction des cases à cocher) garde un accès complet par défaut — cohérent avec
  // User::staffPermissions() côté backend.
  const isStaffMember = !!user?.staff_owner_id;
  const staffPermissions = isStaffMember
    ? user?.staff_permissions ?? (user?.staff_role === 'administrateur' ? Object.values(NAV_ITEM_PERMISSION) : [])
    : null;
  const visibleItems = staffPermissions
    ? NAV_ITEMS.filter((item) => {
        const perm = NAV_ITEM_PERMISSION[item.href];
        return !perm || staffPermissions.includes(perm);
      })
    : NAV_ITEMS;

  return (
    <>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-bosejour-red text-white'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 py-3 px-3 space-y-1">
        <Link
          href="/dashboard/host/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white"
        >
          <Settings className="w-4 h-4" />
          Paramètres
        </Link>
        <a
          href="mailto:contact@bosejour.ci"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white"
        >
          <HelpCircle className="w-4 h-4" />
          Centre d&apos;aide
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </>
  );
}

export default function HostSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Bouton menu mobile */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-30 p-2 rounded-lg bg-black text-white shadow-md"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-black text-gray-300 h-screen self-start sticky top-0">
        <SidebarContent />
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 max-w-[80vw] bg-black text-gray-300 flex flex-col">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-white/10"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="pt-14 flex flex-col flex-1 overflow-hidden">
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
