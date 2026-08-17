import api from './api';
import { persistAuth, clearAuth, readToken, readUser, isRemembered, setRememberedEmail } from './tokenStorage';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'host' | 'admin';
  phone?: string;
  avatar?: string;
  roles?: Array<{ id: number; name: string; display_name: string }>;
  // Champs spécifiques aux hôtes (remplis lors de l'inscription)
  establishment_name?: string;
  accommodation_type?: string;
  address_line1?: string;
  city?: string;
  phone_fixed?: string;
  whatsapp?: string;
  // Voyageur (brief Parcours Voyageur)
  traveler_type?: 'individual' | 'corporate';
  company_name?: string;
  // Collaborateur hôte (menu Personnel — brief Extranet Partenaire, Phase 13)
  staff_owner_id?: number | null;
  staff_role?: 'administrateur' | 'receptionniste' | 'comptabilite' | 'commercial' | 'housekeeping' | 'maintenance' | null;
  /** Menus cochés individuellement par le propriétaire à l'invitation (clés HostStaff::PERMISSIONS). */
  staff_permissions?: string[] | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  role?: 'user' | 'host';
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<{
    user?: User;
    token?: string;
    requires_2fa?: boolean;
    requires_email_otp?: boolean;
    user_id?: number;
    temp_token?: string;
  }> {
    const { remember = true, ...creds } = credentials;
    const response = await api.post('/login', creds);

    // Mémoriser l'e-mail pour le préremplissage (si « se souvenir »)
    setRememberedEmail(remember ? credentials.email : null);

    // Google 2FA
    if (response.data.requires_2fa) {
      return {
        requires_2fa: true,
        user_id: response.data.user_id,
        temp_token: response.data.temp_token,
      };
    }

    // Email OTP
    if (response.data.requires_email_otp) {
      return {
        requires_email_otp: true,
        user_id: response.data.user_id,
      };
    }

    const { user, token } = response.data;
    persistAuth(token, user, remember);

    return { user, token };
  },

  async register(data: RegisterData) {
    const response = await api.post('/register', data);
    const { user, token } = response.data;

    persistAuth(token, user, isRemembered());

    return { user, token };
  },

  async logout() {
    await api.post('/logout');
    clearAuth();
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get('/me');
      return response.data;
    } catch {
      return null;
    }
  },

  getStoredUser(): User | null {
    const userStr = readUser();
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken(): string | null {
    return readToken();
  },

  /**
   * Rediriger vers le fournisseur OAuth
   */
  redirectToOAuth(provider: 'google' | 'microsoft') {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.bosejour.ci/api';
    window.location.href = `${apiUrl}/auth/${provider}/redirect`;
  },

  /**
   * Gérer le callback OAuth (appelé depuis une page de callback)
   */
  async handleOAuthCallback(data: { user: User; token: string; provider: string }) {
    persistAuth(data.token, data.user, isRemembered());
    return { user: data.user, token: data.token };
  },

  /**
   * Vérifier le code OTP email et finaliser la connexion
   */
  async verifyEmailOtp(userId: number, code: string): Promise<{ user: User; token: string }> {
    const response = await api.post('/auth/verify-otp', { user_id: userId, code });
    const { user, token } = response.data;

    persistAuth(token, user, isRemembered());

    return { user, token };
  },

  /**
   * Demander un email de réinitialisation de mot de passe
   */
  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  /**
   * Réinitialiser le mot de passe avec le token reçu par email
   */
  async resetPassword(
    token: string,
    email: string,
    password: string,
    passwordConfirmation: string
  ): Promise<void> {
    await api.post('/auth/reset-password', {
      token,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });
  },
};

