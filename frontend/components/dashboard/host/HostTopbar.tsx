'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Bell, MessageSquare, Globe, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Logo from '@/components/common/Logo';

interface Accommodation {
  id: number;
  name: string;
}

export default function HostTopbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [establishments, setEstablishments] = useState<Accommodation[]>([]);

  useEffect(() => {
    api
      .get('/host/inbox', { params: { per_page: 20 } })
      .then((res) => {
        const items = res.data?.data ?? [];
        setUnreadMessages(items.filter((m: any) => !m.read_at).length);
      })
      .catch(() => {});

    api
      .get('/accommodations/my')
      .then((res) => {
        const items = res.data?.data ?? res.data ?? [];
        setEstablishments(Array.isArray(items) ? items : []);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const establishmentLabel =
    establishments.length === 0
      ? '—'
      : establishments.length === 1
      ? establishments[0].name
      : `${establishments.length} établissements`;

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 pl-16 pr-4 lg:px-8 py-3 flex items-center gap-6">
      <Link href="/dashboard/host" className="hidden lg:flex shrink-0">
        <Logo size="sm" href="" className="h-8" />
      </Link>

      <div className="flex-1 max-w-xl relative mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher..."
          className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm border-none focus:ring-2 focus:ring-bosejour-red/40 outline-none"
        />
      </div>

      <div className="flex items-center gap-2 lg:gap-5 shrink-0">
        <button
          type="button"
          title="Notifications"
          className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Bell className="w-5 h-5 text-gray-500 dark:text-gray-300" />
        </button>

        <Link
          href="/dashboard/host/inbox"
          title="Messages"
          className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <MessageSquare className="w-5 h-5 text-gray-500 dark:text-gray-300" />
          {unreadMessages > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-bosejour-red" />
          )}
        </Link>

        <button
          type="button"
          title="Langue"
          className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Globe className="w-4 h-4" />
          FR
        </button>

        <span className="hidden md:inline-block px-3 py-1.5 rounded-full bg-bosejour-beige/60 dark:bg-bosejour-grayDark text-xs font-semibold text-bosejour-grayDark dark:text-bosejour-beige truncate max-w-[160px]">
          {establishmentLabel}
        </span>

        <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-700">
          <div className="w-9 h-9 rounded-full bg-bosejour-red/10 text-bosejour-red flex items-center justify-center font-bold text-sm shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'H'}
          </div>
          <div className="hidden lg:block leading-tight">
            <p className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Gérant</p>
          </div>
          <button
            onClick={handleLogout}
            title="Déconnexion"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <LogOut className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </header>
  );
}
