'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { isController, isAdmin } from '@/lib/userUtils';
import {
  Home,
  Search,
  Building2,
  CalendarCheck,
  User,
  LayoutDashboard,
  Users,
  Inbox,
  Handshake,
  ShieldCheck,
  Settings,
  BarChart3,
  MessageSquare,
  Menu,
  Heart,
  Zap,
  CreditCard,
  Wallet,
  FileText,
  Compass,
  Globe2,
  HelpCircle,
} from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

export default function MobileBottomBar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const [showMore, setShowMore] = useState(false);

  const isControllerUser = isAuthenticated && isController(user);

  // Les contrôleurs n'ont pas de bottom bar
  if (isControllerUser) return null;

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname?.startsWith(href) || false;
  };

  // Obtenir les items principaux (max 5 en bottom bar) + items secondaires (dans le menu "Plus"/"Menu")
  const getNavItems = (): { main: NavItem[]; more: NavItem[]; moreTrigger?: { icon: React.ReactNode; label: string } } => {
    // Admin
    if (isAdmin(user)) {
      return {
        main: [
          { href: '/dashboard/admin', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', isActive: isActive('/dashboard/admin', true) },
          { href: '/dashboard/admin/users', icon: <Users className="w-5 h-5" />, label: 'Utilisateurs', isActive: isActive('/dashboard/admin/users') },
          { href: '/dashboard/admin/accommodations', icon: <Building2 className="w-5 h-5" />, label: 'Établis.', isActive: isActive('/dashboard/admin/accommodations') },
          { href: '/dashboard/admin/hosts', icon: <Handshake className="w-5 h-5" />, label: 'Hôtes', isActive: isActive('/dashboard/admin/hosts') },
        ],
        more: [
          { href: '/dashboard/admin/inspections', icon: <ShieldCheck className="w-5 h-5" />, label: 'Inspections', isActive: isActive('/dashboard/admin/inspections') },
          { href: '/dashboard/admin/analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics', isActive: isActive('/dashboard/admin/analytics') },
          { href: '/dashboard/admin/revenue', icon: <BarChart3 className="w-5 h-5" />, label: 'Revenus', isActive: isActive('/dashboard/admin/revenue') },
          { href: '/dashboard/admin/reviews', icon: <MessageSquare className="w-5 h-5" />, label: 'Avis', isActive: isActive('/dashboard/admin/reviews') },
          { href: '/dashboard/admin/settings', icon: <Settings className="w-5 h-5" />, label: 'Paramètres', isActive: isActive('/dashboard/admin/settings') },
        ],
      };
    }

    // Host
    if (user?.role === 'host') {
      return {
        main: [
          { href: '/dashboard/host', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', isActive: isActive('/dashboard/host', true) },
          { href: '/dashboard/host/bookings/requests', icon: <CalendarCheck className="w-5 h-5" />, label: 'Demandes', isActive: isActive('/dashboard/host/bookings/requests') },
          { href: '/dashboard/host/inbox', icon: <Inbox className="w-5 h-5" />, label: 'Messages', isActive: isActive('/dashboard/host/inbox') },
          { href: '/dashboard/host/profile', icon: <User className="w-5 h-5" />, label: 'Profil', isActive: isActive('/dashboard/host/profile') },
        ],
        more: [
          { href: '/dashboard/host/analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Analyses', isActive: isActive('/dashboard/host/analytics') },
          { href: '/dashboard/host/bookings', icon: <CalendarCheck className="w-5 h-5" />, label: 'Calendrier', isActive: isActive('/dashboard/host/bookings') && !isActive('/dashboard/host/bookings/requests') },
          { href: '/dashboard/host/reviews', icon: <MessageSquare className="w-5 h-5" />, label: 'Avis', isActive: isActive('/dashboard/host/reviews') },
          { href: '/dashboard/host/revenue', icon: <BarChart3 className="w-5 h-5" />, label: 'Revenus', isActive: isActive('/dashboard/host/revenue') },
        ],
      };
    }

    // User connecté
    if (isAuthenticated && user?.role === 'user') {
      const isCorporate = user?.traveler_type === 'corporate';
      return {
        main: [
          { href: '/', icon: <Home className="w-5 h-5" />, label: 'Accueil', isActive: isActive('/', true) },
          { href: '/accommodations', icon: <Search className="w-5 h-5" />, label: 'Explorer', isActive: isActive('/accommodations') },
          { href: '/bookings', icon: <CalendarCheck className="w-5 h-5" />, label: 'Réservations', isActive: isActive('/bookings') },
          { href: '/dashboard/user/inbox', icon: <Inbox className="w-5 h-5" />, label: 'Messages', isActive: isActive('/dashboard/user/inbox') },
        ],
        // Reprend le contenu de l'ancien menu burger (app/dashboard/user/layout.tsx,
        // désormais retiré) : plus accessible en 1 tap depuis n'importe quelle page.
        more: [
          { href: '/favorites', icon: <Heart className="w-5 h-5" />, label: 'Favoris', isActive: isActive('/favorites') },
          { href: '/dashboard/user/programme', icon: <Zap className="w-5 h-5" />, label: 'Programme', isActive: isActive('/dashboard/user/programme') },
          { href: '/dashboard/user/paiements', icon: <CreditCard className="w-5 h-5" />, label: 'Paiements', isActive: isActive('/dashboard/user/paiements') },
          { href: '/dashboard/user/avoirs', icon: <Wallet className="w-5 h-5" />, label: 'Mes avoirs', isActive: isActive('/dashboard/user/avoirs') },
          ...(isCorporate ? [{ href: '/dashboard/user/entreprise', icon: <Building2 className="w-5 h-5" />, label: 'Entreprise', isActive: isActive('/dashboard/user/entreprise') }] : []),
          { href: '/dashboard/user/avis', icon: <MessageSquare className="w-5 h-5" />, label: 'Avis', isActive: isActive('/dashboard/user/avis') },
          { href: '/dashboard/user/profil', icon: <User className="w-5 h-5" />, label: 'Profil', isActive: isActive('/dashboard/user/profil') },
          { href: '/dashboard/user/documents', icon: <FileText className="w-5 h-5" />, label: 'Documents', isActive: isActive('/dashboard/user/documents') },
          { href: '/dashboard/user/voyages', icon: <Compass className="w-5 h-5" />, label: 'Mes voyages', isActive: isActive('/dashboard/user/voyages') },
          { href: '/dashboard/user/decouvrir', icon: <Globe2 className="w-5 h-5" />, label: 'Découvrir', isActive: isActive('/dashboard/user/decouvrir') },
          { href: '/dashboard/user/parametres', icon: <Settings className="w-5 h-5" />, label: 'Paramètres', isActive: isActive('/dashboard/user/parametres') },
          { href: '/dashboard/user/aide', icon: <HelpCircle className="w-5 h-5" />, label: 'Aide', isActive: isActive('/dashboard/user/aide') },
        ],
        moreTrigger: { icon: <Menu className="w-5 h-5" />, label: 'Menu' },
      };
    }

    // Visiteur (non connecté)
    return {
      main: [
        { href: '/', icon: <Home className="w-5 h-5" />, label: 'Accueil', isActive: isActive('/', true) },
        { href: '/accommodations', icon: <Search className="w-5 h-5" />, label: 'Explorer', isActive: isActive('/accommodations') },
        { href: '/partenaire', icon: <Building2 className="w-5 h-5" />, label: 'Établissement', isActive: isActive('/partenaire') },
        { href: '/auth/register', icon: <User className="w-5 h-5" />, label: 'Créer', isActive: isActive('/auth/register') },
      ],
      more: [],
    };
  };

  const { main, more, moreTrigger } = getNavItems();
  const hasMore = more.length > 0;
  const triggerIcon = moreTrigger?.icon ?? (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
  const triggerLabel = moreTrigger?.label ?? 'Plus';

  return (
    <>
      {/* Overlay quand le menu "Plus" est ouvert */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMore(false)}
          />
        )}
      </AnimatePresence>

      {/* Panneau "Plus" */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            className="fixed bottom-16 left-0 right-0 z-50 md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-t-2xl shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="p-4">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
              <div className="grid grid-cols-4 gap-4">
                {more.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${
                      item.isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item.icon}
                    <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {main.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                item.isActive
                  ? 'text-primary'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          ))}
          {hasMore && (
            <button
              onClick={() => setShowMore(!showMore)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                showMore ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {triggerIcon}
              <span className="text-[10px] font-medium leading-tight">{triggerLabel}</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
