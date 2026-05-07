import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';

interface Subscription {
  status: string;
  plan: { type: string; name: string };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  avatarUrl?: string | null;
  onboardingDone?: boolean;
  subscription?: Subscription | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setOnboardingDone: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
  /** Returns the active plan type (BASIC | PLUS | PREMIUM) or null */
  planType: () => string | null;
  /** True when subscription exists and status is ACTIVE */
  hasActivePlan: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  hydrated: false,

  planType: () => {
    const sub = get().user?.subscription;
    return sub?.status === 'ACTIVE' ? sub.plan?.type ?? null : null;
  },

  hasActivePlan: () => get().user?.subscription?.status === 'ACTIVE',

  hydrate: async () => {
    try {
      const token = await AsyncStorage.getItem('@minhanutrionline:token');
      if (token) {
        // Re-fetch user from API to get up-to-date subscription info
        try {
          const { data } = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          await AsyncStorage.setItem(
            '@minhanutrionline:user',
            JSON.stringify(data),
          );
          set({ token, user: data, hydrated: true });
        } catch {
          // fallback to cached user if API fails (offline)
          const userStr = await AsyncStorage.getItem('@minhanutrionline:user');
          set({
            token,
            user: userStr ? JSON.parse(userStr) : null,
            hydrated: true,
          });
        }
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await AsyncStorage.setItem('@minhanutrionline:token', data.token);
      await AsyncStorage.setItem(
        '@minhanutrionline:user',
        JSON.stringify(data.user),
      );
      set({ token: data.token, user: data.user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/register', {
        name,
        email,
        password,
      });
      await AsyncStorage.setItem('@minhanutrionline:token', data.token);
      await AsyncStorage.setItem(
        '@minhanutrionline:user',
        JSON.stringify(data.user),
      );
      set({ token: data.token, user: data.user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('@minhanutrionline:token');
    await AsyncStorage.removeItem('@minhanutrionline:user');
    set({ token: null, user: null });
  },

  setOnboardingDone: async () => {
    const userStr = await AsyncStorage.getItem('@minhanutrionline:user');
    if (userStr) {
      const updated = { ...JSON.parse(userStr), onboardingDone: true };
      await AsyncStorage.setItem(
        '@minhanutrionline:user',
        JSON.stringify(updated),
      );
      set(state => ({
        user: state.user ? { ...state.user, onboardingDone: true } : null,
      }));
    }
  },

  updateUser: async patch => {
    const userStr = await AsyncStorage.getItem('@minhanutrionline:user');
    if (userStr) {
      const updated = { ...JSON.parse(userStr), ...patch };
      await AsyncStorage.setItem(
        '@minhanutrionline:user',
        JSON.stringify(updated),
      );
      set(state => ({
        user: state.user ? { ...state.user, ...patch } : null,
      }));
    }
  },
}));
