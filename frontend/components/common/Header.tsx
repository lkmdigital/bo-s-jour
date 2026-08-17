'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import {
  Moon,
  Sun,
  Menu,
  X,
  Home,
  Building2,
  CalendarCheck,
  LayoutDashboard,
  Users,
  Handshake,
  ShieldCheck,
  BarChart3,
  Wallet,
  LogIn,
  UserPlus,
  User,
  Settings,
  Inbox,
  MessageSquare,
  Search,
  Globe,
  Headphones,
  Gift,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isController, isAdmin } from '@/lib/userUtils';
import { useLocaleStore, Locale } from '@/stores/localeStore';
import Logo from './Logo';

const LANG_OPTIONS: { key: Locale; label: string }[] = [
  { key: 'fr', label: 'Français' },
  { key: 'en', label: 'English' },
];

/** Info-bulle affichée sous une icône au survol (souris). */
function IconTooltip({ text }: { text: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-50"
    >
      {text}
    </span>
  );
}

export default function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { locale, setLocale } = useLocaleStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // Vérifier si on est sur une page admin
  const isAdminPage = pathname?.startsWith('/dashboard/admin');
  // Les contrôleurs ne voient aucun menu (vérification via RBAC)
  const isControllerUser = isAuthenticated && isController(user);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  // Les contrôleurs n'ont AUCUN menu, juste le header minimal
  if (isControllerUser) {
    return (
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo 
              href="/dashboard/admin/inspections"
              size="md"
            />

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Changer le thème"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {isAuthenticated && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm">{user?.name}</span>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary text-sm"
                  >
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>
    );
  }

  // Fonction pour obtenir le menu selon le rôle
  const getMenuForRole = (isHomePage: boolean) => {
    // Les contrôleurs n'ont pas de menu
    if (isControllerUser) {
      return null;
    }
    
    // Menu Admin/Super Admin
    if (isAdmin(user)) {
      return (
        <>
          <Link 
            href="/dashboard/admin" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname === '/dashboard/admin' ? 'text-primary font-semibold' : ''}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Tableau de bord
          </Link>
          <Link
            href="/dashboard/admin/users" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/dashboard/admin/users') ? 'text-primary font-semibold' : ''}`}
          >
            <Users className="w-4 h-4" />
            Utilisateurs
          </Link>
          <Link 
            href="/dashboard/admin/hosts" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/dashboard/admin/hosts') ? 'text-primary font-semibold' : ''}`}
          >
            <Handshake className="w-4 h-4" />
            Hôtes
          </Link>
          <Link 
            href="/dashboard/admin/accommodations" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/dashboard/admin/accommodations') ? 'text-primary font-semibold' : ''}`}
          >
            <Building2 className="w-4 h-4" />
            Établissements
          </Link>
          <Link 
            href="/dashboard/admin/inspections" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/dashboard/admin/inspections') ? 'text-primary font-semibold' : ''}`}
          >
            <ShieldCheck className="w-4 h-4" />
            Inspections
          </Link>
          <Link 
            href="/dashboard/admin/analytics" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/dashboard/admin/analytics') ? 'text-primary font-semibold' : ''}`}
          >
            <BarChart3 className="w-4 h-4" />
            Statistiques
          </Link>
          <Link
            href="/dashboard/admin/revenue" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/dashboard/admin/revenue') ? 'text-primary font-semibold' : ''}`}
          >
            <Wallet className="w-4 h-4" />
            Revenus
          </Link>
          <Link 
            href="/dashboard/admin/reviews" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/dashboard/admin/reviews') ? 'text-primary font-semibold' : ''}`}
          >
            <MessageSquare className="w-4 h-4" />
            Avis
          </Link>
          <Link 
            href="/dashboard/admin/settings" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/dashboard/admin/settings') ? 'text-primary font-semibold' : ''}`}
          >
            <Settings className="w-4 h-4" />
            Paramètres
          </Link>
        </>
      );
    }

    // Menu Host
    if (user?.role === 'host') {
      return (
        <>
          <Link 
            href="/dashboard/host" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname === '/dashboard/host' ? 'text-primary font-semibold' : ''}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Tableau de bord
          </Link>
          <Link 
            href="/dashboard/host/analytics" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/dashboard/host/analytics') ? 'text-primary font-semibold' : ''}`}
          >
            <BarChart3 className="w-4 h-4" />
            Analyses
          </Link>
          <Link 
            href="/dashboard/host/bookings/requests" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/dashboard/host/bookings/requests') ? 'text-primary font-semibold' : ''}`}
          >
            <Users className="w-4 h-4" />
            Réservations
          </Link>
          <Link 
            href="/dashboard/host/bookings" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/dashboard/host/bookings') && !pathname?.startsWith('/dashboard/host/bookings/requests') ? 'text-primary font-semibold' : ''}`}
          >
            <CalendarCheck className="w-4 h-4" />
            Calendrier
          </Link>
          <Link 
            href="/dashboard/host/inbox" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/dashboard/host/inbox') ? 'text-primary font-semibold' : ''}`}
          >
            <Inbox className="w-4 h-4" />
            Boîte de réception
          </Link>
          <Link 
            href="/dashboard/host/reviews" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/dashboard/host/reviews') ? 'text-primary font-semibold' : ''}`}
          >
            <MessageSquare className="w-4 h-4" />
            Commentaires
          </Link>
          <Link 
            href="/dashboard/host/profile" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/dashboard/host/profile') ? 'text-primary font-semibold' : ''}`}
          >
            <User className="w-4 h-4" />
            Profil
          </Link>
        </>
      );
    }

    // Menu User (utilisateur normal)
    if (isAuthenticated && user && user.role === 'user') {
      return (
        <>
          <Link 
            href="/" 
            className={`${
              isHomePage 
                ? 'text-white hover:text-white/80' 
                : 'hover:text-primary'
            } transition-colors inline-flex items-center gap-1.5 ${pathname === '/' ? (isHomePage ? 'font-semibold' : 'text-primary font-semibold') : ''}`}
          >
            <Home className="w-4 h-4" />
            Accueil
          </Link>
          <Link 
            href="/accommodations" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/accommodations') ? 'text-primary font-semibold' : ''}`}
          >
            <Building2 className="w-4 h-4" />
            Hébergements
          </Link>
          <Link 
            href="/bookings" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/bookings') ? 'text-primary font-semibold' : ''}`}
          >
            <CalendarCheck className="w-4 h-4" />
            Réservations
          </Link>
          <Link 
            href="/dashboard" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/dashboard') && !pathname?.startsWith('/dashboard/admin') && !pathname?.startsWith('/dashboard/host') && pathname !== '/dashboard/user/inbox' ? 'text-primary font-semibold' : ''}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Tableau de bord
          </Link>
          <Link 
            href="/dashboard/user/inbox" 
            className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname === '/dashboard/user/inbox' ? 'text-primary font-semibold' : ''}`}
          >
            <Inbox className="w-4 h-4" />
            Messages
          </Link>
        </>
      );
    }

    // Menu public (non connecté)
    return (
      <>
        <Link
          href="/accommodations"
          className={`hover:text-primary transition-colors inline-flex items-center gap-1.5 ${pathname?.startsWith('/accommodations') ? 'text-primary font-semibold' : ''}`}
        >
          <Search className="w-4 h-4" />
          
          Reservation
        </Link>
      </>
    );
  };

  // Fermer le menu mobile au clic sur un lien (pour navigation)
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Fonction pour obtenir le menu mobile selon le rôle (affichage vertical)
  const getMobileMenuForRole = () => {
    const linkClass = (isHome: boolean) =>
      `block py-3 w-full text-left inline-flex items-center gap-2 rounded-lg px-3 ${
        isHome ? 'text-white hover:bg-white/10' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }`;
    // Les contrôleurs n'ont pas de menu
    if (isControllerUser) {
      return null;
    }
    
    // Menu Admin/Super Admin
    if (isAdmin(user)) {
      return (
        <>
          <Link href="/dashboard/admin" onClick={closeMobileMenu} className={linkClass(false)}>
            <LayoutDashboard className="w-4 h-4" /> Tableau de bord
          </Link>
          <Link href="/dashboard/admin/users" onClick={closeMobileMenu} className={linkClass(false)}>
            <Users className="w-4 h-4" /> Utilisateurs
          </Link>
          <Link href="/dashboard/admin/hosts" onClick={closeMobileMenu} className={linkClass(false)}>
            <Handshake className="w-4 h-4" /> Hôtes
          </Link>
          <Link href="/dashboard/admin/accommodations" onClick={closeMobileMenu} className={linkClass(false)}>
            <Building2 className="w-4 h-4" /> Établissements
          </Link>
          <Link href="/dashboard/admin/inspections" onClick={closeMobileMenu} className={linkClass(false)}>
            <ShieldCheck className="w-4 h-4" /> Inspections
          </Link>
          <Link href="/dashboard/admin/analytics" onClick={closeMobileMenu} className={linkClass(false)}>
            <BarChart3 className="w-4 h-4" /> Statistiques
          </Link>
          <Link href="/dashboard/admin/revenue" onClick={closeMobileMenu} className={linkClass(false)}>
            <Wallet className="w-4 h-4" /> Revenus
          </Link>
          <Link href="/dashboard/admin/settings" onClick={closeMobileMenu} className={linkClass(false)}>
            <Settings className="w-4 h-4" /> Paramètres
          </Link>
        </>
      );
    }

    // Menu Host
    if (user?.role === 'host') {
      return (
        <>
          <Link href="/dashboard/host" onClick={closeMobileMenu} className={linkClass(false)}>
            <LayoutDashboard className="w-4 h-4" /> Tableau de bord
          </Link>
          <Link href="/dashboard/host/analytics" onClick={closeMobileMenu} className={linkClass(false)}>
            <BarChart3 className="w-4 h-4" /> Analyses
          </Link>
          <Link href="/dashboard/host/bookings/requests" onClick={closeMobileMenu} className={linkClass(false)}>
            <Users className="w-4 h-4" /> Réservations
          </Link>
          <Link href="/dashboard/host/bookings" onClick={closeMobileMenu} className={linkClass(false)}>
            <CalendarCheck className="w-4 h-4" /> Calendrier
          </Link>
          <Link href="/dashboard/host/inbox" onClick={closeMobileMenu} className={linkClass(false)}>
            <Inbox className="w-4 h-4" /> Boîte de réception
          </Link>
          <Link href="/dashboard/host/reviews" onClick={closeMobileMenu} className={linkClass(false)}>
            <MessageSquare className="w-4 h-4" /> Commentaires
          </Link>
          <Link href="/dashboard/host/profile" onClick={closeMobileMenu} className={linkClass(false)}>
            <User className="w-4 h-4" /> Profil
          </Link>
        </>
      );
    }

    // Menu User (utilisateur normal)
    if (isAuthenticated && user && user.role === 'user') {
      return (
        <>
          <Link href="/" onClick={closeMobileMenu} className={linkClass(false)}>
            <Home className="w-4 h-4" /> Accueil
          </Link>
          <Link href="/accommodations" onClick={closeMobileMenu} className={linkClass(false)}>
            <Building2 className="w-4 h-4" /> Hébergements
          </Link>
          <Link href="/bookings" onClick={closeMobileMenu} className={linkClass(false)}>
            <CalendarCheck className="w-4 h-4" /> Réservations
          </Link>
          <Link href="/dashboard" onClick={closeMobileMenu} className={linkClass(false)}>
            <LayoutDashboard className="w-4 h-4" /> Tableau de bord
          </Link>
        </>
      );
    }

    // Menu public (non connecté)
    return (
      <>
        <Link href="/accommodations" onClick={closeMobileMenu} className={linkClass(false)}>
          <Search className="w-4 h-4" /> Explorer
        </Link>
      </>
    );
  };

  // Un menu de navigation par rôle n'est affiché que pour les utilisateurs connectés
  // (admin/host/user). Le public voit un header épuré façon maquette.
  const showRoleMenu = isAuthenticated;

  return (
    <motion.header
      className="bg-white dark:bg-gray-900 shadow-md fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <nav className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
            <Logo
              href={isAdminPage ? '/dashboard/admin' : user?.role === 'host' ? '/dashboard/host' : '/'}
              size="md"
            />
          </motion.div>

          <div className="hidden md:flex items-center space-x-6">
            {/* Seuls les membres (voyageurs) ont la navigation publique. */}
            {isAuthenticated && user?.role === 'user' && (
              <div className="flex items-center space-x-6">{getMenuForRole(false)}</div>
            )}

            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Changer le thème">
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                {/* Le personnel (admin/host) accède à son espace via un bouton dédié — jamais la nav complète en public */}
                {isAdmin(user) && (
                  <Link href="/dashboard/admin" className="btn-secondary text-sm inline-flex items-center gap-1.5">
                    <LayoutDashboard className="w-4 h-4" /> Tableau de bord
                  </Link>
                )}
                {user?.role === 'host' && (
                  <Link href="/dashboard/host" className="btn-secondary text-sm inline-flex items-center gap-1.5">
                    <LayoutDashboard className="w-4 h-4" /> Espace partenaire
                  </Link>
                )}
                <span className="text-sm font-medium hidden lg:inline">{user?.name}</span>
                <button onClick={handleLogout} className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">Déconnexion</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Langue */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setLangMenuOpen((v) => !v)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-primary"
                    aria-label="Changer la langue"
                    aria-haspopup="true"
                    aria-expanded={langMenuOpen}
                  >
                    <Globe className="w-5 h-5" />
                  </button>
                  {langMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1.5 z-50">
                        {LANG_OPTIONS.map((o) => (
                          <button
                            key={o.key}
                            type="button"
                            onClick={() => { setLocale(o.key); setLangMenuOpen(false); }}
                            className={`w-full text-left px-3.5 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${locale === o.key ? 'text-primary font-semibold' : 'text-gray-700 dark:text-gray-300'}`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {/* Offres promotionnelles */}
                <Link
                  href="/accommodations?featured=1"
                  className="group relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-primary"
                  aria-label="Offres promotionnelles"
                >
                  <Gift className="w-5 h-5" />
                  <IconTooltip text="Profitez de nos offres promotionnelles" />
                </Link>
                {/* Support */}
                <a
                  href="https://wa.me/2250705654775?text=Bonjour%2C%20j%27ai%20besoin%20d%27assistance."
                  target="_blank" rel="noopener noreferrer"
                  className="group relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-primary"
                  aria-label="Assistance technique"
                >
                  <Headphones className="w-5 h-5" />
                  <IconTooltip text="Assistance technique" />
                </a>
                {/* Publier mon établissement (espace partenaire) */}
                <Link href="/partenaire" className="hidden lg:inline-flex text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  Publier mon établissement
                </Link>
                {/* Se connecter — réservé au voyageur (page /voyageur, miroir de /partenaire) */}
                <Link href="/voyageur" className="btn-primary text-sm inline-flex items-center gap-1.5">
                  <LogIn className="w-4 h-4" />
                  Se connecter
                </Link>
              </div>
            )}
          </div>

          {/* Actions mobiles */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated ? (
              <>
                {isAdmin(user) && (
                  <Link href="/dashboard/admin" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-primary" aria-label="Tableau de bord">
                    <LayoutDashboard className="w-5 h-5" />
                  </Link>
                )}
                {user?.role === 'host' && (
                  <Link href="/dashboard/host" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-primary" aria-label="Espace partenaire">
                    <LayoutDashboard className="w-5 h-5" />
                  </Link>
                )}
                <button onClick={handleLogout} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                  Déconnexion
                </button>
              </>
            ) : (
              <Link href="/voyageur" className="btn-primary text-sm inline-flex items-center gap-1.5">
                <LogIn className="w-4 h-4" />
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </nav>
    </motion.header>
  );
}

