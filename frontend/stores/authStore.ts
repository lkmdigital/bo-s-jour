import { create } from 'zustand';
import { User, authService } from '@/lib/auth';
import { markAuthenticated } from '@/lib/tokenStorage';
import { oneSignal } from '@/lib/oneSignal';
import { useFavoritesStore } from '@/stores/favoritesStore';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

function identifyForNotifications(user: User) {
  if (!user?.id) return;
  oneSignal.loginUser(user.id);
  oneSignal.setTags({ role: user.role ?? 'user' });
  if (user.email) {
    oneSignal.syncEmail(user.email);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string, remember: boolean = true) => {
    const result = await authService.login({ email, password, remember });

    // Si une étape 2FA est requise, propager l'info au caller sans modifier le store
    if (result.requires_2fa || result.requires_email_otp) {
      const error: any = new Error(
        result.requires_email_otp ? 'Email OTP required' : '2FA verification required'
      );
      error.requires_2fa = result.requires_2fa;
      error.requires_email_otp = result.requires_email_otp;
      error.user_id = result.user_id;
      error.temp_token = result.temp_token;
      throw error;
    }

    const { user } = result as { user: User };

    try {
      const freshUser = await authService.getCurrentUser();
      const activeUser = freshUser ?? user;
      set({ user: activeUser, isAuthenticated: true });
      identifyForNotifications(activeUser);
    } catch {
      set({ user, isAuthenticated: true });
      identifyForNotifications(user);
    }
  },

  register: async (data: any) => {
    const { user } = await authService.register(data);
    try {
      const freshUser = await authService.getCurrentUser();
      const activeUser = freshUser ?? user;
      set({ user: activeUser, isAuthenticated: true });
      identifyForNotifications(activeUser);
    } catch {
      set({ user, isAuthenticated: true });
      identifyForNotifications(user);
    }
  },

  logout: async () => {
    oneSignal.logoutUser();
    await authService.logout();
    useFavoritesStore.getState().reset();
    set({ user: null, isAuthenticated: false });
  },

  // Authentification par cookie de session httpOnly (migration 2026-08-31) : il n'y a plus
  // de token/utilisateur en cache à lire en premier — le navigateur envoie le cookie
  // automatiquement, donc on interroge systématiquement /me pour connaître l'état réel.
  checkAuth: async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      const user = await Promise.race([
        authService.getCurrentUser(),
        timeoutPromise,
      ]) as User | null;

      set({ user, isAuthenticated: !!user, isLoading: false });
      markAuthenticated(!!user);
      if (user) identifyForNotifications(user);
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },
}));
